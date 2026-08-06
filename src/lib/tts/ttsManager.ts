import { DEFAULT_TTS_CONFIG, ITTSEngine, SpeakOptions, TTSConfig, TTSEngineMode, TTS_STORAGE_KEY, TTSVoiceOption } from './types';
import { WebSpeechEngine } from './webSpeechEngine';
import { EdgeTTSEngine } from './edgeTTSEngine';

export class TTSManager {
  private static instance: TTSManager | null = null;

  private webSpeechEngine = new WebSpeechEngine();
  private edgeEngine = new EdgeTTSEngine();
  private activeEngine: ITTSEngine = this.webSpeechEngine;

  private config: TTSConfig = DEFAULT_TTS_CONFIG;
  /** Set this to get notified when EdgeTTS auto-falls back to webspeech */
  public onBridgeOffline: ((cb: () => void) => void) | null = null;
  private bridgeOfflineFired = false;

  private constructor() {
    this.loadConfig();
    // Wire EdgeTTS engine to notify manager when bridge is offline
    this.edgeEngine.onBridgeOffline = () => {
      if (this.bridgeOfflineFired) return;
      this.bridgeOfflineFired = true;
      // Auto-fallback: update BOTH the active engine AND config so sentence
      // streamer (which checks config.engine) also switches to webspeech
      this.config = { ...this.config, engine: 'webspeech' };
      this.activeEngine = this.webSpeechEngine;
      this.saveConfig(); // persist so next load starts with webspeech
      this.onBridgeOffline?.(() => { /* UI toast callback */ });
    };
  }

  public static getInstance(): TTSManager {
    if (!TTSManager.instance) {
      TTSManager.instance = new TTSManager();
    }
    return TTSManager.instance;
  }

  public getConfig(): TTSConfig {
    return { ...this.config };
  }

  public setConfig(newConfig: Partial<TTSConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();
    this.updateActiveEngine();
  }

  public loadConfig(): TTSConfig {
    if (typeof window === 'undefined') return DEFAULT_TTS_CONFIG;
    try {
      const raw = localStorage.getItem(TTS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const merged = { ...DEFAULT_TTS_CONFIG, ...parsed };

        // Migration: if stored config has engine:'edge' but NO bridge URL is
        // configured in localStorage, the user has a stale config from before
        // the default changed. Auto-migrate them to webspeech.
        if (merged.engine === 'edge') {
          try {
            const bridgeRaw = localStorage.getItem('abhyas.bridge');
            const hasBridge = bridgeRaw && JSON.parse(bridgeRaw)?.bridgeUrl;
            if (!hasBridge) {
              merged.engine = 'webspeech';
              merged.voiceId = '';
              // Save migrated config so it sticks
              localStorage.setItem(TTS_STORAGE_KEY, JSON.stringify(merged));
            }
          } catch { /* ignore */ }
        }

        this.config = merged;
      }
    } catch {
      this.config = DEFAULT_TTS_CONFIG;
    }
    this.updateActiveEngine();
    return this.config;
  }

