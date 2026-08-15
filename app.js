// ==================== BORÇ TAKİP APP ====================
const STORAGE_DEBTS = 'borc_takip_debts';
const STORAGE_INCOMES = 'borc_takip_incomes';
const STORAGE_ADJUST = 'borc_takip_adjustments';
let debts = [];
let incomes = [];
let adjustments = []; // {id, monthKey, amount, currency, note, createdAt}
let editingDebtId = null;
let currentFilter = 'this-month';

// Pending payment flow
let pendingPay = null; // { debtId, installmentIndex, amount, mode: 'full'|'partial' }

const CURRENCIES = [
  { code: 'TRY', symbol: '₺', label: 'TRY ₺' },
  { code: 'USD', symbol: '$', label: 'USD $' },
  { code: 'EUR', symbol: '€', label: 'EUR €' },
  { code: 'GBP', symbol: '£', label: 'GBP £' },
  { code: 'CHF', symbol: 'Fr', label: 'CHF' },
  { code: 'SAR', symbol: '﷼', label: 'SAR' },
  { code: 'AED', symbol: 'د.إ', label: 'AED' }
];

const FILTER_THEMES = {
  overdue: {
    card: 'bg-rose-50 rounded-xl p-3 card-shadow text-center border border-rose-100',
    cardActive: 'bg-rose-50 rounded-xl p-3 card-shadow text-center border-2 border-rose-400',
    debt: 'bg-rose-50 rounded-xl p-4 card-shadow fade-in border border-rose-200',
    label: 'text-rose-600'
  },
  today: {
    card: 'bg-amber-50 rounded-xl p-3 card-shadow text-center border border-amber-100',
    cardActive: 'bg-amber-50 rounded-xl p-3 card-shadow text-center border-2 border-amber-400',
    debt: 'bg-amber-50 rounded-xl p-4 card-shadow fade-in border border-amber-200',
    label: 'text-amber-600'
  },
  'this-month': {
    card: 'bg-sky-50 rounded-xl p-3 card-shadow text-center border border-sky-100',
    cardActive: 'bg-sky-50 rounded-xl p-3 card-shadow text-center border-2 border-sky-400',
    debt: 'bg-sky-50 rounded-xl p-4 card-shadow fade-in border border-sky-200',
    label: 'text-sky-600'
  },
  'month-1': {
    card: 'bg-emerald-50 rounded-xl p-3 card-shadow text-center border border-emerald-100',
    cardActive: 'bg-emerald-50 rounded-xl p-3 card-shadow text-center border-2 border-emerald-400',
    debt: 'bg-emerald-50 rounded-xl p-4 card-shadow fade-in border border-emerald-200',
    label: 'text-emerald-700'
  },
  'month-2': {
    card: 'bg-violet-50 rounded-xl p-3 card-shadow text-center border border-violet-100',
    cardActive: 'bg-violet-50 rounded-xl p-3 card-shadow text-center border-2 border-violet-400',
    debt: 'bg-violet-50 rounded-xl p-4 card-shadow fade-in border border-violet-200',
    label: 'text-violet-600'
  },
  all: {
    card: 'bg-slate-50 rounded-xl p-3 card-shadow text-center border border-slate-100',
    cardActive: 'bg-slate-50 rounded-xl p-3 card-shadow text-center border-2 border-slate-400',
    debt: 'bg-slate-50 rounded-xl p-4 card-shadow fade-in border border-slate-200',
    label: 'text-slate-600'
  }
};
function getTheme(filter) {
  return FILTER_THEMES[filter] || FILTER_THEMES['this-month'];
}

function currencyMeta(code) {
  return CURRENCIES.find(function(c) { return c.code === code; }) || CURRENCIES[0];
}
function formatMoney(amount, currency) {
  currency = currency || 'TRY';
  try {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: currency, minimumFractionDigits: 2 }).format(amount || 0);
  } catch (e) {
    return currencyMeta(currency).symbol + ' ' + (Number(amount) || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 });
  }
}
function fillCurrencySelects() {
  ['debt-currency', 'income-currency'].forEach(function(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = CURRENCIES.map(function(c) {
      return '<option value="' + c.code + '">' + c.label + '</option>';
    }).join('');
  });
}
function toLocalDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}
function formatDateTR(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00');
  const days = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
  const months = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear() + ' ' + days[d.getDay()];
}
function monthNameTR(offset) {
  const months = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return months[d.getMonth()];
}
function todayStr() { return toLocalDateStr(new Date()); }
function addMonths(dateStr, months) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setMonth(d.getMonth() + months);
  return toLocalDateStr(d);
}
function isSameMonth(dateStr, ref) {
  if (!ref) ref = new Date();
  const d = new Date(dateStr + 'T12:00:00');
  return d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear();
}
function isMonthOffset(dateStr, offset) {
  const ref = new Date();
  ref.setMonth(ref.getMonth() + offset);
  return isSameMonth(dateStr, ref);
}
function isOverdue(dateStr) { return dateStr < todayStr(); }
function isToday(dateStr) { return dateStr === todayStr(); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('opacity-0');
  t.classList.add('opacity-100');
  setTimeout(function() { t.classList.remove('opacity-100'); t.classList.add('opacity-0'); }, 2800);
}
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&').replace(/</g,'<').replace(/>/g,'>').replace(/"/g,'"');
}
function loadData() {
  try {
    debts = JSON.parse(localStorage.getItem(STORAGE_DEBTS) || '[]');
    incomes = JSON.parse(localStorage.getItem(STORAGE_INCOMES) || '[]');
    adjustments = JSON.parse(localStorage.getItem(STORAGE_ADJUST) || '[]');
  } catch (e) { debts = []; incomes = []; adjustments = []; }
  debts.forEach(function(d) {
    if (!d.currency) d.currency = 'TRY';
    if (!d.partials) d.partials = {};
  });
  incomes.forEach(function(i) { if (!i.currency) i.currency = 'TRY'; });
}
function saveDebts() { localStorage.setItem(STORAGE_DEBTS, JSON.stringify(debts)); }
function saveIncomes() { localStorage.setItem(STORAGE_INCOMES, JSON.stringify(incomes)); }
function saveAdjustments() { localStorage.setItem(STORAGE_ADJUST, JSON.stringify(adjustments)); }

