/** Browser SpeechRecognition helpers (Chrome / Edge webkit). */

export interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event?: { error?: string }) => void) | null;
  onend: (() => void) | null;
}

export interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [i: number]: { isFinal: boolean; [j: number]: { transcript: string } };
  };
}

/** Voice command: saying this word removes itself and the previous word. */
export const VOICE_DELETE_WORD = 'abhyas';

/** Returns true if the browser is Firefox (no Web Speech API support). */
export function isFirefox(): boolean {
  if (typeof navigator === 'undefined') return false;
  return navigator.userAgent.includes('Firefox');
}

/** Returns true if the browser is Brave (STT requires Google services to be enabled). */
export function isBrave(): boolean {
  if (typeof navigator === 'undefined') return false;
  // Brave exposes navigator.brave — most reliable detection
  return !!(navigator as unknown as { brave?: { isBrave?: unknown } }).brave;
}

/** Returns a browser-specific message when STT is unavailable. */
export function getSttUnavailableMessage(): string {
  if (isFirefox()) {
    return 'Firefox does not support microphone input. Try Chrome or Brave.';
  }
  if (isBrave()) {
    return 'Enable Google Services in Brave Settings → Privacy → Google services to use the microphone.';
  }
  return 'Speech recognition unavailable — use keyboard instead.';
}

export function getSpeechRecognitionCtor():
  | (new () => SpeechRecognitionLike)
  | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition;
}

export function joinUtterances(...parts: string[]): string {
  return parts
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(' ');
}

export function readSpeechTranscript(event: SpeechRecognitionEventLike): {
  finalText: string;
  interimText: string;
} {
  let finalText = '';
  let interimText = '';
  for (let i = 0; i < event.results.length; i++) {
    const piece = event.results[i][0]?.transcript ?? '';
    if (event.results[i].isFinal) finalText += piece;
    else interimText += piece;
  }
  return {
    finalText: finalText.replace(/\s+/g, ' ').trim(),
    interimText: interimText.replace(/\s+/g, ' ').trim(),
  };
}

const DELETE_CMD = new RegExp(`^${VOICE_DELETE_WORD}[.!,;:?]*$`, 'i');

/**
 * Process voice commands in finalized text.
 * Saying "abhyas" deletes that command word and the previous word.
 */
export function applyAbhyasVoiceCommands(text: string): {
  text: string;
  deletedWords: number;
} {
  const tokens = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const out: string[] = [];
  let deletedWords = 0;

  for (const token of tokens) {
    if (DELETE_CMD.test(token)) {
      if (out.length > 0) {
        out.pop();
        deletedWords += 1;
      }
      continue;
    }
    out.push(token);
  }

  return { text: out.join(' '), deletedWords };
}
