/**
 * STT Module Public API
 *
 * All external code imports from this file only.
 * Internal structure of the stt/ folder is an implementation detail.
 */

export type {
  SttProviderId,
  SttProviderKind,
  SttProviderDescriptor,
  SttModelFile,
  SttModelRequirements,
  SttConfig,
  SttProviderInfo,
} from './types.js';

export {
  registerSttProvider,
  getSttProvider,
  getAllSttProviders,
  detectAvailableProviders,
  hasSttProvider,
  listSttProviderIds,
} from './registry.js';

export {
  readSttConfig,
  writeSttConfig,
  clearSttConfig,
  saveSttSelection,
} from './config.js';

export { runSttStartupFlow, initRegistry } from './detector.js';
