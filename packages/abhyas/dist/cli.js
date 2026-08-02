#!/usr/bin/env node
import readline from 'readline';
import { detectOllama, DEFAULT_OLLAMA_URL } from './ollama.js';
import { findFreePort } from './port.js';
import { listenBridge, startModelKeepAlive } from './server.js';
import { log } from './logger.js';
function parseArgs(argv) {
    const args = argv.slice(2);
    const cmd = args[0] && !args[0].startsWith('-') ? args[0] : 'run';
    const flags = new Map();
    for (let i = cmd === args[0] ? 1 : 0; i < args.length; i++) {
        const a = args[i];
        if (a.startsWith('--')) {
            const key = a.slice(2);
            const next = args[i + 1];
            if (next && !next.startsWith('-')) {
                flags.set(key, next);
                i++;
            }
            else {
                flags.set(key, true);
            }
        }
    }
    return { cmd, flags };
}
function ask(question) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}
async function pickModel(names, preselect) {
    if (preselect && names.includes(preselect))
        return preselect;
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
        if (names.includes(raw))
            return raw;
        log.warn('Invalid selection, try again.');
    }
}
async function cmdHealth(ollamaUrl) {
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
async function cmdModels(ollamaUrl) {
    await cmdHealth(ollamaUrl);
}
async function cmdRun(flags) {
    const ollamaUrl = (typeof flags.get('ollama') === 'string' && flags.get('ollama')) ||
        process.env.OLLAMA_URL ||
        DEFAULT_OLLAMA_URL;
    log.info('Checking Ollama…');
    const detected = await detectOllama(ollamaUrl);
    if (!detected.ok) {
        log.err(detected.error ?? 'Ollama unreachable');
        process.exit(1);
    }
    log.ok(`Ollama connected (${ollamaUrl})`);
    log.info(`Models found: ${detected.models.length}`);
    const names = detected.models.map((m) => m.name);
    const flagModel = typeof flags.get('model') === 'string' ? flags.get('model') : undefined;
    const selectedModel = await pickModel(names, flagModel || process.env.ABHYAS_MODEL);
    const preferred = Number(flags.get('port') || process.env.ABHYAS_PORT || 11435) || 11435;
    let port = preferred;
    try {
        port = await findFreePort(preferred, 10);
        if (port !== preferred) {
            log.warn(`Port ${preferred} busy → using ${port}`);
        }
        else {
            log.ok(`Port ${port} free`);
        }
    }
    catch (err) {
        log.err(err instanceof Error ? err.message : String(err));
        process.exit(1);
    }
    const state = {
        ollamaUrl,
        selectedModel,
        port,
    };
    const { url } = await listenBridge(state);
    startModelKeepAlive(state);
    log.banner(url, selectedModel);
    log.info('Model keep-alive started (every 4m)');
}
async function main() {
    const { cmd, flags } = parseArgs(process.argv);
    const ollamaUrl = (typeof flags.get('ollama') === 'string' && flags.get('ollama')) ||
        process.env.OLLAMA_URL ||
        DEFAULT_OLLAMA_URL;
    if (cmd === 'help' || flags.get('help')) {
        console.log(`
Abhyas local bridge

  abhyas-bridge run [--port 11435] [--model name] [--ollama http://127.0.0.1:11434]
  abhyas-bridge health
  abhyas-bridge models

Paste the printed URL into the Abhyas website Local AI settings.
`);
        return;
    }
    if (cmd === 'health')
        return cmdHealth(ollamaUrl);
    if (cmd === 'models')
        return cmdModels(ollamaUrl);
    if (cmd === 'run')
        return cmdRun(flags);
    log.err(`Unknown command: ${cmd}`);
    process.exit(1);
}
main().catch((err) => {
    log.err(err instanceof Error ? err.message : String(err));
    process.exit(1);
});
