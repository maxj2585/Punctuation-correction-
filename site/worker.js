self.onmessage = (event) => {
  const data = event.data;
  const original = typeof data === 'string' ? data : (data && (data.text ?? data.input)) ?? '';
  let corrected = String(original);

  // Capitalize the first letter of the text and the first letter after sentence-ending punctuation.
  corrected = corrected.replace(/(^|[.!?]\s+)(["'“‘([{]*\s*)([a-z])/g, (_match, boundary, opening, letter) =>
    boundary + opening + letter.toUpperCase()
  );

  // Turn sentences beginning with a question word/auxiliary into questions.
  const questionStarter = /^(?:who|what|when|where|why|how|is|are|do|does|can)\b/i;
  corrected = corrected.split(/(?<=[.!?])(?=\s)/).map((sentence) => {
    const leading = sentence.match(/^\s*/)[0];
    const body = sentence.slice(leading.length);
    if (!questionStarter.test(body)) return sentence;

    const trailing = body.match(/[\]})"'”’]*\s*$/)[0];
    const core = body.slice(0, body.length - trailing.length);
    const withoutEndMark = core.replace(/[.!?]+$/, '');
    return leading + withoutEndMark + '?' + trailing;
  }).join('');

  // Return the corrected text to the page; keep the raw string as the response for simple clients.
  postMessage({ type: 'corrected', text: corrected, correctedText: corrected });
};
