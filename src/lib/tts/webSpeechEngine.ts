import { ITTSEngine, SpeakOptions, TTSConfig, TTSEngineMode, TTSVoiceOption } from './types';

/**
 * WebSpeech TTS Engine
 *
 * Handles 3 known Brave/Chromium bugs:
 *
 * Bug 1 — Silent stall: Chrome/Brave's speechSynthesis silently stops
 *   firing onend after ~15s or after the tab loses focus.
 *   Fix: a keep-alive timer calls pause()+resume() every 5s while speaking.
 *
 * Bug 2 — Voices not loaded: getVoices() returns [] on first call in Brave.
 *   Fix: retry loop waits up to 2000ms for voices to populate.
 *
 * Bug 3 — Stuck paused state: if a prior utterance was interrupted by Brave
 *   internal policies the synth can be left in a paused state where new
 *   utterances are queued but never spoken.
 *   Fix: cancel() then re-queue after a short tick.
 */
export class WebSpeechEngine implements ITTSEngine {
  readonly mode: TTSEngineMode = 'webspeech';

  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private keepAliveTimer: ReturnType<typeof setInterval> | null = null;

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  /** Load voices with retry — Brave/Chrome lazily populate voices. */
  public async getVoices(): Promise<TTSVoiceOption[]> {
    if (!this.isSupported()) return [];

    const tryLoad = (): TTSVoiceOption[] => {
      return window.speechSynthesis.getVoices().map((v) => ({
        id: v.name,
        name: `${v.name} (${v.lang})`,
        lang: v.lang,
        engine: 'webspeech' as TTSEngineMode,
      }));
    };

    // Fast path — voices already available
    const immediate = tryLoad();
    if (immediate.length > 0) return immediate;

    // Slow path — wait for onvoiceschanged or poll up to 2000ms
    return new Promise((resolve) => {
      let resolved = false;

      const done = () => {
        if (resolved) return;
        resolved = true;
        resolve(tryLoad());
      };

      window.speechSynthesis.onvoiceschanged = done;

      // Poll every 100ms as a fallback (Brave sometimes never fires the event)
      let elapsed = 0;
      const poll = setInterval(() => {
        elapsed += 100;
        if (window.speechSynthesis.getVoices().length > 0 || elapsed >= 2000) {
          clearInterval(poll);
          done();
        }
      }, 100);
    });
  }

  public speak(text: string, config: TTSConfig, options?: SpeakOptions): Promise<void> {
    return new Promise((resolve) => {
      if (!this.isSupported()) {
        options?.onEnd?.();
        return resolve();
      }

      this.stop();

      const cleaned = text.trim();
      if (!cleaned) {
        options?.onEnd?.();
        return resolve();
      }

      const utterance = new SpeechSynthesisUtterance(cleaned);
      utterance.rate = config.rate || 1.0;
      utterance.pitch = config.pitch || 1.0;
      utterance.volume = config.volume ?? 1.0;

      // Set voice — try to use the configured voice, fall back to first en-US
      const voices = window.speechSynthesis.getVoices();
      if (config.voiceId) {
        const match = voices.find((v) => v.name === config.voiceId);
        if (match) utterance.voice = match;
      }
      // If still no voice set, pick the first English voice to avoid silence
      if (!utterance.voice) {
        const fallback =
          voices.find((v) => v.lang.startsWith('en') && v.localService) ||
          voices.find((v) => v.lang.startsWith('en')) ||
          voices[0];
        if (fallback) utterance.voice = fallback;
      }

      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        this.clearKeepAlive();
        this.activeUtterance = null;
        options?.onEnd?.();
        resolve();
      };

      utterance.onstart = () => {
        options?.onStart?.();

        // Bug 1 fix: keep-alive timer — Brave/Chrome stalls after ~15s
        // pause()+resume() every 5s nudges the engine to keep going
        this.keepAliveTimer = setInterval(() => {
          if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
            window.speechSynthesis.pause();
            window.speechSynthesis.resume();
          }
        }, 5000);
      };

      utterance.onend = finish;

      utterance.onerror = (e) => {
        // 'interrupted' is normal when stop() is called — not a real error
        if ((e as SpeechSynthesisErrorEvent).error !== 'interrupted') {
          options?.onError?.(e);
        }
        finish();
      };

      if (options?.signal) {
        options.signal.addEventListener('abort', () => {
          this.stop();
          resolve();
        });
      }

      this.activeUtterance = utterance;

      // Bug 3 fix: if synth is paused (stuck state), cancel everything first,
      // then re-queue on next tick so the engine gets a clean slate
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.cancel();
        setTimeout(() => {
          if (!finished) {
            try {
              window.speechSynthesis.speak(utterance);
            } catch (err) {
              options?.onError?.(err);
              finish();
            }
          }
        }, 50);
        return;
      }

      try {
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        options?.onError?.(err);
        finish();
      }
    });
  }

  public stop(): void {
    this.clearKeepAlive();
    if (this.isSupported()) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        /* ignore */
      }
    }
    this.activeUtterance = null;
  }

  private clearKeepAlive(): void {
    if (this.keepAliveTimer !== null) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
  }
}
