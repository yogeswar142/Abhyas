'use client';

/**
 * Client-side STT Provider Registry
 *
 * Maps provider IDs to their factory functions.
 * Adding a new provider only requires adding one entry here.
 *
 * The registry is intentionally separate from the provider classes so that
 * unused providers are tree-shaken by the bundler.
 */

import type { SttProvider, SttProviderId } from './types';
import { BrowserSttProvider } from './providers/browserProvider';
import { OnnxAsrProvider } from './providers/onnxProvider';

type ProviderFactory = () => SttProvider;

const registry = new Map<string, ProviderFactory>([
  ['browser', () => new BrowserSttProvider()],
  ['onnx-asr', () => new OnnxAsrProvider()],
  // Future providers:
  // ['faster-whisper', () => new FasterWhisperProvider()],
]);

/**
 * Create a new instance of the specified STT provider.
 * Returns null if the provider ID is not registered.
 */
export function createSttProvider(id: SttProviderId): SttProvider | null {
  const factory = registry.get(id);
  if (!factory) return null;
  return factory();
}

/**
 * Get all registered provider IDs.
 */
export function getRegisteredProviderIds(): string[] {
  return [...registry.keys()];
}

/**
 * Check whether a given provider ID has a registered factory.
 */
export function hasClientProvider(id: string): boolean {
  return registry.has(id);
}
