import init, { Linter, Dialect, Language } from './engine/harper_wasm.js';
let linter;
try { await init(); linter = Linter.new(Dialect.American); postMessage({ type: 'ready' }); }
catch (error) { postMessage({ type: 'fatal', error: String(error) }); }
onmessage = ({ data }) => {
  if (!linter) return;
  try {
    const raw = linter.lint(data.text, Language.Plain, false, undefined, true, false);
    const issues = [];
    for (const lint of raw) {
      try {
        const kind = lint.lint_kind();
        if (data.mode === 'punctuation' && !/punctuation|spacing/i.test(kind)) continue;
        const span = lint.span();
        let start, end;
        try { start = span.start; end = span.end; } finally { span.free(); }
        const suggestions = lint.suggestions().map((suggestion) => {
          try { return { kind: suggestion.kind(), text: suggestion.get_replacement_text() }; }
          finally { suggestion.free(); }
        });
        issues.push({ kind, start, end, message: lint.message(), suggestions });
      } finally { lint.free(); }
    }
    postMessage({ type: 'results', id: data.id, issues });
  } catch (error) { postMessage({ type: 'error', id: data.id, error: String(error) }); }
};
