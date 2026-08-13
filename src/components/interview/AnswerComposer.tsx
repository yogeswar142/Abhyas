'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { getSttUnavailableMessage } from '@/lib/speech';
import { useSttProvider } from '@/lib/stt';

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
  /** Bridge URL passed from the interview page so useSttProvider can fetch /stt/config. */
  bridgeUrl?: string | null;
}

export function AnswerComposer({
  value,
  onChange,
  onSubmit,
  disabled,
  waitingForInterviewer,
  onLevelChange,
  onModeChange,
  bridgeUrl,
}: AnswerComposerProps) {
  const [mode, setMode] = useState<AnswerInputMode>('voice');
  const [listening, setListening] = useState(false);
  const [statusLabel, setStatusLabel] = useState('Initializing speech engine…');
  const [micDenied, setMicDenied] = useState(false);
  const [allFailed, setAllFailed] = useState(false);
  const [idleNudge, setIdleNudge] = useState(false);

  const formRef = useRef<HTMLFormElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const modeRef = useRef(mode);
  const onChangeRef = useRef(onChange);
  const cancelledRef = useRef(false);
  const idleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSpeechRef = useRef<number>(Date.now());

  onChangeRef.current = onChange;
  modeRef.current = mode;

  // ── STT Provider (provider-agnostic) ───────────────────────────────────────
  const stt = useSttProvider({
    bridgeUrl,
    mediaStream: streamRef.current,
    onResult: (text, isFinal) => {
      if (!text) return;
      onChangeRef.current(text);
      lastSpeechRef.current = Date.now();
      setIdleNudge(false);
      if (isFinal) {
        setStatusLabel(`${stt.activeProviderName} — listening`);
      } else {
        setStatusLabel(`🎙 ${stt.activeProviderName} — live`);
      }
    },
    onVADSubmit: () => {
      if (formRef.current) {
        formRef.current.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      }
    },
    onAllFailed: (msg) => {
      console.error('[AnswerComposer] All STT providers failed:', msg);
      setAllFailed(true);
      setMode('keyboard');
      modeRef.current = 'keyboard';
      onModeChange?.('keyboard');
      setStatusLabel('All speech engines unavailable — using keyboard');
    },
  });

  // ── canListen: voice mode is alive if not locked, mic not blocked, provider ready ──
  const canListen =
    mode === 'voice' &&
    !disabled &&
    !waitingForInterviewer &&
    !micDenied &&
    !allFailed &&
    (stt.status === 'ready' || stt.status === 'listening' || stt.status === 'idle');

  // ── Sync status label with provider state ──────────────────────────────────
  useEffect(() => {
    if (mode === 'keyboard') return;
    if (allFailed || micDenied) return;
    if (stt.status === 'loading') {
      setStatusLabel(`Loading ${stt.activeProviderName ?? 'speech engine'} (${stt.loadingProgress}%)…`);
    } else if (stt.status === 'error') {
      setStatusLabel(stt.errorMsg || 'Speech engine error');
    } else if (stt.status === 'listening') {
      const fallbackNote = stt.isUsingFallback ? ' (fallback)' : '';
      setStatusLabel(`🎙 ${stt.activeProviderName}${fallbackNote} — listening`);
    } else if (stt.status === 'ready' || stt.status === 'idle') {
      setStatusLabel(`${stt.activeProviderName ?? 'Microphone'} ready`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stt.status, stt.loadingProgress, stt.activeProviderName, stt.isUsingFallback, mode, allFailed, micDenied]);

  // ── Mode switching ─────────────────────────────────────────────────────────
  const switchMode = (next: AnswerInputMode) => {
    modeRef.current = next;
    if (next === 'keyboard') {
      stt.stopRecording();
      setListening(false);
      setMode('keyboard');
      onModeChange?.('keyboard');
      setIdleNudge(false);
      setStatusLabel('Keyboard input');
      return;
    }
    setMode('voice');
    onModeChange?.('voice');
    setStatusLabel('Starting microphone…');
  };

  // ── Start/stop recognition when canListen changes ─────────────────────────
  useEffect(() => {
    if (!canListen) {
      stt.stopRecording();
      setListening(false);
      if (waitingForInterviewer) setStatusLabel('Waiting for interviewer…');
      else if (disabled) setStatusLabel('Session closed');
      else if (mode === 'keyboard') setStatusLabel('Keyboard input');
      return;
    }

    setListening(true);
    stt.startRecording();

    return () => {
      stt.stopRecording();
      setListening(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canListen]);

  // ── Reset committed text when parent clears the input after send ───────────
  useEffect(() => {
    if (!value.trim()) {
      stt.resetText();
      lastSpeechRef.current = Date.now();
      setIdleNudge(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // ── Mic level meter (for orb glow) ────────────────────────────────────────
  // Only run when ONNX is NOT active (ONNX owns the mic itself).
  // When ONNX is active the level meter reflects the shared stream it manages.
  useEffect(() => {
    cancelledRef.current = false;
    let audioCtx: AudioContext | null = null;

    const isOnnxActive = stt.activeProviderId === 'onnx-asr' && mode === 'voice';
    if (mode !== 'voice' || isOnnxActive) {
      onLevelChange?.(0);
      return;
    }

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelledRef.current) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        setMicDenied(false);

        audioCtx = new AudioContext();
        if (audioCtx.state === 'suspended') { try { await audioCtx.resume(); } catch { /* ignore */ } }
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
          onLevelChange?.(Math.min(1, Math.sqrt(sum / data.length) * 4.5));
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        if (!cancelledRef.current) {
          setMicDenied(true);
          setMode('keyboard');
          modeRef.current = 'keyboard';
          onModeChange?.('keyboard');
          setStatusLabel('Microphone blocked — switched to keyboard');
        }
      }
    })();

    return () => {
      cancelledRef.current = true;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      try { audioCtx?.close(); } catch { /* ignore */ }
      onLevelChange?.(0);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, stt.activeProviderId]);

  // ── Idle nudge after 45s of silence during voice mode ─────────────────────
  useEffect(() => {
    if (idleTimerRef.current) clearInterval(idleTimerRef.current);
    if (mode !== 'voice' || disabled || waitingForInterviewer) return;
    idleTimerRef.current = setInterval(() => {
      if (Date.now() - lastSpeechRef.current > 45_000 && modeRef.current === 'voice') {
        setIdleNudge(true);
      }
    }, 5000);
    return () => { if (idleTimerRef.current) clearInterval(idleTimerRef.current); };
  }, [mode, disabled, waitingForInterviewer]);

  // ── Render ─────────────────────────────────────────────────────────────────
  const locked = disabled || waitingForInterviewer;
  const placeholder = locked
    ? waitingForInterviewer
      ? 'Interviewer is speaking… Please listen.'
      : 'Session closed — analysis in progress…'
    : mode === 'voice'
      ? 'Speak your answer… (say "abhyas" to delete a word)'
      : 'Type your answer and press enter…';

  const dotColor =
    mode === 'voice' && listening
      ? T.green
      : micDenied || allFailed
        ? '#f87171'
        : stt.status === 'loading'
          ? '#eab308'
          : T.text3;

  const dotShadow =
    mode === 'voice' && listening
      ? '0 0 10px rgba(34,197,94,0.45)'
      : stt.status === 'loading'
        ? '0 0 8px rgba(234,179,8,0.4)'
        : 'none';

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        if (!value.trim() || locked) return;
        stt.stopRecording();
        onSubmit(e);
      }}
      style={{
        padding: 16,
        borderTop: `1px solid ${T.border}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        backgroundColor: T.page,
        position: 'relative',
      }}
    >
      {/* STT Provider Loading Indicator */}
      {stt.status === 'loading' && mode === 'voice' && !locked && (
        <div style={{ position: 'absolute', top: -30, right: 16, fontSize: 11, color: T.green, display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: T.green, animation: 'pulse 1.5s infinite' }} />
          {stt.activeProviderName
            ? `Loading ${stt.activeProviderName} (${stt.loadingProgress}%)…`
            : 'Loading speech engine…'}
        </div>
      )}

      {/* Fallback indicator */}
      {stt.isUsingFallback && mode === 'voice' && !locked && stt.status === 'listening' && (
        <div style={{ position: 'absolute', top: -30, left: 16, fontSize: 10, color: '#eab308', fontFamily: 'monospace' }}>
          ↩ Using {stt.activeProviderName} (fallback)
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0% { transform: scale(0.95); opacity: 0.5; }
          50% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.5; }
        }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: dotColor,
              boxShadow: dotShadow,
            }}
          />
          <span style={{ fontSize: 11, fontFamily: 'monospace', color: stt.status === 'loading' ? '#eab308' : T.text2 }}>
            {statusLabel}
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
              disabled={disabled || micDenied || allFailed}
              style={{
                fontSize: 10,
                fontFamily: 'monospace',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: micDenied || allFailed ? T.text3 : T.green,
                background: 'transparent',
                border: `1px solid ${micDenied || allFailed ? T.border : 'rgba(34,197,94,0.35)'}`,
                borderRadius: 6,
                padding: '4px 8px',
                cursor: disabled || micDenied || allFailed ? 'not-allowed' : 'pointer',
              }}
            >
              Use microphone
            </button>
          )}
        </div>
      </div>

      {(micDenied || allFailed) && mode === 'keyboard' && (
        <p style={{ fontSize: 11, color: '#eab308', margin: 0, lineHeight: 1.4 }}>
          {micDenied
            ? 'Microphone access blocked. Continue by typing your answers.'
            : getSttUnavailableMessage()}
        </p>
      )}

      {idleNudge && mode === 'voice' && !locked && (
        <p style={{ fontSize: 11, color: '#eab308', margin: 0, lineHeight: 1.4, animation: 'pulse 1.5s infinite' }}>
          Still there? Start speaking or press Enter to send.
        </p>
      )}

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
        <textarea
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (mode === 'voice') {
              // Keep provider's committed text in sync with manual edits
              stt.resetText();
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
              stt.stopRecording();
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