function installmentRemaining(debt, index) {
  const full = debt.installmentAmount || debt.totalAmount || 0;
  const paid = (debt.partials && Number(debt.partials[index])) || 0;
  return Math.max(0, Math.round((full - paid) * 100) / 100);
}

function getActiveInstallments() {
  const result = [];
  debts.forEach(function(debt) {
    const paidCount = debt.paidInstallments || 0;
    const count = debt.installmentCount || 1;
    const currency = debt.currency || 'TRY';
    for (let i = paidCount; i < count; i++) {
      const remaining = installmentRemaining(debt, i);
      if (remaining <= 0) continue;
      result.push({
        debtId: debt.id,
        name: debt.name,
        amount: remaining,
        fullAmount: debt.installmentAmount || debt.totalAmount || 0,
        partialPaid: (debt.partials && Number(debt.partials[i])) || 0,
        dueDate: addMonths(debt.startDate, i),
        installmentLabel: (i + 1) + '/' + count,
        installmentIndex: i,
        isRecurring: !!debt.recurring,
        currency: currency,
        totalAmount: debt.totalAmount || ((debt.installmentAmount || 0) * count),
        remaining: count - paidCount
      });
    }
  });
  return result;
}

function calcSummaries() {
  const items = getActiveInstallments();
  let overdue = 0, today = 0, thisMonth = 0, next1 = 0, next2 = 0, later = 0, total = 0;
  items.forEach(function(item) {
    total += item.amount;
    if (isOverdue(item.dueDate)) overdue += item.amount;
    else if (isToday(item.dueDate)) today += item.amount;
    else if (isSameMonth(item.dueDate)) thisMonth += item.amount;
    else if (isMonthOffset(item.dueDate, 1)) next1 += item.amount;
    else if (isMonthOffset(item.dueDate, 2)) next2 += item.amount;
    else later += item.amount;
  });
  return { overdue: overdue, today: today, thisMonth: thisMonth, next1: next1, next2: next2, later: later, total: total };
}

function getFilterMonthOffset(filter) {
  if (filter === 'month-1') return 1;
  if (filter === 'month-2') return 2;
  return 0;
}
function balanceMonthName(filter) {
  return monthNameTR(getFilterMonthOffset(filter));
}
function getMonthKeyForOffset(offset) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}
function getEffectiveIncomeByCurrency(monthKey) {
  const map = {};
  incomes.forEach(function(inc) {
    const c = inc.currency || 'TRY';
    map[c] = (map[c] || 0) + (Number(inc.amount) || 0);
  });
  adjustments.forEach(function(adj) {
    if (adj.monthKey !== monthKey) return;
    const c = adj.currency || 'TRY';
    map[c] = (map[c] || 0) - (Number(adj.amount) || 0);
  });
  return map;
}
function getDebtByCurrencyForOffset(offset) {
  const map = {};
  getActiveInstallments().forEach(function(item) {
    let match = false;
    if (offset === 0) match = isSameMonth(item.dueDate);
    else match = isMonthOffset(item.dueDate, offset);
    if (!match) return;
    const c = item.currency || 'TRY';
    map[c] = (map[c] || 0) + item.amount;
  });
  return map;
}

