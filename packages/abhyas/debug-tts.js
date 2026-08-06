import { WebSocket } from 'ws';
import crypto from 'crypto';

const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';

function generateSecMsGec() {
  const WIN_EPOCH = 11644473600n;
  const nowSec = BigInt(Math.floor(Date.now() / 1000));
  const totalSec = nowSec + WIN_EPOCH;
  const roundedSec = totalSec - (totalSec % 300n);
  const fileTimeTicks = roundedSec * 10000000n;
  const strToHash = `${fileTimeTicks}${TRUSTED_CLIENT_TOKEN}`;
  return crypto.createHash('sha256').update(strToHash, 'ascii').digest('hex').toUpperCase();
}

async function debugEdgeTts() {
  const secMsGec = generateSecMsGec();
  const muid = crypto.randomBytes(16).toString('hex').toUpperCase();
  const wsUrl = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&Sec-MS-GEC=${secMsGec}&Sec-MS-GEC-Version=1-143.0.3650.75`;

  console.log('Connecting to:', wsUrl);

  const ws = new WebSocket(wsUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept-Language': 'en-US,en;q=0.9',
      Pragma: 'no-cache',
      'Cache-Control': 'no-cache',
      Origin: 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
      Cookie: `muid=${muid};`,
    },
  });

  ws.on('open', () => {
    console.log('WebSocket OPEN!');
    const configHeader =
      `X-Timestamp:${new Date().toISOString()}\r\n` +
      `Content-Type:application/json; charset=utf-8\r\n` +
      `Path:speech.config\r\n\r\n` +
      JSON.stringify({
        context: {
          synthesis: {
            audio: {
              metadataversion: 'A2Mv1',
              wordmatchingmode: 'MicrosoftServer',
              outputformat: 'audio-24khz-48kbitrate-mono-mp3',
            },
          },
        },
      });

    ws.send(configHeader);

    const ssml =
      `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>` +
      `<voice name='en-US-AvaNeural'>` +
      `<prosody pitch='+0Hz' rate='+0%' volume='+0%'>` +
      `Hello, welcome to your interview.` +
      `</prosody>` +
      `</voice>` +
      `</speak>`;

    const ssmlHeader =
      `X-RequestId:${crypto.randomUUID().replace(/-/g, '')}\r\n` +
      `Content-Type:application/ssml+xml\r\n` +
      `Path:ssml\r\n\r\n` +
      ssml;

    ws.send(ssmlHeader);
  });

  ws.on('message', (data, isBinary) => {
    if (isBinary) {
      console.log('Received binary audio chunk length:', Buffer.from(data).length);
    } else {
      console.log('Received text message:', data.toString());
    }
  });

  ws.on('error', (err) => {
    console.error('WS Error:', err);
  });

  ws.on('close', (code, reason) => {
    console.log('WS Close code:', code, 'reason:', reason.toString());
  });
}

debugEdgeTts();
