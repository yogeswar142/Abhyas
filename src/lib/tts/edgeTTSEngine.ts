import { ITTSEngine, SpeakOptions, TTSConfig, TTSEngineMode, TTSVoiceOption } from './types';
import { normalizeBridgeUrl } from '../bridge';

export const EDGE_NEURAL_VOICES: TTSVoiceOption[] = [
  { id: 'en-US-AvaNeural', name: 'Ava (US English - Female Neural)', lang: 'en-US', engine: 'edge', gender: 'female' },
  { id: 'en-US-AndrewNeural', name: 'Andrew (US English - Male Neural)', lang: 'en-US', engine: 'edge', gender: 'male' },
  { id: 'en-US-EmmaNeural', name: 'Emma (US English - Female Neural)', lang: 'en-US', engine: 'edge', gender: 'female' },
  { id: 'en-US-BrianNeural', name: 'Brian (US English - Male Neural)', lang: 'en-US', engine: 'edge', gender: 'male' },
  { id: 'en-GB-SoniaNeural', name: 'Sonia (UK English - Female Neural)', lang: 'en-GB', engine: 'edge', gender: 'female' },
  { id: 'en-GB-RyanNeural', name: 'Ryan (UK English - Male Neural)', lang: 'en-GB', engine: 'edge', gender: 'male' },
  { id: 'en-IN-NeerjaNeural', name: 'Neerja (Indian English - Female Neural)', lang: 'en-IN', engine: 'edge', gender: 'female' },
  { id: 'en-IN-PrabhatNeural', name: 'Prabhat (Indian English - Male Neural)', lang: 'en-IN', engine: 'edge', gender: 'male' },
];

export class EdgeTTSEngine implements ITTSEngine {
  readonly mode: TTSEngineMode = 'edge';

  private activeAudio: HTMLAudioElement | null = null;
  private currentAbortController: AbortController | null = null;

  public async getVoices(): Promise<TTSVoiceOption[]> {
    return EDGE_NEURAL_VOICES;
  }

  public speak(text: string, config: TTSConfig, options?: SpeakOptions): Promise<void> {
    return new Promise(async (resolve) => {
      this.stop();

      const cleaned = text.trim();
      if (!cleaned) {
        options?.onEnd?.();
        return resolve();
      }

      this.currentAbortController = new AbortController();
      const signal = options?.signal || this.currentAbortController.signal;

      if (signal.aborted) {
        options?.onEnd?.();
        return resolve();
      }

      signal.addEventListener('abort', () => {
        this.stop();
        resolve();
      });

      try {
        const bridgeUrl = this.getBridgeUrl();
        const voice = config.voiceId || 'en-US-AvaNeural';
        const rate = `${Math.round((config.rate - 1.0) * 100)}%`;

        const res = await fetch(`${bridgeUrl}/tts/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal,
          body: JSON.stringify({
            text: cleaned,
            voice,
            rate: rate.startsWith('-') || rate.startsWith('+') ? rate : `+${rate}`,
            pitch: '+0Hz',
          }),
        });

        if (!res.ok) {
          throw new Error(`Edge-TTS bridge endpoint returned ${res.status}`);
        }

        const blob = await res.blob();
        if (signal.aborted) {
          options?.onEnd?.();
          return resolve();
        }

        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        audio.volume = config.volume ?? 1.0;
        this.activeAudio = audio;

        audio.onplay = () => {
          options?.onStart?.();
        };

        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          this.activeAudio = null;
          options?.onEnd?.();
          resolve();
        };

        audio.onerror = (err) => {
          URL.revokeObjectURL(audioUrl);
          this.activeAudio = null;
          options?.onError?.(err);
          options?.onEnd?.();
          resolve();
        };

        await audio.play();
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          options?.onEnd?.();
          return resolve();
        }
        options?.onError?.(err);
        options?.onEnd?.();
        resolve();
      }
    });
  }

  public stop(): void {
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }
    if (this.activeAudio) {
      try {
        this.activeAudio.pause();
        this.activeAudio.currentTime = 0;
      } catch {
        /* ignore */
      }
      this.activeAudio = null;
    }
  }

  private getBridgeUrl(): string {
    if (typeof window === 'undefined') return 'http://localhost:11435';
    try {
      const raw = localStorage.getItem('abhyas.bridge');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.bridgeUrl) return normalizeBridgeUrl(parsed.bridgeUrl);
      }
    } catch {
      /* ignore */
    }
    return 'http://localhost:11435';
  }
}
