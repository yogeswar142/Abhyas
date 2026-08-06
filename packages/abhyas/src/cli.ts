#!/usr/bin/env node
import readline from 'readline';
import { detectOllama, DEFAULT_OLLAMA_URL } from './ollama.js';
import { findFreePort } from './port.js';
import { listenBridge, startModelKeepAlive, type BridgeState } from './server.js';
import { log } from './logger.js';

function parseArgs(argv: string[]) {
  const args = argv.slice(2);
  const cmd = args[0] && !args[0].startsWith('-') ? args[0] : 'run';
  const flags = new Map<string, string | boolean>();
  for (let i = cmd === args[0] ? 1 : 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('-')) {
        flags.set(key, next);
        i++;
      } else {
        flags.set(key, true);
      }
    }
  }
  return { cmd, flags };
}

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function pickModel(names: string[], preselect?: string): Promise<string> {
  if (preselect && names.includes(preselect)) return preselect;
  if (names.length === 0) {
    throw new Error('No Ollama models found. Pull one first (e.g. ollama pull qwen2.5:3b).');
  }
  if (names.length === 1) {
    log.ok(`Using only model: ${names[0]}`);
    return names[0];
  }

  console.log('');
  log.info(`Found ${names.length} models — pick one:`);
  names.forEach((n, i) => console.log(`  ${i + 1}) ${n}`));
  console.log('');

  while (true) {
    const raw = await ask(`Select [1-${names.length}]: `);
    const idx = Number(raw);
    if (Number.isInteger(idx) && idx >= 1 && idx <= names.length) {
      return names[idx - 1];
    }
    if (names.includes(raw)) return raw;
    log.warn('Invalid selection, try again.');
  }
}

async function cmdHealth(ollamaUrl: string) {
  const result = await detectOllama(ollamaUrl);
  if (!result.ok) {
    log.err(result.error ?? 'Ollama unreachable');
    process.exitCode = 1;
    return;
  }
  log.ok(`Ollama connected · ${result.models.length} models`);
  for (const m of result.models) {
    console.log(`  - ${m.name}`);
  }
}

async function cmdModels(ollamaUrl: string) {
  await cmdHealth(ollamaUrl);
}

async function cmdRun(flags: Map<string, string | boolean>) {
  const ollamaUrl =
    (typeof flags.get('ollama') === 'string' && (flags.get('ollama') as string)) ||
    process.env.OLLAMA_URL ||
    DEFAULT_OLLAMA_URL;

  // Find port first so server can always start
  const preferred =
    Number(flags.get('port') || process.env.ABHYAS_PORT || 11435) || 11435;
  let port = preferred;
  try {
    port = await findFreePort(preferred, 10);
    if (port !== preferred) log.warn(`Port ${preferred} busy → using ${port}`);
    else log.ok(`Port ${port} free`);
  } catch (err) {
    log.err(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  // Try Ollama — NEVER crash if it's not running. Server starts regardless.
  // /health reports Ollama status live; /tts/generate always works.
  log.info('Checking Ollama…');
  const detected = await detectOllama(ollamaUrl);
  let selectedModel = '';

  if (!detected.ok) {
    log.warn(detected.error ?? 'Ollama not reachable — TTS still works');
    log.info('Start Ollama on the host to enable interview AI.');
  } else {
    log.ok(`Ollama connected (${ollamaUrl})`);
    const names = detected.models.map((m) => m.name);
    const flagModel = typeof flags.get('model') === 'string' ? (flags.get('model') as string) : undefined;
    const envModel = process.env.ABHYAS_MODEL;
    if (flagModel && names.includes(flagModel)) {
      selectedModel = flagModel;
    } else if (envModel && names.includes(envModel)) {
      selectedModel = envModel;
    } else if (names.length >= 1) {
      // Non-interactive (Docker): auto-pick first available model
      selectedModel = names[0];
      log.ok(`Auto-selected model: ${selectedModel}${names.length > 1 ? ` (${names.length} available)` : ''}`);
    }
  }

  const state: BridgeState = { ollamaUrl, selectedModel, port };
  const { url } = await listenBridge(state);
  if (selectedModel) startModelKeepAlive(state);
  log.banner(url, selectedModel || '<TTS-only — start Ollama for interview AI>');
  if (selectedModel) log.info('Model keep-alive started (every 4m)');
}

/** Start bridge in TTS-only mode — no Ollama required. */
async function cmdRunTtsOnly(flags: Map<string, string | boolean>) {
  const preferred = Number(flags.get('port') || process.env.ABHYAS_PORT || 11435) || 11435;
  let port = preferred;
  try {
    port = await findFreePort(preferred, 10);
    if (port !== preferred) log.warn(`Port ${preferred} busy → using ${port}`);
    else log.ok(`Port ${port} free`);
  } catch (err) {
    log.err(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  const state: BridgeState = {
    ollamaUrl: (typeof flags.get('ollama') === 'string' ? flags.get('ollama') as string : null)
      || process.env.OLLAMA_URL
      || DEFAULT_OLLAMA_URL,
    selectedModel: '',
    port,
  };

  const { url } = await listenBridge(state);
  log.ok(`TTS-only bridge running at ${url}/tts/generate`);
  log.info('Ollama endpoints are disabled in TTS-only mode.');
}

async function main() {
  const { cmd, flags } = parseArgs(process.argv);
  const ollamaUrl =
    (typeof flags.get('ollama') === 'string' && (flags.get('ollama') as string)) ||
    process.env.OLLAMA_URL ||
    DEFAULT_OLLAMA_URL;

  if (cmd === 'help' || flags.get('help')) {
    console.log(`
Abhyas local bridge

  abhyas-bridge run [--port 11435] [--model name] [--ollama http://127.0.0.1:11434]
  abhyas-bridge run --tts-only [--port 11435]   (start without Ollama — TTS only)
  abhyas-bridge health
  abhyas-bridge models

Paste the printed URL into the Abhyas website Local AI settings.
`);
    return;
  }

  if (cmd === 'health') return cmdHealth(ollamaUrl);
  if (cmd === 'models') return cmdModels(ollamaUrl);
  if (cmd === 'run') {
    // --tts-only: skip Ollama requirement, only start TTS endpoint
    if (flags.get('tts-only')) return cmdRunTtsOnly(flags);
    return cmdRun(flags);
  }

  log.err(`Unknown command: ${cmd}`);
  process.exit(1);
}

main().catch((err) => {
  log.err(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