function renderBalance() {
  const offset = getFilterMonthOffset(currentFilter);
  const monthName = balanceMonthName(currentFilter);
  const monthKey = getMonthKeyForOffset(offset);
  const incomeMap = getEffectiveIncomeByCurrency(monthKey);
  const debtMap = getDebtByCurrencyForOffset(offset);
  const currencies = {};
  Object.keys(incomeMap).forEach(function(c) { currencies[c] = true; });
  Object.keys(debtMap).forEach(function(c) { currencies[c] = true; });
  const codes = Object.keys(currencies);
  const banner = document.getElementById('balance-banner');
  const lines = document.getElementById('balance-lines');
  const sub = document.getElementById('balance-sub');
  const icon = document.getElementById('balance-icon');
  const monthEl = document.getElementById('balance-month');
  if (codes.length === 0) { banner.classList.add('hidden'); return; }
  let anyActivity = false;
  codes.forEach(function(c) {
    if ((incomeMap[c] || 0) !== 0 || (debtMap[c] || 0) !== 0) anyActivity = true;
  });
  if (!anyActivity) { banner.classList.add('hidden'); return; }
  banner.classList.remove('hidden');
  if (monthEl) monthEl.textContent = monthName;
  lines.innerHTML = '';
  let overallPositive = true;
  codes.sort().forEach(function(c) {
    const inc = incomeMap[c] || 0;
    const deb = debtMap[c] || 0;
    if (inc === 0 && deb === 0) return;
    const bal = inc - deb;
    if (bal < 0) overallPositive = false;
    const p = document.createElement('p');
    p.className = 'text-xl font-bold mt-0.5';
    p.textContent = formatMoney(Math.abs(bal), c) + (bal >= 0 ? ' artı' : ' eksi');
    lines.appendChild(p);
  });
  if (overallPositive) {
    banner.className = 'mt-4 rounded-2xl p-4 text-white fade-in bg-gradient-to-r from-emerald-500 to-green-600';
    icon.innerHTML = '<i class="fas fa-arrow-up"></i>';
  } else {
    banner.className = 'mt-4 rounded-2xl p-4 text-white fade-in bg-gradient-to-r from-rose-500 to-red-600';
    icon.innerHTML = '<i class="fas fa-arrow-down"></i>';
  }
  const parts = codes.map(function(c) {
    const inc = incomeMap[c] || 0;
    const deb = debtMap[c] || 0;
    if (inc === 0 && deb === 0) return null;
    return formatMoney(inc, c) + ' gelir / ' + formatMoney(deb, c) + ' borç';
  }).filter(Boolean);
  sub.textContent = monthName + ': ' + parts.join(' · ');
}

function renderSummaries() {
  const s = calcSummaries();
  document.getElementById('sum-overdue').textContent = formatMoney(s.overdue, 'TRY');
  document.getElementById('sum-today').textContent = formatMoney(s.today, 'TRY');
  document.getElementById('sum-this-month').textContent = formatMoney(s.thisMonth + s.today, 'TRY');
  const cards = document.querySelectorAll('#summary-grid > div');
  if (cards.length >= 6) {
    const filters = ['overdue', 'today', 'this-month', 'month-1', 'month-2', 'all'];
    cards[3].querySelector('p:first-child').textContent = monthNameTR(1);
    cards[3].querySelector('p:last-child').textContent = formatMoney(s.next1, 'TRY');
    cards[4].querySelector('p:first-child').textContent = monthNameTR(2);
    cards[4].querySelector('p:last-child').textContent = formatMoney(s.next2 + s.later, 'TRY');
    for (let i = 0; i < 6; i++) {
      cards[i].setAttribute('data-filter', filters[i]);
      cards[i].style.cursor = 'pointer';
      const th = getTheme(filters[i]);
      cards[i].className = (filters[i] === currentFilter) ? th.cardActive : th.card;
    }
  }
  document.getElementById('sum-total').textContent = formatMoney(s.total, 'TRY');
}

