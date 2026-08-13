/**
 * STT Config Persistence
 *
 * Reads and writes the user's selected STT provider to ~/.abhyas/stt-config.json.
 * This is the single source of truth for the active provider between launches.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import type { SttConfig, SttProviderId } from './types.js';

function getConfigPath(): string {
  return path.join(os.homedir(), '.abhyas', 'stt-config.json');
}

export function readSttConfig(): SttConfig | null {
  try {
    const raw = fs.readFileSync(getConfigPath(), 'utf-8');
    const parsed = JSON.parse(raw) as SttConfig;
    if (!parsed.providerId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeSttConfig(config: SttConfig): void {
  const dir = path.dirname(getConfigPath());
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(getConfigPath(), JSON.stringify(config, null, 2), 'utf-8');
}

export function clearSttConfig(): void {
  try {
    fs.unlinkSync(getConfigPath());
  } catch {
    // ignore if not found
  }
}

/** Write a new selection, preserving modelDir from the provider's requirements. */
export function saveSttSelection(providerId: SttProviderId, modelDir: string | null): void {
  writeSttConfig({
    providerId,
    selectedAt: new Date().toISOString(),
    modelDir,
  });
}
