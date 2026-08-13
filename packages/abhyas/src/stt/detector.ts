/**
 * STT Startup Detector
 *
 * This module runs at CLI startup (before Ollama check) and:
 * 1. Initializes the provider registry with all available providers.
 * 2. Checks if the user has a persisted STT selection and validates it.
 * 3. If no valid selection: detects available local providers and prompts the user.
 * 4. Returns the resolved SttConfig that cli.ts passes to the bridge server.
 *
 * This file knows nothing about ONNX specifically — it talks to providers
 * through the SttProviderDescriptor interface only.
 */

import readline from 'readline';
import type { SttConfig } from './types.js';
import { registerSttProvider, detectAvailableProviders, getSttProvider, getAllSttProviders } from './registry.js';
import { readSttConfig, saveSttSelection } from './config.js';
import { browserSttProvider } from './providers/browser.js';
import { onnxAsrProvider } from './providers/onnx.js';
import { log } from '../logger.js';

// ─── Provider Registration ────────────────────────────────────────────────────
//
// All providers are registered here, once, at startup.
// To add a future provider: import it and call registerSttProvider().

function initRegistry(): void {
  registerSttProvider(browserSttProvider);
  registerSttProvider(onnxAsrProvider);
  // Future providers: registerSttProvider(fasterWhisperProvider);
}

// ─── User Prompt Helpers ──────────────────────────────────────────────────────

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function renderProgressBar(pct: number, width = 28): string {
  const filled = Math.round((pct / 100) * width);
  return '[' + '█'.repeat(filled) + '░'.repeat(width - filled) + ']';
}

// ─── Install Flow ─────────────────────────────────────────────────────────────

