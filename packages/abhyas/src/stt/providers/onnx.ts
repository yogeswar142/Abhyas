/**
 * ONNX ASR Provider Descriptor
 *
 * First local STT provider for Abhyas.
 * Uses Xenova/whisper-tiny.en via @xenova/transformers (ONNX runtime in browser).
 *
 * NOTE: The ONNX model files are cached in the browser's IndexedDB/Cache Storage
 * (managed by @xenova/transformers), not on the local filesystem via Node.js.
 *
 * This descriptor handles:
 * - Availability detection (checks if model is present in local app-data cache)
 * - Guided download UX during CLI startup
 * - Verification that the cache entry is valid
 *
 * The actual transcription runs in the browser (via whisper-worker.js),
 * not in this Node.js bridge process. This provider descriptor is only
 * responsible for the startup-time detection/install flow and config persistence.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import type { SttProviderDescriptor, SttModelRequirements } from '../types.js';

// ─── Model Definition ─────────────────────────────────────────────────────────
//
// Xenova/whisper-tiny.en model files (ONNX quantized).
// These are the same files @xenova/transformers downloads to the browser cache.
// We pre-download them to the local app-data dir so the browser worker can use
// a local fallback path (env.localModelPath), avoiding re-download on every launch.

const MODEL_ID = 'Xenova/whisper-tiny.en';
const HF_BASE = 'https://huggingface.co/Xenova/whisper-tiny.en/resolve/main';

/** Model files required for whisper-tiny.en (ONNX quantized). */
const MODEL_FILES = [
  { name: 'onnx/encoder_model_quantized.onnx', expectedBytes: 41_800_000 },
  { name: 'onnx/decoder_model_merged_quantized.onnx', expectedBytes: 44_200_000 },
  { name: 'tokenizer.json', expectedBytes: 2_200_000 },
  { name: 'tokenizer_config.json', expectedBytes: 2000 },
  { name: 'vocab.json', expectedBytes: 1_000_000 },
  { name: 'merges.txt', expectedBytes: 500_000 },
  { name: 'normalizer.json', expectedBytes: 50_000 },
  { name: 'generation_config.json', expectedBytes: 4000 },
  { name: 'config.json', expectedBytes: 3000 },
  { name: 'preprocessor_config.json', expectedBytes: 2000 },
];

function getModelDir(): string {
  const home = os.homedir();
  return path.join(home, '.abhyas', 'models', 'onnx-asr', MODEL_ID.replace('/', '--'));
}

function fileUrl(filename: string): string {
  return `${HF_BASE}/${filename}`;
}

function fileSize(filepath: string): number {
  try {
    return fs.statSync(filepath).size;
  } catch {
    return 0;
  }
}

/**
 * Download a file from a URL to a local destination, reporting byte progress.
 *
 * Uses the Node.js built-in fetch() (available Node 18+) which:
 *  - Follows redirects automatically (handles HuggingFace LFS CDN redirects)
 *  - Handles encoded query strings in redirect URLs correctly
 *  - No manual redirect chain needed
 */
async function downloadFile(
  url: string,
  dest: string,
  onProgress: (bytes: number, total: number) => void
): Promise<void> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText} — ${url}`);
  }

  const total = parseInt(response.headers.get('content-length') ?? '0', 10);
  let downloaded = 0;

  const file = fs.createWriteStream(dest);

  try {
    if (!response.body) throw new Error('Empty response body');

    // Stream the response body chunk-by-chunk into the file
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      downloaded += value.length;
      await new Promise<void>((res, rej) => {
        file.write(value, (err) => (err ? rej(err) : res()));
      });
      onProgress(downloaded, total);
    }

    // Flush and close
    await new Promise<void>((res, rej) => {
      file.end((err?: Error | null) => (err ? rej(err) : res()));
    });
  } catch (err) {
    file.destroy();
    try { fs.unlinkSync(dest); } catch { /* best-effort cleanup */ }
    throw err;
  }
}

// ─── Provider Descriptor ──────────────────────────────────────────────────────

export const onnxAsrProvider: SttProviderDescriptor = {
  id: 'onnx-asr',
  name: 'ONNX ASR (Local AI)',
  description:
    'Runs Whisper Tiny entirely on your device using the ONNX runtime. ' +
    'No internet connection needed during interviews. ' +
    'Significantly better accuracy for technical/CS terminology than Browser STT.',
  kind: 'local',
  requirements: '~90 MB disk space, any modern CPU. No GPU required.',

  async isAvailable(): Promise<boolean> {
    const modelDir = getModelDir();
    if (!fs.existsSync(modelDir)) return false;
    // Check that all critical model files are present and non-empty
    const critical = ['onnx/encoder_model_quantized.onnx', 'onnx/decoder_model_merged_quantized.onnx', 'tokenizer.json'];
    return critical.every((f) => {
      const fullPath = path.join(modelDir, f);
      return fs.existsSync(fullPath) && fileSize(fullPath) > 10_000;
    });
  },

  getModelRequirements(): SttModelRequirements {
    const modelDir = getModelDir();
    return {
      modelDir,
      files: MODEL_FILES.map((f) => ({
        name: f.name,
        url: fileUrl(f.name),
        expectedBytes: f.expectedBytes,
      })),
    };
  },

  async install(opts: { onProgress: (pct: number, label: string) => void }): Promise<void> {
    const modelDir = getModelDir();
    fs.mkdirSync(path.join(modelDir, 'onnx'), { recursive: true });

    const totalFiles = MODEL_FILES.length;
    for (let i = 0; i < totalFiles; i++) {
      const file = MODEL_FILES[i];
      const dest = path.join(modelDir, file.name);

      // Skip if already fully downloaded
      if (fs.existsSync(dest) && fileSize(dest) > file.expectedBytes * 0.9) {
        opts.onProgress(
          Math.round(((i + 1) / totalFiles) * 100),
          `Skipped (cached): ${file.name}`
        );
        continue;
      }

      // Ensure sub-directory exists (e.g. onnx/)
      fs.mkdirSync(path.dirname(dest), { recursive: true });

      await downloadFile(
        fileUrl(file.name),
        dest,
        (bytes, total) => {
          const fileProgress = total > 0 ? bytes / total : 0;
          const overallPct = Math.round(((i + fileProgress) / totalFiles) * 100);
          const mb = (bytes / 1_048_576).toFixed(1);
          const totalMb = total > 0 ? `/${(total / 1_048_576).toFixed(1)} MB` : '';
          opts.onProgress(overallPct, `Downloading ${file.name} (${mb}${totalMb} MB)`);
        }
      );

      opts.onProgress(
        Math.round(((i + 1) / totalFiles) * 100),
        `Downloaded: ${file.name}`
      );
    }
  },

  async verify(): Promise<boolean> {
    return this.isAvailable();
  },
};
