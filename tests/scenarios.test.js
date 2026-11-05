const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp, debt, backup, seed, plain, connectDrive, response } = require('./helpers');

test('month ends, leap years and year transitions keep the original day when possible', () => {
  const { context: c } = createApp();
  for (const [start, offset, expected] of [
    ['2026-01-31', 1, '2026-02-28'], ['2026-01-31', 2, '2026-03-31'],
    ['2028-01-31', 1, '2028-02-29'], ['2026-12-31', 1, '2027-01-31'], ['2026-03-31', -1, '2026-02-28']
  ]) assert.equal(c.addMonths(start, offset), expected);
});
test('new debt defaults to today in the current month and the 15th in any other month', () => {
  const { context: c } = createApp();
  assert.equal(c.defaultDateForMonth('2026-11'), '2026-11-05');
  for (const month of ['2026-10', '2026-12', '2027-01', '2028-02']) assert.equal(c.defaultDateForMonth(month), month + '-15');
  assert.equal(c.defaultDateForMonth(null), '2026-11-05');
});
test('summary separates overdue, today, future months and currencies', () => {
  const a = createApp();
  seed(a, backup([
    debt({ id: 'd1', startDate: '2026-11-04', installmentCount: 1, currency: 'TRY', installmentAmount: 10 }),
    debt({ id: 'd2', startDate: '2026-11-05', installmentCount: 1, currency: 'USD', installmentAmount: 20 }),
    debt({ id: 'd3', startDate: '2026-12-01', installmentCount: 1, currency: 'EUR', installmentAmount: 30 })
  ]));
  const s = plain(a.context.calcSummaries());
  assert.deepEqual(s.overdue, { TRY: 10 }); assert.deepEqual(s.today, { USD: 20 });
  assert.deepEqual(s.thisMonth, { TRY: 10, USD: 20 }); assert.deepEqual(s.next1, { EUR: 30 });
  assert.deepEqual(s.total, { TRY: 10, USD: 20, EUR: 30 });
});
test('recurring income starts in its start month; one-time income stays in one month', () => {
  const { context: c } = createApp();
  const recurring = { type: 'recurring', startMonth: '2026-12' };
  assert.equal(c.incomeAppliesToMonth(recurring, '2026-11'), false);
  assert.equal(c.incomeAppliesToMonth(recurring, '2027-01'), true);
  assert.equal(c.incomeAppliesToMonth({ type: 'once', date: '2026-12-15' }, '2026-12'), true);
  assert.equal(c.incomeAppliesToMonth({ type: 'once', date: '2026-12-15' }, '2027-12'), false);
});
test('exchange-rate conversion uses all currencies and safely falls back without a rate', () => {
  const a = createApp();
  a.storage.set('borc_takip_convert_try', '1');
  a.run('rateCache = { rates: { USD: 0.025, EUR: 0.02 } };');
  assert.equal(a.context.totalInTL({ TRY: 10, USD: 2, EUR: 1 }), 140);
  assert.equal(a.context.totalInTL({ TRY: 10, CHF: 1 }), null);
  a.storage.set('borc_takip_convert_try', '0');
  assert.equal(a.context.totalInTL({ USD: 1 }), null);
});
test('rates refresh at most once per 12 hours after success and respect offline mode', async () => {
  let calls = 0;
  const a = createApp({ fetch: async () => { calls++; return response([{ base: 'TRY', quote: 'USD', rate: 0.025, date: '2026-11-04' }]); } });
  a.storage.set('borc_takip_convert_try', '1');
  await a.context.refreshRates(); await a.context.refreshRates();
  assert.equal(calls, 1);
  a.run('rateCache.fetchedAt = 0; lastRateAttempt = 0;');
  a.context.navigator.onLine = false;
  await a.context.refreshRates(); assert.equal(calls, 1);
});
for (const source of ['salary', 'extra']) {
  test(`${source}: partial payment, archive and undo preserve balance semantics`, () => {
    const a = createApp();
    seed(a, { ...backup([debt({ installmentCount: 1, totalAmount: 100 })]), incomes: [{ id: 'i1', name: 'Salary', amount: 1000, type: 'recurring', startMonth: '2026-11', currency: 'TRY' }] });
    const beforeBalance = a.context.getEffectiveIncomeByCurrency('2026-11').TRY - a.context.calcSummaries().thisMonth.TRY;
    a.context.startPay('debt1', 0, 'partial');
    a.document.getElementById('partial-amount').value = '30.25';
    a.context.submitPartialAmount(); a.context.confirmPaySource(source);
    assert.equal(a.context.getActiveInstallments()[0].amount, 69.75);
    assert.equal(a.run('payments.length'), 1);
    const balance = a.context.getEffectiveIncomeByCurrency('2026-11').TRY - a.context.calcSummaries().thisMonth.TRY;
    assert.equal(balance, beforeBalance + (source === 'extra' ? 30.25 : 0));
    a.context.undoPayment(a.run('payments[0].id'));
    assert.equal(a.context.getActiveInstallments()[0].amount, 100);
    assert.equal(a.run('payments.length'), 0); assert.equal(a.run('adjustments.length'), 0);
  });
}
test('out-of-order full payments do not hide earlier unpaid installments', () => {
  const a = createApp(); seed(a, backup());
  a.context.startPay('debt1', 2, 'full'); a.context.confirmPaySource('extra');
  assert.deepEqual(plain(a.context.getActiveInstallments()).map(i => i.installmentIndex), [0, 1]);
  a.context.startPay('debt1', 0, 'full'); a.context.confirmPaySource('extra');
  assert.deepEqual(plain(a.context.getActiveInstallments()).map(i => i.installmentIndex), [1]);
});
test('partial payment rejects zero, negative, empty and excess amounts', () => {
  const a = createApp(); seed(a, backup());
  for (const value of ['0', '-1', '', '100.01']) {
    a.context.startPay('debt1', 0, 'partial'); a.document.getElementById('partial-amount').value = value;
    a.context.submitPartialAmount();
    assert.equal(a.document.getElementById('modal-pay-source').classList.contains('hidden'), true);
    assert.equal(a.run('payments.length'), 0);
  }
});
test('single-installment edit preserves other amounts, dates, name, currency and count', () => {
  const a = createApp(); seed(a, backup());
  a.run("editingDebtId='debt1';pendingDebtSave={debt:{id:'debt1',installmentAmount:150,startDate:'2026-12-18'},installmentIndex:1};");
  a.context.applyDebtEdit('single');
  const d = plain(a.run('debts[0]'));
  assert.equal(d.name, 'Test debt'); assert.equal(d.currency, 'TRY'); assert.equal(d.installmentCount, 3);
  assert.equal(d.installmentOverrides[0], undefined); assert.equal(d.installmentOverrides[2], undefined);
  assert.deepEqual(d.installmentOverrides[1], { amount: 150, dueDate: '2026-12-18' });
});
test('all-open-installment edit preserves modern fully paid installments', () => {
  const a = createApp(); seed(a, backup([debt({ partials: { 0: 100 }, paidInstallments: 1 })]));
  a.run("editingDebtId='debt1';pendingDebtSave={debt:{id:'debt1',installmentAmount:150,startDate:'2026-12-18'},installmentIndex:1};");
  a.context.applyDebtEdit('all');
  const d = plain(a.run('debts[0]'));
  assert.equal(d.installmentOverrides[0], undefined); assert.equal(d.installmentOverrides[1].amount, 150); assert.equal(d.installmentOverrides[2].amount, 150);
});
test('delete cancellation leaves records unchanged; delete retains payment history', () => {
  const canceled = createApp({ confirm: false }); seed(canceled, backup());
  canceled.context.deleteDebt('debt1'); assert.equal(canceled.run('debts.length'), 1);
  const a = createApp(); seed(a, backup()); a.context.startPay('debt1', 0, 'full'); a.context.confirmPaySource('extra');
  a.context.deleteDebt('debt1'); assert.equal(a.run('debts.length'), 0); assert.equal(a.run('payments.length'), 1);
});
test('backup validator rejects impossible dates, negative amounts, unsupported currency and executable IDs', () => {
  const a = createApp();
  for (const patch of [{ startDate: '2027-02-30' }, { installmentAmount: -1 }, { installmentCount: 121 }, { currency: 'INVALID' }, { id: "x');alert(1);//" }]) {
    assert.throws(() => a.context.validateBackup(backup([debt(patch)])));
  }
  assert.doesNotThrow(() => a.context.validateBackup(backup([debt({ name: '<script>alert(1)</script>' })])));
});
test('restoring a backup round-trips records without changing the local language', () => {
  const a = createApp(); a.context.BorcI18n.setLanguage('ru');
  const data = backup([debt({ name: 'Özel & <test> \"Здравствуйте\"' })]);
  assert.ok(a.context.applySyncPayload(a.context.validateBackup(data)));
  assert.deepEqual(plain(a.context.buildSyncPayload()).debts, data.debts);
  assert.equal(a.context.BorcI18n.getLanguage(), 'ru');
});
test('first Google connection restores the existing remote backup', async () => {
  const a = createApp(); const remote = backup([debt({ name: 'Remote backup' })]); const calls = [];
  connectDrive(a, async (url, options = {}) => { calls.push({ url, method: options.method }); return response(url.includes('alt=media') ? remote : { files: [{ id: 'file1', version: '1' }] }); });
  await a.context.syncNow(true);
  assert.equal(a.run('debts[0].name'), 'Remote backup'); assert.equal(a.context.getSyncMeta().baseline, 'file1:1');
  assert.ok(!calls.some(call => call.method === 'POST' || call.method === 'PATCH'));
});
test('offline edits remain pending and upload when sync runs after reconnection', async () => {
  const a = createApp(); const remote = backup([debt({ name: 'Old' })]); seed(a, backup([debt({ name: 'Offline edit' })]));
  let uploads = 0;
  connectDrive(a, async (url, options = {}) => {
    if (options.method === 'PATCH') { uploads++; assert.ok(options.body.includes('Offline edit')); return response({ id: 'file1', version: '2' }); }
    return response(url.includes('alt=media') ? remote : { files: [{ id: 'file1', version: '1' }] });
  }, { baseline: 'file1:1' });
  a.context.navigator.onLine = false; a.context.markSyncDirty(); await a.context.syncNow(false);
  assert.equal(uploads, 0); assert.equal(a.context.getSyncMeta().dirty, true);
  a.context.navigator.onLine = true; await a.context.syncNow(false);
  assert.equal(uploads, 1); assert.equal(a.context.getSyncMeta().dirty, false);
});
test('signed-out or paused sync does not send records', async () => {
  const a = createApp(); let calls = 0; connectDrive(a, async () => { calls++; throw new Error('Unexpected'); }, { paused: true });
  await a.context.syncNow(false); assert.equal(calls, 0);
  a.context.setSyncMeta({ signedIn: false, paused: false }); await a.context.syncNow(true); assert.equal(calls, 0);
});
test('a mismatched Google account cannot upload or delete another account’s data', async () => {
  const a = createApp(); let calls = 0;
  connectDrive(a, async () => { calls++; return response({}); }, { account: 'other@example.test' });
  await a.context.syncNow(true); assert.equal(calls, 0); assert.equal(a.context.getSyncMeta().error, true);
});
test('clearing phone records pauses sync and keeps the language preference', () => {
  const a = createApp(); seed(a, backup()); a.context.BorcI18n.setLanguage('de');
  a.context.clearAllData(); assert.equal(a.run('debts.length'), 0); assert.equal(a.context.getSyncMeta().paused, true);
  assert.equal(a.context.BorcI18n.getLanguage(), 'de');
});
test('deleting Drive backup deletes all app backup copies and preserves phone records', async () => {
  const a = createApp(); seed(a, backup()); const deleted = [];
  connectDrive(a, async (url, options = {}) => {
    if (options.method === 'DELETE') { deleted.push(url); return response({}); }
    return response({ files: [{ id: 'file1', version: '1' }, { id: 'file2', version: '2' }] });
  });
  await a.context.deleteDriveBackup(); assert.equal(deleted.length, 2); assert.equal(a.run('debts.length'), 1);
  assert.equal(a.context.getSyncMeta().paused, true);
});
