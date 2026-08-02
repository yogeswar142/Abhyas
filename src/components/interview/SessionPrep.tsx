'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  checkBridgeHealth,
  loadBridgeConfig,
  normalizeBridgeUrl,
  saveBridgeConfig,
  type BridgeHealth,
} from '@/lib/bridge';

const T = {
  page: 'var(--v-page)',
  card: 'var(--v-card)',
  raised: 'var(--v-raised)',
  float: 'var(--v-float)',
  border: 'var(--v-border)',
  green: 'var(--v-accent)',
  text0: 'var(--v-tx0)',
  text1: 'var(--v-tx1)',
  text2: 'var(--v-tx2)',
  text3: 'var(--v-tx3)',
} as const;

type PrepStep = 'connect' | 'mic';

export interface SessionPrepResult {
  bridgeUrl: string;
  model: string;
}

interface SessionPrepProps {
  onReady: (result: SessionPrepResult) => void;
}

export function SessionPrep({ onReady }: SessionPrepProps) {
  const saved = loadBridgeConfig();
  const [step, setStep] = useState<PrepStep>('connect');
  const [bridgeUrl, setBridgeUrl] = useState(saved?.bridgeUrl || 'http://localhost:11435');
  const [model, setModel] = useState(saved?.model || '');
  const [health, setHealth] = useState<BridgeHealth | null>(null);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');

  const handleTest = async () => {
    setTesting(true);
    setError('');
    setHealth(null);
    try {
      const url = normalizeBridgeUrl(bridgeUrl);
      if (!url) {
        setError('Enter a bridge URL from abhyas-bridge run');
        return;
      }
      const h = await checkBridgeHealth(url);
      setHealth(h);
      if (h.status !== 'healthy') {
        setError(h.error || 'Bridge unhealthy — is Ollama running?');
        return;
      }
      const names = h.models.map((m) => m.name);
      const nextModel =
        (model && names.includes(model) && model) ||
        h.model ||
        names[0] ||
        '';
      setModel(nextModel);
      setBridgeUrl(url);
    } catch {
      setError('Cannot reach bridge. Check the URL and that abhyas-bridge is running.');
    } finally {
      setTesting(false);
    }
  };

  const handleContinueToMic = () => {
    if (!health || health.status !== 'healthy' || !model) {
      setError('Connect successfully and select a model first.');
      return;
    }
    saveBridgeConfig({ bridgeUrl: normalizeBridgeUrl(bridgeUrl), model });
    setStep('mic');
  };

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: T.green, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          Pre-session
        </span>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: T.text0, margin: 0 }}>
          {step === 'connect' ? 'Connect local AI' : 'Verify microphone'}
        </h2>
        <p style={{ fontSize: 13, color: T.text2, margin: 0, lineHeight: 1.5 }}>
          {step === 'connect'
            ? 'Run abhyas-bridge on your machine, then paste the URL it prints.'
            : 'Speak a sentence so we can confirm levels and what we heard.'}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {(['connect', 'mic'] as PrepStep[]).map((s, i) => (
          <div
            key={s}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 10,
              border: `1px solid ${step === s ? 'rgba(34,197,94,0.35)' : T.border}`,
              backgroundColor: step === s ? 'rgba(34,197,94,0.08)' : T.card,
              fontSize: 11,
              fontFamily: 'monospace',
              fontWeight: 700,
              color: step === s ? T.green : T.text3,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            {i + 1}. {s}
          </div>
        ))}
      </div>

      {step === 'connect' ? (
        <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: T.text2, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Bridge URL
            </span>
            <input
              value={bridgeUrl}
              onChange={(e) => setBridgeUrl(e.target.value)}
              placeholder="http://localhost:11435"
              style={{
                backgroundColor: T.raised, border: `1px solid ${T.border}`, borderRadius: 10,
                padding: '10px 14px', fontSize: 13, color: T.text0, outline: 'none',
                fontFamily: 'inherit', width: '100%', boxSizing: 'border-box',
              }}
            />
          </label>

          {health?.status === 'healthy' && health.models.length > 0 && (
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: T.text2, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Model
              </span>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                style={{
                  backgroundColor: T.raised, border: `1px solid ${T.border}`, borderRadius: 10,
                  padding: '10px 14px', fontSize: 13, color: T.text0, outline: 'none',
                  fontFamily: 'inherit', width: '100%', cursor: 'pointer',
                }}
              >
                {health.models.map((m) => (
                  <option key={m.name} value={m.name}>{m.name}</option>
                ))}
              </select>
            </label>
          )}

          {health?.status === 'healthy' && (
            <p style={{ fontSize: 12, color: T.green, margin: 0 }}>
              Connected · Ollama ok · {health.models.length} model{health.models.length === 1 ? '' : 's'}
            </p>
          )}
          {error && <p style={{ fontSize: 12, color: '#f87171', margin: 0 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              style={{
                backgroundColor: 'transparent', color: T.text1, fontWeight: 600, fontSize: 13,
                padding: '10px 18px', borderRadius: 10, border: `1px solid ${T.border}`,
                cursor: testing ? 'wait' : 'pointer',
              }}
            >
              {testing ? 'Testing…' : 'Test connection'}
            </button>
            <button
              type="button"
              onClick={handleContinueToMic}
              disabled={!health || health.status !== 'healthy' || !model}
              style={{
                backgroundColor: T.green, color: '#000', fontWeight: 700, fontSize: 13,
                padding: '10px 18px', borderRadius: 10, border: 'none',
                cursor: !health || health.status !== 'healthy' || !model ? 'not-allowed' : 'pointer',
                opacity: !health || health.status !== 'healthy' || !model ? 0.5 : 1,
              }}
            >
              Continue to mic
            </button>
          </div>
        </div>
      ) : (
        <MicVerify
          onBack={() => setStep('connect')}
          onConfirm={() => {
            const url = normalizeBridgeUrl(bridgeUrl);
            saveBridgeConfig({ bridgeUrl: url, model });
            onReady({ bridgeUrl: url, model });
          }}
        />
      )}
    </div>
  );
}

function getSpeechCtor(): (new () => SpeechRecognitionLike) | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition;
}

