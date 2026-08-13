/**
 * STT Provider Registry
 *
 * Central store for all registered STT providers.
 * Adding a future provider only requires registering it here.
 * Nothing else in the codebase needs to know about provider-specific logic.
 */

import type { SttProviderDescriptor, SttProviderInfo } from './types.js';

const registry = new Map<string, SttProviderDescriptor>();

/**
 * Register an STT provider.
 * Providers are registered at startup before any detection runs.
 */
export function registerSttProvider(descriptor: SttProviderDescriptor): void {
  if (registry.has(descriptor.id)) {
    throw new Error(`STT provider "${descriptor.id}" is already registered.`);
  }
  registry.set(descriptor.id, descriptor);
}

/**
 * Get a single registered provider by ID.
 * Throws if the provider is not registered.
 */
export function getSttProvider(id: string): SttProviderDescriptor {
  const p = registry.get(id);
  if (!p) {
    throw new Error(
      `STT provider "${id}" is not registered. Available: ${[...registry.keys()].join(', ')}`
    );
  }
  return p;
}

/**
 * Get all registered providers (in registration order).
 */
export function getAllSttProviders(): SttProviderDescriptor[] {
  return [...registry.values()];
}

/**
 * Detect which providers are currently available on this machine.
 * Runs isAvailable() for each registered provider in parallel.
 */
export async function detectAvailableProviders(): Promise<SttProviderInfo[]> {
  const all = getAllSttProviders();
  const results = await Promise.all(
    all.map(async (descriptor) => {
      try {
        const available = await descriptor.isAvailable();
        return { descriptor, available };
      } catch {
        return { descriptor, available: false };
      }
    })
  );
  return results;
}

/**
 * Check whether a specific provider is registered.
 */
export function hasSttProvider(id: string): boolean {
  return registry.has(id);
}

/**
 * List all registered provider IDs (useful for diagnostics).
 */
export function listSttProviderIds(): string[] {
  return [...registry.keys()];
}
