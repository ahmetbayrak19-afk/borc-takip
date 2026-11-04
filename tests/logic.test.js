const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function element() {
  return {
    value: '', checked: false, textContent: '', innerHTML: '', style: {}, disabled: false,
    className: '', classList: { add() {}, remove() {}, toggle() {}, contains() { return true; } },
    addEventListener() {}, setAttribute() {}, querySelector() { return null; }, appendChild() {}, focus() {}
  };
}

const elements = new Map();
const document = {
  getElementById(id) { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); },
  querySelectorAll() { return []; },
  createElement() { return element(); },
  addEventListener() {}, body: element()
};
const storage = new Map();
const localStorage = {
  getItem(key) { return storage.has(key) ? storage.get(key) : null; },
  setItem(key, value) { storage.set(key, String(value)); },
  removeItem(key) { storage.delete(key); }
};
const context = vm.createContext({
  console, document, localStorage, navigator: { onLine: true }, window: {},
  setTimeout() { return 1; }, clearTimeout() {}, Blob, URL,
  confirm() { return true; }, Intl, Date, Math, JSON, Object, Array, Number, String, Map, Set
});
const source = fs.readFileSync(require('path').join(__dirname, '..', 'app.js'), 'utf8');
vm.runInContext(source, context);

const baseBackup = {
  debts: [{ id: 'd1', name: 'Test', startDate: '2026-11-15', installmentAmount: 100, installmentCount: 2, currency: 'TRY' }],
  incomes: [], adjustments: [], payments: [], hiddenNames: []
};
assert.doesNotThrow(() => context.validateBackup(baseBackup));
assert.throws(() => context.validateBackup({ ...baseBackup, debts: [{ ...baseBackup.debts[0], startDate: '2027-02-30' }] }));
assert.throws(() => context.validateBackup({ ...baseBackup, adjustments: [{ id: 'a1', amount: 1, monthKey: '2026-13' }] }));

vm.runInContext(`
  debts = [{ id:'d1', name:'Taksit', installmentAmount:100, totalAmount:300, startDate:'2026-11-10',
    installmentCount:3, recurring:true, currency:'TRY', paidInstallments:0, partials:{1:100}, installmentOverrides:{} }];
  pendingDebtSave = { debt:{ id:'d1', installmentAmount:150, startDate:'2026-11-15' }, installmentIndex:0 };
  editingDebtId = 'd1';
  persistDebt = function(updated) { globalThis.updatedDebt = updated; };
  applyDebtEdit('all');
`, context);
const updated = context.updatedDebt;
assert.strictEqual(updated.installmentOverrides[0].amount, 150);
assert.strictEqual(updated.installmentOverrides[2].amount, 150);
assert.strictEqual(updated.installmentOverrides[1], undefined, 'Ödenen taksit değiştirilmemeli');
assert.strictEqual(context.installmentRemaining(updated, 1), 0, 'Ödenen taksit yeniden açılmamalı');

console.log('Mantık testleri geçti');
