import http from 'http';

export const DEFAULT_OLLAMA_URL = 'http://127.0.0.1:11434';
/** Keep selected model loaded in VRAM between turns. */
export const OLLAMA_KEEP_ALIVE = '45m';

export interface OllamaModel {
  name: string;
  size?: number;
  modified_at?: string;
}

export async function detectOllama(baseUrl = DEFAULT_OLLAMA_URL): Promise<{
  ok: boolean;
  models: OllamaModel[];
  error?: string;
}> {
  try {
    const res = await fetch(`${baseUrl}/api/tags`);
    if (!res.ok) {
      return { ok: false, models: [], error: `Ollama HTTP ${res.status}` };
    }
    const data = (await res.json()) as { models?: OllamaModel[] };
    return { ok: true, models: data.models ?? [] };
  } catch {
    return {
      ok: false,
      models: [],
      error: 'Ollama is not running. Launch the Ollama app first.',
    };
  }
}

function withKeepAlive(body: Record<string, unknown>): Record<string, unknown> {
  return {
    ...body,
    keep_alive: body.keep_alive ?? OLLAMA_KEEP_ALIVE,
  };
}

export function streamOllamaChat(
  baseUrl: string,
  body: Record<string, unknown>,
  onChunk: (chunk: Buffer) => void,
  onEnd: () => void,
  onError: (err: Error) => void
): http.ClientRequest {
  const payload = JSON.stringify(withKeepAlive({ ...body, stream: true }));
  const url = new URL('/api/chat', baseUrl);

  const req = http.request(
    {
      hostname: url.hostname,
      port: url.port || 11434,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    },
    (res) => {
      res.on('data', onChunk);
      res.on('end', onEnd);
    }
  );

  req.on('error', (err) => onError(err));
  req.write(payload);
  req.end();
  return req;
}

/** Non-streaming Ollama chat — best for tiny JSON / one-liner tasks. */
export async function chatOllamaOnce(
  baseUrl: string,
  body: Record<string, unknown>
): Promise<string> {
  const res = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withKeepAlive({ ...body, stream: false })),
  });
  if (!res.ok) {
    throw new Error(`Ollama chat failed (${res.status})`);
  }
  const data = (await res.json()) as { message?: { content?: string } };
  return (data.message?.content || '').trim();
}

/** Load model into memory without a real interview reply. */
export async function warmOllamaModel(
  baseUrl: string,
  model: string
): Promise<void> {
  const res = await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt: '',
      stream: false,
      keep_alive: OLLAMA_KEEP_ALIVE,
    }),
  });
  if (!res.ok) {
    throw new Error(`Failed to warm model (${res.status})`);
  }
  await res.json().catch(() => null);
}

/** Convert Ollama NDJSON line buffer into SSE data frames. */
export function ndjsonToSse(chunk: Buffer, carry: { buf: string }): string {
  carry.buf += chunk.toString('utf8');
  const lines = carry.buf.split('\n');
  carry.buf = lines.pop() ?? '';
  let out = '';
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    out += `data: ${trimmed}\n\n`;
  }
  return out;
}
