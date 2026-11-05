// Optional real-Chromium tests. Install Playwright separately; TEST_BROWSER_EXECUTABLE
// may point to an existing Chromium binary. Release unit tests have no browser dependency.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { root, debt } = require('./helpers');

function loadPlaywright() {
  const paths = [process.cwd(), process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, process.env.TEST_NODE_MODULES].filter(Boolean);
  try { return require(require.resolve('playwright', { paths })); }
  catch { throw new Error('Install playwright or set TEST_NODE_MODULES to a directory containing playwright.'); }
}
const results = [];
let browser;
let server;
let origin;
async function fresh(code = 'tr', records = [], showWelcome = false) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'en-US', timezoneId: 'Europe/Istanbul' });
  await context.route('https://**', route => route.abort());
  await context.addInitScript(({ code, records, showWelcome }) => {
    const RealDate = Date;
    class TestDate extends RealDate {
      constructor(...args) { if (args.length) super(...args); else super('2026-11-05T09:00:00Z'); }
      static now() { return new RealDate('2026-11-05T09:00:00Z').getTime(); }
    }
    window.Date = TestDate;
    if (!localStorage.getItem('qa-seeded')) {
      localStorage.setItem('borc_takip_language', code);
      localStorage.setItem('borc_takip_debts', JSON.stringify(records));
      if (!showWelcome) localStorage.setItem('borc_takip_sync_welcome_seen', '1');
      localStorage.setItem('qa-seeded', '1');
    }
  }, { code, records, showWelcome });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => dialog.accept());
  await page.goto(origin, { waitUntil: 'load' });
  await page.locator('#splash').waitFor({ state: 'hidden' });
  return { page, context, errors };
}
async function scenario(name, run) {
  if (process.env.TEST_CASE_FILTER && !new RegExp(process.env.TEST_CASE_FILTER).test(name)) return;
  try { await run(); results.push({ name, status: 'PASS' }); console.log('PASS', name); }
  catch (error) { results.push({ name, status: 'FAIL', error: error.message }); console.error('FAIL', name, error.message); }
}
async function noOverflow(page, label) {
  const widths = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, viewport: innerWidth }));
  assert.ok(widths.doc <= widths.viewport + 1, label + ': horizontal overflow ' + JSON.stringify(widths));
}
async function translated(page, selector, source) {
  const expected = await page.evaluate(source => BorcI18n.t(source), source);
  assert.equal((await page.locator(selector).textContent()).trim(), expected);
}