function renderIncomes() {
  const list = document.getElementById('income-list');
  const empty = document.getElementById('income-empty');
  list.innerHTML = '';
  if (incomes.length === 0) { empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  incomes.forEach(function(inc) {
    const cur = inc.currency || 'TRY';
    const el = document.createElement('div');
    el.className = 'bg-white rounded-xl p-3.5 card-shadow flex items-center justify-between fade-in';
    el.innerHTML = '<div class="flex items-center gap-3"><div class="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><i class="fas fa-wallet"></i></div><div><p class="font-medium text-gray-900">' + escapeHtml(inc.name) + '</p><p class="text-xs text-gray-500">Aylık · ' + cur + '</p></div></div><div class="flex items-center gap-2"><span class="font-semibold text-emerald-600">' + formatMoney(inc.amount, cur) + '</span><button onclick="deleteIncome(\'' + inc.id + '\')" class="text-gray-400 hover:text-red-500 p-1.5"><i class="fas fa-trash-alt text-sm"></i></button></div>';
    list.appendChild(el);
  });
}

function renderDebts() {
  const filter = currentFilter;
  const list = document.getElementById('debt-list');
  const empty = document.getElementById('debt-empty');
  list.innerHTML = '';
  let items = getActiveInstallments();
  if (filter === 'today') items = items.filter(function(i) { return isToday(i.dueDate); });
  else if (filter === 'this-month') items = items.filter(function(i) { return isSameMonth(i.dueDate); });
  else if (filter === 'overdue') items = items.filter(function(i) { return isOverdue(i.dueDate); });
  else if (filter === 'upcoming') items = items.filter(function(i) { return !isOverdue(i.dueDate); });
  else if (filter.indexOf('month-') === 0) {
    const offset = parseInt(filter.split('-')[1], 10);
    items = items.filter(function(i) { return isMonthOffset(i.dueDate, offset); });
  }
  items.sort(function(a, b) { return a.dueDate.localeCompare(b.dueDate); });
  if (items.length === 0) { empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  items.forEach(function(item) {
    const isLate = isOverdue(item.dueDate);
    const isTod = isToday(item.dueDate);
    const cur = item.currency || 'TRY';
    const partialNote = item.partialPaid > 0
      ? '<p class="text-xs text-gray-500 mt-0.5">Kalan · ödenen ' + formatMoney(item.partialPaid, cur) + '</p>'
      : '';
    const el = document.createElement('div');
    el.className = getTheme(filter).debt;
    el.innerHTML =
      '<div class="flex justify-between items-start">' +
        '<div class="flex-1 min-w-0">' +
          '<p class="text-xs text-gray-500 mb-0.5">' + formatDateTR(item.dueDate) + '</p>' +
          '<p class="font-semibold text-gray-900 truncate">' + escapeHtml(item.name) + '</p>' +
          '<p class="text-xs font-medium text-blue-600 mt-1">(' + item.installmentLabel + ') · ' + cur + '</p>' +
          partialNote +
        '</div>' +
        '<div class="text-right ml-3">' +
          '<p class="font-bold ' + (isLate ? 'text-red-600' : 'text-gray-900') + '">' + formatMoney(item.amount, cur) + '</p>' +
          (isLate ? '<span class="text-xs text-red-500 font-medium">Gecikmiş</span>' : isTod ? '<span class="text-xs text-orange-500 font-medium">Bugün</span>' : '') +
        '</div>' +
      '</div>' +
      '<div class="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100 flex-wrap">' +
        '<button onclick="startFullPay(\'' + item.debtId + '\',' + item.installmentIndex + ')" class="text-green-600 hover:text-green-700 flex items-center gap-1.5 text-sm font-medium"><i class="fas fa-check-circle"></i> Ödendi</button>' +
        '<button onclick="startPartialPay(\'' + item.debtId + '\',' + item.installmentIndex + ')" class="text-amber-600 hover:text-amber-700 flex items-center gap-1.5 text-sm font-medium"><i class="fas fa-coins"></i> Kısmi Öde</button>' +
        '<button onclick="editDebt(\'' + item.debtId + '\')" class="text-blue-600 hover:text-blue-700 flex items-center gap-1.5 text-sm font-medium"><i class="fas fa-pen"></i> Düzenle</button>' +
        '<button onclick="deleteDebt(\'' + item.debtId + '\')" class="text-red-500 hover:text-red-600 flex items-center gap-1.5 text-sm font-medium ml-auto"><i class="fas fa-times"></i></button>' +
      '</div>';
    list.appendChild(el);
  });
}

function filterLabel(f) {
  if (f === 'today') return 'Bugün';
  if (f === 'this-month') return 'Bu Ay';
  if (f === 'overdue') return 'Gecikmiş';
  if (f === 'all') return 'Tümü';
  if (f && f.indexOf('month-') === 0) return monthNameTR(parseInt(f.split('-')[1], 10));
  return 'Bu Ay';
}
function renderFilterOptions() {
  const label = document.getElementById('debt-list-label');
  if (label) {
    label.textContent = filterLabel(currentFilter);
    const th = getTheme(currentFilter);
    label.className = 'text-xs font-medium ' + th.label;
  }
}
function renderAll() {
  renderFilterOptions();
  renderBalance();
  renderSummaries();
  renderIncomes();
  renderDebts();
}

// ---- Payment flow ----
function startFullPay(debtId, installmentIndex) {
  const debt = debts.find(function(d) { return d.id === debtId; });
  if (!debt) return;
  const remaining = installmentRemaining(debt, installmentIndex);
  if (remaining <= 0) return;
  pendingPay = { debtId: debtId, installmentIndex: installmentIndex, amount: remaining, mode: 'full' };
  document.getElementById('pay-source-info').textContent =
    debt.name + ' · ' + formatMoney(remaining, debt.currency || 'TRY') + ' tamamen ödenecek';
  document.getElementById('modal-pay-source').classList.remove('hidden');
}
function startPartialPay(debtId, installmentIndex) {
  const debt = debts.find(function(d) { return d.id === debtId; });
  if (!debt) return;
  const remaining = installmentRemaining(debt, installmentIndex);
  if (remaining <= 0) return;
  pendingPay = { debtId: debtId, installmentIndex: installmentIndex, amount: remaining, mode: 'partial' };
  document.getElementById('partial-info').textContent =
    debt.name + ' · kalan ' + formatMoney(remaining, debt.currency || 'TRY');
  document.getElementById('partial-amount').value = '';
  document.getElementById('partial-amount').max = remaining;
  document.getElementById('modal-partial').classList.remove('hidden');
}
function closePartialModal() {
  document.getElementById('modal-partial').classList.add('hidden');
}
function submitPartialAmount() {
  if (!pendingPay) return;
  const debt = debts.find(function(d) { return d.id === pendingPay.debtId; });
  if (!debt) return;
  const remaining = installmentRemaining(debt, pendingPay.installmentIndex);
  let amt = parseFloat(document.getElementById('partial-amount').value);
  if (!amt || amt <= 0) { showToast('Geçerli tutar girin'); return; }
  if (amt > remaining) amt = remaining;
  pendingPay.amount = Math.round(amt * 100) / 100;
  closePartialModal();
  document.getElementById('pay-source-info').textContent =
    debt.name + ' · ' + formatMoney(pendingPay.amount, debt.currency || 'TRY') + ' kısmi ödeme';
  document.getElementById('modal-pay-source').classList.remove('hidden');
}
function closePaySourceModal() {
  document.getElementById('modal-pay-source').classList.add('hidden');
  pendingPay = null;
}
function confirmPaySource(source) {
  if (!pendingPay) return;
  const debt = debts.find(function(d) { return d.id === pendingPay.debtId; });
  if (!debt) { closePaySourceModal(); return; }
  const idx = pendingPay.installmentIndex;
  const amount = pendingPay.amount;
  const currency = debt.currency || 'TRY';
  const dueDate = addMonths(debt.startDate, idx);

  if (!debt.partials) debt.partials = {};
  debt.partials[idx] = Math.round(((Number(debt.partials[idx]) || 0) + amount) * 100) / 100;

  while ((debt.paidInstallments || 0) < (debt.installmentCount || 1) &&
         installmentRemaining(debt, debt.paidInstallments || 0) <= 0) {
    debt.paidInstallments = (debt.paidInstallments || 0) + 1;
  }

  if (source === 'salary') {
    const monthKey = dueDate.slice(0, 7);
    adjustments.push({
      id: uid(),
      monthKey: monthKey,
      amount: amount,
      currency: currency,
      note: debt.name,
      createdAt: new Date().toISOString()
    });
    saveAdjustments();
    showToast('Ödendi (maaştan) · durum aynı kaldı');
  } else {
    showToast('Ödendi (ekstra) · durum iyileşti');
  }

  saveDebts();
  closePaySourceModal();
  renderAll();
  scheduleDueNotifications();
}

function openNamePicker() {
  const list = document.getElementById('name-picker-list');
  const empty = document.getElementById('name-picker-empty');
  list.innerHTML = '';
  const seen = {};
  const names = [];
  for (let i = debts.length - 1; i >= 0; i--) {
    const name = (debts[i].name || '').trim();
    if (name && !seen[name.toLowerCase()]) { seen[name.toLowerCase()] = true; names.push(name); }
  }
  if (names.length === 0) empty.classList.remove('hidden');
  else {
    empty.classList.add('hidden');
    names.forEach(function(n) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'w-full text-left px-4 py-3 rounded-xl bg-gray-50 hover:bg-blue-50 border border-gray-100 text-gray-800 font-medium';
      btn.textContent = n;
      btn.onclick = function() { document.getElementById('debt-name').value = n; closeNamePicker(); };
      list.appendChild(btn);
    });
  }
  document.getElementById('modal-name-picker').classList.remove('hidden');
}
function closeNamePicker() { document.getElementById('modal-name-picker').classList.add('hidden'); }

function openDebtModal(editId) {
  editingDebtId = editId || null;
  const modal = document.getElementById('modal-debt');
  const title = document.getElementById('debt-modal-title');
  const form = document.getElementById('form-debt');
  form.reset();
  fillCurrencySelects();
  document.getElementById('debt-id').value = '';
  document.getElementById('debt-installments').value = 2;
  document.getElementById('installment-fields').classList.add('hidden');
  document.getElementById('installment-preview').classList.add('hidden');
  document.getElementById('debt-recurring').checked = false;
  document.getElementById('debt-currency').value = 'TRY';
  if (editId) {
    const debt = debts.find(function(d) { return d.id === editId; });
    if (!debt) return;
    title.textContent = 'Borcu Düzenle';
    document.getElementById('debt-id').value = debt.id;
    document.getElementById('debt-name').value = debt.name;
    document.getElementById('debt-total').value = debt.installmentAmount || debt.totalAmount;
    document.getElementById('debt-due').value = debt.startDate;
    document.getElementById('debt-installments').value = debt.installmentCount || 1;
    document.getElementById('debt-currency').value = debt.currency || 'TRY';
    const isMulti = (debt.installmentCount || 1) > 1;
    document.getElementById('debt-recurring').checked = isMulti;
    if (isMulti) {
      document.getElementById('installment-fields').classList.remove('hidden');
      updateInstallmentPreview();
    }
  } else {
    title.textContent = 'Yeni Borç Ekle';
    const d = new Date();
    d.setDate(d.getDate() + 7);
    document.getElementById('debt-due').value = toLocalDateStr(d);
  }
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function closeDebtModal() {
  document.getElementById('modal-debt').classList.add('hidden');
  document.body.style.overflow = '';
  editingDebtId = null;
}
function updateInstallmentPreview() {
  const amount = parseFloat(document.getElementById('debt-total').value) || 0;
  const count = parseInt(document.getElementById('debt-installments').value) || 1;
  const cur = document.getElementById('debt-currency').value || 'TRY';
  const preview = document.getElementById('installment-preview');
  const info = document.getElementById('installment-info');
  if (count > 1 && amount > 0) {
    const total = Math.round(amount * count * 100) / 100;
    info.textContent = count + ' taksit × ' + formatMoney(amount, cur) + ' = ' + formatMoney(total, cur) + ' toplam';
    preview.classList.remove('hidden');
  } else preview.classList.add('hidden');
}
function saveDebt(e) {
  e.preventDefault();
  const id = document.getElementById('debt-id').value || uid();
  const name = document.getElementById('debt-name').value.trim();
  const installmentAmount = parseFloat(document.getElementById('debt-total').value);
  const startDate = document.getElementById('debt-due').value;
  const currency = document.getElementById('debt-currency').value || 'TRY';
  const isMulti = document.getElementById('debt-recurring').checked;
  let installmentCount = 1;
  if (isMulti) {
    installmentCount = parseInt(document.getElementById('debt-installments').value) || 1;
    if (installmentCount < 1) installmentCount = 1;
  }
  if (!name || !installmentAmount || !startDate) { showToast('Lütfen zorunlu alanları doldurun'); return; }
  const totalAmount = Math.round(installmentAmount * installmentCount * 100) / 100;
  const existingIdx = debts.findIndex(function(d) { return d.id === id; });
  let paidInstallments = 0;
  let partials = {};
  if (existingIdx >= 0) {
    const old = debts[existingIdx];
    if (old.startDate === startDate && old.installmentCount === installmentCount && old.installmentAmount === installmentAmount) {
      paidInstallments = old.paidInstallments || 0;
      partials = old.partials || {};
    }
  }
  const debtObj = {
    id: id, name: name, category: '', totalAmount: totalAmount,
    installmentCount: installmentCount, installmentAmount: installmentAmount,
    startDate: startDate, note: '', recurring: isMulti,
    paidInstallments: paidInstallments, partials: partials, currency: currency,
    createdAt: existingIdx >= 0 ? debts[existingIdx].createdAt : new Date().toISOString()
  };
  if (existingIdx >= 0) { debts[existingIdx] = debtObj; showToast('Borç güncellendi'); }
  else { debts.push(debtObj); showToast('Borç eklendi'); }
  saveDebts(); closeDebtModal(); renderAll(); scheduleDueNotifications();
}
function editDebt(debtId) { openDebtModal(debtId); }
function deleteDebt(debtId) {
  if (!confirm('Bu borcu silmek istediğinize emin misiniz?')) return;
  debts = debts.filter(function(d) { return d.id !== debtId; });
  saveDebts(); showToast('Borç silindi'); renderAll();
}

function openIncomeModal() {
  fillCurrencySelects();
  document.getElementById('form-income').reset();
  document.getElementById('income-currency').value = 'TRY';
  document.getElementById('modal-income').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function closeIncomeModal() {
  document.getElementById('modal-income').classList.add('hidden');
  document.body.style.overflow = '';
}
function saveIncome(e) {
  e.preventDefault();
  const name = document.getElementById('income-name').value.trim();
  const amount = parseFloat(document.getElementById('income-amount').value);
  const currency = document.getElementById('income-currency').value || 'TRY';
  if (!name || !amount) return;
  incomes.push({ id: uid(), name: name, amount: amount, currency: currency, createdAt: new Date().toISOString() });
  saveIncomes(); closeIncomeModal(); showToast('Gelir eklendi'); renderAll();
}
function deleteIncome(id) {
  if (!confirm('Bu geliri silmek istiyor musunuz?')) return;
  incomes = incomes.filter(function(i) { return i.id !== id; });
  saveIncomes(); showToast('Gelir silindi'); renderAll();
}

function openSettings() { document.getElementById('modal-settings').classList.remove('hidden'); }
function closeSettings() { document.getElementById('modal-settings').classList.add('hidden'); }

function exportData() {
  const data = { debts: debts, incomes: incomes, adjustments: adjustments, exportedAt: new Date().toISOString() };
  const json = JSON.stringify(data, null, 2);
  const filename = 'borc-takip-' + todayStr() + '.json';
  closeSettings();
  saveBackupFile(json, filename);
}

async function saveBackupFile(json, filename) {
  if (window.Capacitor && window.Capacitor.Plugins) {
    const FS = window.Capacitor.Plugins.Filesystem;
    const SharePlugin = window.Capacitor.Plugins.Share;
    try {
      if (FS && FS.writeFile) {
        await FS.writeFile({ path: filename, data: json, directory: 'DOCUMENTS', encoding: 'utf8', recursive: true });
        let uri = null;
        try {
          const uriResult = await FS.getUri({ path: filename, directory: 'DOCUMENTS' });
          uri = uriResult && (uriResult.uri || uriResult);
        } catch (e1) {}
        if (SharePlugin && SharePlugin.share) {
          try {
            const shareOpts = { title: 'Borç Takip Yedek', dialogTitle: 'Yedeği kaydet veya paylaş' };
            if (uri) shareOpts.url = uri; else shareOpts.text = json;
            await SharePlugin.share(shareOpts);
            showToast('Kaydedildi: ' + filename);
            return;
          } catch (e2) {
            showToast('Belgeler klasörüne kaydedildi: ' + filename);
            return;
          }
        }
        showToast('Belgeler klasörüne kaydedildi: ' + filename);
        return;
      }
    } catch (err) {
      showToast('Kayıt hatası, panoya kopyalanıyor...');
      copyTextFallback(json);
      return;
    }
  }
  try {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.rel = 'noopener';
    document.body.appendChild(a); a.click();
    setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(url); }, 800);
    showToast('İndirildi: ' + filename);
  } catch (e) { copyTextFallback(json); }
}

function copyTextFallback(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function() { showToast('JSON panoya kopyalandı'); })
      .catch(function() { showToast('Dışa aktarma başarısız'); });
  } else showToast('Dışa aktarma desteklenmiyor');
}

