import { ITTSEngine, SpeakOptions, TTSConfig, TTSEngineMode, TTSVoiceOption } from './types';

export class WebSpeechEngine implements ITTSEngine {
  readonly mode: TTSEngineMode = 'webspeech';

  private activeUtterance: SpeechSynthesisUtterance | null = null;

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  public async getVoices(): Promise<TTSVoiceOption[]> {
    if (!this.isSupported()) return [];

    return new Promise((resolve) => {
      const load = () => {
        const rawVoices = window.speechSynthesis.getVoices();
        const formatted: TTSVoiceOption[] = rawVoices.map((v) => ({
          id: v.name,
          name: `${v.name} (${v.lang})`,
          lang: v.lang,
          engine: 'webspeech',
        }));
        resolve(formatted);
      };

      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        load();
      } else {
        window.speechSynthesis.onvoiceschanged = () => load();
        // Fallback timeout in case event doesn't fire
        setTimeout(() => load(), 250);
      }
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

      if (config.voiceId) {
        const voices = window.speechSynthesis.getVoices();
        const match = voices.find((v) => v.name === config.voiceId);
        if (match) utterance.voice = match;
      }

      utterance.onstart = () => {
        options?.onStart?.();
      };

      utterance.onend = () => {
        this.activeUtterance = null;
        options?.onEnd?.();
        resolve();
      };

      utterance.onerror = (e) => {
        this.activeUtterance = null;
        options?.onError?.(e);
        options?.onEnd?.();
        resolve();
      };

      if (options?.signal) {
        options.signal.addEventListener('abort', () => {
          this.stop();
          resolve();
        });
      }

      this.activeUtterance = utterance;
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        this.activeUtterance = null;
        options?.onError?.(err);
        options?.onEnd?.();
        resolve();
      }
    });
  }

  public stop(): void {
    if (this.isSupported()) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        /* ignore */
      }
    }
    this.activeUtterance = null;
  }
}
