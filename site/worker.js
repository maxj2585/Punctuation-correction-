import { correct } from './engine/harper_engine.js';

self.onmessage = (event) => {
  const data = event.data;
  const original = typeof data === 'string' ? data : (data && (data.text ?? data.input)) ?? '';
  const corrected = correct(String(original));
  postMessage({ type: 'corrected', text: corrected, correctedText: corrected });
};
