'use client';
import { useEffect, useRef, useState, useCallback } from 'react';

export type WhisperStatus =
  | 'loading'
  | 'ready'
  | 'error'
  | 'listening'
  | 'processing'
  | 'idle';

export interface UseWhisperOptions {
  onResult?: (text: string, isFinal: boolean) => void;
  /** If set, long silence after speech auto-stops and calls this (interview submit). */
  onVADSubmit?: () => void;
  onError?: (msg: string) => void;
  /** Reuse an existing mic stream (e.g. level meter) instead of opening a second one. */
  mediaStream?: MediaStream | null;
}

const TARGET_RATE = 16_000;
const VOICE_RMS = 0.008;
const SILENCE_FINALIZE_MS = 1100;
const SILENCE_SUBMIT_MS = 3200;
const INTERIM_EVERY_MS = 1200;
const MIN_UTTERANCE_SAMPLES = TARGET_RATE * 0.45; // ~450ms
const MAX_UTTERANCE_SAMPLES = TARGET_RATE * 28; // keep under Whisper chunk size

/** Linear resample → 16 kHz mono (browsers often ignore getUserMedia sampleRate). */
function resampleTo16k(input: Float32Array, inputRate: number): Float32Array {
  if (inputRate === TARGET_RATE) return input;
  if (inputRate <= 0 || input.length === 0) return new Float32Array(0);

  const ratio = inputRate / TARGET_RATE;
  const outLen = Math.max(1, Math.floor(input.length / ratio));
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const src = i * ratio;
    const i0 = Math.floor(src);
    const i1 = Math.min(i0 + 1, input.length - 1);
    const t = src - i0;
    out[i] = input[i0] * (1 - t) + input[i1] * t;
  }
  return out;
}

function joinParts(...parts: string[]): string {
  return parts
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(' ');
}

function rmsOf(buf: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
  return Math.sqrt(sum / Math.max(1, buf.length));
}

