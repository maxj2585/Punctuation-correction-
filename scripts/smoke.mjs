import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(process.env.RUNNER_TEMP + '/browser/node_modules/playwright/index.mjs').href);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:8080/');
  await page.waitForFunction(() => document.querySelector('#check').textContent === 'Check text', { timeout: 120000 });
  await page.selectOption('#mode', 'all');
  await page.fill('#text', 'The the problem is here.');
  await page.click('#check');
  await page.waitForSelector('.issue button', { timeout: 30000 });
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
  await page.setViewportSize({ width: 390, height: 844 });
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error('Mobile overflow');
  console.log('Engine, grammar correction, undo, punctuation correction, and mobile layout passed.');
} finally { await browser.close(); }