function importData(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    try {
      const data = JSON.parse(ev.target.result);
      if (data.debts) debts = data.debts;
      if (data.incomes) incomes = data.incomes;
      if (data.adjustments) adjustments = data.adjustments;
      saveDebts(); saveIncomes(); saveAdjustments(); renderAll();
      showToast('Veriler yüklendi'); closeSettings();
    } catch (err) { showToast('Geçersiz dosya'); }
  };
  reader.readAsText(file);
}
function clearAllData() {
  if (!confirm('TÜM borç ve gelir verileri silinecek. Emin misiniz?')) return;
  debts = []; incomes = []; adjustments = [];
  saveDebts(); saveIncomes(); saveAdjustments(); renderAll();
  showToast('Tüm veriler silindi'); closeSettings();
}

function getMonthKey(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}
function monthTitleFromKey(key) {
  const parts = key.split('-');
  const months = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  return months[parseInt(parts[1], 10) - 1] + ' ' + parts[0];
}
function openMonthsModal() {
  closeSettings();
  const items = getActiveInstallments();
  const byMonth = {};
  items.forEach(function(item) {
    const key = getMonthKey(item.dueDate);
    if (!byMonth[key]) byMonth[key] = { total: 0, count: 0 };
    byMonth[key].total += item.amount;
    byMonth[key].count += 1;
  });
  const keys = Object.keys(byMonth).sort();
  const list = document.getElementById('months-list');
  list.innerHTML = '';
  if (keys.length === 0) {
    list.innerHTML = '<p class="text-center text-gray-400 py-8">Henüz borç yok.</p>';
  } else {
    keys.forEach(function(key) {
      const m = byMonth[key];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'w-full flex items-center justify-between px-4 py-3.5 rounded-xl bg-gray-50 hover:bg-blue-50 border border-gray-100 text-left';
      btn.innerHTML = '<div><p class="font-semibold text-gray-900">' + monthTitleFromKey(key) + '</p><p class="text-xs text-gray-500">' + m.count + ' borç</p></div><span class="font-bold text-gray-800">' + formatMoney(m.total, 'TRY') + '</span>';
      btn.onclick = function() { openMonthDebtsModal(key); };
      list.appendChild(btn);
    });
  }
  document.getElementById('modal-months').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function closeMonthsModal() {
  const el = document.getElementById('modal-months');
  if (el) el.classList.add('hidden');
  document.body.style.overflow = '';
}
function openMonthDebtsModal(monthKey) {
  const items = getActiveInstallments().filter(function(i) { return getMonthKey(i.dueDate) === monthKey; });
  items.sort(function(a, b) { return a.dueDate.localeCompare(b.dueDate); });
  document.getElementById('month-debts-title').textContent = monthTitleFromKey(monthKey);
  const list = document.getElementById('month-debts-list');
  const empty = document.getElementById('month-debts-empty');
  const totalEl = document.getElementById('month-debts-total');
  list.innerHTML = '';
  if (items.length === 0) {
    empty.classList.remove('hidden');
    totalEl.textContent = '';
  } else {
    empty.classList.add('hidden');
    let total = 0;
    items.forEach(function(item) {
      total += item.amount;
      const isLate = isOverdue(item.dueDate);
      const el = document.createElement('div');
      el.className = 'bg-gray-50 rounded-xl p-4';
      el.innerHTML = '<div class="flex justify-between items-start"><div><p class="text-xs text-gray-500">' + formatDateTR(item.dueDate) + '</p><p class="font-semibold text-gray-900">' + escapeHtml(item.name) + '</p><p class="text-xs text-blue-600 mt-0.5">(' + item.installmentLabel + ') · ' + (item.currency || 'TRY') + '</p></div><p class="font-bold ' + (isLate ? 'text-red-600' : 'text-gray-900') + '">' + formatMoney(item.amount, item.currency || 'TRY') + '</p></div>';
      list.appendChild(el);
    });
    totalEl.textContent = 'Toplam: ' + formatMoney(total, 'TRY');
  }
  document.getElementById('modal-month-debts').classList.remove('hidden');
}
function closeMonthDebtsModal() {
  const el = document.getElementById('modal-month-debts');
  if (el) el.classList.add('hidden');
}

// ---- Notifications (due today only) ----
async function requestNotifPermission() {
  closeSettings();
  try {
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications) {
      const LN = window.Capacitor.Plugins.LocalNotifications;
      const perm = await LN.requestPermissions();
      if (perm && (perm.display === 'granted' || perm.receive === 'granted')) {
        showToast('Bildirim izni verildi');
        await scheduleDueNotifications();
      } else {
        showToast('Bildirim izni gerekli');
      }
    } else if ('Notification' in window) {
      const p = await Notification.requestPermission();
      showToast(p === 'granted' ? 'Bildirim izni verildi' : 'Bildirim izni reddedildi');
      scheduleDueNotifications();
    } else {
      showToast('Bildirim bu cihazda desteklenmiyor');
    }
  } catch (e) {
    showToast('Bildirim hatası');
  }
}