async function runInstall(providerId: string): Promise<boolean> {
  const provider = getSttProvider(providerId);
  const reqs = provider.getModelRequirements();
  const totalMb = reqs
    ? Math.round(reqs.files.reduce((s, f) => s + f.expectedBytes, 0) / 1_048_576)
    : 0;

  log.info(`Installing ${provider.name} (~${totalMb} MB)…`);

  let lastLine = '';
  const clearLast = () => {
    if (lastLine) process.stdout.write('\r' + ' '.repeat(lastLine.length) + '\r');
  };

  try {
    await provider.install({
      onProgress: (pct, label) => {
        clearLast();
        lastLine = `  ${renderProgressBar(pct)} ${pct}%  ${label}`;
        process.stdout.write(lastLine);
      },
    });
    clearLast();
    log.ok(`${provider.name} installed.`);

    log.info('Verifying model files…');
    const ok = await provider.verify();
    if (!ok) {
      log.err('Model verification failed — files may be corrupted.');
      return false;
    }
    log.ok('Model verified.');
    return true;
  } catch (err) {
    clearLast();
    log.err(`Install failed: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}

// ─── Main Startup Flow ────────────────────────────────────────────────────────

/**
 * Run the full STT startup flow.
 * Returns the resolved SttConfig (never null — falls back to browser if all else fails).
 *
 * Flow:
 *   1. Init registry (all providers registered)
 *   2. Read persisted config
 *      a. If found + provider still available → reuse
 *      b. If found + provider gone → warn + re-run detection
 *   3. No persisted config → detect local providers → prompt user
 *   4. Persist selection and return config
 */
export async function runSttStartupFlow(opts?: { nonInteractive?: boolean }): Promise<SttConfig> {
  initRegistry();

  const BROWSER_FALLBACK: SttConfig = {
    providerId: 'browser',
    selectedAt: new Date().toISOString(),
    modelDir: null,
  };

  // ── Step 1: Detect available local STT models on user's machine ────────────
  log.info('Detecting available STT providers…');
  const allProviders = await detectAvailableProviders();
  const localAvailable = allProviders.filter(
    (p) => p.available && p.descriptor.kind !== 'browser'
  );
  const localInstallable = allProviders.filter(
    (p) => !p.available && p.descriptor.kind !== 'browser'
  );

  // ── Step 2: If a local model is already installed & available ──────────────
  if (localAvailable.length > 0) {
    let active = localAvailable[0].descriptor;

    if (localAvailable.length === 1) {
      log.ok(`Local STT model detected: ${active.name}`);
    } else if (!opts?.nonInteractive) {
      console.log('');
      log.info(`Found ${localAvailable.length} installed local STT models — pick one:`);
      localAvailable.forEach((p, i) => {
        console.log(`  ${i + 1}) ${p.descriptor.name} (${p.descriptor.kind})`);
      });
      console.log(`  s) Browser STT`);
      console.log('');

      while (true) {
        const raw = await prompt(`Select STT model [1-${localAvailable.length}/s]: `);
        if (raw.toLowerCase() === 's' || raw.toLowerCase() === 'skip') {
          log.info('Using Browser STT.');
          saveSttSelection('browser', null);
          return BROWSER_FALLBACK;
        }
        const idx = Number(raw);
        if (Number.isInteger(idx) && idx >= 1 && idx <= localAvailable.length) {
          active = localAvailable[idx - 1].descriptor;
          break;
        }
        log.warn('Invalid selection, try again.');
      }
      log.ok(`Selected STT model: ${active.name}`);
    } else {
      log.ok(`Auto-selected local STT model: ${active.name} (${localAvailable.length} available)`);
    }

    const reqs = active.getModelRequirements();
    saveSttSelection(active.id, reqs?.modelDir ?? null);
    return {
      providerId: active.id,
      selectedAt: new Date().toISOString(),
      modelDir: reqs?.modelDir ?? null,
    };
  }

  // ── Step 3: Prompt user (interactive mode only) ───────────────────────────
  if (opts?.nonInteractive || localInstallable.length === 0) {
    // Docker / CI / no local providers available → silent fallback
    return BROWSER_FALLBACK;
  }

  console.log('');
  console.log('  ┌─────────────────────────────────────────────────────────┐');
  console.log('  │          Abhyas — Local Speech Recognition               │');
  console.log('  └─────────────────────────────────────────────────────────┘');
  console.log('');
  console.log('  Abhyas can use a local AI model for speech-to-text, which');
  console.log('  gives significantly better accuracy — especially for technical');
  console.log('  CS terminology — and runs entirely on your device.');
  console.log('');

  console.log('  Available local STT models:');
  localInstallable.forEach((p, i) => {
    const desc = p.descriptor;
    console.log(`    ${i + 1}) ${desc.name}`);
    console.log(`       ${desc.description}`);
    if (desc.requirements) {
      console.log(`       Requires: ${desc.requirements}`);
    }
    const reqs = desc.getModelRequirements();
    if (reqs) {
      const totalMb = Math.round(
        reqs.files.reduce((s, f) => s + f.expectedBytes, 0) / 1_048_576
      );
      console.log(`       Download size: ~${totalMb} MB`);
    }
    console.log('');
  });

  console.log(`    s) Skip — use Browser STT (current default)`);
  console.log('');

  // If only one installable option, simplify the prompt
  const choice = await prompt(
    localInstallable.length === 1
      ? '  Install local AI model? [1/s]: '
      : `  Choose model [1-${localInstallable.length}/s]: `
  );

  // ── Step 4: Handle user choice ────────────────────────────────────────────
  const choiceNum = Number(choice);
  const isSkip =
    choice.toLowerCase() === 's' ||
    choice.toLowerCase() === 'skip' ||
    choice === '' ||
    (Number.isInteger(choiceNum) && (choiceNum < 1 || choiceNum > localInstallable.length));

  if (isSkip) {
    console.log('');
    log.info('Skipped local STT — using Browser STT.');
    saveSttSelection('browser', null);
    return BROWSER_FALLBACK;
  }

  const selectedIdx = Number.isInteger(choiceNum) ? choiceNum - 1 : 0;
  const selectedProvider = localInstallable[selectedIdx]?.descriptor ?? localInstallable[0].descriptor;

  console.log('');
  log.info(`Installing ${selectedProvider.name}…`);

  const installed = await runInstall(selectedProvider.id);
  if (!installed) {
    log.warn('Installation failed — falling back to Browser STT.');
    saveSttSelection('browser', null);
    return BROWSER_FALLBACK;
  }

  const reqs = selectedProvider.getModelRequirements();
  saveSttSelection(selectedProvider.id, reqs?.modelDir ?? null);
  log.ok(`STT provider set to: ${selectedProvider.name}`);

  return {
    providerId: selectedProvider.id,
    selectedAt: new Date().toISOString(),
    modelDir: reqs?.modelDir ?? null,
  };
}

/**
 * Re-export initRegistry for use by the "stt" subcommand.
 */
export { initRegistry, getAllSttProviders };
