// public/whisper-worker.js
// ES Module worker — loaded as a static file from /public, NOT processed by Turbopack.
// Uses dynamic import() to load transformers.min.js (which uses ES module exports).

let whisperModel = null;
let isLoading = false;

/** whisper-tiny loves inventing these on silence / noise */
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
  /^,…*$/,
];

function cleanTranscript(raw) {
  let text = (raw ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  // Strip leading/trailing quotes Whisper sometimes adds
  text = text.replace(/^["'`]+|["'`]+$/g, '').trim();
  if (HALLUCINATIONS.some((re) => re.test(text))) return '';
  return text;
}

self.onmessage = async function (event) {
  const { type } = event.data;

  if (type === 'load') {
    if (whisperModel !== null) {
      self.postMessage({ type: 'ready' });
      return;
    }
    if (isLoading) return;
    isLoading = true;

    try {
      const { pipeline, env } = await import('/transformers.min.js');

      // Point ALL model fetches to our local /public/models folder — no internet needed
      env.allowLocalModels = true;
      env.localModelPath = '/models/';
      env.useBrowserCache = false;

      // Point ONNX WASM runtime to /public root
      if (env.backends?.onnx?.wasm) {
        env.backends.onnx.wasm.wasmPaths = '/';
      }

      self.postMessage({ type: 'progress', data: { status: 'progress', progress: 5 } });

      // Prefer quantized local files (faster). Fall back to full ONNX if missing.
      whisperModel = await pipeline(
        'automatic-speech-recognition',
        'Xenova/whisper-tiny.en',
        {
          quantized: true,
          local_files_only: true,
          progress_callback: (x) => {
            if (x && typeof x === 'object') {
              self.postMessage({ type: 'progress', data: x });
            }
          },
        }
      );

      isLoading = false;
      self.postMessage({ type: 'ready' });
    } catch (err) {
      isLoading = false;
      whisperModel = null;
      const msg = err?.message ?? String(err);
      console.error('[whisper-worker] load error:', msg);
      self.postMessage({ type: 'error', error: msg });
    }
    return;
  }

  if (type === 'transcribe') {
    const audioData = event.data.audio;
    if (!audioData || audioData.length === 0) {
      self.postMessage({ type: 'result', text: '' });
      return;
    }
    if (!whisperModel) {
      self.postMessage({ type: 'error', error: 'Model not ready' });
      return;
    }
    try {
      const output = await whisperModel(audioData, {
        // Short clips from VAD — avoid long-chunk overhead/hallucinations
        chunk_length_s: 20,
        stride_length_s: 3,
        language: 'english',
        task: 'transcribe',
        return_timestamps: false,
        // Greedy decode is more stable for short interview answers
        temperature: 0,
        no_repeat_ngram_size: 3,
      });
      const text = cleanTranscript(output?.text ?? '');
      self.postMessage({ type: 'result', text });
    } catch (err) {
      console.error('[whisper-worker] transcribe error:', err);
      // Always reply so the UI unlocks processingRef
      self.postMessage({ type: 'result', text: '' });
    }
  }
};
