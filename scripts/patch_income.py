#!/usr/bin/env python3
from pathlib import Path
import sys

p = Path(sys.argv[1] if len(sys.argv) > 1 else "www/app.js")
c = p.read_text(encoding="utf-8")

old_load = "  incomes.forEach(function(i) { if (!i.currency) i.currency = 'TRY'; });"
new_load = """  incomes.forEach(function(i) {
    if (!i.currency) i.currency = 'TRY';
    if (!i.type) i.type = 'recurring';
    if (!i.startMonth) {
      i.startMonth = (i.createdAt && String(i.createdAt).substring(0, 7)) || '2020-01';
    }
  });"""
if old_load not in c:
    raise SystemExit("load incomes block missing")
c = c.replace(old_load, new_load, 1)

old_inc = """function getEffectiveIncomeByCurrency(monthKey) {
  const map = {};
  incomes.forEach(function(inc) {
    const c = inc.currency || 'TRY';
    map[c] = (map[c] || 0) + (Number(inc.amount) || 0);
  });"""
new_inc = """function incomeAppliesToMonth(inc, monthKey) {
  if (!inc) return false;
  const type = inc.type || 'recurring';
  if (type === 'once') {
    const key = (inc.date || inc.startMonth || '').substring(0, 7);
    return key === monthKey;
  }
  const start = inc.startMonth || (inc.createdAt && String(inc.createdAt).substring(0, 7)) || '2020-01';
  return start <= monthKey;
}
function getEffectiveIncomeByCurrency(monthKey) {
  const map = {};
  incomes.forEach(function(inc) {
    if (!incomeAppliesToMonth(inc, monthKey)) return;
    const c = inc.currency || 'TRY';
    map[c] = (map[c] || 0) + (Number(inc.amount) || 0);
  });"""
if old_inc not in c:
    raise SystemExit("getEffectiveIncomeByCurrency block missing")
c = c.replace(old_inc, new_inc, 1)

start = c.find("function renderIncomes()")
end = c.find("function renderDebts()")
if start < 0 or end < 0:
    raise SystemExit("renderIncomes/renderDebts missing")
new_render = """function renderIncomes() {
  const list = document.getElementById('income-list');
  const empty = document.getElementById('income-empty');
  list.innerHTML = '';
  const monthKey = getMonthKeyForOffset(getFilterMonthOffset(currentFilter));
  const visible = incomes.filter(function(inc) { return incomeAppliesToMonth(inc, monthKey); });
  if (visible.length === 0) { empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  visible.forEach(function(inc) {
    const cur = inc.currency || 'TRY';
    const type = inc.type || 'recurring';
    const sub = type === 'once'
      ? ('Tek seferlik \u00b7 ' + formatDateTR(inc.date || (inc.startMonth + '-01')))
      : ('Düzenli \u00b7 her ay \u00b7 ' + cur);
    const el = document.createElement('div');
    el.className = 'bg-white rounded-xl p-3.5 card-shadow flex items-center justify-between fade-in';
    el.innerHTML = '<div class="flex items-center gap-3"><div class="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><i class="fas fa-wallet"></i></div><div><p class="font-medium text-gray-900">' + escapeHtml(inc.name) + '</p><p class="text-xs text-gray-500">' + sub + '</p></div></div><div class="flex items-center gap-2"><span class="font-semibold text-emerald-600">' + formatMoney(inc.amount, cur) + '</span><button onclick="deleteIncome(\\\'' + inc.id + '\\\')" class="text-gray-400 hover:text-red-500 p-1.5"><i class="fas fa-trash-alt text-sm"></i></button></div>';
    list.appendChild(el);
  });
}
"""
c = c[:start] + new_render + c[end:]

