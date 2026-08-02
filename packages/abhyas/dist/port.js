import net from 'net';
export async function isPortFree(port, host = '127.0.0.1') {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.once('error', () => resolve(false));
        server.once('listening', () => {
            server.close(() => resolve(true));
        });
        server.listen(port, host);
    });
}
/** Prefer `preferred`, then scan preferred+1 … preferred+range. */
export async function findFreePort(preferred = 11435, range = 10) {
    for (let i = 0; i <= range; i++) {
        const port = preferred + i;
        if (await isPortFree(port))
            return port;
    }
    throw new Error(`No free port in ${preferred}–${preferred + range}`);
}
