import express from 'express';
import cors from 'cors';
import {
  detectOllama,
  ndjsonToSse,
  streamOllamaChat,
  chatOllamaOnce,
  warmOllamaModel,
  OLLAMA_KEEP_ALIVE,
} from './ollama.js';
import {
  buildInterviewerSystemPrompt,
  defaultGenerationOptions,
  buildTurnScorePrompt,
  parseTurnScores,
  buildClosingBlurbPrompt,
  pickClosingPreset,
  averageTurnScores,
  type TurnScores,
} from './prompts/interviewer.js';
import { log } from './logger.js';

export interface BridgeState {
  ollamaUrl: string;
  selectedModel: string;
  port: number;
}

const KEEP_ALIVE_MS = 4 * 60 * 1000;

/** Periodically re-touch the selected model so Ollama does not unload it. */
export function startModelKeepAlive(state: BridgeState): NodeJS.Timeout {
  const tick = () => {
    if (!state.selectedModel) return;
    void warmOllamaModel(state.ollamaUrl, state.selectedModel).catch((err) => {
      log.warn(`keepalive: ${err instanceof Error ? err.message : String(err)}`);
    });
  };
  tick();
  return setInterval(tick, KEEP_ALIVE_MS);
}

export function createBridgeApp(state: BridgeState) {
  const app = express();

  app.use(
    cors({
      origin: '*',
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type'],
    })
  );
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
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.err(`warm: ${msg}`);
      return res.status(502).json({ error: 'Failed to warm interviewer' });
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
    const {
      model,
      messages,
      interviewType = 'custom',
      role = 'Software Engineer',
      company = 'Company',
      difficulty = 'medium',
      options,
    } = req.body ?? {};

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Missing messages array' });
    }

    const useModel = (typeof model === 'string' && model) || state.selectedModel;
    if (!useModel) {
      return res.status(400).json({ error: 'No model selected. Restart bridge and pick a model.' });
    }

    const system = buildInterviewerSystemPrompt({
      interviewType,
      role,
      company,
      difficulty,
    });

    const stripped = messages.filter(
      (m: { role?: string }) => m && m.role !== 'system'
    );
    const fullMessages = [{ role: 'system', content: system }, ...stripped];
    const gen = {
      ...defaultGenerationOptions(difficulty),
      ...(options && typeof options === 'object' ? options : {}),
    };

    log.info(`interview · ${useModel} · ${interviewType}/${difficulty}`);
    pipeSseChat(res, state, { model: useModel, messages: fullMessages, options: gen });
  });

  /** Score one Q+A only (fast) — do not send full transcript. */
  app.post('/interview/score-turn', async (req, res) => {
    const {
      model,
      question,
      answer,
      interviewType = 'custom',
    } = req.body ?? {};

    if (!question || !answer) {
      return res.status(400).json({ error: 'Missing question or answer' });
    }

    const useModel = (typeof model === 'string' && model) || state.selectedModel;
    if (!useModel) {
      return res.status(400).json({ error: 'No model selected' });
    }

    const prompt = buildTurnScorePrompt(String(question), String(answer), String(interviewType));
    log.info(`score-turn · ${useModel}`);

    try {
      const raw = await chatOllamaOnce(state.ollamaUrl, {
        model: useModel,
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
        options: prompt.options,
      });
      const scores = parseTurnScores(raw) ?? {
        clarity: 74,
        structure: 72,
        confidence: 73,
        depth: 71,
      };
      return res.json({ scores, raw });
    } catch (err) {
      log.err(`score-turn: ${err instanceof Error ? err.message : String(err)}`);
      return res.status(502).json({ error: 'Failed to score turn' });
    }
  });

  /** Premade closing + one short model performance sentence. */
  app.post('/interview/closing', async (req, res) => {
    const {
      model,
      role = 'Software Engineer',
      company = 'Company',
      lastAnswer = '',
      turnScores = [],
    } = req.body ?? {};

    const useModel = (typeof model === 'string' && model) || state.selectedModel;
    if (!useModel) {
      return res.status(400).json({ error: 'No model selected' });
    }

    const avg = averageTurnScores(Array.isArray(turnScores) ? (turnScores as TurnScores[]) : []);
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
      if (cleaned && cleaned.length < 160) blurb = cleaned;
    } catch (err) {
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

function pipeSseChat(
  res: express.Response,
  state: BridgeState,
  body: { model: string; messages: unknown; options?: unknown }
) {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const carry = { buf: '' };

  streamOllamaChat(
    state.ollamaUrl,
    body,
    (chunk) => {
      const sse = ndjsonToSse(chunk, carry);
      if (sse) res.write(sse);
    },
    () => {
      if (carry.buf.trim()) {
        res.write(`data: ${carry.buf.trim()}\n\n`);
      }
      res.write('data: [DONE]\n\n');
      res.end();
    },
    (err) => {
      log.err(`ollama chat: ${err.message}`);
      if (!res.headersSent) {
        res.status(502).json({ error: 'Failed to connect to local Ollama' });
      } else {
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.end();
      }
    }
  );
}

export async function listenBridge(
  state: BridgeState
): Promise<{ port: number; url: string }> {
  const app = createBridgeApp(state);
  return new Promise((resolve, reject) => {
    const server = app.listen(state.port, '0.0.0.0', () => {
      const url = `http://localhost:${state.port}`;
      resolve({ port: state.port, url });
    });
    server.on('error', reject);
  });
}
