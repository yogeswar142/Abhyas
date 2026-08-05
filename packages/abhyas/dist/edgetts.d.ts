export interface EdgeTtsOptions {
    text: string;
    voice?: string;
    rate?: string;
    pitch?: string;
    volume?: string;
}
/** Synthesize audio buffer using Microsoft Edge Read Aloud WebSocket API. */
export declare function synthesizeEdgeTts(options: EdgeTtsOptions): Promise<Buffer>;
