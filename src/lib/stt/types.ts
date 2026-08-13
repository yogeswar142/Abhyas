'use client';

/**
 * Client-side STT Provider Types
 *
 * These types define the interface that the AnswerComposer (and any future
 * interview component) uses to interact with STT. The component never imports
 * from a specific provider — it only uses these types.
 */

/** Stable provider IDs — must match the server-side SttProviderId. */
export type SttProviderId = 'browser' | 'onnx-asr' | (string & {});

/** Lifecycle states of an STT session. */
export type SttStatus =
  | 'idle'       // Provider ready, not recording
  | 'loading'    // Provider loading its model
  | 'ready'      // Provider ready to record
  | 'listening'  // Actively capturing audio
  | 'processing' // Audio captured, transcription in progress
  | 'error';     // Provider failed (will fall back)

/**
 * The common interface that every client-side STT provider must implement.
 * AnswerComposer interacts only with this interface.
 */
export interface SttProvider {
  /** The stable ID of this provider. */
  readonly id: SttProviderId;

  /** Human-readable name for status display. */
  readonly displayName: string;

  /** Current lifecycle status. */
  readonly status: SttStatus;

  /** Loading progress (0–100), meaningful only when status === 'loading'. */
  readonly loadingProgress: number;

  /** Error message, meaningful only when status === 'error'. */
  readonly errorMsg: string;

  /**
   * Called once when the provider is first used.
   * Must set up any workers, models, or audio infrastructure.
   */
  initialize(opts: SttInitOptions): Promise<void>;

  /** Start capturing audio from the microphone and transcribing. */
  startRecording(): void | Promise<void>;

  /**
   * Stop capturing. Flushes any buffered audio and fires a final onResult.
   */
  stopRecording(): void;

  /** Release all resources (worker, AudioContext, mic stream). */
  destroy(): void;
}

/** Options passed to SttProvider.initialize(). */
export interface SttInitOptions {
  /** Called when a transcript segment arrives. isFinal=true means committed text. */
  onResult: (text: string, isFinal: boolean) => void;
  /** Called after a long silence following committed text (VAD auto-submit). */
  onVADSubmit?: () => void;
  /** Called when the provider encounters a fatal error. */
  onError: (msg: string) => void;
  /**
   * Shared mic stream from the level meter, so we don't open two mic tracks.
   * Providers that open their own mic stream should ignore this.
   */
  mediaStream?: MediaStream | null;
}

/**
 * Config fetched from the bridge server's GET /stt/config endpoint.
 * Mirrors the server-side SttConfig shape.
 */
export interface BridgeSttConfig {
  providerId: SttProviderId;
  selectedAt: string;
  modelDir: string | null;
}
