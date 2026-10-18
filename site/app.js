const $ = (id) => document.getElementById(id);
const text = $('text');
const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
let ready = false, revision = 0, pending = null, history = [];
const status = (message) => { $('status').textContent = message; };
function invalidate() {
  revision++; pending = null;
  $('check').disabled = !ready; $('check').textContent = ready ? 'Check text' : 'Loading engine…';
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
  $('check').disabled = true; $('check').textContent = 'Checking…'; status('Checking on your device…');
  worker.postMessage({ id, text: text.value, mode: $('mode').value });
}
worker.onmessage = ({ data }) => {
  if (data.type === 'ready') { ready = true; invalidate(); status('Ready. Your writing stays on your device.'); return; }
  if (data.type === 'fatal') { status('Engine could not load. Reload to retry.'); console.error(data.error); return; }
  if (!pending || data.id !== pending.id || data.id !== revision) return;
  const { source, id } = pending; pending = null;
  $('check').disabled = false; $('check').textContent = 'Check text';
  if (data.type === 'error') { status('Checking failed. Try again.'); console.error(data.error); return; }
  $('results').replaceChildren();
  for (const issue of data.issues) {
    const card = document.createElement('article'); card.className = 'issue';
    const kind = document.createElement('small'); kind.textContent = issue.kind;
    const message = document.createElement('p'); message.textContent = issue.message;
    const context = document.createElement('p'); context.textContent = `Passage: ${source.slice(Math.max(0, issue.start - 25), Math.min(source.length, issue.end + 25))}`;
    card.append(kind, message, context);
    const buttons = document.createElement('div'); buttons.className = 'buttons';
    for (const suggestion of issue.suggestions) {
      const button = document.createElement('button');
      button.textContent = suggestion.kind === 1 ? 'Remove marked text' : `Apply: ${suggestion.text}`;
      button.addEventListener('click', () => {
        if (revision !== id || text.value !== source) return;
        history.push(source); if (history.length > 30) history.shift();
        const start = suggestion.kind === 2 ? issue.end : issue.start;
        text.value = source.slice(0, start) + suggestion.text + source.slice(issue.end);
        invalidate(); status('Correction applied.'); check();
      });
      buttons.append(button);
    }
    card.append(buttons); $('results').append(card);
  }
  if (!data.issues.length) $('results').textContent = 'No suggestions in this mode. This does not guarantee error-free writing.';
  status(`${data.issues.length} suggestion${data.issues.length === 1 ? '' : 's'} found.`);
};
worker.onerror = (event) => { ready = false; pending = null; $('check').disabled = true; status('Engine failed to load or stopped. Reload to retry.'); console.error(event.message); };
text.addEventListener('input', () => { history = []; invalidate(); status('Ready to check your changes.'); });
$('check').onclick = check;
$('mode').onchange = () => { invalidate(); status('Mode changed. Check again.'); };
$('clear').onclick = () => { text.value = ''; history = []; invalidate(); status('Text cleared.'); };
$('example').onclick = () => { text.value = 'Hello , world! This is a sentence.. The the problem is here.'; history = []; invalidate(); };
$('undo').onclick = () => { if (!history.length) return; text.value = history.pop(); invalidate(); status('Correction undone.'); };
$('copy').onclick = async () => { try { await navigator.clipboard.writeText(text.value); status('Text copied.'); } catch { text.focus(); text.select(); status('Use your device’s copy command on the selected text.'); } };
