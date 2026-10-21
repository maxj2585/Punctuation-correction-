let engineCorrect = null;

try {
  const engine = await import('./engine/harper_engine.js');
  engineCorrect = engine.correct;
} catch (error) {
  // Fall back to lightweight punctuation heuristics if the engine cannot load.
}

self.onmessage = (event) => {
  const data = event.data;
  if (!data || data.type !== 'check') return;

  const text = String(data.text ?? '');
  let corrected = text;

  if (typeof engineCorrect === 'function') {
    try {
      corrected = String(engineCorrect(text));
    } catch (error) {
      corrected = text;
    }
  }

  const corrections = [];
  if (corrected !== text) {
    let start = 0;
    while (start < text.length && start < corrected.length && text[start] === corrected[start]) start++;
    let oldEnd = text.length;
    let newEnd = corrected.length;
    while (oldEnd > start && newEnd > start && text[oldEnd - 1] === corrected[newEnd - 1]) {
      oldEnd--;
      newEnd--;
    }
    corrections.push({ start, end: oldEnd, replace: corrected.slice(start, newEnd) });
  } else if (text.trim() && !/[.!?…]["'”’)]*\s*$/.test(text)) {
    const end = text.length;
    const trailingWhitespace = text.match(/\s*$/)?.[0] ?? '';
    const boundary = end - trailingWhitespace.length;
    if (boundary > 0 && /[\p{L}\p{N}]$/u.test(text.slice(0, boundary))) {
      corrections.push({ start: boundary, end: boundary, replace: '.' });
    }
  }

  self.postMessage({ type: 'result', corrections });
};
