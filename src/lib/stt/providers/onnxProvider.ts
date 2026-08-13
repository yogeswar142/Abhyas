'use client';

/**
 * ONNX ASR Client Provider
 *
 * Wraps the existing useWhisper / whisper-worker.js infrastructure
 * behind the SttProvider interface.
 *
 * This class is a thin adapter: it delegates all actual transcription
 * to the existing Whisper worker (public/whisper-worker.js), reusing
 * the same audio pipeline (AudioContext, ScriptProcessor, VAD logic)
 * from useWhisper.ts, extracted here as non-hook imperative code so it
 * can be used by the provider registry pattern.
 */

import type { SttProvider, SttStatus, SttInitOptions } from '../types';

const TARGET_RATE = 16_000;
const VOICE_RMS = 0.008;
const SILENCE_FINALIZE_MS = 1100;
const SILENCE_SUBMIT_MS = 3200;
const INTERIM_EVERY_MS = 1200;
const MIN_UTTERANCE_SAMPLES = TARGET_RATE * 0.45;
const MAX_UTTERANCE_SAMPLES = TARGET_RATE * 28;
const LOAD_TIMEOUT_MS = 60_000;
const PROCESS_TIMEOUT_MS = 12_000;

const HALLUCINATIONS = [
  /^thank you for watching\.?$/i,
  /^thanks for watching\.?$/i,
  /^thank you\.?$/i,
  /^thanks\.?$/i,
  /^you\.?$/i,
  /^bye\.?$/i,
  /^goodbye\.?$/i,
  /^subscribe\.?$/i,
  /^please subscribe\.?$/i,
  /^\[?\s*blank(?:\s+audio)?\s*\]?\.?$/i,
  /^\.+$/,
];

