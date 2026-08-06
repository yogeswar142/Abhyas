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
  /** Set by TTSManager when auto-probe detects bridge — avoids writing to localStorage */
  private ttsOnlyBridgeUrl: string | null = null;

  /** Called by TTSManager when bridge is detected, without touching abhyas.bridge localStorage */
  public setTtsOnlyBridgeUrl(url: string): void {
    this.ttsOnlyBridgeUrl = url;
  }

  public async getVoices(): Promise<TTSVoiceOption[]> {
    return EDGE_NEURAL_VOICES;
  }

  /** Called when bridge is unreachable — set externally by TTSManager for fallback logic */
  public onBridgeOffline: (() => void) | null = null;

  public async prefetchAudio(
    text: string,
    config: TTSConfig,
    signal?: AbortSignal
  ): Promise<HTMLAudioElement | null> {
    const cleaned = text.trim();
    if (!cleaned) return null;

    try {
      const bridgeUrl = this.getBridgeUrl();
      const voice = config.voiceId || 'en-US-AvaNeural';
      const rateNum = config.rate ?? 1.3;
      const ratePct = Math.round((rateNum - 1.0) * 100);
      const rate = `${ratePct >= 0 ? '+' : ''}${ratePct}%`;

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
        this.onBridgeOffline?.();
        return null;
      }
      const blob = await res.blob();
      if (signal?.aborted) return null;

      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audio.volume = config.volume ?? 1.0;
      audio.preload = 'auto';

      // Fix: revoke blob URL to prevent memory leak once audio is done
      const revoke = () => URL.revokeObjectURL(audioUrl);
      audio.addEventListener('ended', revoke, { once: true });
      audio.addEventListener('error', revoke, { once: true });

      return audio;
    } catch (err) {
      // fetch threw — bridge is offline
      if ((err as Error)?.name !== 'AbortError') {
        this.onBridgeOffline?.();
      }
      return null;
    }
  }

  public playAudioElement(
    audio: HTMLAudioElement,
    options?: SpeakOptions
  ): Promise<void> {
    return new Promise((resolve) => {
      this.stop();
      const signal = options?.signal;

      if (signal?.aborted) {
        options?.onEnd?.();
        return resolve();
      }

      this.activeAudio = audio;

      audio.onplay = () => {
        options?.onStart?.();
      };

      audio.onended = () => {
        this.activeAudio = null;
        options?.onEnd?.();
        resolve();
      };

      audio.onerror = (err) => {
        this.activeAudio = null;
        options?.onError?.(err);
        options?.onEnd?.();
        resolve();
      };

      audio.play().catch((err) => {
        this.activeAudio = null;
        options?.onError?.(err);
        options?.onEnd?.();
        resolve();
      });
    });
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
        const audio = await this.prefetchAudio(cleaned, config, signal);
        if (!audio || signal.aborted) {
          options?.onEnd?.();
          return resolve();
        }

        await this.playAudioElement(audio, options);
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
    // In-memory override takes priority (set by TTSManager auto-probe, never writes to localStorage)
    if (this.ttsOnlyBridgeUrl) return this.ttsOnlyBridgeUrl;
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
