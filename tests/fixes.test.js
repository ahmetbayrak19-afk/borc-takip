const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp, debt, backup, seed, plain, connectDrive, response } = require('./helpers');

function form(app, patch = {}) {
  const values = { 'debt-name': 'New debt', 'debt-total': '80', 'debt-due': '2026-11-15', 'debt-currency': 'TRY', ...patch };
  for (const [id, value] of Object.entries(values)) app.document.getElementById(id).value = value;
}
function records(app) {
  const value = plain(app.context.buildSyncPayload());
  delete value.updatedAt;
  return value;
}
function notifier(app, initial = [], permission = 'granted') {
  const pending = new Map(initial.map(n => [n.id, n]));
  const scheduled = [], canceled = [];
  app.context.window.Capacitor = { Plugins: { LocalNotifications: {
    async checkPermissions() { return { display: permission }; },
    async getPending() { return { notifications: [...pending.values()] }; },
    async cancel({ notifications }) { for (const n of notifications) { canceled.push(n.id); pending.delete(n.id); } },
    async schedule({ notifications }) { for (const n of notifications) { scheduled.push(n); pending.set(n.id, n); } }
  } } };
  return { pending, scheduled, canceled };
}

test('A01/A02: migrate legacy paid installments once, keep overrides, and survive restart plus undo', () => {
  const old = debt({ installmentCount: 4, totalAmount: 380, paidInstallments: 1, partials: { 1: 15 }, installmentOverrides: { 0: { amount: 80 } } });
  const app = createApp({ storage: { borc_takip_debts: JSON.stringify([old]) } });
  app.context.loadData();
  assert.equal(app.context.installmentRemaining(app.run('debts[0]'), 0), 0);
  assert.equal(app.run('debts[0].partials[0]'), 80);
  app.context.startPay('debt1', 1, 'full'); app.context.confirmPaySource('salary');
  const paymentId = app.run('payments[0].id');
  const restarted = createApp({ storage: Object.fromEntries(app.storage) }); restarted.context.loadData();
  restarted.context.undoPayment(paymentId);
  assert.equal(restarted.run('debts[0].paidInstallments'), 1);
  assert.equal(restarted.run('debts[0].partials[0]'), 80);
  assert.equal(restarted.run('debts[0].partials[1]'), 15);
  assert.equal(restarted.run('adjustments.length'), 0);
  assert.equal(restarted.context.installmentRemaining(restarted.run('debts[0]'), 1), 85);
  restarted.context.loadData();
  assert.equal(restarted.run('debts[0].partials[0]'), 80, 'Repeated loading must not duplicate old payments');
});

test('A02: undo one payment while preserving other partial payments and income deductions', () => {
  const app = createApp(); seed(app, backup([debt({ installmentCount: 4, paidInstallments: 1 })]));
  function pay(index, amount, source) {
    app.context.startPay('debt1', index, 'partial');
    app.document.getElementById('partial-amount').value = String(amount);
    app.context.submitPartialAmount(); app.context.confirmPaySource(source);
    return app.run('payments[0].id');
  }
  const first = pay(1, 30, 'salary'); const second = pay(1, 20, 'salary'); pay(3, 10, 'extra');
  app.context.undoPayment(first);
  assert.equal(app.run('debts[0].paidInstallments'), 1);
  assert.equal(app.run('debts[0].partials[1]'), 20); assert.equal(app.run('debts[0].partials[3]'), 10);
  assert.equal(app.run('adjustments.length'), 1); assert.equal(app.run('adjustments[0].amount'), 20);
  assert.equal(app.run('payments.some(p => p.id === ' + JSON.stringify(second) + ')'), true);
});

test('A03: malformed local collection preserves healthy income and original damaged bytes', () => {
  for (const damaged of ['{}', '{broken', '[null]', 'null']) {
    const salary = { id: 'income1', name: 'Salary', amount: 1000, currency: 'TRY', startMonth: '2026-11' };
    const app = createApp({ storage: { borc_takip_debts: damaged, borc_takip_incomes: JSON.stringify([salary]) } });
    assert.doesNotThrow(() => { app.context.loadData(); app.context.renderAll(); });
    assert.equal(app.run('incomes[0].name'), 'Salary');
    assert.equal(app.document.getElementById('storage-warning').classList.contains('hidden'), false);
    form(app); app.context.saveDebt({ preventDefault() {} });
    assert.equal(app.run('debts.length'), 0);
    assert.equal(app.storage.get('borc_takip_debts'), damaged);
    assert.equal(app.storage.has('borc_takip_state_v5'), false);
    assert.equal(app.context.applySyncPayload(backup(), { dirty: true, replaceDamaged: true }), true);
    assert.equal(app.run('storageReadOnly'), false);
  }
});

