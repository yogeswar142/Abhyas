import http from 'http';
export declare const DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434";
/** Keep selected model loaded in VRAM between turns. */
export declare const OLLAMA_KEEP_ALIVE = "45m";
export interface OllamaModel {
    name: string;
    size?: number;
    modified_at?: string;
}
export declare function detectOllama(baseUrl?: string): Promise<{
    ok: boolean;
    models: OllamaModel[];
    error?: string;
}>;
export declare function streamOllamaChat(baseUrl: string, body: Record<string, unknown>, onChunk: (chunk: Buffer) => void, onEnd: () => void, onError: (err: Error) => void): http.ClientRequest;
/** Non-streaming Ollama chat — best for tiny JSON / one-liner tasks. */
export declare function chatOllamaOnce(baseUrl: string, body: Record<string, unknown>): Promise<string>;
/** Load model into memory without a real interview reply. */
export declare function warmOllamaModel(baseUrl: string, model: string): Promise<void>;
/** Convert Ollama NDJSON line buffer into SSE data frames. */
export declare function ndjsonToSse(chunk: Buffer, carry: {
    buf: string;
}): string;
