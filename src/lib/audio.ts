import { ttsManager } from './tts/ttsManager';

export interface SpeechSyncOptions {
  onSentenceStart?: (sentence: string, index: number) => void;
  onEnd?: () => void;
  onError?: (err: unknown) => void;
}

export function isSpeechSynthesisAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function speakText(text: string, options?: SpeechSyncOptions): () => void {
  ttsManager.speak(text, {
    onEnd: options?.onEnd,
    onError: options?.onError,
  });

  return () => {
    ttsManager.stop();
  };
}

export function stopSpeech(): void {
  ttsManager.stop();
}