async function scheduleDueNotifications() {
  const todayItems = getActiveInstallments().filter(function(i) { return isToday(i.dueDate); });
  if (todayItems.length === 0) return;

  const title = 'Bugün ödenecek borç';
  const body = todayItems.length === 1
    ? (todayItems[0].name + ' · ' + formatMoney(todayItems[0].amount, todayItems[0].currency))
    : (todayItems.length + ' borcun vadesi bugün');

  try {
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications) {
      const LN = window.Capacitor.Plugins.LocalNotifications;
      await LN.cancel({ notifications: [{ id: 1001 }] }).catch(function() {});
      await LN.schedule({
        notifications: [{
          id: 1001,
          title: title,
          body: body,
          schedule: { at: new Date(Date.now() + 2000) },
          sound: undefined,
          smallIcon: 'ic_stat_icon_default',
          channelId: 'borc_due'
        }]
      });
    } else if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body: body });
    }
  } catch (e) {
    console.warn('notif', e);
  }
}

function isModalOpen(id) {
  const el = document.getElementById(id);
  return el && !el.classList.contains('hidden');
}
function handleBackButton() {
  if (isModalOpen('modal-pay-source')) { closePaySourceModal(); return; }
  if (isModalOpen('modal-partial')) { closePartialModal(); return; }
  if (isModalOpen('modal-month-debts')) { closeMonthDebtsModal(); return; }
  if (isModalOpen('modal-months')) { closeMonthsModal(); return; }
  if (isModalOpen('modal-name-picker')) { closeNamePicker(); return; }
  if (isModalOpen('modal-debt')) { closeDebtModal(); return; }
  if (isModalOpen('modal-income')) { closeIncomeModal(); return; }
  if (isModalOpen('modal-settings')) { closeSettings(); return; }
  if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) window.Capacitor.Plugins.App.exitApp();
}
function setupBackButton() {
  if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App)
    window.Capacitor.Plugins.App.addListener('backButton', handleBackButton);
}

