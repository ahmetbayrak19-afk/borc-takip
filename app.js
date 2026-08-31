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
function shiftMonth(date, months) {
  // 31 Agustos + 1 ay = 30 Eylul (Ekim'e tasmasin)
  const d = new Date(date.getTime());
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return d;
}
function monthKeyFromOffset(offset) {
  const d = shiftMonth(new Date(), offset);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}
function monthNameTR(offset) {
  const months = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  const d = shiftMonth(new Date(), offset);
  return months[d.getMonth()];
}
function todayStr() { return toLocalDateStr(new Date()); }
function addMonths(dateStr, months) {
  const d = new Date(dateStr + 'T12:00:00');
  return toLocalDateStr(shiftMonth(d, months));
}
function isSameMonth(dateStr, ref) {
  if (!ref) ref = new Date();
  const key = ref.getFullYear() + '-' + String(ref.getMonth() + 1).padStart(2, '0');
  return String(dateStr).substring(0, 7) === key;
}
function isMonthOffset(dateStr, offset) {
  return String(dateStr).substring(0, 7) === monthKeyFromOffset(offset);
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
  var s = String(str);
  s = s.split('&').join('&' + 'amp;');
  s = s.split('<').join('&' + 'lt;');
  s = s.split('>').join('&' + 'gt;');
  s = s.split('"').join('&' + 'quot;');
  return s;
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
  // Her kartta SADECE o döneme ait borç tutarı (maaş/kalan değil)
  const items = getActiveInstallments();
  let overdue = 0, today = 0, thisMonth = 0, next1 = 0, next2 = 0, later = 0, total = 0;
  items.forEach(function(item) {
    total += item.amount;
    if (isOverdue(item.dueDate)) overdue += item.amount;
    if (isToday(item.dueDate)) today += item.amount;
    // Bu ay: o aydaki tüm borçlar (gecikmiş + bugün + kalan günler)
    if (isSameMonth(item.dueDate)) thisMonth += item.amount;
    else if (isMonthOffset(item.dueDate, 1)) next1 += item.amount;
    else if (isMonthOffset(item.dueDate, 2)) next2 += item.amount;
    else if (!isOverdue(item.dueDate)) later += item.amount;
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
  return monthKeyFromOffset(offset);
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
  document.getElementById('sum-this-month').textContent = formatMoney(s.thisMonth, 'TRY');
  const cards = document.querySelectorAll('#summary-grid > div');
  if (cards.length >= 6) {
    const filters = ['overdue', 'today', 'this-month', 'month-1', 'month-2', 'all'];
    cards[3].querySelector('p:first-child').textContent = monthNameTR(1);
    cards[3].querySelector('p:last-child').textContent = formatMoney(s.next1, 'TRY');
    cards[4].querySelector('p:first-child').textContent = monthNameTR(2);
    // Sadece 2. ayın borçları — sonraki aylar buraya eklenmez
    cards[4].querySelector('p:last-child').textContent = formatMoney(s.next2, 'TRY');
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
  const label = document.getElementById('debt-list-label');
  list.innerHTML = '';
  let items = getActiveInstallments();
  if (filter === 'overdue') items = items.filter(function(i) { return isOverdue(i.dueDate); });
  else if (filter === 'today') items = items.filter(function(i) { return isToday(i.dueDate); });
  else if (filter === 'this-month') items = items.filter(function(i) { return isSameMonth(i.dueDate); });
  else if (filter === 'month-1') items = items.filter(function(i) { return isMonthOffset(i.dueDate, 1); });
  else if (filter === 'month-2') items = items.filter(function(i) { return isMonthOffset(i.dueDate, 2); });
  else if (filter === 'all') { /* all remaining */ }
  else items = items.filter(function(i) { return isSameMonth(i.dueDate); });

  if (label) label.textContent = filterLabel(filter);
  if (items.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  items.sort(function(a, b) { return a.dueDate.localeCompare(b.dueDate); });
  items.forEach(function(item) {
    const th = getTheme(filter);
    const el = document.createElement('div');
    el.className = th.debt;
    const remainingTxt = item.partialPaid > 0 ? ' (kısmi ödendi: ' + formatMoney(item.partialPaid, item.currency) + ')' : '';
    el.innerHTML = '<div class="flex items-start justify-between gap-3"><div class="min-w-0 flex-1"><p class="font-semibold text-gray-900 truncate">' + escapeHtml(item.name) + '</p><p class="text-xs text-gray-500 mt-0.5">' + formatDateTR(item.dueDate) + (item.installmentLabel ? ' · ' + item.installmentLabel : '') + remainingTxt + '</p></div><div class="text-right shrink-0"><p class="font-bold ' + th.label + '">' + formatMoney(item.amount, item.currency) + '</p><div class="flex gap-1 mt-1 justify-end"><button onclick="startPay(\'' + item.debtId + '\', ' + item.installmentIndex + ', \'full\')" class="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg font-medium">Öde</button><button onclick="startPay(\'' + item.debtId + '\', ' + item.installmentIndex + ', \'partial\')" class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-lg font-medium">Kısmi</button><button onclick="editDebt(\'' + item.debtId + '\')" class="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg"><i class="fas fa-pen"></i></button></div></div></div>';
    list.appendChild(el);
  });
}

function filterLabel(f) {
  if (f === 'overdue') return 'Gecikmiş';
  if (f === 'today') return 'Bugün';
  if (f === 'this-month') return 'Bu Ay';
  if (f === 'month-1') return monthNameTR(1);
  if (f === 'month-2') return monthNameTR(2);
  if (f === 'all') return 'Tümü';
  return 'Bu Ay';
}

function renderAll() {
  renderIncomes();
  renderBalance();
  renderSummaries();
  renderDebts();
}

// ==================== PAYMENT FLOW ====================
function startPay(debtId, installmentIndex, mode) {
  const debt = debts.find(function(d) { return d.id === debtId; });
  if (!debt) return;
  const remaining = installmentRemaining(debt, installmentIndex);
  if (remaining <= 0) return;
  pendingPay = { debtId: debtId, installmentIndex: installmentIndex, amount: remaining, mode: mode };
  if (mode === 'partial') {
    document.getElementById('partial-info').textContent = escapeHtml(debt.name) + ' — kalan: ' + formatMoney(remaining, debt.currency || 'TRY');
    document.getElementById('partial-amount').value = '';
    document.getElementById('partial-amount').max = remaining;
    document.getElementById('modal-partial').classList.remove('hidden');
  } else {
    document.getElementById('pay-source-info').textContent = escapeHtml(debt.name) + ' — ' + formatMoney(remaining, debt.currency || 'TRY');
    document.getElementById('modal-pay-source').classList.remove('hidden');
  }
}

function closePartialModal() {
  document.getElementById('modal-partial').classList.add('hidden');
  pendingPay = null;
}
function submitPartialAmount() {
  const val = parseFloat(document.getElementById('partial-amount').value);
  if (!pendingPay || isNaN(val) || val <= 0) { showToast('Geçerli tutar girin'); return; }
  const debt = debts.find(function(d) { return d.id === pendingPay.debtId; });
  if (!debt) return;
  const remaining = installmentRemaining(debt, pendingPay.installmentIndex);
  if (val > remaining) { showToast('Kalan tutardan fazla olamaz'); return; }
  pendingPay.amount = Math.round(val * 100) / 100;
  document.getElementById('modal-partial').classList.add('hidden');
  document.getElementById('pay-source-info').textContent = escapeHtml(debt.name) + ' — ' + formatMoney(pendingPay.amount, debt.currency || 'TRY');
  document.getElementById('modal-pay-source').classList.remove('hidden');
}

function closePaySourceModal() {
  document.getElementById('modal-pay-source').classList.add('hidden');
  pendingPay = null;
}
function confirmPaySource(source) {
  if (!pendingPay) return;
  const debt = debts.find(function(d) { return d.id === pendingPay.debtId; });
  if (!debt) return;
  const amount = pendingPay.amount;
  const idx = pendingPay.installmentIndex;
  const due = addMonths(debt.startDate, idx);
  const monthKey = due.substring(0, 7);

  if (!debt.partials) debt.partials = {};
  debt.partials[idx] = Math.round(((Number(debt.partials[idx]) || 0) + amount) * 100) / 100;

  while ((debt.paidInstallments || 0) < (debt.installmentCount || 1) &&
         installmentRemaining(debt, debt.paidInstallments || 0) <= 0) {
    debt.paidInstallments = (debt.paidInstallments || 0) + 1;
  }

  if (source === 'salary') {
    adjustments.push({
      id: uid(),
      monthKey: monthKey,
      amount: amount,
      currency: debt.currency || 'TRY',
      note: 'Maaştan ödeme: ' + debt.name,
      createdAt: new Date().toISOString()
    });
    saveAdjustments();
  }

  saveDebts();
  closePaySourceModal();
  showToast(source === 'salary' ? 'Maaştan ödendi' : 'Ekstra ile ödendi');
  renderAll();
  scheduleDueNotifications();
}

// ==================== DEBT CRUD ====================
function openDebtModal(editId) {
  editingDebtId = editId || null;
  document.getElementById('debt-modal-title').textContent = editId ? 'Borcu Düzenle' : 'Yeni Borç Ekle';
  document.getElementById('debt-id').value = editId || '';
  document.getElementById('debt-name').value = '';
  document.getElementById('debt-total').value = '';
  document.getElementById('debt-due').value = todayStr();
  document.getElementById('debt-recurring').checked = false;
  document.getElementById('debt-installments').value = '2';
  document.getElementById('installment-fields').classList.add('hidden');
  document.getElementById('installment-preview').classList.add('hidden');
  fillCurrencySelects();
  document.getElementById('debt-currency').value = 'TRY';
  if (editId) {
    const d = debts.find(function(x) { return x.id === editId; });
    if (d) {
      document.getElementById('debt-name').value = d.name;
      document.getElementById('debt-total').value = d.installmentAmount || d.totalAmount || '';
      document.getElementById('debt-due').value = d.startDate;
      document.getElementById('debt-recurring').checked = !!d.recurring;
      document.getElementById('debt-installments').value = d.installmentCount || 1;
      document.getElementById('debt-currency').value = d.currency || 'TRY';
      if (d.recurring || (d.installmentCount || 1) > 1) {
        document.getElementById('installment-fields').classList.remove('hidden');
        updateInstallmentPreview();
      }
    }
  }
  document.getElementById('modal-debt').classList.remove('hidden');
}
function closeDebtModal() {
  document.getElementById('modal-debt').classList.add('hidden');
  editingDebtId = null;
}
function updateInstallmentPreview() {
  const total = parseFloat(document.getElementById('debt-total').value) || 0;
  const count = parseInt(document.getElementById('debt-installments').value, 10) || 1;
  const prev = document.getElementById('installment-preview');
  const info = document.getElementById('installment-info');
  if (count > 1 && total > 0) {
    prev.classList.remove('hidden');
    info.textContent = count + ' taksit × ' + formatMoney(total, document.getElementById('debt-currency').value) + ' = ' + formatMoney(total * count, document.getElementById('debt-currency').value);
  } else {
    prev.classList.add('hidden');
  }
}
function saveDebt(e) {
  e.preventDefault();
  const name = document.getElementById('debt-name').value.trim();
  const amount = parseFloat(document.getElementById('debt-total').value);
  const due = document.getElementById('debt-due').value;
  const recurring = document.getElementById('debt-recurring').checked;
  const count = recurring ? (parseInt(document.getElementById('debt-installments').value, 10) || 1) : 1;
  const currency = document.getElementById('debt-currency').value || 'TRY';
  if (!name || isNaN(amount) || amount <= 0 || !due) { showToast('Eksik bilgi'); return; }

  let paidInstallments = 0;
  let partials = {};
  if (editingDebtId) {
    const old = debts.find(function(d) { return d.id === editingDebtId; });
    if (old) {
      paidInstallments = old.paidInstallments || 0;
      partials = old.partials || {};
    }
  }

  const debt = {
    id: editingDebtId || uid(),
    name: name,
    installmentAmount: amount,
    totalAmount: amount * count,
    startDate: due,
    recurring: recurring || count > 1,
    installmentCount: count,
    paidInstallments: paidInstallments,
    partials: partials,
    currency: currency,
    createdAt: new Date().toISOString()
  };

  if (editingDebtId) {
    const idx = debts.findIndex(function(d) { return d.id === editingDebtId; });
    if (idx >= 0) debts[idx] = debt;
  } else {
    debts.push(debt);
  }
  saveDebts();
  closeDebtModal();
  showToast(editingDebtId ? 'Borç güncellendi' : 'Borç eklendi');
  renderAll();
  scheduleDueNotifications();
}

function editDebt(id) {
  openDebtModal(id);
}
function deleteDebt(id) {
  if (!confirm('Bu borcu silmek istediğinize emin misiniz?')) return;
  debts = debts.filter(function(d) { return d.id !== id; });
  saveDebts();
  showToast('Borç silindi');
  renderAll();
}

// ==================== INCOME ====================
function openIncomeModal() {
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
}
function deleteIncome(id) {
  incomes = incomes.filter(function(i) { return i.id !== id; });
  saveIncomes();
  showToast('Gelir silindi');
  renderAll();
}

// ==================== SETTINGS / EXPORT / NOTIF ====================
function openSettings() {
  document.getElementById('modal-settings').classList.remove('hidden');
}
function closeSettings() {
  document.getElementById('modal-settings').classList.add('hidden');
}

function openMonthsModal() {
  closeSettings();
  const list = document.getElementById('months-list');
  list.innerHTML = '';
  const months = [];
  for (let i = -1; i <= 11; i++) {
    const d = shiftMonth(new Date(), i);
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    const name = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'][d.getMonth()] + ' ' + d.getFullYear();
    months.push({ key: key, name: name, offset: i });
  }
  months.forEach(function(m) {
    const items = getActiveInstallments().filter(function(it) {
      const dd = it.dueDate.substring(0, 7);
      return dd === m.key;
    });
    const totalByCur = {};
    items.forEach(function(it) {
      const c = it.currency || 'TRY';
      totalByCur[c] = (totalByCur[c] || 0) + it.amount;
    });
    const totalStr = Object.keys(totalByCur).map(function(c) { return formatMoney(totalByCur[c], c); }).join(' · ') || '—';
    const el = document.createElement('button');
    el.className = 'w-full flex items-center justify-between p-3.5 rounded-xl bg-gray-50 hover:bg-blue-50 text-left';
    el.innerHTML = '<span class="font-medium text-gray-900">' + m.name + '</span><span class="text-sm text-gray-600">' + totalStr + '</span>';
    el.onclick = function() { openMonthDebts(m.key, m.name); };
    list.appendChild(el);
  });
  document.getElementById('modal-months').classList.remove('hidden');
}
function closeMonthsModal() {
  document.getElementById('modal-months').classList.add('hidden');
}
function openMonthDebts(monthKey, title) {
  document.getElementById('month-debts-title').textContent = title;
  const list = document.getElementById('month-debts-list');
  const empty = document.getElementById('month-debts-empty');
  const totalEl = document.getElementById('month-debts-total');
  list.innerHTML = '';
  const items = getActiveInstallments().filter(function(it) { return it.dueDate.substring(0, 7) === monthKey; });
  if (items.length === 0) {
    empty.classList.remove('hidden');
    totalEl.textContent = '';
    document.getElementById('modal-month-debts').classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  const byCur = {};
  items.forEach(function(item) {
    const c = item.currency || 'TRY';
    byCur[c] = (byCur[c] || 0) + item.amount;
    const el = document.createElement('div');
    el.className = 'bg-white rounded-xl p-3.5 card-shadow flex items-center justify-between';
    el.innerHTML = '<div><p class="font-medium text-gray-900">' + escapeHtml(item.name) + '</p><p class="text-xs text-gray-500">' + formatDateTR(item.dueDate) + (item.installmentLabel ? ' · ' + item.installmentLabel : '') + '</p></div><p class="font-semibold text-gray-800">' + formatMoney(item.amount, item.currency) + '</p>';
    list.appendChild(el);
  });
  totalEl.textContent = 'Toplam: ' + Object.keys(byCur).map(function(c) { return formatMoney(byCur[c], c); }).join(' · ');
  document.getElementById('modal-month-debts').classList.remove('hidden');
}
function closeMonthDebtsModal() {
  document.getElementById('modal-month-debts').classList.add('hidden');
}

function exportData() {
  const data = { debts: debts, incomes: incomes, adjustments: adjustments, exportedAt: new Date().toISOString() };
  const json = JSON.stringify(data, null, 2);
  if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Filesystem && window.Capacitor.Plugins.Share) {
    const Filesystem = window.Capacitor.Plugins.Filesystem;
    const Share = window.Capacitor.Plugins.Share;
    const fileName = 'borc-takip-' + todayStr() + '.json';
    Filesystem.writeFile({
      path: fileName,
      data: btoa(unescape(encodeURIComponent(json))),
      directory: 'CACHE',
      encoding: 'utf8'
    }).then(function(res) {
      return Share.share({ title: 'Borç Takip Verileri', text: 'Veriler', url: res.uri, dialogTitle: 'Verileri paylaş' });
    }).then(function() {
      showToast('Paylaşıldı');
    }).catch(function(err) {
      console.error(err);
      downloadFallback(json);
    });
  } else {
    downloadFallback(json);
  }
  closeSettings();
}
function downloadFallback(json) {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'borc-takip-' + todayStr() + '.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('İndirildi');
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (data.debts) debts = data.debts;
      if (data.incomes) incomes = data.incomes;
      if (data.adjustments) adjustments = data.adjustments;
      saveDebts(); saveIncomes(); saveAdjustments();
      showToast('Veriler yüklendi');
      renderAll();
    } catch (err) { showToast('Geçersiz dosya'); }
  };
  reader.readAsText(file);
  event.target.value = '';
  closeSettings();
}

function clearAllData() {
  if (!confirm('TÜM veriler silinecek. Emin misiniz?')) return;
  debts = []; incomes = []; adjustments = [];
  saveDebts(); saveIncomes(); saveAdjustments();
  showToast('Tüm veriler silindi');
  renderAll();
  closeSettings();
}

function requestNotifPermission() {
  if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications) {
    window.Capacitor.Plugins.LocalNotifications.requestPermissions().then(function(res) {
      if (res.display === 'granted') {
        showToast('Bildirim izni verildi');
        scheduleDueNotifications();
      } else {
        showToast('İzin reddedildi');
      }
    }).catch(function() { showToast('Bildirim desteklenmiyor'); });
  } else {
    showToast('Sadece Android APK\'da çalışır');
  }
  closeSettings();
}

function scheduleDueNotifications() {
  if (!window.Capacitor || !window.Capacitor.Plugins || !window.Capacitor.Plugins.LocalNotifications) return;
  const LocalNotifications = window.Capacitor.Plugins.LocalNotifications;
  LocalNotifications.cancel({ notifications: [{ id: 1 }, { id: 2 }, { id: 3 }] }).catch(function() {});
  const today = todayStr();
  const dueToday = getActiveInstallments().filter(function(i) { return i.dueDate === today; });
  if (dueToday.length === 0) return;
  const totalByCur = {};
  dueToday.forEach(function(i) {
    const c = i.currency || 'TRY';
    totalByCur[c] = (totalByCur[c] || 0) + i.amount;
  });
  const body = dueToday.map(function(i) { return i.name + ': ' + formatMoney(i.amount, i.currency); }).join(', ');
  LocalNotifications.schedule({
    notifications: [{
      id: 1,
      title: 'Bugün ödenecek borçlar',
      body: body,
      schedule: { at: new Date(Date.now() + 2000) },
      sound: undefined,
      attachments: undefined,
      actionTypeId: '',
      extra: null
    }]
  }).catch(function(e) { console.log('notif', e); });
}

// ==================== NAME PICKER ====================
function openNamePicker() {
  const list = document.getElementById('name-picker-list');
  const empty = document.getElementById('name-picker-empty');
  list.innerHTML = '';
  const names = [];
  const seen = {};
  debts.forEach(function(d) {
    if (d.name && !seen[d.name]) { seen[d.name] = true; names.push(d.name); }
  });
  if (names.length === 0) {
    empty.classList.remove('hidden');
  } else {
    empty.classList.add('hidden');
    names.sort().forEach(function(n) {
      const el = document.createElement('button');
      el.className = 'w-full text-left p-3 rounded-xl bg-gray-50 hover:bg-blue-50 font-medium text-gray-900';
      el.textContent = n;
      el.onclick = function() {
        document.getElementById('debt-name').value = n;
        closeNamePicker();
      };
      list.appendChild(el);
    });
  }
  document.getElementById('modal-name-picker').classList.remove('hidden');
}
function closeNamePicker() {
  document.getElementById('modal-name-picker').classList.add('hidden');
}

// ==================== SPLASH & INIT ====================
function hideSplash() {
  const splash = document.getElementById('splash');
  const root = document.getElementById('app-root');
  if (splash) {
    splash.classList.add('fade-out');
    setTimeout(function() {
      splash.style.display = 'none';
      document.body.classList.add('app-ready');
      if (root) root.classList.add('visible');
    }, 550);
  } else {
    document.body.classList.add('app-ready');
    if (root) root.classList.add('visible');
  }
}

// Capacitor App back button
if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
  window.Capacitor.Plugins.App.addListener('backButton', function(e) {
    const modals = ['modal-debt', 'modal-income', 'modal-partial', 'modal-pay-source', 'modal-settings', 'modal-months', 'modal-month-debts', 'modal-name-picker'];
    for (let i = 0; i < modals.length; i++) {
      const m = document.getElementById(modals[i]);
      if (m && !m.classList.contains('hidden')) {
        m.classList.add('hidden');
        if (modals[i] === 'modal-partial' || modals[i] === 'modal-pay-source') pendingPay = null;
        e.canGoBack = false;
        return;
      }
    }
    // no modal open -> exit or default
  });
}

