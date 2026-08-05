import { WebSocket } from 'ws';
const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EA01470597E3F5183064AF59';
function generateRequestId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
/** Synthesize audio buffer using Microsoft Edge Read Aloud WebSocket API. */
export async function synthesizeEdgeTts(options) {
    const voice = options.voice || 'en-US-AvaNeural';
    const rate = options.rate || '+0%';
    const pitch = options.pitch || '+0Hz';
    const volume = options.volume || '+0%';
    const requestId = generateRequestId();
    const wsUrl = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&Sec-MS-GEC=1&Sec-MS-GEC-Version=1-130.0.2849.68`;
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(wsUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept-Language': 'en-US,en;q=0.9',
                Pragma: 'no-cache',
            },
        });
        const audioBuffers = [];
        let isCompleted = false;
        const timeoutTimer = setTimeout(() => {
            if (!isCompleted) {
                isCompleted = true;
                ws.close();
                reject(new Error('Edge-TTS websocket request timed out'));
            }
        }, 12000);
        ws.on('open', () => {
            const configHeader = `X-Timestamp:${new Date().toISOString()}\r\n` +
                `Content-Type:application/json; charset=utf-8\r\n` +
                `Path:speech.config\r\n\r\n` +
                JSON.stringify({
                    context: {
                        synthesis: {
                            audio: {
                                metadataversion: 'A2Mv1',
                                wordmatchingmode: 'MicrosoftServer',
                            },
                        },
                    },
                });
            ws.send(configHeader);
            const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>` +
                `<voice name='${voice}'>` +
                `<prosody pitch='${pitch}' rate='${rate}' volume='${volume}'>` +
                `${options.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}` +
                `</prosody>` +
                `</voice>` +
                `</speak>`;
            const ssmlHeader = `X-RequestId:${requestId}\r\n` +
                `Content-Type:application/ssml+xml\r\n` +
                `Path:ssml\r\n\r\n` +
                ssml;
            ws.send(ssmlHeader);
        });
        ws.on('message', (data, isBinary) => {
            if (isBinary) {
                const buffer = Buffer.from(data);
                // Header length is encoded in the first 2 bytes as BigEndian unsigned int
                if (buffer.length > 2) {
                    const headerLength = buffer.readUInt16BE(0);
                    const audioChunk = buffer.subarray(2 + headerLength);
                    if (audioChunk.length > 0) {
                        audioBuffers.push(audioChunk);
                    }
                }
            }
            else {
                const text = data.toString('utf8');
                if (text.includes('Path:turn.end')) {
                    isCompleted = true;
                    clearTimeout(timeoutTimer);
                    ws.close();
                    resolve(Buffer.concat(audioBuffers));
                }
            }
        });
        ws.on('error', (err) => {
            if (!isCompleted) {
                isCompleted = true;
                clearTimeout(timeoutTimer);
                reject(err);
            }
        });
        ws.on('close', () => {
            if (!isCompleted) {
                isCompleted = true;
                clearTimeout(timeoutTimer);
                if (audioBuffers.length > 0) {
                    resolve(Buffer.concat(audioBuffers));
                }
                else {
                    reject(new Error('Edge-TTS connection closed before receiving audio'));
                }
            }
        });
    });
}
