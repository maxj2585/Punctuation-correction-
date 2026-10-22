import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(process.env.RUNNER_TEMP + '/browser/node_modules/playwright/index.mjs').href);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:8080/');
  await page.waitForFunction(() => document.querySelector('#check').textContent === 'Correct text', { timeout: 120000 });
  // The offline service worker installs and activates on the served site.
  await page.waitForFunction(() => navigator.serviceWorker.getRegistrations().then((regs) => regs.length > 0), { timeout: 30000 });
  // Correct text applies the fixes straight away. First run downloads the punctuation model (about 270 MB).
  await page.selectOption('#mode', 'all');
  await page.fill('#text', 'The the problem is here.');
  await page.click('#check');
  await page.waitForFunction(() => document.querySelector('#text').value === 'The problem is here.', { timeout: 300000 });
  await page.waitForFunction(() => !document.querySelector('#undo').disabled);
  await page.click('#undo');
  if (await page.inputValue('#text') !== 'The the problem is here.') throw new Error('Undo failed');
  // Choosing a checking mode corrects the text in that mode right away.
  await page.fill('#text', 'Hello , world!');
  await page.selectOption('#mode', 'punctuation');
  await page.waitForFunction(() => document.querySelector('#text').value === 'Hello, world!', { timeout: 60000 });
  // Two closing dots collapse to one.
  await page.fill('#text', 'This works..');
  await page.click('#check');
  await page.waitForFunction(() => document.querySelector('#text').value === 'This works.', { timeout: 60000 });
  // Pasted run-on text gets its missing commas, periods, and question mark inserted.
  await page.fill('#text', 'i went to the store yesterday and i bought some milk eggs and bread then i went home how are you doing today');
  await page.click('#fixall');
  await page.waitForFunction(() => document.querySelector('#text').value === 'I went to the store yesterday and I bought some milk, eggs, and bread. Then I went home. How are you doing today?', { timeout: 120000 });
  // One press on Fix all walks every suggestion to a fully cleaned sentence.
  await page.fill('#text', 'wow!! he said hi,then left');
  await page.click('#fixall');
  await page.waitForFunction(() => document.querySelector('#text').value === 'Wow! he said hi, then left.', { timeout: 60000 });
  await page.setViewportSize({ width: 390, height: 844 });
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error('Mobile overflow');
  console.log('Engine, grammar correction, undo, punctuation correction, style-guide checks, and mobile layout passed.');
} finally { await browser.close(); }
