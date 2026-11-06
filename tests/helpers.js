const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
function element() {
  const classes = new Set(['hidden']);
  const attributes = new Map();
  const children = [];
  const el = {
    value: '', checked: false, textContent: '', innerHTML: '', disabled: false,
    className: '', children, style: { setProperty() {} }, isConnected: true,
    classList: {
      add(...names) { names.forEach(name => classes.add(name)); },
      remove(...names) { names.forEach(name => classes.delete(name)); },
      contains(name) { return classes.has(name); },
      toggle(name, force) { const next = force === undefined ? !classes.has(name) : force; next ? classes.add(name) : classes.delete(name); return next; }
    },
    addEventListener() {}, setAttribute(key, value) { attributes.set(key, String(value)); },
    getAttribute(key) { return attributes.get(key) ?? null; },
    querySelector() { if (!el.child) el.child = element(); return el.child; },
    appendChild(child) { children.push(child); }, removeChild() {}, focus() {}, click() {},
    getBoundingClientRect() { return { height: 96 }; }
  };
  return el;
}
function createApp(options = {}) {
  const elements = new Map();
  const document = {
    documentElement: element(), body: element(),
    getElementById(id) { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); },
    querySelectorAll() { return []; }, createElement() { return element(); }, addEventListener() {},
    createTreeWalker() { return { nextNode() { return null; } }; }
  };
  const storage = new Map(Object.entries(options.storage || {}));
  const localStorage = {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) { if (typeof options.failWrites === 'function' ? options.failWrites(key, value) : options.failWrites) throw new Error('QuotaExceededError'); storage.set(key, String(value)); },
    removeItem(key) { storage.delete(key); }
  };
  const epoch = new Date(options.now || '2026-11-05T09:00:00Z').getTime();
  class FixedDate extends Date {
    constructor(...args) { if (args.length) super(...args); else super(epoch); }
    static now() { return epoch; }
  }
  const timers = [];
  const confirmations = [];
  const logs = [];
  const context = vm.createContext({
    document, localStorage, navigator: { onLine: true }, window: { addEventListener() {} },
    console: { log(...args) { logs.push(args); } },
    setTimeout(fn, delay) { timers.push({ fn, delay }); return timers.length; }, clearTimeout() {},
    confirm(message) { confirmations.push(message); return options.confirm !== false; },
    fetch: options.fetch || (async function() { throw new Error('Unexpected network request'); }),
    Blob, URL, AbortController, Intl, Date: FixedDate, Math, JSON, Object, Array, Number, String, Map, Set
  });
  ['i18n.js', 'app.js'].forEach(file => vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file }));
  if (!options.realConfirm) context.requestConfirmation = async function(source, values) {
    confirmations.push(context.BorcI18n.t(source, values));
    return options.confirm !== false;
  };
  const run = source => vm.runInContext(source, context);
  return { context, run, elements, storage, document, timers, confirmations, logs };
}
function debt(overrides = {}) {
  return { id: 'debt1', name: 'Test debt', currency: 'TRY', startDate: '2026-11-10', installmentAmount: 100,
    totalAmount: 300, installmentCount: 3, paidInstallments: 0, recurring: true, partials: {}, installmentOverrides: {}, ...overrides };
}
function backup(debts = [debt()]) {
  return { version: 4, debts, incomes: [], adjustments: [], payments: [], hiddenNames: [] };
}
function plain(value) { return JSON.parse(JSON.stringify(value)); }
function seed(app, data) {
  for (const key of ['debts', 'incomes', 'adjustments', 'payments', 'hiddenNames']) {
    app.run(key + ' = ' + JSON.stringify(data[key] || []) + ';');
  }
}
function connectDrive(app, fetch, meta = {}) {
  app.context.fetch = fetch;
  app.context.window.Capacitor = { Plugins: { GoogleDriveAuth: {
    async getToken() { return { email: 'tester@example.test', accessToken: 'synthetic-test-token' }; }
  } } };
  app.context.setSyncMeta({ signedIn: true, account: 'tester@example.test', paused: false, dirty: false, ...meta });
}
function response(data, status = 200) { return { ok: status >= 200 && status < 300, status, async json() { return data; } }; }
module.exports = { createApp, debt, backup, plain, seed, connectDrive, response, root };