test('A03: a damaged snapshot preserves its valid collections and blocks automatic Drive replacement', async () => {
  const state = { ...backup(), incomes: {}, syncMeta: { signedIn: true } };
  const raw = JSON.stringify(state);
  const app = createApp({ storage: { borc_takip_state_v5: raw } }); app.context.loadData();
  assert.equal(app.run('debts.length'), 1); assert.equal(app.run('storageReadOnly'), true);
  let network = 0;
  app.context.window.Capacitor = { Plugins: { GoogleDriveAuth: { getToken() { network++; } } } };
  await app.context.syncNow(true);
  assert.equal(network, 0); assert.equal(app.storage.get('borc_takip_state_v5'), raw);
});

test('A04: reject invalid counts, map keys, partial amounts, duplicate IDs and broken payment links', () => {
  const app = createApp();
  for (const patch of [
    { paidInstallments: -1 }, { paidInstallments: 0.5 }, { paidInstallments: 4 },
    { partials: { 3: 1 } }, { partials: { '-1': 1 } }, { partials: { '01': 1 } },
    { partials: { 0: 101 } }, { partials: [] }, { installmentOverrides: [] },
    { installmentOverrides: { 3: { amount: 1 } } }, { totalAmount: Infinity }
  ]) assert.throws(() => app.context.validateBackup(backup([debt(patch)])), JSON.stringify(patch));
  const salary = { id: 'i', name: 'Salary', amount: 10 };
  assert.throws(() => app.context.validateBackup({ ...backup(), incomes: [salary, salary] }));
  app.context.startPay('missing', -1, 'full');
  const payment = { id: 'p', debtId: 'debt1', debtName: 'Test debt', installmentIndex: 3, amount: 1, dueDate: '2026-11-10', paidAt: '2026-11-05T09:00:00Z' };
  assert.throws(() => app.context.validateBackup({ ...backup(), payments: [payment] }));
  payment.installmentIndex = 0; payment.source = 'salary'; payment.adjustmentId = 'missing';
  assert.throws(() => app.context.validateBackup({ ...backup(), payments: [payment] }));
  delete payment.adjustmentId;
  assert.throws(() => app.context.validateBackup({ ...backup(), payments: [payment, payment] }));
  assert.doesNotThrow(() => app.context.validateBackup({ ...backup([]), payments: [payment] }), 'Archived payments for deleted debts must remain importable');
});

test('A05: single and all-open edits keep original totals, paid amounts and backup totals consistent', () => {
  const app = createApp(); seed(app, backup([debt({ paidInstallments: 1, installmentOverrides: { 0: { amount: 80 } } })]));
  app.run("editingDebtId='debt1';pendingDebtSave={debt:{id:'debt1',installmentAmount:200,startDate:'2026-12-20'},installmentIndex:1};");
  app.context.applyDebtEdit('single');
  assert.equal(app.run('debts[0].totalAmount'), 380);
  app.run("editingDebtId='debt1';pendingDebtSave={debt:{id:'debt1',installmentAmount:150,startDate:'2026-12-21'},installmentIndex:1};");
  app.context.applyDebtEdit('all');
  assert.equal(app.run('debts[0].totalAmount'), 380);
  assert.equal(app.run('debts[0].partials[0]'), 80);
  assert.equal(app.run('debts[0].installmentOverrides[0].amount'), 80);
  assert.equal(app.context.buildSyncPayload().debts[0].totalAmount, 380);
  assert.doesNotThrow(() => app.context.validateBackup(plain(app.context.buildSyncPayload())));
});

