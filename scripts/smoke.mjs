import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(process.env.RUNNER_TEMP + '/browser/node_modules/playwright/index.mjs').href);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:8080/');
  await page.waitForFunction(() => document.querySelector('#check').textContent === 'Check text', { timeout: 120000 });
  // The offline service worker installs and activates on the served site.
  await page.waitForFunction(() => navigator.serviceWorker.getRegistrations().then((regs) => regs.length > 0), { timeout: 30000 });
  await page.selectOption('#mode', 'all');
  await page.fill('#text', 'The the problem is here.');
  await page.click('#check');
  // First check downloads the punctuation model (about 270 MB), so allow extra time.
  await page.waitForSelector('.issue button', { timeout: 300000 });
  await page.locator('.issue button').first().click();
  await page.waitForFunction(() => document.querySelector('#text').value === 'The problem is here.');
  await page.click('#undo');
  if (await page.inputValue('#text') !== 'The the problem is here.') throw new Error('Undo failed');
  await page.selectOption('#mode', 'punctuation');
  await page.fill('#text', 'Hello , world!');
  await page.click('#check');
  await page.waitForSelector('.issue button');
  await page.locator('.issue button').first().click();
  await page.waitForFunction(() => document.querySelector('#text').value === 'Hello, world!');
  // Sentence-start capitalization now passes the punctuation-mode filter.
  await page.fill('#text', 'lets meet tomorrow at 5 for dinner');
  await page.click('#check');
  await page.waitForSelector('.issue button', { timeout: 30000 });
  await page.locator('.issue button').first().click();
  await page.waitForFunction(() => document.querySelector('#text').value === 'Lets meet tomorrow at 5 for dinner');
  // The follow-up check offers the missing ending period; applying it completes the sentence.
  await page.waitForSelector('.issue button', { timeout: 30000 });
  await page.locator('.issue button').first().click();
  await page.waitForFunction(() => document.querySelector('#text').value === 'Lets meet tomorrow at 5 for dinner.');
  // Two closing dots get a one-dot fix alongside the engine's ellipsis suggestion.
  await page.fill('#text', 'This works..');
  await page.click('#check');
  await page.waitForFunction(() => [...document.querySelectorAll('.issue button')].some((b) => b.textContent === 'Apply: .'), { timeout: 30000 });
  await page.locator('.issue button').filter({ hasText: /^Apply: \.$/ }).first().click();
  await page.waitForFunction(() => document.querySelector('#text').value === 'This works.');
  // Stacked end punctuation collapses to one mark, and a comma with no space after it gets one.
  await page.fill('#text', 'wow!! he said hi,then left');
  await page.click('#check');
  await page.waitForSelector('.issue button', { timeout: 30000 });
  await page.locator('.issue button').filter({ hasText: /^Apply: !$/ }).first().click();
  await page.waitForFunction(() => document.querySelector('#text').value === 'wow! he said hi,then left');
  await page.locator('.issue button').filter({ hasText: 'Add space' }).first().click();
  await page.waitForFunction(() => document.querySelector('#text').value === 'wow! he said hi, then left');
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
