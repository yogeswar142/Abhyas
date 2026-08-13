/**
 * Browser STT Provider Descriptor
 *
 * Represents the browser's native Web Speech API.
 * Always "available" as a fallback — no installation needed.
 * The actual browser recognition runs in the frontend (not here),
 * so this descriptor only acts as the registry entry + config signal.
 */

import type { SttProviderDescriptor, SttModelRequirements } from '../types.js';

export const browserSttProvider: SttProviderDescriptor = {
  id: 'browser',
  name: 'Browser STT',
  description: 'Uses the browser\'s built-in Web Speech API. No installation required. Accuracy varies by browser and network conditions.',
  kind: 'browser',
  requirements: 'Chrome or Edge recommended. Firefox is not supported.',

  async isAvailable(): Promise<boolean> {
    // Browser STT is always "available" as a fallback.
    // Actual availability (Chrome vs Firefox) is checked client-side.
    return true;
  },

  getModelRequirements(): SttModelRequirements | null {
    // Browser STT needs no local model files.
    return null;
  },

  async install(): Promise<void> {
    // Nothing to install — browser STT is built into the browser.
  },

  async verify(): Promise<boolean> {
    // Nothing to verify.
    return true;
  },
};
