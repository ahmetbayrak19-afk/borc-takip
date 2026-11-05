const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createApp, debt, backup, plain, seed, root } = require('./helpers');

test('four complete dictionaries with matching parameter names', () => {
  const { context } = createApp();
  const dict = context.BorcI18n.dictionaries;
  assert.ok(Object.keys(dict).length > 150);
  for (const [source, values] of Object.entries(dict)) {
    const expected = [...source.matchAll(/\{([a-zA-Z]+)\}/g)].map(m => m[1]).sort();
    for (const code of ['tr', 'en', 'de', 'ru']) {
      assert.equal(typeof values[code], 'string', `${code}: ${source}`);
      assert.ok(values[code].length, `${code}: ${source}`);
      assert.deepEqual([...values[code].matchAll(/\{([a-zA-Z]+)\}/g)].map(m => m[1]).sort(), expected, `${code}: ${source}`);
    }
  }
});

test('all visible static UI phrases have translations', () => {
  const { context } = createApp();
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, '');
  const phrases = [...html.matchAll(/>([^<>]+)</g)].map(m => m[1].trim()).filter(s => /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(s));
  const exempt = new Set(['Türkçe', 'English', 'Deutsch', 'Русский']);
  for (const source of phrases) assert.ok(exempt.has(source) || context.BorcI18n.dictionaries[source], source);
  for (const match of html.matchAll(/(?:placeholder|title|aria-label|alt)="([^"]+)"/g)) {
    if (!/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(match[1])) continue;
    assert.ok(context.BorcI18n.dictionaries[match[1]], match[1]);
  }
});

for (const [code, locale, month] of [['tr', 'tr-TR', 'Kasım'], ['en', 'en-US', 'November'], ['de', 'de-DE', 'November'], ['ru', 'ru-RU', 'ноябрь']]) {
  test(`${code}: dates, currency, dialogs and saved preference`, () => {
    const app = createApp();
    assert.ok(app.context.BorcI18n.setLanguage(code));
    assert.equal(app.context.BorcI18n.getLocale(), locale);
    assert.equal(app.context.monthNameTR(0), month);
    assert.equal(app.context.formatMoney(1234.56, 'EUR'), new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(1234.56));
    assert.equal(app.context.formatDateTR('2026-11-10'), new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date('2026-11-10T12:00:00')));
    assert.equal(createApp({ storage: Object.fromEntries(app.storage) }).context.BorcI18n.getLanguage(), code);
    seed(app, backup([debt({ name: 'Ayarlar · Straße · Доход · İpek' })]));
    app.context.deleteDebt('debt1');
    assert.ok(app.confirmations[0].includes('Ayarlar · Straße · Доход · İpek'));
    assert.ok(!app.confirmations[0].includes('{name}'));
    if (code !== 'tr') assert.ok(!app.confirmations[0].includes('silinsin'));
    seed(app, backup([debt({ name: 'Ödeme / Zahlung / Платёж', installmentCount: 1, startDate: '2026-11-05' })]));
    let notification;
    app.context.window.Capacitor = { Plugins: { LocalNotifications: {
      cancel() { return Promise.resolve(); },
      schedule(payload) { notification = payload.notifications[0]; return Promise.resolve(); }
    } } };
    app.context.scheduleDueNotifications();
    const titles = { tr: 'Bugün ödenecek borçlar', en: 'Debts due today', de: 'Heute fällige Schulden', ru: 'Долги к оплате сегодня' };
    assert.equal(notification.title, titles[code]);
    assert.ok(notification.body.startsWith('Ödeme / Zahlung / Платёж: '));
  });
}

test('changing language does not modify saved data, currency, month or a draft form', () => {
  const app = createApp();
  seed(app, backup([debt({ name: 'Ayarlar / Einstellungen / Настройки' })]));
  app.run("currentFilter = 'month-2';");
  app.context.openDebtModal(null, null, '2027-01');
  app.document.getElementById('debt-name').value = 'Unfinished form';
  app.document.getElementById('debt-total').value = '19.99';
  app.document.getElementById('debt-currency').value = 'USD';
  const before = plain(app.context.buildSyncPayload());
  for (const code of ['en', 'de', 'ru', 'tr']) app.context.changeAppLanguage(code);
  assert.deepEqual(plain(app.context.buildSyncPayload()), before);
  assert.equal(app.document.getElementById('debt-name').value, 'Unfinished form');
  assert.equal(app.document.getElementById('debt-total').value, '19.99');
  assert.equal(app.document.getElementById('debt-currency').value, 'USD');
  assert.equal(app.document.getElementById('debt-due').value, '2027-01-15');
  assert.equal(app.run('currentFilter'), 'month-2');
  assert.ok(!('language' in before));
});

test('invalid, missing or unwritable language preference is handled', () => {
  for (const invalid of ['xx', '__proto__', 'constructor', '']) {
    const app = createApp({ storage: { borc_takip_language: invalid } });
    assert.equal(app.context.BorcI18n.getLanguage(), 'tr');
    assert.equal(app.context.BorcI18n.setLanguage(invalid), false);
  }
  const app = createApp({ failWrites: true });
  assert.equal(app.context.BorcI18n.setLanguage('ru'), false);
  assert.equal(app.context.BorcI18n.getLanguage(), 'tr');
});

test('translated parameters remain literal, including HTML and placeholder-like user names', () => {
  const { context } = createApp();
  context.BorcI18n.setLanguage('de');
  const name = '<img src=x onerror=alert(1)> {name} & "Öde"';
  assert.equal(context.BorcI18n.t('“{name}” geliri silinsin mi?', { name }), `Einnahme „${name}“ löschen?`);
});

test('changing language does not trigger another payment notification or mark cloud data dirty', () => {
  const app = createApp();
  seed(app, backup([debt({ startDate: '2026-11-05' })]));
  let notifications = 0;
  app.context.window.Capacitor = { Plugins: { LocalNotifications: {
    cancel() { notifications++; return Promise.resolve(); },
    schedule() { notifications++; return Promise.resolve(); }
  } } };
  app.context.changeAppLanguage('ru');
  assert.equal(notifications, 0);
  assert.equal(app.storage.has('borc_takip_sync_meta'), false);
});