function cleanTranscript(raw: string): string {
  const text = (raw ?? '').replace(/\s+/g, ' ').trim().replace(/^["'`]+|["'`]+$/g, '').trim();
  if (HALLUCINATIONS.some((re) => re.test(text))) return '';
  return text;
}

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

function rmsOf(buf: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
  return Math.sqrt(sum / Math.max(1, buf.length));
}

function joinParts(...parts: string[]): string {
  return parts.map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean).join(' ');
}

export class OnnxAsrProvider implements SttProvider {
  readonly id = 'onnx-asr' as const;
  readonly displayName = 'Local AI (ONNX ASR)';

  private _status: SttStatus = 'loading';
  private _loadingProgress = 0;
  private _errorMsg = '';

  private opts: SttInitOptions | null = null;
  private worker: Worker | null = null;
  private audioCtx: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private gainNode: GainNode | null = null;
  private micStream: MediaStream | null = null;
  private ownsStream = false;

  // Transcription state
  private utterance = new Float32Array(0);
  private committed = '';
  private interim = '';
  private isRecording = false;
  private speechStarted = false;
  private lastVoiceTime = 0;
  private lastProcessTime = 0;
  private processing = false;
  private pendingFinalize = false;
  private sentSamples = 0;
  private sampleRate = TARGET_RATE;

  private loadTimer: ReturnType<typeof setTimeout> | null = null;
  private processTimer: ReturnType<typeof setTimeout> | null = null;

  get status(): SttStatus { return this._status; }
  get loadingProgress(): number { return this._loadingProgress; }
  get errorMsg(): string { return this._errorMsg; }

  async initialize(opts: SttInitOptions): Promise<void> {
    this.opts = opts;
    if (typeof window === 'undefined') {
      this._status = 'error';
      this._errorMsg = 'ONNX ASR requires a browser environment';
      opts.onError(this._errorMsg);
      return;
    }

    try {
      const worker = new Worker('/whisper-worker.js', { type: 'module' });
      this.worker = worker;

      worker.onmessage = (e) => {
        const { type, data, error, text } = e.data;
        if (type === 'progress') {
          if (data?.status === 'progress') {
            this._loadingProgress = Math.round(data.progress ?? 0);
          } else if (data?.status === 'ready') {
            this._loadingProgress = 100;
          }
        } else if (type === 'ready') {
          if (this.loadTimer) { clearTimeout(this.loadTimer); this.loadTimer = null; }
          this._status = 'ready';
        } else if (type === 'error') {
          if (this.loadTimer) { clearTimeout(this.loadTimer); this.loadTimer = null; }
          const msg = error ?? 'ONNX ASR failed to load';
          this._status = 'error';
          this._errorMsg = msg;
          this.opts?.onError(msg);
        } else if (type === 'result') {
          if (this.processTimer) { clearTimeout(this.processTimer); this.processTimer = null; }
          this.processing = false;
          const trimmed = cleanTranscript(text ?? '');
          const shouldFinalize = this.pendingFinalize;
          this.pendingFinalize = false;
          const sent = this.sentSamples;

          if (trimmed) {
            if (shouldFinalize) {
              this.committed = joinParts(this.committed, trimmed);
              this.interim = '';
              if (this.utterance.length > sent) {
                this.utterance = this.utterance.slice(sent);
                this.speechStarted = true;
              } else {
                this.utterance = new Float32Array(0);
                this.speechStarted = false;
              }
              if (this.isRecording) this._emit(false);
            } else if (this.isRecording) {
              this.interim = trimmed;
              this._emit(false);
            }
          } else if (shouldFinalize) {
            if (this.utterance.length > sent) {
              this.utterance = this.utterance.slice(sent);
              this.speechStarted = true;
            } else {
              this.utterance = new Float32Array(0);
              this.speechStarted = false;
            }
            this.interim = '';
          }
        }
      };

      worker.onerror = (e) => {
        this.processing = false;
        const msg = e.message ?? 'ONNX ASR worker crashed';
        this._status = 'error';
        this._errorMsg = msg;
        this.opts?.onError(msg);
      };

      worker.postMessage({ type: 'load' });

      this.loadTimer = setTimeout(() => {
        if (this.worker === worker && this._status !== 'ready') {
          const msg = 'ONNX ASR timed out loading — switching to keyboard input';
          this._status = 'error';
          this._errorMsg = msg;
          this.opts?.onError(msg);
        }
      }, LOAD_TIMEOUT_MS);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not start ONNX ASR worker';
      this._status = 'error';
      this._errorMsg = msg;
      opts.onError(msg);
    }
  }

  async startRecording(): Promise<void> {
    if (this._status !== 'ready' && this._status !== 'idle') return;
    if (this.isRecording) return;
    if (!this.opts) return;

    try {
      const shared = this.opts.mediaStream;
      if (shared && shared.active) {
        this.micStream = shared;
        this.ownsStream = false;
      } else {
        this.micStream = await navigator.mediaDevices.getUserMedia({
          audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        this.ownsStream = true;
      }

      const audioCtx = new AudioContext();
      if (audioCtx.state === 'suspended') { try { await audioCtx.resume(); } catch { /* ignore */ } }
      this.audioCtx = audioCtx;
      this.sampleRate = audioCtx.sampleRate;

      const source = audioCtx.createMediaStreamSource(this.micStream);
      this.sourceNode = source;

      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      this.processorNode = processor;

      const gain = audioCtx.createGain();
      gain.gain.value = 0;
      this.gainNode = gain;

      // Reset transcription state
      this.utterance = new Float32Array(0);
      this.committed = '';
      this.interim = '';
      this.speechStarted = false;
      this.processing = false;
      this.pendingFinalize = false;
      this.isRecording = true;
      this.lastVoiceTime = Date.now();
      this.lastProcessTime = 0;
      this._status = 'listening';

      processor.onaudioprocess = (e) => {
        if (!this.isRecording) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const resampled = resampleTo16k(inputData, this.sampleRate);
        if (resampled.length === 0) return;

        const rms = rmsOf(resampled);
        const now = Date.now();
        const voiced = rms > VOICE_RMS;

        if (voiced) {
          this.lastVoiceTime = now;
          this.speechStarted = true;
          const prev = this.utterance;
          let next = new Float32Array(prev.length + resampled.length);
          next.set(prev, 0);
          next.set(resampled, prev.length);
          if (next.length > MAX_UTTERANCE_SAMPLES) {
            next = next.slice(next.length - MAX_UTTERANCE_SAMPLES);
          }
          this.utterance = next;
        }

        const silenceMs = now - this.lastVoiceTime;

        if (this.speechStarted && silenceMs > SILENCE_FINALIZE_MS && this.utterance.length >= MIN_UTTERANCE_SAMPLES) {
          this._sendUtterance(true);
          return;
        }

        if (this.opts?.onVADSubmit && silenceMs > SILENCE_SUBMIT_MS && this.committed.length > 0 && !this.speechStarted) {
          const finalText = this.committed;
          this._stopAudio();
          this._status = 'ready';
          this.opts?.onResult(finalText, true);
          this.opts?.onVADSubmit();
          return;
        }

        if (this.speechStarted && now - this.lastProcessTime > INTERIM_EVERY_MS && this.utterance.length >= MIN_UTTERANCE_SAMPLES) {
          this.lastProcessTime = now;
          this._sendUtterance(false);
        }
      };

      source.connect(processor);
      processor.connect(gain);
      gain.connect(audioCtx.destination);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Microphone blocked';
      this._status = 'error';
      this._errorMsg = msg;
      this.opts?.onError(msg);
    }
  }

  stopRecording(): void {
    if (!this.isRecording) return;
    if (this.speechStarted && this.utterance.length >= MIN_UTTERANCE_SAMPLES) {
      this.committed = joinParts(this.committed, this.interim);
    }
    const finalText = joinParts(this.committed, this.interim);
    this._stopAudio();
    if (finalText && this.opts) {
      this.opts.onResult(finalText, true);
    }
    this._status = 'ready';
  }

  destroy(): void {
    this._stopAudio();
    if (this.loadTimer) { clearTimeout(this.loadTimer); this.loadTimer = null; }
    this.worker?.terminate();
    this.worker = null;
    this.opts = null;
  }

  /** Reset committed text (called when parent clears after answer send). */
  resetText(): void {
    this.committed = '';
    this.interim = '';
  }

  private _emit(isFinal: boolean): void {
    const text = joinParts(this.committed, this.interim);
    if (!text && !isFinal) return;
    this.opts?.onResult(text, isFinal);
  }

  private _sendUtterance(finalize: boolean): void {
    if (!this.worker || this.processing) {
      if (finalize) this.pendingFinalize = true;
      return;
    }
    const audio = this.utterance;
    if (audio.length < MIN_UTTERANCE_SAMPLES) {
      if (finalize) {
        this.utterance = new Float32Array(0);
        this.speechStarted = false;
        this.interim = '';
        this.pendingFinalize = false;
      }
      return;
    }
    if (rmsOf(audio) < VOICE_RMS * 0.35) {
      if (finalize) {
        this.utterance = new Float32Array(0);
        this.speechStarted = false;
        this.interim = '';
        this.pendingFinalize = false;
      }
      return;
    }

    this.processing = true;
    this.pendingFinalize = finalize;
    this.sentSamples = audio.length;
    const buffer = audio.slice(0);
    this.worker.postMessage({ type: 'transcribe', audio: buffer }, [buffer.buffer]);

    if (this.processTimer) clearTimeout(this.processTimer);
    this.processTimer = setTimeout(() => {
      this.processing = false;
      this.pendingFinalize = false;
    }, PROCESS_TIMEOUT_MS);
  }

  private _stopAudio(): void {
    this.isRecording = false;
    if (this.processTimer) { clearTimeout(this.processTimer); this.processTimer = null; }
    try { this.sourceNode?.disconnect(); } catch { /* ignore */ }
    try { this.processorNode?.disconnect(); } catch { /* ignore */ }
    try { this.gainNode?.disconnect(); } catch { /* ignore */ }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => {});
    }
    if (this.ownsStream) {
      this.micStream?.getTracks().forEach((t) => t.stop());
    }
    this.processorNode = null;
    this.sourceNode = null;
    this.gainNode = null;
    this.audioCtx = null;
    this.micStream = null;
    this.ownsStream = false;
  }
}