function MicVerify({ onBack, onConfirm }: { onBack: () => void; onConfirm: () => void }) {
  const [level, setLevel] = useState(0);
  const [permission, setPermission] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [heard, setHeard] = useState('');
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speechStatus, setSpeechStatus] = useState('Starting speech preview…');
  const [sttDead, setSttDead] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const cancelledRef = useRef(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const networkFailsRef = useRef(0);
  const sttDeadRef = useRef(false);
  const gotResultRef = useRef(false);

  const startRecognition = (SpeechRecognition: new () => SpeechRecognitionLike) => {
    if (cancelledRef.current || sttDeadRef.current) return;

    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US';

    rec.onstart = () => {
      if (cancelledRef.current || sttDeadRef.current) return;
      setListening(true);
      setSpeechStatus('Listening — speak now');
    };

    rec.onresult = (event: SpeechRecognitionEventLike) => {
      if (sttDeadRef.current) return;
      networkFailsRef.current = 0;
      gotResultRef.current = true;
      let finalText = '';
      let interimText = '';
      for (let i = 0; i < event.results.length; i++) {
        const piece = event.results[i][0]?.transcript ?? '';
        if (event.results[i].isFinal) finalText += piece;
        else interimText += piece;
      }
      const combined = `${finalText}${interimText}`.replace(/\s+/g, ' ').trim();
      if (combined) {
        setHeard(combined);
        setSpeechStatus('Live transcript updating');
      }
    };

    rec.onerror = (event?: { error?: string }) => {
      if (cancelledRef.current) return;
      const code = event?.error || 'error';

      if (code === 'not-allowed') {
        sttDeadRef.current = true;
        setSttDead(true);
        setListening(false);
        setSpeechStatus('Speech permission blocked — allow mic for this site');
        return;
      }

      // Soft: browser pauses; onend may restart
      if (code === 'no-speech' || code === 'aborted') return;

      if (code === 'network') {
        networkFailsRef.current += 1;
        setListening(false);
        // Stop the retry ↔ "Listening" flicker after 2 network failures
        if (networkFailsRef.current >= 2) {
          sttDeadRef.current = true;
          setSttDead(true);
          if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
          try { recognitionRef.current?.stop(); } catch { /* ignore */ }
          setSpeechStatus(
            'Browser speech-to-text unavailable (needs Google speech cloud). Mic level still works — local Whisper STT comes later.'
          );
          return;
        }
        setSpeechStatus('Browser STT network error — trying once more…');
        return;
      }

      setListening(false);
      setSpeechStatus(`Speech issue (${code})`);
    };

    rec.onend = () => {
      if (cancelledRef.current) return;
      setListening(false);
      if (sttDeadRef.current) return;

      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      restartTimerRef.current = setTimeout(() => {
        if (cancelledRef.current || sttDeadRef.current) return;
        startRecognition(SpeechRecognition);
      }, gotResultRef.current ? 400 : 700);
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch {
      setListening(false);
      setSpeechStatus('Could not start speech preview — click Retry STT');
    }
  };

  useEffect(() => {
    cancelledRef.current = false;
    sttDeadRef.current = false;
    networkFailsRef.current = 0;
    gotResultRef.current = false;

    const SpeechRecognitionCtor = getSpeechCtor();
    setSpeechSupported(Boolean(SpeechRecognitionCtor));

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelledRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        setPermission('granted');

        const ctx = new AudioContext();
        if (ctx.state === 'suspended') {
          try { await ctx.resume(); } catch { /* ignore */ }
        }
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
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
          setLevel(Math.min(1, rms * 4.5));
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();

        if (SpeechRecognitionCtor) {
          startRecognition(SpeechRecognitionCtor);
        } else {
          setSttDead(true);
          sttDeadRef.current = true;
          setSpeechStatus(
            'This browser has no speech-to-text API. Use mic level to verify — Whisper STT comes later.'
          );
        }
      } catch {
        if (!cancelledRef.current) setPermission('denied');
      }
    })();

    return () => {
      cancelledRef.current = true;
      sttDeadRef.current = true;
      cancelAnimationFrame(rafRef.current);
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      try { recognitionRef.current?.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRetryStt = () => {
    const SpeechRecognitionCtor = getSpeechCtor();
    if (!SpeechRecognitionCtor) return;
    sttDeadRef.current = false;
    networkFailsRef.current = 0;
    gotResultRef.current = false;
    setSttDead(false);
    setHeard('');
    setSpeechStatus('Retrying speech preview…');
    startRecognition(SpeechRecognitionCtor);
  };

  const bars = 12;
  const activeBars = Math.min(bars, Math.round(level * bars));
  const micAlive = level > 0.08;

  return (
    <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {permission === 'pending' && (
        <p style={{ fontSize: 13, color: T.text2, margin: 0 }}>Requesting microphone access…</p>
      )}
      {permission === 'denied' && (
        <p style={{ fontSize: 13, color: '#f87171', margin: 0 }}>
          Microphone blocked. Allow mic access in the browser, then go back and try again.
        </p>
      )}
      {permission === 'granted' && (
        <>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 40 }}>
            {Array.from({ length: bars }).map((_, i) => (
              <span
                key={i}
                style={{
                  flex: 1,
                  height: `${Math.max(8, ((i % 5) + 1) * 7)}px`,
                  borderRadius: 2,
                  backgroundColor: i < activeBars ? T.green : 'rgba(255,255,255,0.08)',
                  transition: 'background 0.08s ease',
                }}
              />
            ))}
          </div>
          <p style={{ fontSize: 11, fontFamily: 'monospace', color: T.text3, margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Input level {Math.round(level * 100)}%
            {micAlive ? ' · mic signal ok' : ' · speak louder'}
            {!sttDead && speechSupported && listening ? ' · stt listening' : ''}
          </p>
          <div style={{
            backgroundColor: T.float,
            border: `1px solid ${sttDead ? 'rgba(248,113,113,0.35)' : T.border}`,
            borderRadius: 12,
            padding: 14,
            minHeight: 88,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8 }}>
              <p style={{ fontSize: 10, fontFamily: 'monospace', color: T.text3, margin: 0, textTransform: 'uppercase' }}>
                What we heard
              </p>
              {speechSupported && (
                <button
                  type="button"
                  onClick={handleRetryStt}
                  style={{
                    fontSize: 10, fontFamily: 'monospace', fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.06em', color: T.green, background: 'transparent',
                    border: '1px solid rgba(34,197,94,0.35)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer',
                  }}
                >
                  Retry STT
                </button>
              )}
            </div>
            <p style={{ fontSize: 14, color: heard ? T.text0 : T.text3, margin: 0, lineHeight: 1.5, minHeight: 42 }}>
              {heard
                || (sttDead
                  ? 'No transcript — browser STT failed. Watch the level bars while you speak to confirm the mic.'
                  : 'Say something clearly… transcript appears here live.')}
            </p>
            <p style={{
              fontSize: 11,
              color: sttDead ? '#f87171' : T.text3,
              margin: '10px 0 0',
              lineHeight: 1.45,
            }}>
              {speechStatus}
            </p>
          </div>
        </>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            backgroundColor: 'transparent', color: T.text1, fontWeight: 600, fontSize: 13,
            padding: '10px 18px', borderRadius: 10, border: `1px solid ${T.border}`, cursor: 'pointer',
          }}
        >
          Back
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={permission !== 'granted'}
          style={{
            backgroundColor: T.green, color: '#000', fontWeight: 700, fontSize: 13,
            padding: '10px 18px', borderRadius: 10, border: 'none',
            cursor: permission !== 'granted' ? 'not-allowed' : 'pointer',
            opacity: permission !== 'granted' ? 0.5 : 1,
          }}
        >
          Mic looks good — start interview
        </button>
      </div>
    </div>
  );
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event?: { error?: string }) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEventLike {
  results: {
    length: number;
    [i: number]: { isFinal: boolean; [j: number]: { transcript: string } };
  };
}
