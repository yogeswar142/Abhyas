import { synthesizeEdgeTts } from './dist/edgetts.js';

async function test() {
  console.log('Testing Edge-TTS synthesis...');
  try {
    const audio = await synthesizeEdgeTts({ text: 'Hello, this is a test of Edge Text to Speech.' });
    console.log('SUCCESS! Audio buffer size:', audio.length, 'bytes');
  } catch (err) {
    console.error('ERROR:', err);
  }
}

test();
