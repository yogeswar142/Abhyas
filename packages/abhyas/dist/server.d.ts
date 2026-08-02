export interface BridgeState {
    ollamaUrl: string;
    selectedModel: string;
    port: number;
}
/** Periodically re-touch the selected model so Ollama does not unload it. */
export declare function startModelKeepAlive(state: BridgeState): NodeJS.Timeout;
export declare function createBridgeApp(state: BridgeState): import("express-serve-static-core").Express;
export declare function listenBridge(state: BridgeState): Promise<{
    port: number;
    url: string;
}>;
