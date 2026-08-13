#!/usr/bin/env node
import readline from 'readline';
import { detectOllama, DEFAULT_OLLAMA_URL } from './ollama.js';
import { findFreePort } from './port.js';
import { listenBridge, startModelKeepAlive, type BridgeState } from './server.js';
import { log } from './logger.js';
import { runSttStartupFlow, readSttConfig, getAllSttProviders, initRegistry } from './stt/index.js';

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

  // ── STT Provider Detection (runs before all other startup checks) ──────────
  // Detects/installs local STT providers. Falls back to Browser STT silently.
  // The resolved config is stored in ~/.abhyas/stt-config.json and exposed
  // by the bridge server at GET /stt/config so the frontend can read it.
  const nonInteractive = !!flags.get('non-interactive') || !!process.env.ABHYAS_NON_INTERACTIVE;
  log.info('Initializing STT provider…');
  const sttConfig = await runSttStartupFlow({ nonInteractive }).catch((err) => {
    log.warn(`STT startup failed (${err instanceof Error ? err.message : String(err)}) — using Browser STT.`);
    return { providerId: 'browser' as const, selectedAt: new Date().toISOString(), modelDir: null };
  });
  // ──────────────────────────────────────────────────────────────────────────

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
    } else if (names.length === 1) {
      selectedModel = names[0];
      log.ok(`Using only model: ${selectedModel}`);
    } else if (names.length > 1) {
      if (nonInteractive) {
        selectedModel = names[0];
        log.ok(`Auto-selected model: ${selectedModel} (${names.length} available)`);
      } else {
        selectedModel = await pickModel(names);
        log.ok(`Selected model: ${selectedModel}`);
      }
    }
  }

  const state: BridgeState = { ollamaUrl, selectedModel, port, sttConfig };
  const { url } = await listenBridge(state);
  if (selectedModel) startModelKeepAlive(state);
  log.banner(url, selectedModel || '<TTS-only — start Ollama for interview AI>');
  if (selectedModel) log.info('Model keep-alive started (every 4m)');
}

/** Start bridge in TTS-only mode — no Ollama required. */
async function cmdRunTtsOnly(flags: Map<string, string | boolean>) {
  // ── STT Provider Detection (runs before all other startup checks) ──────────
  const nonInteractive = !!flags.get('non-interactive') || !!process.env.ABHYAS_NON_INTERACTIVE;
  log.info('Initializing STT provider…');
  const sttConfig = await runSttStartupFlow({ nonInteractive }).catch((err) => {
    log.warn(`STT startup failed (${err instanceof Error ? err.message : String(err)}) — using Browser STT.`);
    return { providerId: 'browser' as const, selectedAt: new Date().toISOString(), modelDir: null };
  });
  // ──────────────────────────────────────────────────────────────────────────

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
    sttConfig,
  };

  const { url } = await listenBridge(state);
  log.ok(`TTS-only bridge running at ${url}/tts/generate`);
  log.info('Ollama endpoints are disabled in TTS-only mode.');
}

/**
 * 'stt' subcommand — lets users re-run the STT provider selection
 * without restarting the full bridge. Useful when the user wants to
 * switch from Browser STT to ONNX after initial skip, or vice versa.
 */
async function cmdStt(flags: Map<string, string | boolean>) {
  const sub = flags.get('reset') ? 'reset' : 'status';

  // Initialize registry so we can query providers
  try { initRegistry(); } catch { /* already initialized in another flow */ }

  if (sub === 'reset' || flags.get('reconfigure')) {
    // Force re-run the startup flow interactively
    log.info('Re-running STT provider selection…');
    const sttConfig = await runSttStartupFlow({ nonInteractive: false });
    log.ok(`STT provider set to: ${sttConfig.providerId}`);
    return;
  }

  // Default: show current status
  const cfg = readSttConfig();
  if (!cfg) {
    log.info('No STT provider configured yet. Run `abhyas-bridge run` to set one up.');
    return;
  }

  const providers = getAllSttProviders();
  console.log('');
  console.log('  STT Provider Configuration');
  console.log('  ──────────────────────────');
  console.log(`  Active provider : ${cfg.providerId}`);
  console.log(`  Selected at     : ${new Date(cfg.selectedAt).toLocaleString()}`);
  console.log(`  Model dir       : ${cfg.modelDir ?? 'N/A (browser-based)'}`);
  console.log('');
  console.log('  Registered providers:');
  providers.forEach((p) => {
    const active = p.id === cfg.providerId ? ' ◀ active' : '';
    console.log(`    • ${p.id}${active} — ${p.name}`);
  });
  console.log('');
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
  abhyas-bridge run --non-interactive            (skip all prompts, use saved/browser STT)
  abhyas-bridge health
  abhyas-bridge models
  abhyas-bridge stt                              (show STT provider status)
  abhyas-bridge stt --reconfigure                (re-run STT provider selection)

Paste the printed URL into the Abhyas website Local AI settings.
`);
    return;
  }

  if (cmd === 'health') return cmdHealth(ollamaUrl);
  if (cmd === 'models') return cmdModels(ollamaUrl);
  if (cmd === 'stt') return cmdStt(flags);
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
