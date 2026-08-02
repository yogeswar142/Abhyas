export declare function isPortFree(port: number, host?: string): Promise<boolean>;
/** Prefer `preferred`, then scan preferred+1 … preferred+range. */
export declare function findFreePort(preferred?: number, range?: number): Promise<number>;
