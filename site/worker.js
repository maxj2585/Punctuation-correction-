import init, { Linter, Dialect, Language } from './engine/harper_wasm.js';
let linter;
try { await init(); linter = Linter.new(Dialect.American); postMessage({ type: 'ready' }); }
catch (error) { postMessage({ type: 'fatal', error: String(error) }); }

// Harper lint kinds that are punctuation-related by category.
const PUNCTUATION_KINDS = /punctuation|formatting|spacing|capitalization/i;
// Messages that describe a punctuation or spacing problem, whatever the kind.
const PUNCTUATION_MESSAGE = /punctuat|comma|period|full stop|apostrophe|quotation|quote mark|hyphen|dash|colon|semicolon|ellipsis|question mark|exclamation|bracket|parenthes|spac(e|ing)|whitespace|capitaliz|uppercase/i;
// Strip punctuation, symbols, and whitespace so we can tell if a fix only touches those.
const stripPunctuation = (value) => value.replace(/[\p{P}\p{S}\p{Z}\s]/gu, '');

// Returns true when every suggestion changes only punctuation or whitespace.
function isPunctuationOnlyFix(flagged, suggestions) {
  if (!suggestions.length) return false;
  const base = stripPunctuation(flagged);
  return suggestions.every(({ kind, text }) => {
    if (kind === 1) return base === ''; // Remove: only punctuation/space was flagged
    if (kind === 2) return stripPunctuation(text) === ''; // InsertAfter: inserting punctuation/space only
    return stripPunctuation(text) === base; // Replace: letters unchanged
  });
}

// True when the writing ends without terminal punctuation, ignoring closing quotes and brackets.
function missingEndPunctuation(text) {
  const trimmed = text.replace(/[\s"'”’»)\]]+$/u, '');
  if (!trimmed) return false;
  return /[\p{L}\p{N}]/u.test(trimmed.slice(-1));
}

// Purdue OWL and the TAMU Twelve Guidelines: one end mark per sentence, never a stack.
// "?!" stays acceptable, so flag only doubled identical marks or runs of three or more.
function repeatedEndMarkIssues(chars, issues) {
  let i = 0;
  while (i < chars.length) {
    if (chars[i] !== '?' && chars[i] !== '!') { i += 1; continue; }
    let j = i;
    while (j < chars.length && (chars[j] === '?' || chars[j] === '!')) j += 1;
    const uniform = chars[i] === chars[j - 1];
    if (j - i >= 3 || (j - i === 2 && uniform)) {
      issues.push({
        kind: 'Punctuation',
        start: i, end: j,
        message: 'Use only one end punctuation mark.',
        suggestions: [{ kind: 0, text: chars.slice(i, j).includes('?') ? '?' : '!' }],
      });
    }
    i = j;
  }
}

// A comma or colon must be followed by a space before the next word; the engine
// already covers . ! ? ;. Digits stay untouched (1,000, 9:30), and URLs fail the
// letter test on their own (https://). Skip a spot the engine already flagged so
// the same fix never shows twice.
function missingSpaceIssues(chars, issues) {
  const covered = new Set(issues
    .filter(({ suggestions }) => suggestions.some((s) => s.kind === 2 && s.text === ' '))
    .map((issue) => issue.start));
  for (let i = 0; i < chars.length - 1; i += 1) {
    const mark = chars[i];
    if (mark !== ',' && mark !== ':') continue;
    if (!/\p{L}/u.test(chars[i + 1])) continue;
    if (covered.has(i + 1)) continue;
    issues.push({
      kind: 'Punctuation',
      start: i + 1, end: i + 1,
      message: `Add a space after the ${mark === ',' ? 'comma' : 'colon'}.`,
      suggestions: [{ kind: 2, text: ' ' }],
    });
  }
}

onmessage = ({ data }) => {
  if (!linter) return;
  try {
    const raw = linter.lint(data.text, Language.Plain, false, undefined, true, false);
    // Harper spans count Unicode characters, so slice by code point.
    const chars = data.mode === 'punctuation' ? Array.from(data.text) : null;
    const issues = [];
    for (const lint of raw) {
      try {
        const kind = lint.lint_kind();
        const message = lint.message();
        const span = lint.span();
        let start, end;
        try { start = span.start; end = span.end; } finally { span.free(); }
        const suggestions = lint.suggestions().map((suggestion) => {
          try { return { kind: suggestion.kind(), text: suggestion.get_replacement_text() }; }
          finally { suggestion.free(); }
        });
        if (data.mode === 'punctuation') {
          const flagged = chars.slice(start, end).join('');
          const related = PUNCTUATION_KINDS.test(kind)
            || PUNCTUATION_MESSAGE.test(message)
            || isPunctuationOnlyFix(flagged, suggestions);
          if (!related) continue;
          // "word.." at the end of a sentence needs one dot, not three;
          // offer the single-dot fix next to the engine's ellipsis suggestion.
          if (flagged === '..' && suggestions.some((s) => s.text === '...')) {
            suggestions.push({ kind: 0, text: '.' });
          }
        }
        issues.push({ kind, start, end, message, suggestions });
      } finally { lint.free(); }
    }
    if (data.mode === 'punctuation') {
      repeatedEndMarkIssues(chars, issues);
      missingSpaceIssues(chars, issues);
      // Suggest the missing period when punctuation mode leaves the text without an ending mark.
      if (missingEndPunctuation(data.text)) {
        issues.push({
          kind: 'Punctuation',
          start: chars.length,
          end: chars.length,
          message: 'This text is missing its ending punctuation.',
          suggestions: [{ kind: 2, text: '.' }],
        });
      }
    }
    postMessage({ type: 'results', id: data.id, issues });
  } catch (error) { postMessage({ type: 'error', id: data.id, error: String(error) }); }
};
