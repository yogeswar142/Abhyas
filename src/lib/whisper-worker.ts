// whisper-worker.ts
// NOTE: This runs inside a Web Worker when bundled.
// Production interview STT uses public/whisper-worker.js (static) — keep logic aligned.

let pipelineInstance: any = null;
let pipelineLoading: Promise<any> | null = null;

const HALLUCINATIONS = [
  /^thank you for watching\.?$/i,
  /^thanks for watching\.?$/i,
  /^thank you\.?$/i,
  /^thanks\.?$/i,
  /^you\.?$/i,
  /^bye\.?$/i,
  /^goodbye\.?$/i,
  /^subscribe\.?$/i,
  /^please subscribe\.?$/i,
  /^\[?\s*blank(?:\s+audio)?\s*\]?\.?$/i,
  /^\.+$/,
];

function cleanTranscript(raw: string): string {
  let text = (raw ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  text = text.replace(/^["'`]+|["'`]+$/g, '').trim();
  if (HALLUCINATIONS.some((re) => re.test(text))) return '';
  return text;
}

async function getPipeline(progress_callback?: (x: any) => void): Promise<any> {
  if (pipelineInstance !== null) return pipelineInstance;
  if (pipelineLoading !== null) return pipelineLoading;

  pipelineLoading = (async () => {
    try {
      const transformers = await import('@xenova/transformers');
      const { pipeline, env } = transformers;

      env.allowLocalModels = false;
      env.useBrowserCache = true;

      const instance = await pipeline(
        'automatic-speech-recognition',
        'Xenova/whisper-tiny.en',
        {
          quantized: false,
          progress_callback: progress_callback ?? (() => {}),
        }
      );
      pipelineInstance = instance;
      return instance;
    } catch (err) {
      pipelineLoading = null;
      pipelineInstance = null;
      throw err;
    }
  })();

  return pipelineLoading;
}

self.addEventListener('message', async (event: MessageEvent) => {
  const { type } = event.data;

  if (type === 'load') {
    try {
      await getPipeline((x: any) => {
        if (x && typeof x === 'object') {
          self.postMessage({ type: 'progress', data: x });
        }
      });
      self.postMessage({ type: 'ready' });
    } catch (err: any) {
      self.postMessage({ type: 'error', error: err?.message ?? 'Failed to load Whisper model' });
    }
    return;
  }

  if (type === 'transcribe') {
    try {
      const audioData = event.data.audio;
      if (!audioData || audioData.length === 0) {
        self.postMessage({ type: 'result', text: '' });
        return;
      }

      const transcriber = await getPipeline();
      if (!transcriber) {
        self.postMessage({ type: 'error', error: 'Pipeline not ready' });
        return;
      }

      const output = await transcriber(audioData, {
        chunk_length_s: 20,
        stride_length_s: 3,
        language: 'english',
        task: 'transcribe',
        return_timestamps: false,
        temperature: 0,
        no_repeat_ngram_size: 3,
      });

      const text = cleanTranscript(output?.text ?? '');
      self.postMessage({ type: 'result', text });
    } catch (err: any) {
      console.error('[whisper-worker] transcribe error:', err);
      self.postMessage({ type: 'result', text: '' });
    }
  }
});