function hideSplash() {
  const s = document.getElementById('splash');
  const root = document.getElementById('app-root');
  if (root) root.classList.add('visible');
  document.body.classList.add('app-ready');
  if (!s) return;
  s.classList.add('fade-out');
  setTimeout(function() {
    s.style.display = 'none';
    s.remove();
  }, 600);
}

document.addEventListener('DOMContentLoaded', function() {
  fillCurrencySelects();
  loadData();
  renderAll();
  setupBackButton();
  setTimeout(hideSplash, 1100);
  setTimeout(scheduleDueNotifications, 1500);

  document.getElementById('btn-add-debt').addEventListener('click', function() { openDebtModal(); });
  document.getElementById('btn-add-income').addEventListener('click', openIncomeModal);
  document.getElementById('btn-settings').addEventListener('click', openSettings);
  document.getElementById('form-debt').addEventListener('submit', saveDebt);
  document.getElementById('form-income').addEventListener('submit', saveIncome);
  document.getElementById('debt-total').addEventListener('input', updateInstallmentPreview);
  document.getElementById('debt-installments').addEventListener('input', updateInstallmentPreview);
  document.getElementById('debt-currency').addEventListener('change', updateInstallmentPreview);
  document.getElementById('debt-recurring').addEventListener('change', function(e) {
    const fields = document.getElementById('installment-fields');
    if (e.target.checked) {
      fields.classList.remove('hidden');
      if (parseInt(document.getElementById('debt-installments').value) < 2) document.getElementById('debt-installments').value = 2;
      updateInstallmentPreview();
    } else {
      fields.classList.add('hidden');
      document.getElementById('debt-installments').value = 1;
      document.getElementById('installment-preview').classList.add('hidden');
    }
  });
  const grid = document.getElementById('summary-grid');
  if (grid) {
    grid.addEventListener('click', function(e) {
      const card = e.target.closest('[data-filter]');
      if (!card) return;
      const f = card.getAttribute('data-filter');
      if (f) { currentFilter = f; renderFilterOptions(); renderBalance(); renderSummaries(); renderDebts(); }
    });
  }
  const pickBtn = document.getElementById('btn-pick-name');
  if (pickBtn) pickBtn.addEventListener('click', openNamePicker);
});
