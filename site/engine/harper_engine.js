// Lightweight punctuation-only engine. Deliberately self-contained: no imports or WASM.
const punctuationCorrect = (input) => {
  if (typeof input !== "string") return input;
  let text = input.replace(/[ \t]+([,.:?])/g, "$1").replace(/([,.:?])(?=\S)/g, "$1 ").trim();
  if (!text) return text;
  if (!/[.!?:]$/.test(text)) {
    const first = text.split(/\s+/)[0].toLowerCase();
    const mark = /^(who|what|when|where|why|how|is|are|am|can|could|would|will|do|does|did|have|has)$/.test(first) ? "?" : ".";
    text += mark;
  }
  return text;
};
function correct(text) { return punctuationCorrect(text); }
function lint(text) {
  if (typeof text !== "string" || !text.trim()) return [];
  const corrected = punctuationCorrect(text);
  if (corrected === text) return [];
  return [{ start: 0, end: text.length, length: text.length, message: "Review punctuation", description: "Review punctuation", kind: " punctuation", replacement: corrected, corrections: [{ kind: "Replace", value: corrected }], isCorrect: false }];
}
export { lint, correct };
export default { lint, correct };
