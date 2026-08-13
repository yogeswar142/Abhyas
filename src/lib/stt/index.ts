'use client';

/**
 * Client-side STT module public API.
 * Import from here only — never from individual provider files.
 */

export type {
  SttProviderId,
  SttStatus,
  SttProvider,
  SttInitOptions,
  BridgeSttConfig,
} from './types';

export { createSttProvider, getRegisteredProviderIds, hasClientProvider } from './registry';

export {
  useSttProvider,
  type UseSttProviderOptions,
  type UseSttProviderReturn,
} from './useSttProvider';