  public saveConfig(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(TTS_STORAGE_KEY, JSON.stringify(this.config));
    } catch {
      /* ignore */
    }
  }

  private updateActiveEngine(): void {
    if (this.config.engine === 'edge') {
      this.activeEngine = this.edgeEngine;
    } else {
      this.activeEngine = this.webSpeechEngine;
    }
  }

  public async getAvailableVoices(engineMode?: TTSEngineMode): Promise<TTSVoiceOption[]> {
    const mode = engineMode || this.config.engine;
    if (mode === 'edge') {
      return this.edgeEngine.getVoices();
    }
    return this.webSpeechEngine.getVoices();
  }

  public speak(text: string, options?: SpeakOptions): Promise<void> {
    return this.activeEngine.speak(text, this.config, options);
  }

  public stop(): void {
    this.webSpeechEngine.stop();
    this.edgeEngine.stop();
  }

  /** Buffer text into completed sentence boundaries and speak them sequentially with audio prefetching. */
  public createSentenceStreamer(
    options?: SpeakOptions & { onStreamStart?: () => void; onStreamEnd?: () => void }
  ) {
    let buffer = '';
    let isSpeaking = false;
    let isFlushed = false;
    let hasStartedStream = false;
    let sentenceIndex = 0;
    const sentenceQueue: string[] = [];
    const prefetchedAudioQueue: Array<{
      sentence: string;
      audioPromise: Promise<HTMLAudioElement | null>;
    }> = [];
    const abortController = new AbortController();

    let resolveFinished: (() => void) | null = null;
    const finishedPromise = new Promise<void>((resolve) => {
      resolveFinished = resolve;
    });

    const triggerFinished = () => {
      options?.onStreamEnd?.();
      resolveFinished?.();
    };

    const enqueueSentence = (sentence: string) => {
      const clean = sentence.trim();
      if (!clean) return;
      sentenceQueue.push(clean);
      if (this.config.engine === 'edge') {
        prefetchedAudioQueue.push({
          sentence: clean,
          audioPromise: this.edgeEngine.prefetchAudio(clean, this.config, abortController.signal),
        });
      }
    };

    const processQueue = async () => {
      if (isSpeaking || sentenceQueue.length === 0 || abortController.signal.aborted) return;

      if (!hasStartedStream) {
        hasStartedStream = true;
        options?.onStreamStart?.();
      }

      isSpeaking = true;
      const sentence = sentenceQueue.shift()!;
      const currentIndex = sentenceIndex++;
      const prefetched = prefetchedAudioQueue.shift();

      let wordTimer: ReturnType<typeof setInterval> | null = null;

      try {
        let audioEl: HTMLAudioElement | null = null;
        if (prefetched && prefetched.sentence === sentence) {
          audioEl = await prefetched.audioPromise;
        }

        const handleStartCallbacks = () => {
          options?.onStart?.();
          options?.onSentenceStart?.(sentence, currentIndex);

          // Word-by-word streaming synchronized to speech audio playback speed (~1.3x rate)
          const words = sentence.trim().split(/\s+/).filter(Boolean);
          if (words.length > 0 && options?.onWord) {
            let wordIdx = 0;
            const delay = Math.max(160, Math.min(280, Math.round(18000 / words.length)));
            wordTimer = setInterval(() => {
              if (wordIdx < words.length && !abortController.signal.aborted) {
                options.onWord!(words[wordIdx++]);
              } else {
                if (wordTimer) clearInterval(wordTimer);
              }
            }, delay);
          }
        };

        if (audioEl && this.config.engine === 'edge') {
          await this.edgeEngine.playAudioElement(audioEl, {
            ...options,
            onStart: handleStartCallbacks,
            signal: abortController.signal,
          });
        } else {
          await this.speak(sentence, {
            ...options,
            onStart: handleStartCallbacks,
            signal: abortController.signal,
          });
        }
      } finally {
        if (wordTimer) clearInterval(wordTimer);
        isSpeaking = false;
        if (sentenceQueue.length > 0 && !abortController.signal.aborted) {
          processQueue();
        } else if (isFlushed && sentenceQueue.length === 0 && !abortController.signal.aborted) {
          triggerFinished();
        }
      }
    };

    return {
      pushToken: (token: string) => {
        if (abortController.signal.aborted) return;
        buffer += token;

        // Extract complete sentences ending in ., ?, !, or newline
        const matchSentenceRegex = /([^.!?\n]+[.!?\n]+)/g;
        let match;
        let lastIndex = 0;

        while ((match = matchSentenceRegex.exec(buffer)) !== null) {
          const sentence = match[0].trim();
          if (sentence) {
            enqueueSentence(sentence);
          }
          lastIndex = matchSentenceRegex.lastIndex;
        }

        if (lastIndex > 0) {
          buffer = buffer.slice(lastIndex);
        }

        processQueue();
      },
      flush: () => {
        isFlushed = true;
        if (buffer.trim() && !abortController.signal.aborted) {
          enqueueSentence(buffer.trim());
          buffer = '';
          processQueue();
        } else if (sentenceQueue.length === 0 && !isSpeaking && !abortController.signal.aborted) {
          triggerFinished();
        }
      },
      waitFinished: () => finishedPromise,
      stop: () => {
        abortController.abort();
        sentenceQueue.length = 0;
        prefetchedAudioQueue.length = 0;
        buffer = '';
        this.stop();
        triggerFinished();
      },
    };
  }
}

export const ttsManager = TTSManager.getInstance();