test('editing below an already paid partial amount keeps the form and saved data unchanged', () => {
  const app = createApp(); seed(app, backup([debt({ partials: { 1: 40 } })]));
  const before = records(app);
  app.run("editingDebtId='debt1';pendingDebtSave={debt:{id:'debt1',installmentAmount:30,startDate:'2026-12-20'},installmentIndex:1};");
  app.context.applyDebtEdit('all');
  assert.deepEqual(records(app), before);
  assert.notEqual(app.run('pendingDebtSave'), null);
});

test('A06: all mutation entry points are guarded while the first remote download is pending', async () => {
  const app = createApp(); seed(app, backup([debt({ id: 'local', name: 'Existing local record' })]));
  let finishDownload, downloadStarted;
  const started = new Promise(resolve => { downloadStarted = resolve; });
  const download = new Promise(resolve => { finishDownload = resolve; });
  connectDrive(app, async url => {
    if (url.includes('alt=media')) { downloadStarted(); return response(await download); }
    return response({ files: [{ id: 'file1', version: '1' }] });
  });
  const syncing = app.context.syncNow(true); await started;
  const before = records(app);
  form(app); app.document.getElementById('income-name').value = 'Blocked'; app.document.getElementById('income-amount').value = '90';
  app.context.saveDebt({ preventDefault() {} }); app.context.saveIncome({ preventDefault() {} });
  app.context.deleteDebt('local'); app.context.clearAllData(); app.context.removeSavedName('Existing local record');
  app.context.startPay('local', 0, 'full'); app.context.confirmPaySource('salary');
  app.context.persistDebt(debt({ id: 'blocked' }));
  app.context.importData({ target: { value: 'file', files: [{}] } });
  app.context.changeAppLanguage('de');
  assert.deepEqual(records(app), before);
  assert.equal(app.document.getElementById('modal-sync-progress').classList.contains('hidden'), false);
  finishDownload(backup([debt({ name: 'Cloud record' })])); await syncing;
  assert.equal(app.run('debts[0].name'), 'Cloud record'); assert.equal(app.run('restoreLocked'), false);
  const restarted = createApp({ storage: Object.fromEntries(app.storage) }); restarted.context.loadData();
  assert.equal(restarted.run('debts[0].name'), 'Cloud record'); assert.equal(restarted.context.getSyncMeta().baseline, 'file1:1');
});

test('A06: a failed first download unlocks forms and preserves existing records', async () => {
  const app = createApp(); seed(app, backup());
  connectDrive(app, async () => { throw new Error('Offline during download'); });
  const before = records(app); await app.context.syncNow(true);
  assert.deepEqual(records(app), before); assert.equal(app.run('restoreLocked'), false);
  app.context.openIncomeModal(); assert.equal(app.document.getElementById('modal-income').classList.contains('hidden'), false);
});

test('A06/A08: restoring onto full storage leaves both old records and baseline untouched', async () => {
  const options = {}; const app = createApp(options); seed(app, backup());
  connectDrive(app, async url => {
    if (url.includes('alt=media')) { options.failWrites = true; return response(backup([debt({ name: 'Remote' })])); }
    return response({ files: [{ id: 'file1', version: '1' }] });
  });
  const raw = app.storage.get('borc_takip_state_v5'); await app.context.syncNow(true);
  assert.equal(app.run('debts[0].name'), 'Test debt'); assert.equal(app.context.getSyncMeta().baseline, undefined);
  assert.equal(app.storage.get('borc_takip_state_v5'), raw); assert.equal(app.run('restoreLocked'), false);
});

test('A06: edits during an ordinary upload stay pending and are sent by the next sync', async () => {
  const app = createApp(); seed(app, backup([debt({ name: 'Local change' })]));
  let uploaded = 0, version = '1', remote = backup([debt({ name: 'Old remote' })]), secondSent;
  const second = new Promise(resolve => { secondSent = resolve; });
  connectDrive(app, async (url, options = {}) => {
    if (options.method === 'PATCH') {
      uploaded++; version = String(uploaded + 1);
      remote = plain(app.context.buildSyncPayload());
      if (uploaded === 1) {
        assert.equal(app.run('restoreLocked'), false);
        app.context.openIncomeModal(); app.document.getElementById('income-name').value = 'Added during upload'; app.document.getElementById('income-amount').value = '80';
        app.context.saveIncome({ preventDefault() {} });
      } else { assert.ok(options.body.includes('Added during upload')); secondSent(); }
      return response({ id: 'file1', version });
    }
    return response(url.includes('alt=media') ? remote : { files: [{ id: 'file1', version }] });
  }, { baseline: 'file1:1', dirty: true });
  await app.context.syncNow(true); await second; await new Promise(resolve => setImmediate(resolve));
  assert.equal(uploaded, 2); assert.equal(app.run('incomes[0].name'), 'Added during upload');
  assert.equal(app.context.getSyncMeta().dirty, false);
});

