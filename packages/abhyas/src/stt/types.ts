/**
 * STT Provider Architecture — Core Types
 *
 * This file defines the contract that every STT provider must satisfy.
 * Adding a new provider in the future only requires implementing SttProviderDescriptor
 * and registering it — no changes to cli.ts, server.ts, or any interview logic.
 */

// ─── Provider Identity ────────────────────────────────────────────────────────

/** Stable unique key for each provider. Never rename — stored in user config. */
export type SttProviderId = 'browser' | 'onnx-asr' | (string & {});

export type SttProviderKind = 'browser' | 'local' | 'remote';

// ─── Model Requirements ───────────────────────────────────────────────────────

/** Describes one model file that a local STT provider needs. */
export interface SttModelFile {
  /** Human-readable name of the file (for display). */
  name: string;
  /** URL to download the file from. */
  url: string;
  /** Expected size in bytes (used for progress display; 0 = unknown). */
  expectedBytes: number;
}

/** All model files required by a provider, plus where to store them. */
export interface SttModelRequirements {
  /** Absolute path to the directory where model files are stored. */
  modelDir: string;
  /** List of files to download/verify. */
  files: SttModelFile[];
}

// ─── Provider Descriptor ──────────────────────────────────────────────────────

/**
 * The full descriptor for an STT provider.
 * Each provider registers exactly one of these.
 */
export interface SttProviderDescriptor {
  /** Stable unique ID. Never changes after release. */
  id: SttProviderId;

  /** Display name shown to the user. */
  name: string;

  /** One-line description shown during selection. */
  description: string;

  /** Provider category. */
  kind: SttProviderKind;

  /**
   * Minimum hardware / OS requirements (optional, for display only).
   * e.g. "~40 MB disk, any modern CPU"
   */
  requirements?: string;

  /**
   * Check whether this provider is already available on the machine.
   * Must resolve quickly (< 2 s). No downloads or side-effects.
   */
  isAvailable(): Promise<boolean>;

  /**
   * Returns model file requirements, or null if the provider needs
   * no local files (e.g. browser STT).
   */
  getModelRequirements(): SttModelRequirements | null;

  /**
   * Download and install model files if not already present.
   * Must report progress via onProgress (0–100).
   * Should throw if download fails.
   */
  install(opts: {
    onProgress: (pct: number, label: string) => void;
  }): Promise<void>;

  /**
   * Verify the installed model files are intact.
   * Called after install() and on subsequent launches to validate the cached model.
   */
  verify(): Promise<boolean>;
}

// ─── Selected Provider Config ─────────────────────────────────────────────────

/**
 * Persisted user choice written to ~/.abhyas/stt-config.json.
 * The bridge reads this at startup and passes it to the frontend.
 */
export interface SttConfig {
  /** The active provider ID. */
  providerId: SttProviderId;
  /** Timestamp of when the user last selected this provider. */
  selectedAt: string;
  /** Absolute path to the model directory (null for browser STT). */
  modelDir: string | null;
}

// ─── Registry ─────────────────────────────────────────────────────────────────

/** Snapshot of a registered provider with its current availability. */
export interface SttProviderInfo {
  descriptor: SttProviderDescriptor;
  available: boolean;
}