document.addEventListener('DOMContentLoaded', function() {
  loadData();
  fillCurrencySelects();
  renderAll();
  scheduleDueNotifications();

  document.getElementById('btn-add-debt').addEventListener('click', function() { openDebtModal(); });
  document.getElementById('btn-add-income').addEventListener('click', openIncomeModal);
  document.getElementById('btn-settings').addEventListener('click', openSettings);
  document.getElementById('form-debt').addEventListener('submit', saveDebt);
  document.getElementById('form-income').addEventListener('submit', saveIncome);
  document.getElementById('debt-recurring').addEventListener('change', function() {
    const fields = document.getElementById('installment-fields');
    if (this.checked) fields.classList.remove('hidden');
    else fields.classList.add('hidden');
    updateInstallmentPreview();
  });
  document.getElementById('debt-installments').addEventListener('input', updateInstallmentPreview);
  document.getElementById('debt-total').addEventListener('input', updateInstallmentPreview);

  const grid = document.getElementById('summary-grid');
  if (grid) {
    grid.addEventListener('click', function(e) {
      let t = e.target;
      while (t && t !== grid) {
        if (t.dataset && t.dataset.filter) {
          currentFilter = t.dataset.filter;
          renderFilterOptions();
          renderBalance();
          renderSummaries();
          renderDebts();
          return;
        }
        t = t.parentElement;
      }
    });
  }

  // name picker
  const pickBtn = document.getElementById('btn-pick-name');
  if (pickBtn) pickBtn.addEventListener('click', openNamePicker);

  setTimeout(hideSplash, 1200);
});

function renderFilterOptions() {
  // already handled in renderSummaries via themes
}
