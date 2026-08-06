import { ITTSEngine, SpeakOptions, TTSConfig, TTSEngineMode, TTSVoiceOption } from './types';

/**
 * WebSpeech TTS Engine — Linux / Brave safe version
 *
 * Brave/Chromium bug fixes:
 *  1. Silent stall bug — keep-alive pause()+resume() every 5s while speaking
 *  2. Voices not loaded on first call — await voice load before speaking
 *  3. Stuck paused state — cancel()+re-queue on next tick
 *
 * Linux note: requires speech-dispatcher to be installed and running,
 * or Chrome/Brave to have built-in TTS support. On Linux the voices
 * may take several hundred ms to load via speech-dispatcher.
 */
export class WebSpeechEngine implements ITTSEngine {
  readonly mode: TTSEngineMode = 'webspeech';

  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private keepAliveTimer: ReturnType<typeof setInterval> | null = null;
  private voicesReady = false;
  private voicesLoadPromise: Promise<void> | null = null;

  constructor() {
    // Kick off voice loading immediately so they're ready when speak() is called
    this.voicesLoadPromise = this.waitForVoices();
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  /** Wait for voices to be available (Brave/Linux lazy-load via speech-dispatcher) */
  private waitForVoices(): Promise<void> {
    if (!this.isSupported()) return Promise.resolve();

    return new Promise<void>((resolve) => {
      if (window.speechSynthesis.getVoices().length > 0) {
        this.voicesReady = true;
        resolve();
        return;
      }

      let resolved = false;
      const done = () => {
        if (resolved) return;
        resolved = true;
        this.voicesReady = true;
        console.debug('[WebSpeechEngine] voices loaded:', window.speechSynthesis.getVoices().length);
        resolve();
      };

      window.speechSynthesis.onvoiceschanged = done;

      // Fallback poll every 100ms up to 3000ms (speech-dispatcher can be slow on Linux)
      let elapsed = 0;
      const poll = setInterval(() => {
        elapsed += 100;
        if (window.speechSynthesis.getVoices().length > 0) {
          clearInterval(poll);
          done();
        } else if (elapsed >= 3000) {
          clearInterval(poll);
          console.warn('[WebSpeechEngine] voices did not load in 3s — will try with no explicit voice');
          done(); // resolve anyway so we don't block indefinitely
        }
      }, 100);
    });
  }

  public async getVoices(): Promise<TTSVoiceOption[]> {
    if (!this.isSupported()) return [];

    // Wait for voices to be ready
    await this.voicesLoadPromise;

    return window.speechSynthesis.getVoices().map((v) => ({
      id: v.name,
      name: `${v.name} (${v.lang})`,
      lang: v.lang,
      engine: 'webspeech' as TTSEngineMode,
    }));
  }

  public speak(text: string, config: TTSConfig, options?: SpeakOptions): Promise<void> {
    return new Promise((resolve) => {
      if (!this.isSupported()) {
        console.warn('[WebSpeechEngine] speechSynthesis not supported in this browser');
        options?.onEnd?.();
        return resolve();
      }

      this.stop();

      const cleaned = text.trim();
      if (!cleaned) {
        options?.onEnd?.();
        return resolve();
      }

      // Wait for voices then speak — critical on Linux where voices load slowly
      (this.voicesLoadPromise || Promise.resolve()).then(() => {
        const voices = window.speechSynthesis.getVoices();

        console.debug(`[WebSpeechEngine] speaking "${cleaned.slice(0, 40)}..." | voices available: ${voices.length} | config engine: ${config.engine}`);

        if (voices.length === 0) {
          console.error(
            '[WebSpeechEngine] No TTS voices found!\n' +
            'On Linux: run "spd-say hello" to test speech-dispatcher.\n' +
            'If silent, run: sudo systemctl restart speech-dispatcher\n' +
            'Or install espeak: sudo apt install espeak-ng'
          );
        }

        const utterance = new SpeechSynthesisUtterance(cleaned);
        utterance.rate = config.rate || 1.0;
        utterance.pitch = config.pitch || 1.0;
        utterance.volume = config.volume ?? 1.0;

        // Set voice: try configured voice ID, then fall back to first en-US, then any
        let selectedVoice: SpeechSynthesisVoice | undefined;
        if (config.voiceId) {
          selectedVoice = voices.find((v) => v.name === config.voiceId);
          if (selectedVoice) {
            console.debug(`[WebSpeechEngine] using configured voice: ${selectedVoice.name}`);
          }
        }
        if (!selectedVoice && voices.length > 0) {
          selectedVoice =
            voices.find((v) => v.lang.startsWith('en') && v.localService) ||
            voices.find((v) => v.lang.startsWith('en')) ||
            voices[0];
          console.debug(`[WebSpeechEngine] using fallback voice: ${selectedVoice?.name ?? 'none'}`);
        }
        if (selectedVoice) {
          utterance.voice = selectedVoice;
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
          console.debug('[WebSpeechEngine] utterance started');
          options?.onStart?.();
          // Bug 1 fix: keep-alive — Brave/Chrome stalls after ~15s
          this.keepAliveTimer = setInterval(() => {
            if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
              window.speechSynthesis.pause();
              window.speechSynthesis.resume();
            }
          }, 5000);
        };

        utterance.onend = () => {
          console.debug('[WebSpeechEngine] utterance ended');
          finish();
        };

        utterance.onerror = (e) => {
          const error = (e as SpeechSynthesisErrorEvent).error;
          if (error !== 'interrupted') {
            console.error('[WebSpeechEngine] utterance error:', error);
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

        // Bug 3 fix: if synth is paused, cancel + re-queue on next tick
        if (window.speechSynthesis.paused) {
          console.debug('[WebSpeechEngine] synth was paused — cancelling and re-queuing');
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
          console.debug('[WebSpeechEngine] calling speechSynthesis.speak()');
          window.speechSynthesis.speak(utterance);
        } catch (err) {
          console.error('[WebSpeechEngine] speak() threw:', err);
          options?.onError?.(err);
          finish();
        }
      });
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