test('A08: failed cloud acknowledgement blocks edits until a successful sync retry', async () => {
  const options = {}; const app = createApp(options); seed(app, backup([debt({ name: 'Local change' })]));
  let remote = backup([debt({ name: 'Old remote' })]), version = '1';
  connectDrive(app, async (url, request = {}) => {
    if (request.method === 'PATCH') {
      remote = plain(app.context.buildSyncPayload()); version = '2'; options.failWrites = true;
      return response({ id: 'file1', version });
    }
    return response(url.includes('alt=media') ? remote : { files: [{ id: 'file1', version }] });
  }, { baseline: 'file1:1', dirty: true });
  await app.context.syncNow(true); assert.equal(app.run('syncWriteBlocked'), true);
  app.context.deleteDebt('debt1'); assert.equal(app.run('debts.length'), 1);
  options.failWrites = false; await app.context.syncNow(true);
  assert.equal(app.run('syncWriteBlocked'), false); assert.equal(app.context.getSyncMeta().baseline, 'file1:2');
});

test('A07: plan one reminder per due date at local 09:00, including future months, without duplicates', async () => {
  const app = createApp(); seed(app, backup([
    debt({ id: 'a', installmentCount: 1, startDate: '2026-11-06' }),
    debt({ id: 'b', installmentCount: 1, startDate: '2026-11-06', currency: 'USD' }),
    debt({ id: 'c', installmentCount: 2, startDate: '2026-12-31' }),
    debt({ id: 'late', installmentCount: 1, startDate: '2026-11-04' })
  ]));
  const n = notifier(app, [{ id: 1, title: 'Legacy reminder' }]);
  await Promise.all([app.context.scheduleDueNotifications(), app.context.scheduleDueNotifications()]);
  assert.equal(n.pending.size, 3); assert.equal(n.scheduled.length, 3); assert.ok(n.canceled.includes(1));
  assert.ok(n.pending.get(20261106).body.includes('Test debt'));
  for (const note of n.pending.values()) {
    assert.equal(note.schedule.at.getHours(), 9); assert.equal(note.schedule.allowWhileIdle, true);
    assert.equal(app.context.toLocalDateStr(note.schedule.at), note.extra.dueDate);
  }
});

test('A07: date edits replace old reminders, payment cancels them, and undo recreates them', async () => {
  const app = createApp(); seed(app, backup([debt({ installmentCount: 1, startDate: '2026-11-06' })]));
  const n = notifier(app); await app.context.scheduleDueNotifications();
  app.run("editingDebtId='debt1';");
  app.context.persistDebt(debt({ installmentCount: 1, startDate: '2026-11-07' }), true);
  await app.context.scheduleDueNotifications();
  assert.equal(n.pending.has(20261106), false); assert.equal(n.pending.has(20261107), true);
  app.context.startPay('debt1', 0, 'full'); app.context.confirmPaySource('extra'); await app.context.scheduleDueNotifications();
  assert.equal(n.pending.size, 0);
  app.context.undoPayment(app.run('payments[0].id')); await app.context.scheduleDueNotifications();
  assert.equal(n.pending.has(20261107), true);
  app.context.deleteDebt('debt1'); await app.context.scheduleDueNotifications(); assert.equal(n.pending.size, 0);
});