old_modal = """function openIncomeModal() {
  document.getElementById('income-name').value = '';
  document.getElementById('income-amount').value = '';
  fillCurrencySelects();
  document.getElementById('income-currency').value = 'TRY';
  document.getElementById('modal-income').classList.remove('hidden');
}
function closeIncomeModal() {
  document.getElementById('modal-income').classList.add('hidden');
}
function saveIncome(e) {
  e.preventDefault();
  const name = document.getElementById('income-name').value.trim();
  const amount = parseFloat(document.getElementById('income-amount').value);
  const currency = document.getElementById('income-currency').value || 'TRY';
  if (!name || isNaN(amount) || amount <= 0) { showToast('Eksik bilgi'); return; }
  incomes.push({ id: uid(), name: name, amount: amount, currency: currency, createdAt: new Date().toISOString() });
  saveIncomes();
  closeIncomeModal();
  showToast('Gelir eklendi');
  renderAll();
}"""
new_modal = """let incomeType = 'recurring';
function setIncomeType(type) {
  incomeType = type === 'once' ? 'once' : 'recurring';
  const rec = document.getElementById('income-type-recurring');
  const once = document.getElementById('income-type-once');
  const wrap = document.getElementById('income-date-wrap');
  const hint = document.getElementById('income-type-hint');
  const amtLbl = document.getElementById('income-amount-label');
  const dateEl = document.getElementById('income-date');
  if (rec && once) {
    if (incomeType === 'recurring') {
      rec.className = 'py-3 px-2 rounded-xl border-2 border-blue-500 bg-blue-50 text-blue-700 text-sm font-semibold';
      once.className = 'py-3 px-2 rounded-xl border-2 border-gray-200 bg-white text-gray-600 text-sm font-medium';
    } else {
      once.className = 'py-3 px-2 rounded-xl border-2 border-blue-500 bg-blue-50 text-blue-700 text-sm font-semibold';
      rec.className = 'py-3 px-2 rounded-xl border-2 border-gray-200 bg-white text-gray-600 text-sm font-medium';
    }
  }
  if (wrap) wrap.classList.toggle('hidden', incomeType !== 'once');
  if (hint) {
    hint.textContent = incomeType === 'once'
      ? 'Sadece seçtiğin ayda görünür, diğer aylara yansımaz.'
      : 'Maaş, kira gibi. Girdiğin aydan itibaren her aya yansır.';
  }
  if (amtLbl) amtLbl.textContent = incomeType === 'once' ? 'Tutar' : 'Aylık Tutar';
  if (dateEl && !dateEl.value) dateEl.value = todayStr();
}
function openIncomeModal() {
  document.getElementById('income-name').value = '';
  document.getElementById('income-amount').value = '';
  fillCurrencySelects();
  document.getElementById('income-currency').value = 'TRY';
  const dateEl = document.getElementById('income-date');
  if (dateEl) dateEl.value = todayStr();
  setIncomeType('recurring');
  document.getElementById('modal-income').classList.remove('hidden');
}
function closeIncomeModal() {
  document.getElementById('modal-income').classList.add('hidden');
}
function saveIncome(e) {
  e.preventDefault();
  const name = document.getElementById('income-name').value.trim();
  const amount = parseFloat(document.getElementById('income-amount').value);
  const currency = document.getElementById('income-currency').value || 'TRY';
  const type = incomeType === 'once' ? 'once' : 'recurring';
  const dateVal = (document.getElementById('income-date') && document.getElementById('income-date').value) || todayStr();
  if (!name || isNaN(amount) || amount <= 0) { showToast('Eksik bilgi'); return; }
  if (type === 'once' && !dateVal) { showToast('Tarih seçin'); return; }
  const startMonth = type === 'once' ? dateVal.substring(0, 7) : todayStr().substring(0, 7);
  incomes.push({
    id: uid(),
    name: name,
    amount: amount,
    currency: currency,
    type: type,
    date: type === 'once' ? dateVal : null,
    startMonth: startMonth,
    createdAt: new Date().toISOString()
  });
  saveIncomes();
  closeIncomeModal();
  showToast(type === 'once' ? 'Tek seferlik gelir eklendi' : 'Düzenli gelir eklendi');
  renderAll();
}"""
if old_modal not in c:
    raise SystemExit("income modal functions missing")
c = c.replace(old_modal, new_modal, 1)

old_click = """          currentFilter = t.dataset.filter;
          renderBalance();
          renderSummaries();
          renderDebts();"""
new_click = """          currentFilter = t.dataset.filter;
          renderIncomes();
          renderBalance();
          renderSummaries();
          renderDebts();"""
if old_click not in c:
    old_click2 = """          currentFilter = t.dataset.filter;
          renderFilterOptions();
          renderBalance();
          renderSummaries();
          renderDebts();"""
    new_click2 = """          currentFilter = t.dataset.filter;
          renderFilterOptions();
          renderIncomes();
          renderBalance();
          renderSummaries();
          renderDebts();"""
    if old_click2 in c:
        c = c.replace(old_click2, new_click2, 1)
    elif "renderIncomes();\n          renderBalance();" not in c:
        raise SystemExit("filter click block missing")
else:
    c = c.replace(old_click, new_click, 1)

p.write_text(c, encoding="utf-8")
print("patched", p, "bytes", p.stat().st_size)
