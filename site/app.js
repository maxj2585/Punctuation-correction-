const $ = (id) => document.getElementById(id);
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch((error) => console.error('Offline cache unavailable.', error));
}
const text = $('text');
let worker = null;
try { worker = new Worker(new URL('./worker.js?v=8', import.meta.url), { type: 'module' }); }
catch { worker = null; }
let ready = false, revision = 0, pending = null, history = [], autoFix = false, fixBudget = 0;
const status = (message) => { $('status').textContent = message; };
const engineDead = () => {
  ready = false; pending = null;
  $('check').disabled = true; $('check').textContent = 'Engine unavailable';
  $('fixall').disabled = true;
  status('This browser cannot start the engine. Reload, or try a current Chrome, Safari, Edge or Firefox.');
};
setTimeout(() => { if (!ready) status('Still loading the engine. If this message stays, reload the page or try another browser.'); }, 30000);
if (!worker) engineDead();
function invalidate() {
  revision++; pending = null;
  $('check').disabled = !ready; $('check').textContent = ready ? 'Check text' : 'Loading engine…';
  $('fixall').disabled = !ready;
  $('undo').disabled = !history.length;
  const value = text.value;
  $('count').textContent = `${value.trim() ? value.trim().split(/\s+/u).length : 0} words · ${value.length} characters`;
  $('results').replaceChildren(); $('results').textContent = 'Check your text to see current suggestions.';
}
function check() {
  if (!ready || pending) return;
  if (!text.value.trim()) { status('Add some text first.'); return; }
  const id = ++revision;
  pending = { id, source: text.value };
  $('check').disabled = true; $('check').textContent = 'Checking…';
  status(autoFix ? 'Fixing everything on your device…' : 'Checking on your device…');
  worker.postMessage({ id, text: text.value, mode: $('mode').value });
}
function applyFix(source, uStart, uEnd, suggestion) {
  history.push(source); if (history.length > 30) history.shift();
  const start = suggestion.kind === 2 ? uEnd : uStart;
  text.value = source.slice(0, start) + suggestion.text + source.slice(uEnd);
  invalidate(); status('Correction applied.'); check();
}
if (worker) worker.onmessage = ({ data }) => {
  if (data.type === 'ready') { ready = true; invalidate(); status('Ready. Your writing stays on your device.'); return; }
  if (data.type === 'fatal') { autoFix = false; status('Engine could not load. Reload to retry.'); console.error(data.error); return; }
  if (!pending || data.id !== pending.id || data.id !== revision) return;
  const { source, id } = pending; pending = null;
  $('check').disabled = false; $('check').textContent = 'Check text';
  if (data.type === 'error') { autoFix = false; status('Checking failed. Try again.'); console.error(data.error); return; }
  $('results').replaceChildren();
  // Worker spans count Unicode characters; strings count UTF-16 units. Map once per result.
  const cps = Array.from(source);
  const offsets = new Uint32Array(cps.length + 1);
  for (let i = 0; i < cps.length; i++) offsets[i + 1] = offsets[i] + cps[i].length;
  const to16 = (index) => offsets[Math.min(Math.max(index, 0), cps.length)];
  const mapped = [];
  for (const issue of data.issues) {
    const uStart = to16(issue.start), uEnd = to16(issue.end);
    mapped.push({ uStart, uEnd, suggestions: issue.suggestions });
    const card = document.createElement('article'); card.className = 'issue';
    const kind = document.createElement('small'); kind.textContent = issue.kind;
    const message = document.createElement('p'); message.textContent = issue.message;
    const context = document.createElement('p'); context.textContent = `Passage: ${source.slice(Math.max(0, uStart - 25), Math.min(source.length, uEnd + 25))}`;
    card.append(kind, message, context);
    const buttons = document.createElement('div'); buttons.className = 'buttons';
    for (const suggestion of issue.suggestions) {
      const button = document.createElement('button');
      button.textContent = suggestion.kind === 1 ? 'Remove marked text'
        : suggestion.kind === 2 && suggestion.text === ' ' ? 'Add space'
        : `Apply: ${suggestion.text}`;
      button.addEventListener('click', () => {
        if (revision !== id || text.value !== source) return;
        applyFix(source, uStart, uEnd, suggestion);
      });
      buttons.append(button);
    }
    card.append(buttons); $('results').append(card);
  }
  if (!data.issues.length) $('results').textContent = 'No suggestions in this mode. This does not guarantee error-free writing.';
  status(`${data.issues.length} suggestion${data.issues.length === 1 ? '' : 's'} found.`);
  if (window.innerWidth <= 760 && data.issues.length) $('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (autoFix) {
    if (data.issues.length && fixBudget > 0) {
      fixBudget -= 1;
      const first = mapped[0];
      const pick = first.suggestions.find((s) => s.preferred) || first.suggestions[0];
      applyFix(source, first.uStart, first.uEnd, pick);
      return;
    }
    autoFix = false;
    if (data.issues.length) status(`Applied what it could. ${data.issues.length} suggestion${data.issues.length === 1 ? '' : 's'} need your choice.`);
    else status('All fixes applied.');
  }
};
if (worker) worker.onerror = (event) => { engineDead(); console.error(event.message); };
text.addEventListener('input', () => { history = []; autoFix = false; invalidate(); status('Ready to check your changes.'); });
$('check').onclick = check;
$('fixall').onclick = () => {
  if (!ready) return;
  if (pending) { status('Still checking…'); return; }
  if (!text.value.trim()) { status('Add some text first.'); return; }
  autoFix = true; fixBudget = 30; check();
};
$('mode').onchange = () => { autoFix = false; invalidate(); status('Mode changed. Check again.'); };
$('clear').onclick = () => { autoFix = false; text.value = ''; history = []; invalidate(); status('Text cleared.'); };
$('example').onclick = () => { autoFix = false; text.value = 'Hello , world! This is a sentence.. The the problem is here.'; history = []; invalidate(); };
$('undo').onclick = () => { if (!history.length) return; text.value = history.pop(); invalidate(); status('Correction undone.'); };
$('copy').onclick = async () => { try { await navigator.clipboard.writeText(text.value); status('Text copied.'); } catch { text.focus(); text.select(); status('Use your device’s copy command on the selected text.'); } };