export function useWhisper({ onResult, onVADSubmit, onError, mediaStream }: UseWhisperOptions) {
  const [status, setStatus] = useState<WhisperStatus>('loading');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const workerRef = useRef<Worker | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const ownsStreamRef = useRef(false);
  const mediaStreamRef = useRef<MediaStream | null | undefined>(mediaStream);
  mediaStreamRef.current = mediaStream;
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Current utterance (16 kHz) + finalized session text
  const utteranceRef = useRef<Float32Array>(new Float32Array(0));
  const committedRef = useRef('');
  const interimRef = useRef('');
  const isRecordingRef = useRef(false);
  const speechStartedRef = useRef(false);
  const lastProcessTimeRef = useRef(0);
  const lastVoiceTimeRef = useRef(0);
  const processingRef = useRef(false);
  const pendingFinalizeRef = useRef(false);
  const sentSamplesRef = useRef(0);
  const sampleRateRef = useRef(TARGET_RATE);

  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;
  const onVADSubmitRef = useRef(onVADSubmit);
  onVADSubmitRef.current = onVADSubmit;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const emit = useCallback((isFinal: boolean) => {
    const text = joinParts(committedRef.current, interimRef.current);
    if (!text && !isFinal) return;
    onResultRef.current?.(text, isFinal);
  }, []);

  const stopRecordingInternal = useCallback(() => {
    isRecordingRef.current = false;
    if (processTimeoutRef.current) {
      clearTimeout(processTimeoutRef.current);
      processTimeoutRef.current = null;
    }

    try { sourceNodeRef.current?.disconnect(); } catch { /* ignore */ }
    try { processorRef.current?.disconnect(); } catch { /* ignore */ }
    try { gainRef.current?.disconnect(); } catch { /* ignore */ }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {});
    }
    // Only stop tracks we opened ourselves — never kill a shared level-meter stream
    if (ownsStreamRef.current) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    }

    processorRef.current = null;
    sourceNodeRef.current = null;
    gainRef.current = null;
    audioCtxRef.current = null;
    streamRef.current = null;
    ownsStreamRef.current = false;
  }, []);

  const sendUtterance = useCallback((finalize: boolean) => {
    if (!workerRef.current || processingRef.current) {
      if (finalize) pendingFinalizeRef.current = true;
      return;
    }
    const audio = utteranceRef.current;
    if (audio.length < MIN_UTTERANCE_SAMPLES) {
      if (finalize) {
        utteranceRef.current = new Float32Array(0);
        speechStartedRef.current = false;
        interimRef.current = '';
        pendingFinalizeRef.current = false;
      }
      return;
    }

    // Skip near-silent buffers — whisper-tiny hallucinates on silence
    if (rmsOf(audio) < VOICE_RMS * 0.35) {
      if (finalize) {
        utteranceRef.current = new Float32Array(0);
        speechStartedRef.current = false;
        interimRef.current = '';
        pendingFinalizeRef.current = false;
      }
      return;
    }

    processingRef.current = true;
    pendingFinalizeRef.current = finalize;
    sentSamplesRef.current = audio.length;
    const buffer = audio.slice(0);
    workerRef.current.postMessage({ type: 'transcribe', audio: buffer }, [buffer.buffer]);

    // Safety: never leave processing stuck if worker drops a reply
    if (processTimeoutRef.current) clearTimeout(processTimeoutRef.current);
    processTimeoutRef.current = setTimeout(() => {
      processingRef.current = false;
      pendingFinalizeRef.current = false;
    }, 12_000);
  }, []);

  // Initialize Worker
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (workerRef.current) return;

    try {
      const worker = new Worker('/whisper-worker.js', { type: 'module' });
      workerRef.current = worker;

      worker.onmessage = (e) => {
        const { type, data, error, text } = e.data;
        if (type === 'progress') {
          if (data?.status === 'progress') {
            setLoadingProgress(Math.round(data.progress ?? 0));
          } else if (data?.status === 'ready') {
            setLoadingProgress(100);
          }
        } else if (type === 'ready') {
          if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
          setStatus('ready');
        } else if (type === 'error') {
          if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
          const msg = error ?? 'Whisper failed to load';
          setStatus('error');
          setErrorMsg(msg);
          onErrorRef.current?.(msg);
        } else if (type === 'result') {
          if (processTimeoutRef.current) {
            clearTimeout(processTimeoutRef.current);
            processTimeoutRef.current = null;
          }
          processingRef.current = false;
          const trimmed = (text ?? '').trim();
          const shouldFinalize = pendingFinalizeRef.current;
          pendingFinalizeRef.current = false;
          const sent = sentSamplesRef.current;

          if (trimmed) {
            if (shouldFinalize) {
              committedRef.current = joinParts(committedRef.current, trimmed);
              interimRef.current = '';
              // Keep any audio that arrived after the snapshot we sent
              if (utteranceRef.current.length > sent) {
                utteranceRef.current = utteranceRef.current.slice(sent);
                speechStartedRef.current = true;
              } else {
                utteranceRef.current = new Float32Array(0);
                speechStartedRef.current = false;
              }
              if (isRecordingRef.current) emit(false);
            } else if (isRecordingRef.current) {
              interimRef.current = trimmed;
              emit(false);
            }
          } else if (shouldFinalize) {
            if (utteranceRef.current.length > sent) {
              utteranceRef.current = utteranceRef.current.slice(sent);
              speechStartedRef.current = true;
            } else {
              utteranceRef.current = new Float32Array(0);
              speechStartedRef.current = false;
            }
            interimRef.current = '';
          }
        }
      };

      worker.onerror = (e) => {
        processingRef.current = false;
        const msg = e.message ?? 'Worker crashed';
        setStatus('error');
        setErrorMsg(msg);
        onErrorRef.current?.(msg);
      };

      worker.postMessage({ type: 'load' });

      loadTimeoutRef.current = setTimeout(() => {
        if (workerRef.current === worker) {
          const msg = 'Whisper timed out — switching to keyboard input';
          setStatus('error');
          setErrorMsg(msg);
          onErrorRef.current?.(msg);
        }
      }, 60_000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not start Whisper worker';
      setStatus('error');
      setErrorMsg(msg);
      onError?.(msg);
    }

    return () => {
      stopRecordingInternal();
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
      workerRef.current?.terminate();
      workerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRecording = useCallback(async () => {
    if (status !== 'ready' && status !== 'idle') return;
    if (isRecordingRef.current) return;

    try {
      const shared = mediaStreamRef.current;
      let stream: MediaStream;
      if (shared && shared.active) {
        stream = shared;
        ownsStreamRef.current = false;
      } else {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        ownsStreamRef.current = true;
      }
      streamRef.current = stream;

      // Do NOT force sampleRate — browsers lie/ignore it. Read the real rate and resample.
      const audioCtx = new AudioContext();
      if (audioCtx.state === 'suspended') {
        try { await audioCtx.resume(); } catch { /* ignore */ }
      }
      audioCtxRef.current = audioCtx;
      sampleRateRef.current = audioCtx.sampleRate;

      const source = audioCtx.createMediaStreamSource(stream);
      sourceNodeRef.current = source;

      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      // Mute output so mic isn't played back (echo wrecks STT)
      const gain = audioCtx.createGain();
      gain.gain.value = 0;
      gainRef.current = gain;

      utteranceRef.current = new Float32Array(0);
      committedRef.current = '';
      interimRef.current = '';
      speechStartedRef.current = false;
      processingRef.current = false;
      pendingFinalizeRef.current = false;
      isRecordingRef.current = true;
      lastVoiceTimeRef.current = Date.now();
      lastProcessTimeRef.current = 0;
      setStatus('listening');

      processor.onaudioprocess = (e) => {
        if (!isRecordingRef.current) return;

        const inputData = e.inputBuffer.getChannelData(0);
        const resampled = resampleTo16k(inputData, sampleRateRef.current);
        if (resampled.length === 0) return;

        const rms = rmsOf(resampled);
        const now = Date.now();
        const voiced = rms > VOICE_RMS;

        if (voiced) {
          lastVoiceTimeRef.current = now;
          speechStartedRef.current = true;

          const prev = utteranceRef.current;
          let next = new Float32Array(prev.length + resampled.length);
          next.set(prev, 0);
          next.set(resampled, prev.length);

          // Cap utterance length so tiny Whisper stays fast/accurate
          if (next.length > MAX_UTTERANCE_SAMPLES) {
            next = next.slice(next.length - MAX_UTTERANCE_SAMPLES);
          }
          utteranceRef.current = next;
        }

        const silenceMs = now - lastVoiceTimeRef.current;

        // End of phrase → finalize this utterance into committed text
        if (
          speechStartedRef.current &&
          silenceMs > SILENCE_FINALIZE_MS &&
          utteranceRef.current.length >= MIN_UTTERANCE_SAMPLES
        ) {
          sendUtterance(true);
          return;
        }

        // Long silence after we have text → auto-submit (interview only)
        if (
          onVADSubmitRef.current &&
          silenceMs > SILENCE_SUBMIT_MS &&
          committedRef.current.length > 0 &&
          !speechStartedRef.current
        ) {
          const finalText = committedRef.current;
          stopRecordingInternal();
          setStatus('ready');
          onResultRef.current?.(finalText, true);
          onVADSubmitRef.current?.();
          return;
        }

        // Live interim while speaking
        if (
          speechStartedRef.current &&
          now - lastProcessTimeRef.current > INTERIM_EVERY_MS &&
          utteranceRef.current.length >= MIN_UTTERANCE_SAMPLES
        ) {
          lastProcessTimeRef.current = now;
          sendUtterance(false);
        }
      };

      source.connect(processor);
      processor.connect(gain);
      gain.connect(audioCtx.destination);
    } catch (err: unknown) {
      console.error('Whisper capture error', err);
      const msg = err instanceof Error ? err.message : 'Microphone blocked';
      setStatus('error');
      setErrorMsg(msg);
      onErrorRef.current?.(msg);
    }
  }, [status, sendUtterance, stopRecordingInternal]);

  const stopRecording = useCallback(() => {
    if (!isRecordingRef.current) return;
    // Flush any in-progress utterance into committed before stopping
    if (speechStartedRef.current && utteranceRef.current.length >= MIN_UTTERANCE_SAMPLES) {
      // Best-effort: keep interim if we can't wait for worker
      committedRef.current = joinParts(committedRef.current, interimRef.current);
    }
    const finalText = joinParts(committedRef.current, interimRef.current);
    stopRecordingInternal();
    if (finalText) {
      onResultRef.current?.(finalText, true);
    }
    setStatus('ready');
  }, [stopRecordingInternal]);

  return {
    status,
    loadingProgress,
    errorMsg,
    startRecording,
    stopRecording,
  };
}
