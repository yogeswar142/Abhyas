import { DEFAULT_TTS_CONFIG, ITTSEngine, SpeakOptions, TTSConfig, TTSEngineMode, TTS_STORAGE_KEY, TTSVoiceOption } from './types';
import { WebSpeechEngine } from './webSpeechEngine';
import { EdgeTTSEngine } from './edgeTTSEngine';

export class TTSManager {
  private static instance: TTSManager | null = null;

  private webSpeechEngine = new WebSpeechEngine();
  private edgeEngine = new EdgeTTSEngine();
  private activeEngine: ITTSEngine = this.webSpeechEngine;

  private config: TTSConfig = DEFAULT_TTS_CONFIG;

  private constructor() {
    this.loadConfig();
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
        this.config = { ...DEFAULT_TTS_CONFIG, ...parsed };
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

  /** Buffer text into completed sentence boundaries and speak them sequentially. */
  public createSentenceStreamer(options?: SpeakOptions) {
    let buffer = '';
    let isSpeaking = false;
    const sentenceQueue: string[] = [];
    const abortController = new AbortController();

    const processQueue = async () => {
      if (isSpeaking || sentenceQueue.length === 0 || abortController.signal.aborted) return;

      isSpeaking = true;
      const sentence = sentenceQueue.shift()!;

      try {
        await this.speak(sentence, {
          ...options,
          signal: abortController.signal,
        });
      } finally {
        isSpeaking = false;
        if (sentenceQueue.length > 0 && !abortController.signal.aborted) {
          processQueue();
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
            sentenceQueue.push(sentence);
          }
          lastIndex = matchSentenceRegex.lastIndex;
        }

        if (lastIndex > 0) {
          buffer = buffer.slice(lastIndex);
        }

        processQueue();
      },
      flush: () => {
        if (buffer.trim() && !abortController.signal.aborted) {
          sentenceQueue.push(buffer.trim());
          buffer = '';
          processQueue();
        }
      },
      stop: () => {
        abortController.abort();
        sentenceQueue.length = 0;
        buffer = '';
        this.stop();
      },
    };
  }
}

export const ttsManager = TTSManager.getInstance();
