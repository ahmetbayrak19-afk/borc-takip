// ==================== BORÇ TAKİP APP ====================
const STORAGE_DEBTS = 'borc_takip_debts';
const STORAGE_INCOMES = 'borc_takip_incomes';
const STORAGE_ADJUST = 'borc_takip_adjustments';
const STORAGE_SYNC_META = 'borc_takip_sync_meta';
const DRIVE_FILE_NAME = 'borc-takip-data.json';
let debts = [];
let incomes = [];
let adjustments = [];
let editingDebtId = null;
let editingInstallmentIndex = null;
let selectedMonthContext = null;
let debtReturnMonth = null;
let pendingDebtSave = null;
let currentFilter = 'this-month';
let pendingPay = null;

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
  'month-3': {
    card: 'bg-fuchsia-50 rounded-xl p-3 card-shadow text-center border border-fuchsia-100',
    cardActive: 'bg-fuchsia-50 rounded-xl p-3 card-shadow text-center border-2 border-fuchsia-400',
    debt: 'bg-fuchsia-50 rounded-xl p-4 card-shadow fade-in border border-fuchsia-200',
    label: 'text-fuchsia-700'
  },
  'month-4': {
    card: 'bg-cyan-50 rounded-xl p-3 card-shadow text-center border border-cyan-100',
    cardActive: 'bg-cyan-50 rounded-xl p-3 card-shadow text-center border-2 border-cyan-400',
    debt: 'bg-cyan-50 rounded-xl p-4 card-shadow fade-in border border-cyan-200',
    label: 'text-cyan-700'
  },
  'month-5': {
    card: 'bg-orange-50 rounded-xl p-3 card-shadow text-center border border-orange-100',
    cardActive: 'bg-orange-50 rounded-xl p-3 card-shadow text-center border-2 border-orange-400',
    debt: 'bg-orange-50 rounded-xl p-4 card-shadow fade-in border border-orange-200',
    label: 'text-orange-700'
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
let toastTimer = null;
function showToast(msg, duration) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('opacity-0');
  t.classList.add('opacity-100');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(function() { t.classList.remove('opacity-100'); t.classList.add('opacity-0'); }, duration || 2800);
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
    if (!d.installmentOverrides) d.installmentOverrides = {};
  });
  incomes.forEach(function(i) {
    if (!i.currency) i.currency = 'TRY';
    if (!i.type) i.type = 'recurring';
    if (!i.startMonth) {
      i.startMonth = (i.createdAt && String(i.createdAt).substring(0, 7)) || '2020-01';
    }
  });
  loadHiddenNames();
}
function saveDebts() { localStorage.setItem(STORAGE_DEBTS, JSON.stringify(debts)); markSyncDirty(); }
function saveIncomes() { localStorage.setItem(STORAGE_INCOMES, JSON.stringify(incomes)); markSyncDirty(); }
function saveAdjustments() { localStorage.setItem(STORAGE_ADJUST, JSON.stringify(adjustments)); markSyncDirty(); }
function installmentRemaining(debt, index) {
  const override = debt.installmentOverrides && debt.installmentOverrides[index];
  const full = (override && Number(override.amount)) || debt.installmentAmount || debt.totalAmount || 0;
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
      const override = debt.installmentOverrides && debt.installmentOverrides[i];
      const remaining = installmentRemaining(debt, i);
      if (remaining <= 0) continue;
      result.push({
        debtId: debt.id,
        name: debt.name,
        amount: remaining,
        fullAmount: (override && Number(override.amount)) || debt.installmentAmount || debt.totalAmount || 0,
        partialPaid: (debt.partials && Number(debt.partials[i])) || 0,
        dueDate: (override && override.dueDate) || addMonths(debt.startDate, i),
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
  let overdue = 0, today = 0, thisMonth = 0, next1 = 0, next2 = 0, next3 = 0, next4 = 0, next5 = 0, later = 0, total = 0;
  items.forEach(function(item) {
    total += item.amount;
    if (isOverdue(item.dueDate)) overdue += item.amount;
    if (isToday(item.dueDate)) today += item.amount;
    if (isSameMonth(item.dueDate)) thisMonth += item.amount;
    else if (isMonthOffset(item.dueDate, 1)) next1 += item.amount;
    else if (isMonthOffset(item.dueDate, 2)) next2 += item.amount;
    else if (isMonthOffset(item.dueDate, 3)) next3 += item.amount;
    else if (isMonthOffset(item.dueDate, 4)) next4 += item.amount;
    else if (isMonthOffset(item.dueDate, 5)) next5 += item.amount;
    else if (!isOverdue(item.dueDate)) later += item.amount;
  });
  return { overdue: overdue, today: today, thisMonth: thisMonth, next1: next1, next2: next2, next3: next3, next4: next4, next5: next5, later: later, total: total };
}
function getFilterMonthOffset(filter) {
  if (filter && filter.indexOf('month-') === 0) {
    const n = parseInt(filter.slice(6), 10);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}
function balanceMonthName(filter) {
  return monthNameTR(getFilterMonthOffset(filter));
}
function getMonthKeyForOffset(offset) {
  return monthKeyFromOffset(offset);
}
function incomeAppliesToMonth(inc, monthKey) {
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
  const setTxt = function(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  setTxt('sum-overdue', formatMoney(s.overdue, 'TRY'));
  setTxt('sum-today', formatMoney(s.today, 'TRY'));
  setTxt('lbl-this-month', monthNameTR(0));
  setTxt('sum-this-month', formatMoney(s.thisMonth, 'TRY'));
  setTxt('lbl-month-1', monthNameTR(1));
  setTxt('sum-month-1', formatMoney(s.next1, 'TRY'));
  setTxt('lbl-month-2', monthNameTR(2));
  setTxt('sum-month-2', formatMoney(s.next2, 'TRY'));
  setTxt('lbl-month-3', monthNameTR(3));
  setTxt('sum-month-3', formatMoney(s.next3, 'TRY'));
  setTxt('lbl-month-4', monthNameTR(4));
  setTxt('sum-month-4', formatMoney(s.next4, 'TRY'));
  setTxt('lbl-month-5', monthNameTR(5));
  setTxt('sum-month-5', formatMoney(s.next5, 'TRY'));
  setTxt('sum-total', formatMoney(s.total, 'TRY'));
  const cards = document.querySelectorAll('#summary-grid > div');
  for (let i = 0; i < cards.length; i++) {
    const f = cards[i].getAttribute('data-filter');
    cards[i].style.cursor = 'pointer';
    const th = getTheme(f);
    cards[i].className = (f === currentFilter) ? th.cardActive : th.card;
  }
}
function renderIncomes() {
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
      ? ('Tek seferlik · ' + formatDateTR(inc.date || (inc.startMonth + '-01')))
      : ('Düzenli · her ay · ' + cur);
    const el = document.createElement('div');
    el.className = 'bg-white rounded-xl p-3.5 card-shadow flex items-center justify-between fade-in';
    el.innerHTML = '<div class="flex items-center gap-3"><div class="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><i class="fas fa-wallet"></i></div><div><p class="font-medium text-gray-900">' + escapeHtml(inc.name) + '</p><p class="text-xs text-gray-500">' + sub + '</p></div></div><div class="flex items-center gap-2"><span class="font-semibold text-emerald-600">' + formatMoney(inc.amount, cur) + '</span><button onclick="deleteIncome(\'' + inc.id + '\')" class="text-gray-400 hover:text-red-500 p-1.5"><i class="fas fa-trash-alt text-sm"></i></button></div>';
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
  else if (filter && filter.indexOf('month-') === 0) {
    const off = getFilterMonthOffset(filter);
    items = items.filter(function(i) { return isMonthOffset(i.dueDate, off); });
  } else if (filter === 'all') {
  } else items = items.filter(function(i) { return isSameMonth(i.dueDate); });
  if (label) label.textContent = filterLabel(filter);
  if (items.length === 0) { empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  items.sort(function(a, b) { return a.dueDate.localeCompare(b.dueDate); });
  items.forEach(function(item) {
    const th = getTheme(filter);
    const el = document.createElement('div');
    el.className = th.debt;
    const remainingTxt = item.partialPaid > 0 ? ' (kısmi ödendi: ' + formatMoney(item.partialPaid, item.currency) + ')' : '';
    el.innerHTML = '<div class="flex items-start justify-between gap-3"><div class="min-w-0 flex-1"><p class="font-semibold text-gray-900 truncate">' + escapeHtml(item.name) + '</p><p class="text-xs text-gray-500 mt-0.5">' + formatDateTR(item.dueDate) + (item.installmentLabel ? ' · ' + item.installmentLabel : '') + remainingTxt + '</p></div><div class="text-right shrink-0"><p class="font-bold ' + th.label + '">' + formatMoney(item.amount, item.currency) + '</p><div class="flex gap-1 mt-1 justify-end"><button onclick="startPay(\'' + item.debtId + '\', ' + item.installmentIndex + ', \'full\')" class="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg font-medium">Öde</button><button onclick="startPay(\'' + item.debtId + '\', ' + item.installmentIndex + ', \'partial\')" class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-lg font-medium">Kısmi</button><button onclick="editDebt(\'' + item.debtId + '\', ' + item.installmentIndex + ')" class="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg"><i class="fas fa-pen"></i></button></div></div></div>';
    list.appendChild(el);
  });
}
function filterLabel(f) {
  if (f === 'overdue') return 'Gecikmiş';
  if (f === 'today') return 'Bugün';
  if (f === 'this-month') return 'Bu Ay';
  if (f && f.indexOf('month-') === 0) return monthNameTR(getFilterMonthOffset(f));
  if (f === 'all') return 'Tümü';
  return 'Bu Ay';
}
function renderAll() {
  renderIncomes();
  renderBalance();
  renderSummaries();
  renderDebts();
}
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
  const paymentOverride = debt.installmentOverrides && debt.installmentOverrides[idx];
  const due = (paymentOverride && paymentOverride.dueDate) || addMonths(debt.startDate, idx);
  const monthKey = due.substring(0, 7);
  if (!debt.partials) debt.partials = {};
  debt.partials[idx] = Math.round(((Number(debt.partials[idx]) || 0) + amount) * 100) / 100;
  while ((debt.paidInstallments || 0) < (debt.installmentCount || 1) && installmentRemaining(debt, debt.paidInstallments || 0) <= 0) {
    debt.paidInstallments = (debt.paidInstallments || 0) + 1;
  }
  if (source === 'salary') {
    adjustments.push({ id: uid(), monthKey: monthKey, amount: amount, currency: debt.currency || 'TRY', note: 'Maaştan ödeme: ' + debt.name, createdAt: new Date().toISOString() });
    saveAdjustments();
  }
  saveDebts();
  closePaySourceModal();
  showToast(source === 'salary' ? 'Maaştan ödendi' : 'Ekstra ile ödendi');
  renderAll();
  scheduleDueNotifications();
}
function defaultDateForMonth(monthKey) {
  if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) return todayStr();
  return monthKey + '-15';
}
function openDebtModal(editId, installmentIndex, monthKey) {
  editingDebtId = editId || null;
  editingInstallmentIndex = Number.isInteger(installmentIndex) ? installmentIndex : null;
  debtReturnMonth = monthKey || selectedMonthContext;
  document.getElementById('debt-modal-title').textContent = editId ? 'Borcu Düzenle' : 'Yeni Borç Ekle';
  document.getElementById('debt-id').value = editId || '';
  document.getElementById('debt-name').value = '';
  document.getElementById('debt-total').value = '';
  document.getElementById('debt-due').value = defaultDateForMonth(monthKey || selectedMonthContext);
  document.getElementById('debt-recurring').checked = false;
  document.getElementById('debt-installments').value = '2';
  document.getElementById('installment-fields').classList.add('hidden');
  document.getElementById('installment-preview').classList.add('hidden');
  fillCurrencySelects();
  document.getElementById('debt-currency').value = 'TRY';
  if (editId) {
    const d = debts.find(function(x) { return x.id === editId; });
    if (d) {
      const override = editingInstallmentIndex !== null && d.installmentOverrides && d.installmentOverrides[editingInstallmentIndex];
      document.getElementById('debt-name').value = d.name;
      document.getElementById('debt-total').value = (override && override.amount) || d.installmentAmount || d.totalAmount || '';
      document.getElementById('debt-due').value = (override && override.dueDate) || addMonths(d.startDate, editingInstallmentIndex || 0);
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
  editingInstallmentIndex = null;
  pendingDebtSave = null;
  debtReturnMonth = null;
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
  let installmentOverrides = {};
  let originalCreatedAt = null;
  if (editingDebtId) {
    const old = debts.find(function(d) { return d.id === editingDebtId; });
    if (old) {
      paidInstallments = old.paidInstallments || 0;
      partials = old.partials || {};
      installmentOverrides = old.installmentOverrides || {};
      originalCreatedAt = old.createdAt;
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
    installmentOverrides: installmentOverrides,
    currency: currency,
    createdAt: originalCreatedAt || new Date().toISOString()
  };
  if (editingDebtId && editingInstallmentIndex !== null && count > 1) {
    pendingDebtSave = { debt: debt, installmentIndex: editingInstallmentIndex };
    const scopeInfo = document.getElementById('edit-scope-info');
    scopeInfo.textContent = (editingInstallmentIndex + 1) + '/' + count + ' taksit · ' + formatMoney(amount, currency) + ' · ' + formatDateTR(due);
    document.getElementById('modal-edit-scope').classList.remove('hidden');
    return;
  }
  persistDebt(debt, false);
}
function persistDebt(debt, wasEdited) {
  const editId = editingDebtId;
  if (editingDebtId) {
    const idx = debts.findIndex(function(d) { return d.id === editingDebtId; });
    if (idx >= 0) debts[idx] = debt;
  } else {
    debts.push(debt);
  }
  saveDebts();
  if (hiddenNames.indexOf(debt.name) >= 0) {
    hiddenNames = hiddenNames.filter(function(x) { return x !== debt.name; });
    saveHiddenNames();
  }
  const returnMonth = debtReturnMonth;
  const detail = debt.name + ' · ' + formatDateTR(debt.startDate) + ' · ' + formatMoney(debt.installmentAmount, debt.currency) + ((debt.installmentCount || 1) > 1 ? ' · ' + debt.installmentCount + ' taksit' : '');
  closeDebtModal();
  renderAll();
  if (returnMonth) openMonthDebts(returnMonth, monthTitleFromKey(returnMonth));
  showToast(detail + (editId || wasEdited ? ' olarak güncellendi' : ' olarak eklendi'), 5200);
  scheduleDueNotifications();
}
function cancelDebtScope() {
  document.getElementById('modal-edit-scope').classList.add('hidden');
  pendingDebtSave = null;
}
function applyDebtEdit(scope) {
  if (!pendingDebtSave) return;
  const draft = pendingDebtSave.debt;
  const installmentIndex = pendingDebtSave.installmentIndex;
  const old = debts.find(function(d) { return d.id === draft.id; });
  if (!old) { cancelDebtScope(); return; }
  if (scope === 'single') {
    old.name = draft.name;
    old.currency = draft.currency;
    if (!old.installmentOverrides) old.installmentOverrides = {};
    old.installmentOverrides[installmentIndex] = { amount: draft.installmentAmount, dueDate: draft.startDate };
    draft.startDate = old.startDate;
    draft.installmentAmount = old.installmentAmount;
    draft.totalAmount = old.totalAmount;
    Object.assign(draft, old);
  } else {
    draft.startDate = addMonths(draft.startDate, -installmentIndex);
    draft.installmentOverrides = {};
  }
  document.getElementById('modal-edit-scope').classList.add('hidden');
  pendingDebtSave = null;
  persistDebt(draft, true);
}
function editDebt(id, installmentIndex) { openDebtModal(id, installmentIndex); }
function deleteDebt(id) {
  if (!confirm('Bu borcu silmek istediğinize emin misiniz?')) return;
  debts = debts.filter(function(d) { return d.id !== id; });
  saveDebts();
  showToast('Borç silindi');
  renderAll();
}
let incomeType = 'recurring';
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
}
function deleteIncome(id) {
  incomes = incomes.filter(function(i) { return i.id !== id; });
  saveIncomes();
  showToast('Gelir silindi');
  renderAll();
}
function openSettings() { document.getElementById('modal-settings').classList.remove('hidden'); }
function closeSettings() { document.getElementById('modal-settings').classList.add('hidden'); }
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
    const items = getActiveInstallments().filter(function(it) { return it.dueDate.substring(0, 7) === m.key; });
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
function closeMonthsModal() { document.getElementById('modal-months').classList.add('hidden'); }
function openMonthDebts(monthKey, title) {
  selectedMonthContext = monthKey;
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
    el.innerHTML = '<div class="min-w-0"><p class="font-medium text-gray-900 truncate">' + escapeHtml(item.name) + '</p><p class="text-xs text-gray-500">' + formatDateTR(item.dueDate) + (item.installmentLabel ? ' · ' + item.installmentLabel : '') + '</p></div><div class="flex items-center gap-2 shrink-0"><p class="font-semibold text-gray-800">' + formatMoney(item.amount, item.currency) + '</p><button type="button" onclick="editDebtFromMonth(\'' + item.debtId + '\', ' + item.installmentIndex + ', \'' + monthKey + '\')" class="w-9 h-9 rounded-lg bg-gray-100 text-gray-600"><i class="fas fa-pen"></i></button></div>';
    list.appendChild(el);
  });
  totalEl.textContent = 'Toplam: ' + Object.keys(byCur).map(function(c) { return formatMoney(byCur[c], c); }).join(' · ');
  document.getElementById('modal-month-debts').classList.remove('hidden');
}
function monthTitleFromKey(monthKey) {
  const parts = monthKey.split('-');
  const names = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  return names[Number(parts[1]) - 1] + ' ' + parts[0];
}
function editDebtFromMonth(id, installmentIndex, monthKey) {
  document.getElementById('modal-month-debts').classList.add('hidden');
  openDebtModal(id, installmentIndex, monthKey);
}
function closeMonthDebtsModal() {
  document.getElementById('modal-month-debts').classList.add('hidden');
  selectedMonthContext = null;
}
function exportData() {
  const data = { version: 2, debts: debts, incomes: incomes, adjustments: adjustments, hiddenNames: hiddenNames, exportedAt: new Date().toISOString() };
  const json = JSON.stringify(data, null, 2);
  const fileName = 'borc-takip-' + todayStr() + '.json';
  closeSettings();
  const cap = window.Capacitor;
  const FS = cap && cap.Plugins && cap.Plugins.Filesystem;
  const Share = cap && cap.Plugins && cap.Plugins.Share;
  if (!FS) { downloadFallback(json, fileName); return; }
  const writeTo = function(dir) {
    return FS.writeFile({ path: fileName, data: json, directory: dir, encoding: 'utf8', recursive: true }).then(function() {
      return FS.getUri({ path: fileName, directory: dir }).then(function(u) {
        return { dir: dir, uri: u && u.uri };
      }).catch(function() { return { dir: dir, uri: null }; });
    });
  };
  const afterSaved = function(res) {
    showToast('Kaydedildi: Documents / ' + fileName);
    if (Share && res.uri) {
      return Share.share({ title: 'Borç Takip yedek', text: fileName, url: res.uri, dialogTitle: 'Dosyayı kaydet veya paylaş' }).catch(function() {});
    }
  };
  const tryDirs = function(dirs, i) {
    if (i >= dirs.length) { downloadFallback(json, fileName); return; }
    writeTo(dirs[i]).then(afterSaved).catch(function() { tryDirs(dirs, i + 1); });
  };
  const start = function() { tryDirs(['DOCUMENTS', 'EXTERNAL_STORAGE', 'DATA', 'CACHE'], 0); };
  if (FS.requestPermissions) FS.requestPermissions().then(start).catch(start);
  else start();
}
function downloadFallback(json, fileName) {
  fileName = fileName || ('borc-takip-' + todayStr() + '.json');
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('İndirildi: ' + fileName);
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
      if (Array.isArray(data.hiddenNames)) hiddenNames = data.hiddenNames;
      saveDebts(); saveIncomes(); saveAdjustments();
      saveHiddenNames();
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
  hiddenNames = [];
  saveDebts(); saveIncomes(); saveAdjustments();
  saveHiddenNames();
  showToast('Tüm veriler silindi');
  renderAll();
  closeSettings();
}
function requestNotifPermission() {
  if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications) {
    window.Capacitor.Plugins.LocalNotifications.requestPermissions().then(function(res) {
      if (res.display === 'granted') { showToast('Bildirim izni verildi'); scheduleDueNotifications(); }
      else showToast('İzin reddedildi');
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
  const body = dueToday.map(function(i) { return i.name + ': ' + formatMoney(i.amount, i.currency); }).join(', ');
  LocalNotifications.schedule({
    notifications: [{ id: 1, title: 'Bugün ödenecek borçlar', body: body, schedule: { at: new Date(Date.now() + 2000) }, sound: undefined, attachments: undefined, actionTypeId: '', extra: null }]
  }).catch(function(e) { console.log('notif', e); });
}
const STORAGE_HIDDEN_NAMES = 'borc_takip_hidden_names';
let hiddenNames = [];
function loadHiddenNames() {
  try { hiddenNames = JSON.parse(localStorage.getItem(STORAGE_HIDDEN_NAMES) || '[]'); }
  catch (e) { hiddenNames = []; }
  if (!Array.isArray(hiddenNames)) hiddenNames = [];
}
function saveHiddenNames() {
  localStorage.setItem(STORAGE_HIDDEN_NAMES, JSON.stringify(hiddenNames));
  markSyncDirty();
}

// ==================== GOOGLE DRIVE EŞİTLEME ====================
let syncTimer = null;
let syncRunning = false;
function getSyncMeta() {
  try { return JSON.parse(localStorage.getItem(STORAGE_SYNC_META) || '{}'); }
  catch (e) { return {}; }
}
function setSyncMeta(patch) {
  const meta = Object.assign({}, getSyncMeta(), patch || {});
  localStorage.setItem(STORAGE_SYNC_META, JSON.stringify(meta));
  updateSyncUI();
  return meta;
}
function markSyncDirty() {
  const meta = getSyncMeta();
  if (!meta.signedIn) return;
  setSyncMeta({ dirty: true, updatedAt: new Date().toISOString() });
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(function() { syncNow(false); }, 1200);
}
function googleAuthPlugin() {
  return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.GoogleDriveAuth;
}
function updateSyncUI() {
  const status = document.getElementById('google-sync-status');
  if (!status) return;
  const meta = getSyncMeta();
  const signIn = document.getElementById('btn-google-signin');
  const sync = document.getElementById('btn-google-sync');
  const signOut = document.getElementById('btn-google-signout');
  if (!meta.signedIn) {
    status.textContent = 'Giriş yapılmadı · Kayıtlar bu telefonda';
    signIn.classList.remove('hidden'); sync.classList.add('hidden'); signOut.classList.add('hidden');
    return;
  }
  signIn.classList.add('hidden'); sync.classList.remove('hidden'); signOut.classList.remove('hidden');
  if (!navigator.onLine || meta.dirty) status.textContent = 'Çevrimdışı değişiklikler bekliyor';
  else if (meta.lastSync) status.textContent = 'Eşitlendi · ' + new Date(meta.lastSync).toLocaleString('tr-TR');
  else status.textContent = 'Google Drive bağlı';
}
function buildSyncPayload() {
  const meta = getSyncMeta();
  return {
    version: 3,
    updatedAt: meta.updatedAt || new Date().toISOString(),
    debts: debts,
    incomes: incomes,
    adjustments: adjustments,
    hiddenNames: hiddenNames
  };
}
function applySyncPayload(data) {
  if (!data || !Array.isArray(data.debts)) return false;
  debts = data.debts || [];
  incomes = data.incomes || [];
  adjustments = data.adjustments || [];
  hiddenNames = data.hiddenNames || [];
  localStorage.setItem(STORAGE_DEBTS, JSON.stringify(debts));
  localStorage.setItem(STORAGE_INCOMES, JSON.stringify(incomes));
  localStorage.setItem(STORAGE_ADJUST, JSON.stringify(adjustments));
  localStorage.setItem(STORAGE_HIDDEN_NAMES, JSON.stringify(hiddenNames));
  renderAll();
  return true;
}
async function driveRequest(url, options, token) {
  options = options || {};
  options.headers = Object.assign({}, options.headers || {}, { Authorization: 'Bearer ' + token });
  const response = await fetch(url, options);
  if (!response.ok) throw new Error('Drive yanıtı: ' + response.status);
  return response;
}
async function findDriveDataFile(token) {
  const q = "name='" + DRIVE_FILE_NAME + "' and trashed=false";
  const url = 'https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&pageSize=10&fields=files(id,name,modifiedTime)&q=' + encodeURIComponent(q);
  const response = await driveRequest(url, {}, token);
  const data = await response.json();
  return data.files && data.files[0];
}
async function downloadDrivePayload(token, fileId) {
  const response = await driveRequest('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(fileId) + '?alt=media', {}, token);
  return response.json();
}
async function uploadDrivePayload(token, fileId, payload) {
  const boundary = 'borctakip_' + Date.now();
  const metadata = fileId ? { name: DRIVE_FILE_NAME } : { name: DRIVE_FILE_NAME, parents: ['appDataFolder'] };
  const body = '--' + boundary + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(metadata) +
    '\r\n--' + boundary + '\r\nContent-Type: application/json\r\n\r\n' + JSON.stringify(payload) + '\r\n--' + boundary + '--';
  const url = fileId
    ? 'https://www.googleapis.com/upload/drive/v3/files/' + encodeURIComponent(fileId) + '?uploadType=multipart'
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
  await driveRequest(url, { method: fileId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + boundary }, body: body }, token);
}
async function googleSignIn() {
  const plugin = googleAuthPlugin();
  if (!plugin) { showToast('Google girişi bu sürümde kullanılamıyor'); return; }
  try {
    showToast('Google hesabı açılıyor…');
    await plugin.signIn();
    setSyncMeta({ signedIn: true, dirty: true, updatedAt: new Date().toISOString() });
    await syncNow(true);
  } catch (e) { showToast('Google girişi tamamlanamadı'); }
}
async function googleSignOut() {
  const plugin = googleAuthPlugin();
  try { if (plugin) await plugin.signOut(); } catch (e) {}
  setSyncMeta({ signedIn: false, dirty: false });
  showToast('Google hesabından çıkış yapıldı');
}
async function syncNow(manual) {
  const meta = getSyncMeta();
  const plugin = googleAuthPlugin();
  if (!meta.signedIn || !plugin || syncRunning) return;
  if (!navigator.onLine) { setSyncMeta({ dirty: true }); if (manual) showToast('İnternet gelince otomatik eşitlenecek'); return; }
  syncRunning = true;
  try {
    if (manual) showToast('Eşitleniyor…');
    const auth = await plugin.getToken();
    const token = auth.accessToken;
    const file = await findDriveDataFile(token);
    const local = buildSyncPayload();
    let remote = null;
    if (file) {
      try { remote = await downloadDrivePayload(token, file.id); } catch (e) { remote = null; }
    }
    const localTime = Date.parse(local.updatedAt || 0) || 0;
    const remoteTime = Date.parse(remote && remote.updatedAt || 0) || 0;
    if (remote && remoteTime > localTime && !meta.dirty) {
      applySyncPayload(remote);
      setSyncMeta({ updatedAt: remote.updatedAt, dirty: false, lastSync: new Date().toISOString() });
    } else {
      await uploadDrivePayload(token, file && file.id, local);
      setSyncMeta({ dirty: false, lastSync: new Date().toISOString() });
    }
    if (manual) showToast('Google Drive ile eşitlendi');
  } catch (e) {
    console.log('sync', e);
    setSyncMeta({ dirty: true });
    if (manual) showToast('Eşitleme bekliyor · İnternet gelince yeniden denenecek');
  } finally { syncRunning = false; }
}
async function restoreGoogleSession() {
  const plugin = googleAuthPlugin();
  if (!plugin) { updateSyncUI(); return; }
  try {
    await plugin.getToken();
    setSyncMeta({ signedIn: true });
    syncNow(false);
  } catch (e) { setSyncMeta({ signedIn: false }); }
}
function isNameHidden(name) {
  return hiddenNames.indexOf(name) >= 0;
}
function getSavedNames() {
  const names = [];
  const seen = {};
  debts.forEach(function(d) {
    if (d.name && !seen[d.name] && !isNameHidden(d.name)) {
      seen[d.name] = true;
      names.push(d.name);
    }
  });
  names.sort();
  return names;
}
function removeSavedName(name) {
  if (!name) return;
  if (hiddenNames.indexOf(name) < 0) hiddenNames.push(name);
  saveHiddenNames();
  showToast('İsim listeden kaldırıldı');
  openNamePicker();
}
function openNamePicker() {
  loadHiddenNames();
  const list = document.getElementById('name-picker-list');
  const empty = document.getElementById('name-picker-empty');
  list.innerHTML = '';
  const names = getSavedNames();
  if (names.length === 0) empty.classList.remove('hidden');
  else {
    empty.classList.add('hidden');
    names.forEach(function(n) {
      const row = document.createElement('div');
      row.className = 'flex items-center gap-2';
      const pick = document.createElement('button');
      pick.type = 'button';
      pick.className = 'flex-1 text-left p-3 rounded-xl bg-gray-50 hover:bg-blue-50 font-medium text-gray-900';
      pick.textContent = n;
      pick.onclick = function() {
        document.getElementById('debt-name').value = n;
        closeNamePicker();
      };
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'w-11 h-11 shrink-0 rounded-xl bg-red-50 text-red-500 hover:bg-red-100';
      del.innerHTML = '<i class="fas fa-times"></i>';
      del.setAttribute('aria-label', 'Kaldır');
      del.onclick = function(ev) {
        ev.preventDefault();
        ev.stopPropagation();
        if (confirm('“' + n + '” ismini listeden kaldırmak istiyor musunuz?')) {
          removeSavedName(n);
        }
      };
      row.appendChild(pick);
      row.appendChild(del);
      list.appendChild(row);
    });
  }
  document.getElementById('modal-name-picker').classList.remove('hidden');
}
function closeNamePicker() { document.getElementById('modal-name-picker').classList.add('hidden'); }
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
if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
  window.Capacitor.Plugins.App.addListener('appStateChange', function(state) {
    if (state && state.isActive) syncNow(false);
  });
  window.Capacitor.Plugins.App.addListener('backButton', function(e) {
    const modals = ['modal-edit-scope', 'modal-debt', 'modal-income', 'modal-partial', 'modal-pay-source', 'modal-settings', 'modal-months', 'modal-month-debts', 'modal-name-picker'];
    for (let i = 0; i < modals.length; i++) {
      const m = document.getElementById(modals[i]);
      if (m && !m.classList.contains('hidden')) {
        m.classList.add('hidden');
        if (modals[i] === 'modal-partial' || modals[i] === 'modal-pay-source') pendingPay = null;
        e.canGoBack = false;
        return;
      }
    }
  });
}
document.addEventListener('DOMContentLoaded', function() {
  loadData();
  updateSyncUI();
  restoreGoogleSession();
  window.addEventListener('online', function() { updateSyncUI(); syncNow(false); });
  window.addEventListener('offline', updateSyncUI);
  fillCurrencySelects();
  renderAll();
  scheduleDueNotifications();
  document.getElementById('btn-add-debt').addEventListener('click', function() { openDebtModal(); });
  document.getElementById('btn-add-month-debt').addEventListener('click', function() {
    const monthKey = selectedMonthContext;
    document.getElementById('modal-month-debts').classList.add('hidden');
    openDebtModal(null, null, monthKey);
  });
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
          renderIncomes();
          renderBalance();
          renderSummaries();
          renderDebts();
          return;
        }
        t = t.parentElement;
      }
    });
  }
  const pickBtn = document.getElementById('btn-pick-name');
  if (pickBtn) pickBtn.addEventListener('click', openNamePicker);
  setTimeout(hideSplash, 1200);
});
