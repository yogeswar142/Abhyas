import express from 'express';
import cors from 'cors';
import { detectOllama, ndjsonToSse, streamOllamaChat, chatOllamaOnce, warmOllamaModel, OLLAMA_KEEP_ALIVE, } from './ollama.js';
import { buildTurnScorePrompt, parseTurnScores, buildClosingBlurbPrompt, buildFullEvaluationPrompt, pickClosingPreset, averageTurnScores, } from './prompts/interviewer.js';
import { log } from './logger.js';
import { synthesizeEdgeTts } from './edgetts.js';
const KEEP_ALIVE_MS = 4 * 60 * 1000;
/** Periodically re-touch the selected model so Ollama does not unload it. */
export function startModelKeepAlive(state) {
    const tick = () => {
        if (!state.selectedModel)
            return;
        void warmOllamaModel(state.ollamaUrl, state.selectedModel).catch((err) => {
            log.warn(`keepalive: ${err instanceof Error ? err.message : String(err)}`);
        });
    };
    tick();
    return setInterval(tick, KEEP_ALIVE_MS);
}
export function createBridgeApp(state) {
    const app = express();
    app.use(cors({
        origin: '*',
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type'],
    }));
    app.use(express.json({ limit: '1mb' }));
    app.post('/warm', async (req, res) => {
        const bodyModel = typeof req.body?.model === 'string' ? req.body.model : '';
        const useModel = bodyModel || state.selectedModel;
        if (!useModel) {
            return res.status(400).json({ error: 'No model selected' });
        }
        try {
            log.info(`warm · ${useModel} · keep_alive ${OLLAMA_KEEP_ALIVE}`);
            await warmOllamaModel(state.ollamaUrl, useModel);
            return res.json({ ok: true, model: useModel, keep_alive: OLLAMA_KEEP_ALIVE });
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            log.err(`warm: ${msg}`);
            return res.status(502).json({ error: 'Failed to warm interviewer' });
        }
    });
    app.post('/tts/generate', async (req, res) => {
        const { text, voice = 'en-US-AvaNeural', rate = '+0%', pitch = '+0Hz' } = req.body ?? {};
        if (!text || typeof text !== 'string') {
            return res.status(400).json({ error: 'Missing text parameter' });
        }
        log.info(`tts · voice: ${voice} · length: ${text.length} chars`);
        try {
            const audioBuffer = await synthesizeEdgeTts({ text, voice, rate, pitch });
            res.setHeader('Content-Type', 'audio/mpeg');
            res.setHeader('Content-Length', audioBuffer.length);
            return res.send(audioBuffer);
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            log.err(`tts error: ${msg}`);
            return res.status(502).json({ error: 'Failed to synthesize speech via Edge-TTS', detail: msg });
        }
    });
    app.get('/health', async (_req, res) => {
        const result = await detectOllama(state.ollamaUrl);
        if (!result.ok) {
            log.warn('health: ollama down');
            return res.status(503).json({
                status: 'unhealthy',
                ollama: 'disconnected',
                model: state.selectedModel,
                port: state.port,
                error: result.error,
                models: [],
            });
        }
        log.info(`health: ok · ${result.models.length} models`);
        return res.json({
            status: 'healthy',
            ollama: 'connected',
            model: state.selectedModel,
            port: state.port,
            models: result.models.map((m) => ({ name: m.name, size: m.size })),
        });
    });
    app.get('/models', async (_req, res) => {
        const result = await detectOllama(state.ollamaUrl);
        if (!result.ok) {
            return res.status(503).json({ error: result.error, models: [] });
        }
        return res.json({
            model: state.selectedModel,
            models: result.models.map((m) => ({ name: m.name, size: m.size })),
        });
    });
    app.post('/chat', (req, res) => {
        const { model, messages, options } = req.body ?? {};
        if (!model || !messages) {
            return res.status(400).json({ error: 'Missing model or messages' });
        }
        pipeSseChat(res, state, { model, messages, options });
    });
    app.post('/interview/chat', (req, res) => {
        const { model, messages, systemPrompt, interviewType = 'custom', difficulty = 'medium', options, } = req.body ?? {};
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Missing messages array' });
        }
        const useModel = (typeof model === 'string' && model) || state.selectedModel;
        if (!useModel) {
            return res.status(400).json({ error: 'No model selected. Restart bridge and pick a model.' });
        }
        const stripped = messages.filter((m) => m && m.role !== 'system');
        const userMessages = stripped.length === 0
            ? [{ role: 'user', content: 'Begin the interview. Introduce yourself briefly and ask the first question.' }]
            : stripped;
        const fullMessages = systemPrompt
            ? [{ role: 'system', content: String(systemPrompt) }, ...userMessages]
            : userMessages;
        const gen = {
            temperature: difficulty === 'hard' ? 0.5 : 0.4,
            top_p: 0.9,
            num_predict: 85,
            repeat_penalty: 1.15,
            ...(options && typeof options === 'object' ? options : {}),
        };
        log.info(`interview · ${useModel} · ${interviewType}/${difficulty}`);
        pipeSseChat(res, state, { model: useModel, messages: fullMessages, options: gen });
    });
    app.post('/interview/score-turn', async (req, res) => {
        const { model, question, answer, interviewType = 'custom', role = 'Software Engineer', company = 'a tech company', difficulty = 'medium', turnIndex = 1, } = req.body ?? {};
        if (!question || !answer) {
            return res.status(400).json({ error: 'Missing question or answer' });
        }
        const useModel = (typeof model === 'string' && model) || state.selectedModel;
        if (!useModel) {
            return res.status(400).json({ error: 'No model selected' });
        }
        const prompt = buildTurnScorePrompt(String(question), String(answer), String(interviewType), {
            role: String(role),
            company: String(company),
            difficulty: String(difficulty),
            turnIndex: Number(turnIndex),
        });
        log.info(`score-turn · ${useModel} · turn ${turnIndex} · ${company}/${difficulty}`);
        try {
            const raw = await chatOllamaOnce(state.ollamaUrl, {
                model: useModel,
                messages: [
                    { role: 'system', content: prompt.system },
                    { role: 'user', content: prompt.user },
                ],
                options: prompt.options,
            });
            const scores = parseTurnScores(raw);
            if (!scores) {
                log.warn(`score-turn: failed to parse JSON from model output: ${raw.slice(0, 100)}`);
                return res.status(502).json({ error: 'Model returned unparseable score output', raw });
            }
            return res.json({ scores, reasoning: scores.reasoning ?? null, raw });
        }
        catch (err) {
            log.err(`score-turn: ${err instanceof Error ? err.message : String(err)}`);
            return res.status(502).json({ error: 'Failed to score turn' });
        }
    });
    app.post('/interview/evaluate', async (req, res) => {
        const { model, transcript, interviewType = 'custom', role = 'Software Engineer', company = 'a tech company', difficulty = 'medium', } = req.body ?? {};
        if (!Array.isArray(transcript) || transcript.length === 0) {
            return res.status(400).json({ error: 'Missing or empty transcript array' });
        }
        const useModel = (typeof model === 'string' && model) || state.selectedModel;
        if (!useModel) {
            return res.status(400).json({ error: 'No model selected' });
        }
        const prompt = buildFullEvaluationPrompt({
            transcript: transcript,
            interviewType: String(interviewType),
            role: String(role),
            company: String(company),
            difficulty: String(difficulty),
        });
        log.info(`evaluate · ${useModel} · ${transcript.length} turns · ${company}/${difficulty}`);
        try {
            const raw = await chatOllamaOnce(state.ollamaUrl, {
                model: useModel,
                messages: [
                    { role: 'system', content: prompt.system },
                    { role: 'user', content: prompt.user },
                ],
                options: prompt.options,
            });
            const match = raw.match(/\{[\s\S]*\}/);
            if (!match) {
                log.warn(`evaluate: no JSON found in model output`);
                return res.status(502).json({ error: 'Model returned unparseable evaluation', raw });
            }
            try {
                const evaluation = JSON.parse(match[0]);
                return res.json({ evaluation, raw });
            }
            catch {
                return res.status(502).json({ error: 'Failed to parse evaluation JSON', raw });
            }
        }
        catch (err) {
            log.err(`evaluate: ${err instanceof Error ? err.message : String(err)}`);
            return res.status(502).json({ error: 'Failed to evaluate session' });
        }
    });
    app.post('/interview/closing', async (req, res) => {
        const { model, role = 'Software Engineer', company = 'Company', lastAnswer = '', turnScores = [], } = req.body ?? {};
        const useModel = (typeof model === 'string' && model) || state.selectedModel;
        if (!useModel) {
            return res.status(400).json({ error: 'No model selected' });
        }
        const avg = averageTurnScores(Array.isArray(turnScores) ? turnScores : []);
        const overall = Math.round((avg.clarity + avg.structure + avg.confidence + avg.depth) / 4);
        const preset = pickClosingPreset(overall);
        const prompt = buildClosingBlurbPrompt({
            role: String(role),
            company: String(company),
            lastAnswer: String(lastAnswer),
            avgOverall: overall,
        });
        log.info(`closing · ${useModel} · avg ${overall}`);
        let blurb = 'You showed up and engaged with the questions — keep practicing.';
        try {
            const raw = await chatOllamaOnce(state.ollamaUrl, {
                model: useModel,
                messages: [
                    { role: 'system', content: prompt.system },
                    { role: 'user', content: prompt.user },
                ],
                options: prompt.options,
            });
            const cleaned = raw.replace(/^["']|["']$/g, '').split('\n')[0].trim();
            if (cleaned && cleaned.length < 160)
                blurb = cleaned;
        }
        catch (err) {
            log.warn(`closing blurb fallback: ${err instanceof Error ? err.message : String(err)}`);
        }
        return res.json({
            message: `${preset} ${blurb}`,
            scores: avg,
            overall,
        });
    });
    return app;
}
function pipeSseChat(res, state, body) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
    const carry = { buf: '' };
    streamOllamaChat(state.ollamaUrl, body, (chunk) => {
        const sse = ndjsonToSse(chunk, carry);
        if (sse)
            res.write(sse);
    }, () => {
        if (carry.buf.trim()) {
            res.write(`data: ${carry.buf.trim()}\n\n`);
        }
        res.write('data: [DONE]\n\n');
        res.end();
    }, (err) => {
        log.err(`ollama chat: ${err.message}`);
        if (!res.headersSent) {
            res.status(502).json({ error: 'Failed to connect to local Ollama' });
        }
        else {
            res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
            res.end();
        }
    });
}
export async function listenBridge(state) {
    const app = createBridgeApp(state);
    return new Promise((resolve, reject) => {
        const server = app.listen(state.port, '0.0.0.0', () => {
            const url = `http://localhost:${state.port}`;
            resolve({ port: state.port, url });
        });
        server.on('error', reject);
    });
}
