'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import {
  VOICE_DELETE_WORD,
  applyAbhyasVoiceCommands,
  getSpeechRecognitionCtor,
  joinUtterances,
  readSpeechTranscript,
  type SpeechRecognitionLike,
} from '@/lib/speech';

const T = {
  page: 'var(--v-page)',
  float: 'var(--v-float)',
  border: 'var(--v-border)',
  green: 'var(--v-accent)',
  text0: 'var(--v-tx0)',
  text1: 'var(--v-tx1)',
  text2: 'var(--v-tx2)',
  text3: 'var(--v-tx3)',
} as const;

export type AnswerInputMode = 'voice' | 'keyboard';

interface AnswerComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  disabled: boolean;
  waitingForInterviewer: boolean;
  onLevelChange?: (level: number) => void;
  onModeChange?: (mode: AnswerInputMode) => void;
}

export function AnswerComposer({
  value,
  onChange,
  onSubmit,
  disabled,
  waitingForInterviewer,
  onLevelChange,
  onModeChange,
}: AnswerComposerProps) {
  const speechAvailable = Boolean(getSpeechRecognitionCtor());
  const [mode, setMode] = useState<AnswerInputMode>(speechAvailable ? 'voice' : 'keyboard');
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState(
    speechAvailable ? 'Microphone ready' : 'Speech unavailable — use keyboard'
  );
  const [sttFailed, setSttFailed] = useState(!speechAvailable);
  const [micDenied, setMicDenied] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const networkFailsRef = useRef(0);
  const sttDeadRef = useRef(!speechAvailable);
  const cancelledRef = useRef(false);
  /** Stable text kept across recognition restarts (pauses). */
  const committedRef = useRef('');
  /** Text frozen when the current recognition session started. */
  const baselineRef = useRef('');
  const modeRef = useRef(mode);
  const canListenRef = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const canListen = mode === 'voice' && !disabled && !waitingForInterviewer && !sttFailed && !micDenied;
  canListenRef.current = canListen;
  modeRef.current = mode;

  const flashStatus = (msg: string, restore = 'Listening — speak your answer') => {
    setStatus(msg);
    if (statusResetRef.current) clearTimeout(statusResetRef.current);
    statusResetRef.current = setTimeout(() => {
      if (canListenRef.current) setStatus(restore);
    }, 1600);
  };

  const switchMode = (next: AnswerInputMode) => {
    modeRef.current = next;
    if (next === 'keyboard') {
      canListenRef.current = false;
      stopRecognition();
      setListening(false);
      setMode('keyboard');
      onModeChange?.('keyboard');
      setStatus('Keyboard input');
      return;
    }

    sttDeadRef.current = false;
    setSttFailed(false);
    networkFailsRef.current = 0;
    setMode('voice');
    onModeChange?.('voice');
    setStatus('Starting microphone…');
  };

  const stopRecognition = () => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    recognitionRef.current = null;
  };

  const startRecognition = () => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor || cancelledRef.current || sttDeadRef.current || !canListenRef.current) return;

    stopRecognition();

    // Preserve everything said before this session (survives pause / restart)
    baselineRef.current = committedRef.current;

    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US';

    rec.onstart = () => {
      if (cancelledRef.current || !canListenRef.current) return;
      setListening(true);
      setStatus(`Listening — say “${VOICE_DELETE_WORD}” to delete a word`);
    };

    rec.onresult = (event) => {
      if (sttDeadRef.current || modeRef.current !== 'voice') return;
      networkFailsRef.current = 0;

      const { finalText, interimText } = readSpeechTranscript(event);
      // Session finals only — append onto baseline so pauses don't wipe prior speech
      const mergedRaw = joinUtterances(baselineRef.current, finalText);
      const { text: merged, deletedWords } = applyAbhyasVoiceCommands(mergedRaw);
      committedRef.current = merged;

      if (deletedWords > 0) {
        flashStatus(
          deletedWords === 1 ? 'Deleted last word' : `Deleted ${deletedWords} words`
        );
      }

      const display = joinUtterances(merged, interimText);
      onChangeRef.current(display);
    };

    rec.onerror = (event?: { error?: string }) => {
      if (cancelledRef.current) return;
      const code = event?.error || 'error';

      if (code === 'not-allowed') {
        sttDeadRef.current = true;
        setSttFailed(true);
        setMicDenied(true);
        setListening(false);
        switchMode('keyboard');
        setStatus('Microphone permission blocked — use keyboard');
        return;
      }

      if (code === 'no-speech' || code === 'aborted') return;

      if (code === 'network') {
        networkFailsRef.current += 1;
        setListening(false);
        if (networkFailsRef.current >= 2) {
          sttDeadRef.current = true;
          setSttFailed(true);
          stopRecognition();
          switchMode('keyboard');
          setStatus('Speech recognition unavailable — use keyboard');
          return;
        }
        setStatus('Speech network issue — retrying…');
        return;
      }

      setListening(false);
      setStatus(`Speech issue (${code})`);
    };

    rec.onend = () => {
      setListening(false);
      // Lock in committed text before the next session baseline is taken
      baselineRef.current = committedRef.current;
      if (cancelledRef.current || sttDeadRef.current || !canListenRef.current) return;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      restartTimerRef.current = setTimeout(() => {
        if (cancelledRef.current || sttDeadRef.current || !canListenRef.current) return;
        startRecognition();
      }, 400);
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch {
      setListening(false);
      setStatus('Could not start microphone');
    }
  };

  // Mic level meter for the acoustic orb
  useEffect(() => {
    cancelledRef.current = false;
    let audioCtx: AudioContext | null = null;

    (async () => {
      if (mode !== 'voice') {
        onLevelChange?.(0);
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelledRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        setMicDenied(false);

        audioCtx = new AudioContext();
        if (audioCtx.state === 'suspended') {
          try {
            await audioCtx.resume();
          } catch {
            /* ignore */
          }
        }
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);
        const data = new Uint8Array(analyser.fftSize);

        const tick = () => {
          analyser.getByteTimeDomainData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) {
            const v = (data[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / data.length);
          onLevelChange?.(Math.min(1, rms * 4.5));
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        if (!cancelledRef.current) {
          setMicDenied(true);
          setSttFailed(true);
          sttDeadRef.current = true;
          setStatus('Microphone blocked — switched to keyboard');
          setMode('keyboard');
          onModeChange?.('keyboard');
        }
      }
    })();

    return () => {
      cancelledRef.current = true;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      try {
        audioCtx?.close();
      } catch {
        /* ignore */
      }
      onLevelChange?.(0);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Start / pause recognition with turn state
  useEffect(() => {
    if (!canListen) {
      stopRecognition();
      setListening(false);
      if (waitingForInterviewer) setStatus('Waiting for interviewer…');
      else if (disabled) setStatus('Session closed');
      else if (mode === 'keyboard') setStatus('Keyboard input');
      return;
    }

    committedRef.current = value.trim();
    baselineRef.current = value.trim();
    startRecognition();

    return () => {
      stopRecognition();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canListen]);

  // Keep committed baseline in sync when parent clears after send
  useEffect(() => {
    if (!value.trim()) {
      committedRef.current = '';
      baselineRef.current = '';
    }
  }, [value]);

  useEffect(() => {
    return () => {
      if (statusResetRef.current) clearTimeout(statusResetRef.current);
    };
  }, []);

  const locked = disabled || waitingForInterviewer;
  const placeholder = locked
    ? waitingForInterviewer
      ? 'Waiting for interviewer…'
      : 'Session closed — analysis in progress…'
    : mode === 'voice'
      ? `Speak your answer — say “${VOICE_DELETE_WORD}” to delete a word…`
      : 'Type your answer and press enter…';

  return (
    <form
      onSubmit={(e) => {
        stopRecognition();
        onSubmit(e);
      }}
      style={{
        padding: 16,
        borderTop: `1px solid ${T.border}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        backgroundColor: T.page,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor:
                mode === 'voice' && listening ? T.green : micDenied || sttFailed ? '#f87171' : T.text3,
              boxShadow: mode === 'voice' && listening ? '0 0 10px rgba(34,197,94,0.45)' : 'none',
            }}
          />
          <span style={{ fontSize: 11, fontFamily: 'monospace', color: T.text2 }}>
            {status}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {mode === 'voice' ? (
            <button
              type="button"
              onClick={() => switchMode('keyboard')}
              disabled={disabled}
              style={{
                fontSize: 10,
                fontFamily: 'monospace',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: T.text1,
                background: 'transparent',
                border: `1px solid ${T.border}`,
                borderRadius: 6,
                padding: '4px 8px',
                cursor: disabled ? 'not-allowed' : 'pointer',
              }}
            >
              Use keyboard instead
            </button>
          ) : (
            <button
              type="button"
              onClick={() => switchMode('voice')}
              disabled={disabled || micDenied || !speechAvailable}
              style={{
                fontSize: 10,
                fontFamily: 'monospace',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: micDenied || !speechAvailable ? T.text3 : T.green,
                background: 'transparent',
                border: `1px solid ${micDenied || !speechAvailable ? T.border : 'rgba(34,197,94,0.35)'}`,
                borderRadius: 6,
                padding: '4px 8px',
                cursor: disabled || micDenied || !speechAvailable ? 'not-allowed' : 'pointer',
              }}
            >
              Use microphone
            </button>
          )}
        </div>
      </div>

      {(sttFailed || micDenied) && mode === 'keyboard' && (
        <p style={{ fontSize: 11, color: '#eab308', margin: 0, lineHeight: 1.4 }}>
          {micDenied
            ? 'Microphone access failed. Continue by typing your answers.'
            : 'Speech recognition failed. Continue by typing your answers.'}
        </p>
      )}

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
        <textarea
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (mode === 'voice') {
              committedRef.current = e.target.value.trim();
              baselineRef.current = e.target.value.trim();
            }
          }}
          placeholder={placeholder}
          disabled={locked}
          rows={mode === 'voice' ? 3 : 2}
          style={{
            flex: 1,
            backgroundColor: T.float,
            border: `1px solid ${mode === 'voice' && listening ? 'rgba(34,197,94,0.35)' : T.border}`,
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 13.5,
            color: T.text0,
            outline: 'none',
            fontFamily: 'inherit',
            resize: 'none',
            lineHeight: 1.45,
            minHeight: mode === 'voice' ? 72 : 44,
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (!value.trim() || locked) return;
              stopRecognition();
              onSubmit(e as unknown as React.FormEvent);
            }
          }}
        />
        <Button
          type="submit"
          disabled={!value.trim() || locked}
          className="px-6 font-bold"
        >
          Send Answer
        </Button>
      </div>
    </form>
  );
}
