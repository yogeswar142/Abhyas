/** Dual-Mode Text-to-Speech Engine Architecture for Abhyas. */

export type TTSEngineMode = 'webspeech' | 'edge';

export interface TTSVoiceOption {
  id: string;
  name: string;
  lang: string;
  engine: TTSEngineMode;
  gender?: 'male' | 'female' | 'neutral';
}

export interface TTSConfig {
  engine: TTSEngineMode;
  voiceId: string;
  rate: number; // 0.8 to 1.5 (default 1.0)
  pitch: number; // 0.8 to 1.2 (default 1.0)
  volume: number; // 0.0 to 1.0 (default 1.0)
}

export const TTS_STORAGE_KEY = 'abhyas.tts_config';

export const DEFAULT_TTS_CONFIG: TTSConfig = {
  engine: 'edge',
  voiceId: 'en-US-AvaNeural',
  rate: 1.3,
  pitch: 1.0,
  volume: 1.0,
};

export interface SpeakOptions {
  onStart?: () => void;
  onSentenceStart?: (sentence: string, index: number) => void;
  onWord?: (word: string) => void;
  onEnd?: () => void;
  onError?: (err: unknown) => void;
  signal?: AbortSignal;
}

export interface ITTSEngine {
  readonly mode: TTSEngineMode;
  getVoices(): Promise<TTSVoiceOption[]>;
  speak(text: string, config: TTSConfig, options?: SpeakOptions): Promise<void>;
  stop(): void;
}
