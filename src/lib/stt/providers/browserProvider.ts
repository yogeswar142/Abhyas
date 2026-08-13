'use client';

/**
 * Browser STT Client Provider
 *
 * Wraps the existing Web Speech API logic from src/lib/speech.ts.
 * This is the permanent fallback provider — always available in Chrome/Edge.
 *
 * All the browser-specific SpeechRecognition quirks (backoff, network errors,
 * Firefox detection, voice command processing) stay inside this class.
 * AnswerComposer sees none of it.
 */

import type { SttProvider, SttStatus, SttInitOptions } from '../types';
import {
  getSpeechRecognitionCtor,
  joinUtterances,
  readSpeechTranscript,
  applyAbhyasVoiceCommands,
  sttRestartDelay,
  type SpeechRecognitionLike,
} from '../../speech';

export class BrowserSttProvider implements SttProvider {
  readonly id = 'browser' as const;
  readonly displayName = 'Browser STT';

  private _status: SttStatus = 'idle';
  private _loadingProgress = 0;
  private _errorMsg = '';

  private opts: SttInitOptions | null = null;
  private recognition: SpeechRecognitionLike | null = null;
  private restartTimer: ReturnType<typeof setTimeout> | null = null;
  private committedText = '';
  private baselineText = '';
  private networkFails = 0;
  private cancelled = false;
  private dead = false;

  get status(): SttStatus { return this._status; }
  get loadingProgress(): number { return this._loadingProgress; }
  get errorMsg(): string { return this._errorMsg; }

  async initialize(opts: SttInitOptions): Promise<void> {
    this.opts = opts;
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      this._status = 'error';
      this._errorMsg = 'Browser STT unavailable in this browser';
      opts.onError(this._errorMsg);
      return;
    }
    this._status = 'ready';
  }

  startRecording(): void {
    if (this.dead || this.cancelled) return;
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor || !this.opts) return;

    this._stopRecognition();
    this.baselineText = this.committedText;

    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US';

    rec.onstart = () => {
      if (this.cancelled || this.dead) return;
      this._status = 'listening';
    };

    rec.onresult = (event) => {
      if (this.dead || !this.opts) return;
      this.networkFails = 0;
      const { finalText, interimText } = readSpeechTranscript(event);
      const mergedRaw = joinUtterances(this.baselineText, finalText);
      const { text: merged } = applyAbhyasVoiceCommands(mergedRaw);
      this.committedText = merged;
      const display = joinUtterances(merged, interimText);
      this.opts.onResult(display, false);
      if (finalText) this.opts.onResult(merged, true);
    };

    rec.onerror = (event?: { error?: string }) => {
      if (this.cancelled || !this.opts) return;
      const code = event?.error || 'error';
      if (code === 'not-allowed') {
        this.dead = true;
        this._status = 'error';
        this._errorMsg = 'Microphone permission blocked';
        this.opts.onError(this._errorMsg);
        return;
      }
      if (code === 'no-speech' || code === 'aborted') return;
      if (code === 'network') {
        this.networkFails += 1;
        this._status = 'idle';
        this.dead = true;
        // Signal caller to switch to ONNX/local provider
        this.opts.onError('network');
      }
    };

    rec.onend = () => {
      this._status = 'idle';
      this.baselineText = this.committedText;
      if (this.cancelled || this.dead) return;
      const delay = sttRestartDelay(this.networkFails);
      this.restartTimer = setTimeout(() => {
        if (!this.cancelled && !this.dead) this.startRecording();
      }, delay);
    };

    this.recognition = rec;
    try {
      rec.start();
    } catch {
      this._status = 'error';
      this._errorMsg = 'Could not start microphone';
    }
  }

  stopRecording(): void {
    this._stopRecognition();
    if (this.committedText && this.opts) {
      this.opts.onResult(this.committedText, true);
    }
    this._status = 'ready';
  }

  destroy(): void {
    this.cancelled = true;
    this._stopRecognition();
    this.opts = null;
  }

  /** Reset committed text (called when parent clears after answer send). */
  resetText(): void {
    this.committedText = '';
    this.baselineText = '';
  }

  private _stopRecognition(): void {
    if (this.restartTimer) { clearTimeout(this.restartTimer); this.restartTimer = null; }
    try { this.recognition?.stop(); } catch { /* ignore */ }
    this.recognition = null;
  }
}