(async function main() {
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
  server = http.createServer((req, res) => {
    let resource = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (resource === '/favicon.ico') { res.writeHead(204); res.end(); return; }
    const base = resource.startsWith('/vendor/fontawesome/') ? path.join(root, 'node_modules/@fortawesome/fontawesome-free') : root;
    if (base !== root) resource = resource.slice('/vendor/fontawesome'.length);
    const file = path.resolve(base, '.' + (resource === '/' ? '/index.html' : resource));
    if (!file.startsWith(base + path.sep)) { res.writeHead(403); res.end(); return; }
    fs.readFile(file, (err, bytes) => {
      if (err) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }); res.end(bytes);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = 'http://127.0.0.1:' + server.address().port;
  browser = await loadPlaywright().chromium.launch({
    executablePath: process.env.TEST_BROWSER_EXECUTABLE || undefined,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'], headless: true
  });
  try {
    for (const code of ['tr', 'en', 'de', 'ru']) {
      await scenario(code + ': real UI add, edit, partial payment, undo, reload and XSS-safe names', async () => {
        const { page, context, errors } = await fresh();
        try {
          await page.click('#btn-settings'); await page.selectOption('#app-language', code);
          assert.equal(await page.locator('html').getAttribute('lang'), code);
          await translated(page, '#btn-settings', 'Ayarlar');
          await page.click('#modal-settings button[onclick="closeSettings()"]');
          await page.click('#summary-grid [data-filter="month-1"]');
          await page.click('#btn-add-debt');
          assert.equal(await page.inputValue('#debt-due'), '2026-12-15');
          const name = 'Ayarlar · Straße · Доход <img src=x onerror="window.__injected=1">';
          await page.fill('#debt-name', name); await page.fill('#debt-total', '1234.56');
          await page.selectOption('#debt-currency', 'USD'); await page.check('#debt-recurring');
          await page.fill('#debt-installments', '5');
          await page.click('#form-debt button[type="submit"]');
          await page.locator('#modal-debt-saved').waitFor({ state: 'visible' });
          await translated(page, '#modal-debt-saved h2', 'Borç eklendi');
          assert.equal(await page.textContent('#saved-debt-name'), name);
          assert.ok((await page.textContent('#saved-debt-installments')).includes('5'));
          await page.click('#modal-debt-saved button[onclick="closeDebtSavedModal()"]');
          assert.equal(await page.locator('#debt-list > div').count(), 1);
          assert.equal(await page.locator('#debt-list img').count(), 0);
          assert.equal(await page.evaluate(() => window.__injected), undefined);
          await page.click('#debt-list button[onclick^="editDebt("]');
          for (const field of ['debt-name-field', 'debt-currency-field', 'debt-recurring-field', 'installment-fields']) assert.equal(await page.locator('#' + field).isVisible(), false, field);
          await page.fill('#debt-total', '1200'); await page.fill('#debt-due', '2026-12-17');
          await page.click('#form-debt button[type="submit"]');
          await page.locator('#modal-edit-scope').waitFor({ state: 'visible' });
          await translated(page, '#modal-edit-scope button[onclick="applyDebtEdit(\'single\')"] p:first-child', 'Sadece bu taksit');
          await page.click('#modal-edit-scope button[onclick="applyDebtEdit(\'single\')"]');
          assert.equal(await page.evaluate(() => installmentRemaining(debts[0], 0)), 1200);
          assert.equal(await page.evaluate(() => installmentRemaining(debts[0], 1)), 1234.56);
          await page.click('#debt-list button[onclick*="partial"]');
          await page.fill('#partial-amount', '50.25'); await page.click('button[onclick="submitPartialAmount()"]');
          await page.click('button[onclick="confirmPaySource(\'extra\')"]');
          assert.equal(await page.evaluate(() => installmentRemaining(debts[0], 0)), 1149.75);
          await page.click('#btn-settings'); await page.click('button[onclick="openPaymentHistory()"]');
          assert.equal(await page.locator('#payment-history-list > div').count(), 1);
          await page.click('#payment-history-list button');
          assert.equal(await page.evaluate(() => installmentRemaining(debts[0], 0)), 1200);
          assert.equal(await page.evaluate(() => payments.length), 0);
          await page.reload({ waitUntil: 'load' }); await page.locator('#splash').waitFor({ state: 'hidden' });
          assert.equal(await page.locator('html').getAttribute('lang'), code);
          assert.equal(await page.evaluate(() => debts[0].name), name);
          assert.equal(await page.evaluate(() => debts[0].currency), 'USD');
          assert.deepEqual(errors, []);
        } finally { await context.close(); }
      });
      await scenario(code + ': first-launch Google explanation and permission guidance are translated', async () => {
        const { page, context, errors } = await fresh(code, [], true);
        try {
          await page.locator('#modal-sync-welcome').waitFor({ state: 'visible' });
          await translated(page, '#modal-sync-welcome h2', 'Borçların kaybolmasın');
          await page.click('button[onclick="acceptSyncWelcome()"]');
          await translated(page, '#modal-drive-permission h2', 'Bir kutuyu işaretlemen gerekiyor');
          assert.equal(await page.locator('#modal-drive-permission b').textContent(), await page.evaluate(() => BorcI18n.t('“Google Drive’ınızda kendi yapılandırma verilerini görme, oluşturma ve silme”')));
          assert.deepEqual(errors, []);
        } finally { await context.close(); }
      });
    }
    for (const code of ['tr', 'en', 'de', 'ru']) {
      const records = Array.from({ length: 25 }, (_, i) => debt({ id: 'layout' + i, name: 'Uzun kayıt adı / Lange Bezeichnung / Длинное название ' + i, installmentCount: 1, startDate: '2026-11-10', installmentAmount: 1234.56, currency: i % 2 ? 'EUR' : 'TRY' }));
      const { page, context, errors } = await fresh(code, records);
      try {
        for (const [width, height] of [[320, 568], [360, 640], [412, 915], [768, 1024], [844, 390]]) {
          await scenario(`${code}: ${width}x${height} footer, list and forms`, async () => {
            await page.setViewportSize({ width, height });
            await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            const positions = await page.evaluate(() => ({ last: document.querySelector('#debt-list > div:last-child').getBoundingClientRect().bottom, footer: document.getElementById('bottom-actions').getBoundingClientRect().top }));
            assert.ok(positions.last <= positions.footer + 1, 'Last debt is behind the footer: ' + JSON.stringify(positions));
            await noOverflow(page, 'main');
            await page.click('#btn-settings'); await noOverflow(page, 'settings');
            if (process.env.TEST_SCREENSHOT_DIR && code === 'ru' && width === 412) await page.screenshot({ path: path.join(process.env.TEST_SCREENSHOT_DIR, 'ru-settings.png'), animations: 'disabled' });
            await page.click('#modal-settings button[onclick="closeSettings()"]');
            await page.click('#btn-add-income');
            await noOverflow(page, 'income form');
            await page.fill('#income-name', 'Test');
            await page.fill('#income-amount', '100');
            await page.click('#form-income button[type="submit"]');
            assert.equal(await page.locator('#modal-income').isVisible(), false);
            await page.click('#btn-add-debt'); await noOverflow(page, 'debt form');
            await page.locator('#debt-name').fill('Test');
            await page.click('#modal-debt button[onclick="closeDebtModal()"]');
            assert.deepEqual(errors, []);
          });
        }
      } finally { await context.close(); }
    }
    await scenario('Search, deletion, native form validation and one-time income', async () => {
      const { page, context, errors } = await fresh('en', [debt({ name: 'Only this month', installmentCount: 1 }), debt({ id: 'future', name: 'Future debt', startDate: '2027-01-15', installmentCount: 1 })]);
      try {
        await page.click('button[onclick="toggleDebtSearch()"]'); await page.fill('#debt-search', 'Future debt');
        assert.equal(await page.locator('#debt-list > div').count(), 0);
        await page.fill('#debt-search', 'Only this month'); assert.equal(await page.locator('#debt-list > div').count(), 1);
        await page.click('button[onclick="toggleDebtSearch()"]');
        await page.click('#btn-add-debt'); await page.fill('#debt-name', 'Rejected zero'); await page.fill('#debt-total', '0');
        await page.click('#form-debt button[type="submit"]'); assert.equal(await page.locator('#modal-debt').isVisible(), true);
        assert.equal(await page.evaluate(() => debts.length), 2);
        await page.click('#modal-debt button[onclick="closeDebtModal()"]');
        await page.click('#btn-add-income'); await page.click('#income-type-once');
        await page.fill('#income-name', 'Single income'); await page.fill('#income-amount', '200'); await page.fill('#income-date', '2026-12-20');
        await page.click('#form-income button[type="submit"]'); assert.equal(await page.locator('#income-list > div').count(), 0);
        await page.click('#summary-grid [data-filter="month-1"]'); assert.equal(await page.locator('#income-list > div').count(), 1);
        await page.click('#summary-grid [data-filter="this-month"]');
        await page.click('#debt-list button[onclick^="deleteDebt("]'); assert.equal(await page.locator('#debt-list > div').count(), 0);
        assert.deepEqual(errors, []);
      } finally { await context.close(); }
    });
    await scenario('A10: month navigator must not cover the new-debt form', async () => {
      const { page, context } = await fresh('en');
      try {
        await page.click('#btn-settings'); await page.click('button[onclick="openMonthsModal()"]');
        await page.click('button[onclick="changeMonthsYear(1)"]');
        await page.locator('#months-list button').first().click();
        assert.ok((await page.textContent('#month-debts-title')).includes('2027'));
        await page.click('#btn-add-month-debt'); assert.equal(await page.inputValue('#debt-due'), '2027-01-15');
        // A short real click proves whether the previous drawer intercepts the form.
        await page.click('#modal-debt button[onclick="closeDebtModal()"]', { timeout: 2500 });
      } finally { await context.close(); }
    });
  } finally {
    await browser.close(); await new Promise(resolve => server.close(resolve));
  }
  console.log(JSON.stringify({ total: results.length, passed: results.filter(r => r.status === 'PASS').length, failed: results.filter(r => r.status === 'FAIL') }, null, 2));
  if (results.some(r => r.status === 'FAIL')) process.exitCode = 1;
})().catch(async error => {
  console.error(error.stack); process.exitCode = 1;
  if (browser) await browser.close(); if (server) server.close();
});
