// Deliberately tests desired behavior in pre-existing edge cases. Failures are findings,
// not localization regressions; this audit is separate from the release test command.
const assert = require('node:assert/strict');
const { createApp, debt, backup, seed, connectDrive, response } = require('./helpers');
const results = [];
async function probe(id, name, fn) {
  try { const details = await fn(); results.push({ id, name, status: 'PASS', details }); }
  catch (error) { results.push({ id, name, status: 'FAIL', details: error.message }); }
}
(async function() {
  await probe('A01', 'Legacy paid installments must stay unchanged during all-installment editing', () => {
    const a = createApp(); seed(a, backup([debt({ paidInstallments: 1, partials: {} })]));
    a.run("editingDebtId='debt1';pendingDebtSave={debt:{id:'debt1',installmentAmount:200,startDate:'2026-12-10'},installmentIndex:1};");
    a.context.applyDebtEdit('all');
    assert.equal(a.run('debts[0].installmentOverrides[0]?.amount ?? debts[0].installmentAmount'), 100, 'Legacy paid first installment became 200 instead of staying 100');
  });
  await probe('A02', 'Undo must not reopen legacy paid installments', () => {
    const a = createApp(); seed(a, backup([debt({ paidInstallments: 1, partials: {} })]));
    a.context.startPay('debt1', 1, 'full'); a.context.confirmPaySource('extra');
    a.context.undoPayment(a.run('payments[0].id'));
    assert.equal(a.run('debts[0].paidInstallments'), 1, 'Undo reset the legacy paid count from 1 to 0 and reopened the first installment');
  });
  await probe('A03', 'An invalid local-storage array must not prevent opening the app', () => {
    const a = createApp({ storage: { borc_takip_debts: '{}' } }); a.context.loadData();
  });
  await probe('A04', 'Backup validation must reject duplicate IDs and invalid installment metadata', () => {
    const a = createApp(); const accepted = [];
    const samples = [
      ['duplicate IDs', backup([debt(), debt({ name: 'Another debt' })])],
      ['paidInstallments=999', backup([debt({ paidInstallments: 999 })])],
      ['override index=999', backup([debt({ installmentOverrides: { 999: { amount: 1 } } })])]
    ];
    for (const [name, sample] of samples) { try { a.context.validateBackup(sample); accepted.push(name); } catch {} }
    assert.deepEqual(accepted, [], 'Invalid backup structures were accepted: ' + accepted.join(', '));
  });
  await probe('A05', 'Single-installment amount edits must update the stored original total', () => {
    const a = createApp(); seed(a, backup());
    a.run("editingDebtId='debt1';pendingDebtSave={debt:{id:'debt1',installmentAmount:200,startDate:'2026-12-10'},installmentIndex:1};");
    a.context.applyDebtEdit('single');
    assert.equal(a.run('debts[0].totalAmount'), 400, 'Three installments of 100/200/100 still export totalAmount=300 instead of 400');
  });
  await probe('A06', 'First Drive restore must not silently discard a record added during the download', async () => {
    const a = createApp(); const remote = backup([debt({ name: 'Saved remotely' })]);
    connectDrive(a, async url => {
      if (url.includes('alt=media')) {
        a.run('debts.push(' + JSON.stringify(debt({ id: 'newlocal', name: 'Added during restore' })) + ');saveDebts();');
        return response(remote);
      }
      return response({ files: [{ id: 'file1', version: '1' }] });
    });
    await a.context.syncNow(true);
    assert.equal(a.run("debts.some(d => d.id === 'newlocal')"), true, 'The record entered while Drive was loading was overwritten by the remote backup');
  });
  await probe('A07', 'Upcoming due dates must be scheduled without reopening the app on the due day', () => {
    const a = createApp(); const scheduled = [];
    seed(a, backup([debt({ installmentCount: 1, startDate: '2026-11-06' })]));
    a.context.window.Capacitor = { Plugins: { LocalNotifications: {
      cancel() { return Promise.resolve(); }, schedule(payload) { scheduled.push(payload); return Promise.resolve(); }
    } } };
    a.context.scheduleDueNotifications();
    assert.ok(scheduled.length > 0, 'No notification was scheduled for tomorrow’s debt; only debts due on the current open day are considered');
  });
  await probe('A08', 'A full storage device must produce a handled save failure', () => {
    const a = createApp({ failWrites: true });
    for (const [id, value] of Object.entries({ 'debt-name': 'Save test', 'debt-total': '100', 'debt-due': '2026-11-15', 'debt-currency': 'TRY' })) a.document.getElementById(id).value = value;
    a.context.saveDebt({ preventDefault() {} });
    assert.equal(a.run('debts.length'), 0, 'An unsaved debt must not remain only in memory');
  });
  await probe('A09', 'Saved names must accept ordinary strings matching JavaScript property names', () => {
    const a = createApp(); seed(a, backup([debt({ name: 'constructor' }), debt({ id: 'd2', name: '__proto__' })]));
    assert.equal(a.context.getSavedNames().length, 2, 'constructor and __proto__ both disappear from the saved-name list');
  });
  console.log(JSON.stringify({ testedAt: new Date().toISOString(), findings: results.filter(r => r.status === 'FAIL').length, results }, null, 2));
  process.exitCode = results.some(r => r.status === 'FAIL') ? 1 : 0;
})();
