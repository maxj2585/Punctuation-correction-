// Punctuation restoration: predicts the mark (. , ? :) that belongs after each word.
// Harper checks the punctuation that is there; it cannot add periods or commas that
// were never typed. This model (kredor/punctuate-all, ONNX build, MIT licence) runs
// on the device through Transformers.js, so text still never leaves the browser.
export const MODEL_ID = 'onnx-community/punctuate-all-ONNX';
const MAX_WORDS = 180;   // keeps each window well under the model's 512-token limit
const OVERLAP = 30;      // words of context carried between windows
const MIN_SCORE = 0.6;   // only offer marks the model is fairly sure of
const OFFERED = new Set(['.', ',', '?']);
const NAMES = { '.': 'period', ',': 'comma', '?': 'question mark' };

export async function createPunctuator(lib, progress) {
  const { AutoTokenizer, AutoModelForTokenClassification, Tensor } = lib;
  const opts = progress ? { progress_callback: progress } : {};
  const tokenizer = await AutoTokenizer.from_pretrained(MODEL_ID, opts);
  const model = await AutoModelForTokenClassification.from_pretrained(MODEL_ID, { ...opts, dtype: 'q8' });
  const labels = model.config.id2label;
  const bos = 0, eos = 2;

  async function predictWindow(words) {
    const ids = [bos], last = [];
    for (const word of words) {
      const pieces = tokenizer.encode(word, { add_special_tokens: false });
      ids.push(...(pieces.length ? pieces : [3]));
      last.push(ids.length - 1);
    }
    ids.push(eos);
    const input_ids = new Tensor('int64', BigInt64Array.from(ids, BigInt), [1, ids.length]);
    const attention_mask = new Tensor('int64', new BigInt64Array(ids.length).fill(1n), [1, ids.length]);
    const { logits } = await model({ input_ids, attention_mask });
    const width = logits.dims[2], data = logits.data;
    return last.map((pos) => {
      const row = Array.from(data.subarray(pos * width, pos * width + width));
      const top = Math.max(...row);
      const exp = row.map((v) => Math.exp(v - top));
      const sum = exp.reduce((a, b) => a + b, 0);
      let best = 0;
      for (let k = 1; k < width; k++) if (exp[k] > exp[best]) best = k;
      return { mark: labels[best], score: exp[best] / sum };
    });
  }

  // chars: the text as an array of Unicode characters (same indexing as Harper spans).
  // Returns issues that insert a mark right after a word that has none.
  return async function punctuate(chars) {
    const words = [];
    const re = /\S+/gu, text = chars.join('');
    let m;
    let cp = 0, lastIndex = 0;
    while ((m = re.exec(text))) {
      cp += Array.from(text.slice(lastIndex, m.index)).length;
      const raw = m[0], rawLen = Array.from(raw).length;
      // Word without surrounding punctuation is what the model reads.
      const core = raw.replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, '');
      const trailing = /[\p{P}\p{S}]$/u.test(raw);
      words.push({ core: core || raw, end: cp + rawLen, trailing });
      cp += rawLen; lastIndex = m.index + raw.length;
    }
    if (!words.length) return [];
    const marks = new Array(words.length).fill(null);
    for (let start = 0; start < words.length; start += MAX_WORDS - OVERLAP) {
      const slice = words.slice(start, start + MAX_WORDS);
      const preds = await predictWindow(slice.map((w) => w.core));
      // Trust a window's prediction except in its final words, where context is cut off.
      const keepUntil = start + MAX_WORDS >= words.length ? slice.length : slice.length - OVERLAP / 2;
      preds.forEach((p, i) => {
        if (i < keepUntil || marks[start + i] === null) marks[start + i] = p;
      });
      if (start + MAX_WORDS >= words.length) break;
    }
    const issues = [];
    words.forEach((word, i) => {
      const p = marks[i];
      if (!p || word.trailing || !OFFERED.has(p.mark) || p.score < MIN_SCORE) return;
      // A comma never ends the text.
      if (i === words.length - 1 && p.mark === ',') return;
      issues.push({
        kind: 'Punctuation',
        start: word.end, end: word.end,
        message: `Add a ${NAMES[p.mark]} after “${word.core}”.`,
        suggestions: [{ kind: 2, text: p.mark, preferred: true }],
        source: 'restore',
      });
    });
    return issues;
  };
}

// Worker-facing helpers: load the model once (lazily, on the first check) and
// return its suggestions for a text. Transformers.js comes from jsDelivr; the
// model weights come from Hugging Face and are cached by the browser after the first load.
const TRANSFORMERS_URL = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js';
let loading = null;
export function loadPunctuationModel(progress) {
  if (!loading) {
    loading = import(TRANSFORMERS_URL).then((lib) => {
      lib.env.allowLocalModels = false;
      return createPunctuator(lib, progress);
    });
    loading.catch(() => { loading = null; });
  }
  return loading;
}
export async function punctuationIssues(text, chars = Array.from(text)) {
  const punctuate = await loadPunctuationModel();
  const issues = await punctuate(chars);
  for (const issue of issues) issue.last = issue.end === chars.length;
  return issues;
}