test('A07: elapsed daily reminders do not fire again after reopening; denied permission is respected', async () => {
  const app = createApp(); seed(app, backup([debt({ installmentCount: 1, startDate: '2026-11-05' })]));
  const n = notifier(app); await app.context.scheduleDueNotifications(); assert.equal(n.scheduled.length, 1);
  const reopened = createApp({ now: '2026-11-05T19:00:00Z', storage: Object.fromEntries(app.storage) });
  seed(reopened, backup([debt({ installmentCount: 1, startDate: '2026-11-05' })]));
  const after = notifier(reopened); await reopened.context.scheduleDueNotifications(); assert.equal(after.scheduled.length, 0);
  const denied = createApp(); seed(denied, backup()); const none = notifier(denied, [], 'denied');
  assert.equal(await denied.context.scheduleDueNotifications(), false); assert.equal(none.scheduled.length, 0);
});

test('A08: failed debt/income saves preserve drafts and do not change data or show success', () => {
  const options = {}; const app = createApp(options); seed(app, backup()); app.context.markSyncDirty();
  const before = records(app); const raw = app.storage.get('borc_takip_state_v5'); options.failWrites = true;
  app.context.openDebtModal(); form(app); app.context.saveDebt({ preventDefault() {} });
  assert.deepEqual(records(app), before); assert.equal(app.document.getElementById('debt-name').value, 'New debt');
  assert.equal(app.document.getElementById('modal-debt').classList.contains('hidden'), false);
  assert.equal(app.document.getElementById('modal-debt-saved').classList.contains('hidden'), true);
  app.context.openIncomeModal(); app.document.getElementById('income-name').value = 'Salary'; app.document.getElementById('income-amount').value = '90';
  app.context.saveIncome({ preventDefault() {} });
  assert.deepEqual(records(app), before); assert.equal(app.document.getElementById('income-name').value, 'Salary');
  assert.equal(app.document.getElementById('modal-income').classList.contains('hidden'), false);
  assert.equal(app.storage.get('borc_takip_state_v5'), raw);
});

test('A08: payments and undo are atomic across debt, income deduction and payment history', () => {
  const options = {}; const app = createApp(options); seed(app, backup()); app.context.markSyncDirty();
  let before = records(app); let raw = app.storage.get('borc_takip_state_v5'); options.failWrites = true;
  app.context.startPay('debt1', 0, 'full'); app.context.confirmPaySource('salary');
  assert.deepEqual(records(app), before); assert.equal(app.storage.get('borc_takip_state_v5'), raw);
  assert.notEqual(app.run('pendingPay'), null);
  options.failWrites = false; app.context.confirmPaySource('salary');
  assert.equal(app.run('payments.length'), 1); assert.equal(app.run('adjustments.length'), 1);
  const payment = app.run('payments[0].id'); before = records(app); raw = app.storage.get('borc_takip_state_v5'); options.failWrites = true;
  app.context.undoPayment(payment); assert.deepEqual(records(app), before); assert.equal(app.storage.get('borc_takip_state_v5'), raw);
  const restarted = createApp({ storage: Object.fromEntries(app.storage) }); restarted.context.loadData();
  assert.deepEqual(records(restarted), before);
});

test('A08: failed edits, deletion and data replacement preserve the old snapshot', () => {
  const options = {}; const app = createApp(options); seed(app, backup()); app.context.markSyncDirty();
  const before = records(app); const raw = app.storage.get('borc_takip_state_v5'); options.failWrites = true;
  app.run("editingDebtId='debt1';pendingDebtSave={debt:{id:'debt1',installmentAmount:200,startDate:'2026-12-20'},installmentIndex:1};");
  app.context.applyDebtEdit('single'); assert.notEqual(app.run('pendingDebtSave'), null);
  app.context.deleteDebt('debt1'); app.context.clearAllData();
  assert.equal(app.context.applySyncPayload(backup([])), false);
  assert.deepEqual(records(app), before); assert.equal(app.storage.get('borc_takip_state_v5'), raw);
});

test('A09: names matching object properties remain selectable, hideable and restorable', () => {
  const app = createApp(); seed(app, backup(['constructor', '__proto__', 'toString', 'İpek', 'Русский'].map((name, i) => debt({ id: 'd' + i, name }))));
  assert.equal(app.context.getSavedNames().length, 5);
  app.context.removeSavedName('__proto__'); assert.equal(app.context.getSavedNames().length, 4);
  app.context.openDebtModal(); form(app, { 'debt-name': '__proto__' }); app.context.saveDebt({ preventDefault() {} });
  assert.equal(app.context.getSavedNames().length, 5);
});
