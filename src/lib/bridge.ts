/** Client for the local @abhyas/bridge (Ollama proxy on the user's machine). */

export const BRIDGE_STORAGE_KEY = 'abhyas.bridge';

export interface BridgeConfig {
  bridgeUrl: string;
  model: string;
}

export interface BridgeModel {
  name: string;
  size?: number;
}

export interface BridgeHealth {
  status: 'healthy' | 'unhealthy';
  ollama: string;
  model?: string;
  port?: number;
  models: BridgeModel[];
  error?: string;
}

export function normalizeBridgeUrl(raw: string): string {
  let url = raw.trim().replace(/\/+$/, '');
  if (!url) return '';
  if (!/^https?:\/\//i.test(url)) {
    url = `http://${url}`;
  }
  return url;
}

export function loadBridgeConfig(): BridgeConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(BRIDGE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BridgeConfig;
    if (!parsed?.bridgeUrl) return null;
    return {
      bridgeUrl: normalizeBridgeUrl(parsed.bridgeUrl),
      model: parsed.model || '',
    };
  } catch {
    return null;
  }
}

export function saveBridgeConfig(config: BridgeConfig): void {
  const payload: BridgeConfig = {
    bridgeUrl: normalizeBridgeUrl(config.bridgeUrl),
    model: config.model || '',
  };
  localStorage.setItem(BRIDGE_STORAGE_KEY, JSON.stringify(payload));
}

export async function checkBridgeHealth(bridgeUrl: string): Promise<BridgeHealth> {
  const base = normalizeBridgeUrl(bridgeUrl);
  const res = await fetch(`${base}/health`, { method: 'GET' });
  const data = (await res.json()) as BridgeHealth;
  if (!res.ok) {
    return {
      status: 'unhealthy',
      ollama: data.ollama || 'disconnected',
      models: data.models || [],
      error: data.error || `Bridge HTTP ${res.status}`,
      model: data.model,
      port: data.port,
    };
  }
  return {
    status: data.status || 'healthy',
    ollama: data.ollama || 'connected',
    model: data.model,
    port: data.port,
    models: data.models || [],
  };
}

export interface InterviewChatParams {
  bridgeUrl: string;
  model: string;
  interviewType: string;
  role: string;
  company: string;
  difficulty: string;
  systemPrompt?: string;
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[];
  signal?: AbortSignal;
  onToken?: (text: string) => void;
}

/** Stream interviewer reply via SSE from POST /interview/chat. Returns full text. */
export async function streamInterviewChat(params: InterviewChatParams): Promise<string> {
  const base = normalizeBridgeUrl(params.bridgeUrl);
  const res = await fetch(`${base}/interview/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: params.signal,
    body: JSON.stringify({
      model: params.model,
      interviewType: params.interviewType,
      role: params.role,
      company: params.company,
      difficulty: params.difficulty,
      systemPrompt: params.systemPrompt,
      messages: params.messages,
    }),
  });

  if (!res.ok) {
    let msg = `Bridge error ${res.status}`;
    try {
      const err = await res.json();
      if (err?.error) msg = err.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }

  if (!res.body) throw new Error('No response body from bridge');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let carry = '';
  let full = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    carry += decoder.decode(value, { stream: true });
    const parts = carry.split('\n\n');
    carry = parts.pop() ?? '';

    for (const part of parts) {
      const lines = part.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        try {
          const json = JSON.parse(payload) as {
            message?: { content?: string };
            error?: string;
          };
          if (json.error) throw new Error(json.error);
          const token = json.message?.content ?? '';
          if (token) {
            full += token;
            params.onToken?.(token);
          }
        } catch (e) {
          if (e instanceof SyntaxError) continue;
          throw e;
        }
      }
    }
  }

  return full.trim();
}

/** Map UI transcript to Ollama chat roles (skip system bot lines). */
export function toChatMessages(
  messages: { sender: 'interviewer' | 'candidate' | 'system'; content: string }[]
): { role: 'user' | 'assistant'; content: string }[] {
  return messages
    .filter((m) => m.sender === 'candidate' || m.sender === 'interviewer')
    .map((m) => ({
      role: m.sender === 'candidate' ? 'user' : 'assistant',
      content: m.content,
    }));
}

export interface TurnScores {
  clarity: number;
  structure: number;
  confidence: number;
  depth: number;
}

/** Score a single Q+A pair (not the full transcript). */
export async function scoreInterviewTurn(params: {
  bridgeUrl: string;
  model: string;
  question: string;
  answer: string;
  interviewType: string;
}): Promise<TurnScores | null> {
  const base = normalizeBridgeUrl(params.bridgeUrl);
  try {
    const res = await fetch(`${base}/interview/score-turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: params.model,
        question: params.question,
        answer: params.answer,
        interviewType: params.interviewType,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { scores?: TurnScores };
    return data.scores ?? null;
  } catch {
    return null;
  }
}

/** Preload the selected model so the first interviewer reply is not a cold start. */
export async function warmBridgeModel(params: {
  bridgeUrl: string;
  model: string;
}): Promise<void> {
  const base = normalizeBridgeUrl(params.bridgeUrl);
  const res = await fetch(`${base}/warm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: params.model }),
  });
  if (!res.ok) {
    let msg = `Could not reach the interviewer (${res.status})`;
    try {
      const err = await res.json();
      if (err?.error) msg = err.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
}

/** Premade closing + short performance line. */
export async function fetchInterviewClosing(params: {
  bridgeUrl: string;
  model: string;
  role: string;
  company: string;
  lastAnswer: string;
  turnScores: TurnScores[];
}): Promise<{ message: string; scores: TurnScores; overall: number }> {
  const base = normalizeBridgeUrl(params.bridgeUrl);
  const res = await fetch(`${base}/interview/closing`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: params.model,
      role: params.role,
      company: params.company,
      lastAnswer: params.lastAnswer,
      turnScores: params.turnScores,
    }),
  });
  if (!res.ok) {
    throw new Error(`Closing failed (${res.status})`);
  }
  return res.json();
}

export function averageScores(turns: TurnScores[]): TurnScores {
  if (turns.length === 0) {
    return { clarity: 72, structure: 72, confidence: 72, depth: 72 };
  }
  const n = turns.length;
  const sum = turns.reduce(
    (a, t) => ({
      clarity: a.clarity + t.clarity,
      structure: a.structure + t.structure,
      confidence: a.confidence + t.confidence,
      depth: a.depth + t.depth,
    }),
    { clarity: 0, structure: 0, confidence: 0, depth: 0 }
  );
  return {
    clarity: Math.round(sum.clarity / n),
    structure: Math.round(sum.structure / n),
    confidence: Math.round(sum.confidence / n),
    depth: Math.round(sum.depth / n),
  };
}
