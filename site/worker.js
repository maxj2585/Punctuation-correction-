import init, { Linter, Dialect, Language } from './engine/harper_wasm.js';
let linter;
try { await init(); linter = Linter.new(Dialect.American); postMessage({ type: 'ready' }); }
catch (error) { postMessage({ type: 'fatal', error: String(error) }); }

// Harper lint kinds that are punctuation-related by category.
const PUNCTUATION_KINDS = /punctuation|formatting|spacing/i;
// Messages that describe a punctuation or spacing problem, whatever the kind.
const PUNCTUATION_MESSAGE = /punctuat|comma|period|full stop|apostrophe|quotation|quote mark|hyphen|dash|colon|semicolon|ellipsis|question mark|exclamation|bracket|parenthes|spac(e|ing)|whitespace/i;
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
        }
        issues.push({ kind, start, end, message, suggestions });
      } finally { lint.free(); }
    }
    postMessage({ type: 'results', id: data.id, issues });
  } catch (error) { postMessage({ type: 'error', id: data.id, error: String(error) }); }
};
