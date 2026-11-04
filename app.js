// ==================== BORÇ TAKİP APP ====================
const STORAGE_DEBTS = 'borc_takip_debts';
const STORAGE_INCOMES = 'borc_takip_incomes';
const STORAGE_ADJUST = 'borc_takip_adjustments';
const STORAGE_PAYMENTS = 'borc_takip_payments';
const STORAGE_SYNC_META = 'borc_takip_sync_meta';
const DRIVE_FILE_NAME = 'borc-takip-data.json';
let debts = [];
let incomes = [];
let adjustments = [];
let payments = [];
let editingDebtId = null;
let editingInstallmentIndex = null;
let selectedMonthContext = null;
let debtReturnMonth = null;
let pendingDebtSave = null;
let currentFilter = 'this-month';
let pendingPay = null;
let savedDebtId = null;
let debtSearchQuery = '';
let monthsViewYear = new Date().getFullYear();

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
    payments = JSON.parse(localStorage.getItem(STORAGE_PAYMENTS) || '[]');
  } catch (e) { debts = []; incomes = []; adjustments = []; payments = []; }
  if (!Array.isArray(payments)) payments = [];
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
function savePayments() { localStorage.setItem(STORAGE_PAYMENTS, JSON.stringify(payments)); markSyncDirty(); }
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
  const totals = { overdue: {}, today: {}, thisMonth: {}, next1: {}, next2: {}, next3: {}, next4: {}, next5: {}, total: {} };
  getActiveInstallments().forEach(function(item) {
    const currency = item.currency;
    const add = function(map) { map[currency] = (map[currency] || 0) + item.amount; };
    add(totals.total);
    if (isOverdue(item.dueDate)) add(totals.overdue);
    if (isToday(item.dueDate)) add(totals.today);
    if (isSameMonth(item.dueDate)) add(totals.thisMonth);
    for (let offset = 1; offset <= 5; offset++) {
      if (isMonthOffset(item.dueDate, offset)) add(totals['next' + offset]);
    }
  });
  return totals;
}
const RATE_SOURCE = 'https://api.frankfurter.dev/v2/rates?base=TRY&quotes=USD,EUR,GBP,CHF,SAR,AED';
const RATE_INTERVAL = 12 * 60 * 60 * 1000;
let rateCache = null;
let rateLoading = false;
let lastRateAttempt = 0;
function useTL() { return localStorage.getItem('borc_takip_convert_try') === '1'; }
function totalInTL(map) {
  if (!useTL() || !rateCache) return null;
  let total = 0;
  let converted = false;
  for (const [code, amount] of Object.entries(map)) {
    if (code === 'TRY') { total += amount; continue; }
    const rate = rateCache.rates[code];
    if (!Number.isFinite(rate) || rate <= 0) return null;
    total += amount / rate;
    converted = true;
  }
  return converted ? total : null;
}
function formatTotals(map) {
  const converted = totalInTL(map);
  if (converted !== null) return '≈ ' + formatMoney(converted, 'TRY');
  return Object.keys(map).sort().map(function(code) {
    return formatMoney(map[code], code);
  }).join(' · ') || formatMoney(0, 'TRY');
}
function updateRateInfo() {
  document.getElementById('convert-try').checked = useTL();
}
async function refreshRates() {
  const now = Date.now();
  if (!useTL() || !navigator.onLine || rateLoading || now - (rateCache?.fetchedAt || 0) < RATE_INTERVAL || now - lastRateAttempt < 60000) return;
  rateLoading = true;
  lastRateAttempt = now;
  try {
    const response = await fetch(RATE_SOURCE);
    if (!response.ok) return;
    const rows = await response.json();
    const rates = {};
    const dates = [];
    rows.forEach(function(row) {
      if (row.base === 'TRY' && Number.isFinite(row.rate) && row.rate > 0 && /^\d{4}-\d{2}-\d{2}$/.test(row.date)) {
        rates[row.quote] = row.rate;
        dates.push(row.date);
      }
    });
    if (!dates.length) return;
    rateCache = { rates: rates, date: dates.sort()[0], fetchedAt: now };
    localStorage.setItem('borc_takip_rate_cache', JSON.stringify(rateCache));
    updateRateInfo();
    renderAll();
  } catch (error) { console.log('rates', error); }
  finally { rateLoading = false; }
}
function setTLConversion(enabled) {
  localStorage.setItem('borc_takip_convert_try', enabled ? '1' : '0');
  updateRateInfo();
  renderAll();
  refreshRates();
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
  let incomeMap = getEffectiveIncomeByCurrency(monthKey);
  let debtMap = getDebtByCurrencyForOffset(offset);
  const combined = Object.assign({}, incomeMap, debtMap);
  const converted = totalInTL(combined) !== null;
  if (converted) {
    incomeMap = { TRY: totalInTL(incomeMap) ?? incomeMap.TRY ?? 0 };
    debtMap = { TRY: totalInTL(debtMap) ?? debtMap.TRY ?? 0 };
  }
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
    p.textContent = (converted ? '≈ ' : '') + formatMoney(Math.abs(bal), c) + (bal >= 0 ? ' artı' : ' eksi');
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
  setTxt('sum-overdue', formatTotals(s.overdue));
  setTxt('sum-today', formatTotals(s.today));
  setTxt('lbl-this-month', monthNameTR(0));
  setTxt('sum-this-month', formatTotals(s.thisMonth));
  setTxt('lbl-month-1', monthNameTR(1));
  setTxt('sum-month-1', formatTotals(s.next1));
  setTxt('lbl-month-2', monthNameTR(2));
  setTxt('sum-month-2', formatTotals(s.next2));
  setTxt('lbl-month-3', monthNameTR(3));
  setTxt('sum-month-3', formatTotals(s.next3));
  setTxt('lbl-month-4', monthNameTR(4));
  setTxt('sum-month-4', formatTotals(s.next4));
  setTxt('lbl-month-5', monthNameTR(5));
  setTxt('sum-month-5', formatTotals(s.next5));
  setTxt('sum-total', formatTotals(s.total));
  const cards = document.querySelectorAll('#summary-grid > div');
  for (let i = 0; i < cards.length; i++) {
    const f = cards[i].getAttribute('data-filter');
    cards[i].style.cursor = 'pointer';
    const th = getTheme(f);
    cards[i].className = (f === currentFilter)
      ? th.cardActive + ' opacity-100 shadow-lg -translate-y-0.5 transition-all duration-200'
      : th.card + ' opacity-50 transition-all duration-200';
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
  if (debtSearchQuery) {
    const query = debtSearchQuery.toLocaleLowerCase('tr-TR');
    items = items.filter(function(i) { return String(i.name || '').toLocaleLowerCase('tr-TR').includes(query); });
  }
  if (label) label.textContent = filterLabel(filter);
  if (items.length === 0) {
    empty.classList.remove('hidden');
    const text = empty.querySelector('p');
    if (text) text.textContent = debtSearchQuery ? 'Bu ay aradığın borç bulunamadı.' : 'Bu dönemde borç bulunmuyor.';
    return;
  }
  empty.classList.add('hidden');
  items.sort(function(a, b) { return a.dueDate.localeCompare(b.dueDate); });
  items.forEach(function(item) {
    const th = getTheme(filter);
    const el = document.createElement('div');
    el.className = th.debt;
    const remainingTxt = item.partialPaid > 0 ? ' (kısmi ödendi: ' + formatMoney(item.partialPaid, item.currency) + ')' : '';
    el.innerHTML = '<div class="flex items-start justify-between gap-3"><div class="min-w-0 flex-1"><p class="font-semibold text-gray-900 truncate">' + escapeHtml(item.name) + '</p><p class="text-xs text-gray-500 mt-0.5">' + formatDateTR(item.dueDate) + (item.installmentLabel ? ' · ' + item.installmentLabel : '') + remainingTxt + '</p></div><div class="text-right shrink-0"><p class="font-bold ' + th.label + '">' + formatMoney(item.amount, item.currency) + '</p><div class="flex gap-1 mt-1 justify-end"><button onclick="startPay(\'' + item.debtId + '\', ' + item.installmentIndex + ', \'full\')" class="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg font-medium">Öde</button><button onclick="startPay(\'' + item.debtId + '\', ' + item.installmentIndex + ', \'partial\')" class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-lg font-medium">Kısmi</button><button onclick="editDebt(\'' + item.debtId + '\', ' + item.installmentIndex + ')" class="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg" aria-label="Borcu düzenle" title="Düzenle"><i class="fas fa-pen" aria-hidden="true"></i></button><button onclick="deleteDebt(\'' + item.debtId + '\')" class="text-[11px] text-gray-300 hover:text-red-500 px-1.5 py-1 rounded-lg" aria-label="Borcu sil" title="Sil"><i class="fas fa-trash-alt" aria-hidden="true"></i></button></div></div></div>';
    list.appendChild(el);
  });
}
function toggleDebtSearch() {
  const wrap = document.getElementById('debt-search-wrap');
  const input = document.getElementById('debt-search');
  const opening = wrap.classList.contains('hidden');
  wrap.classList.toggle('hidden', !opening);
  if (opening) setTimeout(function() { input.focus(); }, 0);
  else {
    input.value = '';
    debtSearchQuery = '';
    renderDebts();
  }
}
function updateDebtSearch(value) {
  debtSearchQuery = String(value || '').trim();
  renderDebts();
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
  if (selectedMonthContext && !document.getElementById('modal-month-debts').classList.contains('hidden')) {
    openMonthDebts(selectedMonthContext, monthTitleFromKey(selectedMonthContext));
  }
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
  let adjustmentId = null;
  if (source === 'salary') {
    adjustmentId = uid();
    adjustments.push({ id: adjustmentId, monthKey: monthKey, amount: amount, currency: debt.currency || 'TRY', note: 'Maaştan ödeme: ' + debt.name, createdAt: new Date().toISOString() });
    saveAdjustments();
  }
  payments.unshift({
    id: uid(), debtId: debt.id, debtName: debt.name, installmentIndex: idx,
    installmentLabel: (idx + 1) + '/' + (debt.installmentCount || 1), amount: amount,
    currency: debt.currency || 'TRY', source: source, dueDate: due,
    paidAt: new Date().toISOString(), adjustmentId: adjustmentId
  });
  savePayments();
  saveDebts();
  closePaySourceModal();
  showToast(source === 'salary' ? 'Maaştan ödendi' : 'Ekstra ile ödendi');
  renderAll();
  scheduleDueNotifications();
}
function renderPaymentHistory() {
  const list = document.getElementById('payment-history-list');
  const empty = document.getElementById('payment-history-empty');
  if (!list || !empty) return;
  list.innerHTML = '';
  if (!payments.length) { empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  payments.slice().sort(function(a, b) { return String(b.paidAt).localeCompare(String(a.paidAt)); }).forEach(function(payment) {
    const debtExists = debts.some(function(d) { return d.id === payment.debtId; });
    const row = document.createElement('div');
    row.className = 'rounded-xl border border-gray-100 bg-gray-50 p-3';
    const paidDate = new Date(payment.paidAt);
    const dateText = Number.isNaN(paidDate.getTime()) ? '' : paidDate.toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
    row.innerHTML = '<div class="flex items-start justify-between gap-3"><div class="min-w-0"><p class="font-semibold text-gray-900 truncate">' + escapeHtml(payment.debtName || 'Silinmiş borç') + '</p><p class="text-xs text-gray-500 mt-1">' + escapeHtml(payment.installmentLabel || '') + ' · ' + (payment.source === 'salary' ? 'Maaştan' : 'Ekstra') + (dateText ? ' · ' + dateText : '') + '</p></div><div class="text-right shrink-0"><p class="font-semibold text-emerald-700">' + formatMoney(payment.amount, payment.currency) + '</p>' + (debtExists ? '<button type="button" onclick="undoPayment(\'' + payment.id + '\')" class="mt-1 text-xs text-gray-500 underline">Geri al</button>' : '<span class="text-[11px] text-gray-400">Borç silinmiş</span>') + '</div></div>';
    list.appendChild(row);
  });
}
function openPaymentHistory() {
  closeSettings();
  renderPaymentHistory();
  document.getElementById('modal-payment-history').classList.remove('hidden');
}
function closePaymentHistory() { document.getElementById('modal-payment-history').classList.add('hidden'); }
function recomputePaidInstallments(debt) {
  debt.paidInstallments = 0;
  while (debt.paidInstallments < (debt.installmentCount || 1) && installmentRemaining(debt, debt.paidInstallments) <= 0) {
    debt.paidInstallments += 1;
  }
}
function undoPayment(paymentId) {
  const payment = payments.find(function(p) { return p.id === paymentId; });
  if (!payment) return;
  const debt = debts.find(function(d) { return d.id === payment.debtId; });
  if (!debt) { showToast('Borç silindiği için ödeme geri alınamaz'); return; }
  if (!confirm(formatMoney(payment.amount, payment.currency) + ' tutarındaki ödeme geri alınsın mı?')) return;
  const idx = payment.installmentIndex || 0;
  const nextPaid = Math.max(0, Math.round(((Number(debt.partials && debt.partials[idx]) || 0) - Number(payment.amount || 0)) * 100) / 100);
  if (!debt.partials) debt.partials = {};
  if (nextPaid > 0) debt.partials[idx] = nextPaid;
  else delete debt.partials[idx];
  recomputePaidInstallments(debt);
  if (payment.adjustmentId) adjustments = adjustments.filter(function(a) { return a.id !== payment.adjustmentId; });
  payments = payments.filter(function(p) { return p.id !== paymentId; });
  localStorage.setItem(STORAGE_DEBTS, JSON.stringify(debts));
  localStorage.setItem(STORAGE_ADJUST, JSON.stringify(adjustments));
  localStorage.setItem(STORAGE_PAYMENTS, JSON.stringify(payments));
  markSyncDirty();
  renderPaymentHistory();
  renderAll();
  scheduleDueNotifications();
  showToast('Ödeme geri alındı');
}
function defaultDateForMonth(monthKey) {
  if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) return todayStr();
  if (monthKey === todayStr().substring(0, 7)) return todayStr();
  return monthKey + '-15';
}
function selectedFilterMonthKey() {
  if (currentFilter === 'this-month') return getMonthKeyForOffset(0);
  if (currentFilter && currentFilter.indexOf('month-') === 0) {
    return getMonthKeyForOffset(getFilterMonthOffset(currentFilter));
  }
  return null;
}
function openDebtModal(editId, installmentIndex, monthKey) {
  editingDebtId = editId || null;
  editingInstallmentIndex = Number.isInteger(installmentIndex) ? installmentIndex : null;
  const installmentEdit = editingInstallmentIndex !== null;
  debtReturnMonth = monthKey || selectedMonthContext;
  document.getElementById('debt-modal-title').textContent = installmentEdit ? 'Taksiti Düzenle' : (editId ? 'Borcu Düzenle' : 'Yeni Borç Ekle');
  document.getElementById('debt-name-field').classList.remove('hidden');
  document.getElementById('debt-currency-field').classList.remove('hidden');
  document.getElementById('debt-recurring-field').classList.remove('hidden');
  document.getElementById('debt-amount-grid').className = 'grid grid-cols-2 gap-3';
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
  ['debt-name', 'debt-currency', 'debt-recurring', 'debt-installments', 'btn-pick-name'].forEach(function(id) {
    document.getElementById(id).disabled = false;
  });
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
      if (editingInstallmentIndex !== null && d.installmentCount > 1) {
        document.getElementById('debt-name-field').classList.add('hidden');
        document.getElementById('debt-currency-field').classList.add('hidden');
        document.getElementById('debt-recurring-field').classList.add('hidden');
        document.getElementById('installment-fields').classList.add('hidden');
        document.getElementById('debt-amount-grid').className = 'grid grid-cols-1 gap-3';
        ['debt-name', 'debt-currency', 'debt-recurring', 'debt-installments', 'btn-pick-name'].forEach(function(id) {
          document.getElementById(id).disabled = true;
        });
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
  const original = debts.find(function(d) { return d.id === editingDebtId; });
  if (original && editingInstallmentIndex !== null && original.installmentCount > 1) {
    pendingDebtSave = { debt: debt, installmentIndex: editingInstallmentIndex };
    const scopeInfo = document.getElementById('edit-scope-info');
    scopeInfo.textContent = (editingInstallmentIndex + 1) + '/' + original.installmentCount + ' taksit · ' + formatMoney(amount, original.currency) + ' · ' + formatDateTR(due);
    document.getElementById('modal-edit-scope').classList.remove('hidden');
    return;
  }
  persistDebt(debt, false);
}
function persistDebt(debt, wasEdited, editedInstallment) {
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
  const date = editedInstallment?.dueDate || debt.startDate;
  const amount = editedInstallment?.amount ?? debt.installmentAmount;
  const detail = debt.name + ' · ' + formatDateTR(date) + ' · ' + formatMoney(amount, debt.currency) + ((debt.installmentCount || 1) > 1 ? ' · ' + debt.installmentCount + ' taksit' : '');
  closeDebtModal();
  renderAll();
  if (editId || wasEdited) showToast(detail + ' olarak güncellendi', 5200);
  else showDebtSavedModal(debt);
  scheduleDueNotifications();
}
function showDebtSavedModal(debt) {
  savedDebtId = debt.id;
  selectedMonthContext = null;
  document.getElementById('modal-month-debts').classList.add('hidden');
  document.getElementById('saved-debt-name').textContent = debt.name;
  document.getElementById('saved-debt-date').textContent = formatDateTR(debt.startDate);
  document.getElementById('saved-debt-amount').textContent = formatMoney(debt.installmentAmount, debt.currency);
  const count = debt.installmentCount || 1;
  const row = document.getElementById('saved-debt-installments-row');
  if (count > 1) {
    document.getElementById('saved-debt-installments').textContent = count + ' taksit · Her taksit ' + formatMoney(debt.installmentAmount, debt.currency);
    row.classList.remove('hidden');
  } else row.classList.add('hidden');
  document.getElementById('modal-debt-saved').classList.remove('hidden');
}
function closeDebtSavedModal() {
  document.getElementById('modal-debt-saved').classList.add('hidden');
  savedDebtId = null;
}
function editSavedDebt() {
  const id = savedDebtId;
  closeDebtSavedModal();
  if (id) openDebtModal(id);
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
  const change = { amount: draft.installmentAmount, dueDate: draft.startDate };
  const overrides = { ...old.installmentOverrides };
  const updated = { ...old, installmentOverrides: overrides };
  if (scope === 'all') {
    let totalAmount = 0;
    for (let i = 0; i < old.installmentCount; i++) {
      const existing = old.installmentOverrides && old.installmentOverrides[i];
      const completed = installmentRemaining(old, i) <= 0;
      if (!completed) {
        overrides[i] = Object.assign({}, existing || {}, { amount: change.amount });
      }
      totalAmount += completed
        ? ((existing && Number(existing.amount)) || old.installmentAmount || 0)
        : change.amount;
    }
    updated.totalAmount = Math.round(totalAmount * 100) / 100;
  }
  overrides[installmentIndex] = Object.assign({}, overrides[installmentIndex] || {}, change);
  document.getElementById('modal-edit-scope').classList.add('hidden');
  pendingDebtSave = null;
  persistDebt(updated, true, change);
}
function editDebt(id, installmentIndex) { openDebtModal(id, installmentIndex); }
function deleteDebt(id) {
  const debt = debts.find(function(d) { return d.id === id; });
  if (!debt) return;
  if (!confirm('“' + debt.name + '” borcu ve kalan taksitleri silinsin mi? Ödeme arşivi korunur.')) return;
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
      rec.className = 'py-3 px-2 rounded-xl border-2 border-emerald-500 bg-emerald-50 text-emerald-700 text-sm font-semibold';
      once.className = 'py-3 px-2 rounded-xl border-2 border-gray-200 bg-white text-gray-600 text-sm font-medium';
    } else {
      once.className = 'py-3 px-2 rounded-xl border-2 border-emerald-500 bg-emerald-50 text-emerald-700 text-sm font-semibold';
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
  const income = incomes.find(function(i) { return i.id === id; });
  if (!income) return;
  if (!confirm('“' + income.name + '” geliri silinsin mi?')) return;
  incomes = incomes.filter(function(i) { return i.id !== id; });
  saveIncomes();
  showToast('Gelir silindi');
  renderAll();
}
function openSettings() { document.getElementById('modal-settings').classList.remove('hidden'); }
function closeSettings() { document.getElementById('modal-settings').classList.add('hidden'); }
function openLegalInfo() {
  closeSettings();
  document.getElementById('modal-legal').classList.remove('hidden');
}
function closeLegalInfo() { document.getElementById('modal-legal').classList.add('hidden'); }
function openMonthsModal(year) {
  closeSettings();
  monthsViewYear = Number.isInteger(year) ? year : monthsViewYear;
  renderMonthsNavigator();
  document.getElementById('modal-months').classList.remove('hidden');
}
function changeMonthsYear(delta) {
  monthsViewYear += delta;
  renderMonthsNavigator();
}
function jumpMonthsYear() {
  monthsViewYear = new Date().getFullYear();
  renderMonthsNavigator();
}
function renderMonthsNavigator() {
  const list = document.getElementById('months-list');
  list.innerHTML = '';
  document.getElementById('months-year-label').textContent = monthsViewYear;
  const monthNames = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  const months = monthNames.map(function(name, index) {
    return { key: monthsViewYear + '-' + String(index + 1).padStart(2, '0'), name: name + ' ' + monthsViewYear };
  });
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
    el.innerHTML = '<div class="min-w-0"><p class="font-medium text-gray-900 truncate">' + escapeHtml(item.name) + '</p><p class="text-xs text-gray-500">' + formatDateTR(item.dueDate) + (item.installmentLabel ? ' · ' + item.installmentLabel : '') + '</p></div><div class="flex items-center gap-1.5 shrink-0"><p class="font-semibold text-gray-800">' + formatMoney(item.amount, item.currency) + '</p><button type="button" onclick="editDebtFromMonth(\'' + item.debtId + '\', ' + item.installmentIndex + ', \'' + monthKey + '\')" class="w-9 h-9 rounded-lg bg-gray-100 text-gray-600" aria-label="Borcu düzenle" title="Düzenle"><i class="fas fa-pen" aria-hidden="true"></i></button><button type="button" onclick="deleteDebtFromMonth(\'' + item.debtId + '\', \'' + monthKey + '\')" class="w-7 h-7 text-gray-300 hover:text-red-500" aria-label="Borcu sil" title="Sil"><i class="fas fa-trash-alt" aria-hidden="true"></i></button></div>';
    list.appendChild(el);
  });
  totalEl.textContent = 'Toplam: ' + formatTotals(byCur);
  document.getElementById('modal-month-debts').classList.remove('hidden');
}
function deleteDebtFromMonth(id, monthKey) {
  deleteDebt(id);
  if (!document.getElementById('modal-month-debts').classList.contains('hidden')) {
    openMonthDebts(monthKey, monthTitleFromKey(monthKey));
  }
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
function exportData(data) {
  data = data || { version: 4, debts: debts, incomes: incomes, adjustments: adjustments, payments: payments, hiddenNames: hiddenNames, exportedAt: new Date().toISOString() };
  const json = JSON.stringify(data, null, 2);
  const stamp = new Date();
  const fileName = 'borc-takip-' + todayStr() + '-' + String(stamp.getHours()).padStart(2, '0') + String(stamp.getMinutes()).padStart(2, '0') + '.json';
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
    const labels = { DOCUMENTS: 'Documents', EXTERNAL_STORAGE: 'Harici depolama', DATA: 'Uygulama klasörü', CACHE: 'Geçici uygulama klasörü' };
    showToast('Kaydedildi: ' + (labels[res.dir] || res.dir) + ' / ' + fileName);
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
function validateBackup(data) {
  const validRecord = function(record) {
    return record && typeof record === 'object' && typeof record.id === 'string' && /^[a-zA-Z0-9_-]+$/.test(record.id);
  };
  const validDate = function(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parts = value.split('-').map(Number);
    const check = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    return check.getUTCFullYear() === parts[0] && check.getUTCMonth() === parts[1] - 1 && check.getUTCDate() === parts[2];
  };
  const validMonth = function(value) { return typeof value === 'string' && /^\d{4}-\d{2}$/.test(value) && validDate(value + '-01'); };
  const validCurrency = function(record) { return !record.currency || CURRENCIES.some(function(c) { return c.code === record.currency; }); };
  const validAmount = function(value) { return typeof value === 'number' && Number.isFinite(value) && value >= 0; };
  if (!data || !Array.isArray(data.debts) || !data.debts.every(function(d) {
    return validRecord(d) && validCurrency(d) && typeof d.name === 'string' && validDate(d.startDate)
      && validAmount(d.installmentAmount ?? d.totalAmount)
      && Number.isInteger(d.installmentCount ?? 1) && (d.installmentCount ?? 1) >= 1 && (d.installmentCount ?? 1) <= 120
      && (!d.installmentOverrides || Object.values(d.installmentOverrides).every(function(o) {
        return o && (o.amount == null || validAmount(o.amount)) && (o.dueDate == null || validDate(o.dueDate));
      }))
      && (!d.partials || Object.values(d.partials).every(validAmount));
  })) throw new Error('Geçersiz borç kayıtları');
  if (!(data.incomes === undefined || Array.isArray(data.incomes) && data.incomes.every(function(i) {
    return validRecord(i) && validCurrency(i) && typeof i.name === 'string' && validAmount(i.amount)
      && (!i.startMonth || validMonth(i.startMonth)) && (i.type !== 'once' || validDate(i.date || i.startMonth + '-01'));
  })) || !(data.adjustments === undefined || Array.isArray(data.adjustments) && data.adjustments.every(function(a) {
    return validRecord(a) && validCurrency(a) && validAmount(a.amount) && validMonth(a.monthKey);
  })) || !(data.payments === undefined || Array.isArray(data.payments) && data.payments.every(function(p) {
    return validRecord(p) && validCurrency(p) && typeof p.debtId === 'string' && typeof p.debtName === 'string'
      && Number.isInteger(p.installmentIndex) && p.installmentIndex >= 0 && validAmount(p.amount)
      && validDate(p.dueDate) && typeof p.paidAt === 'string' && Number.isFinite(Date.parse(p.paidAt));
  })) || !(data.hiddenNames === undefined || Array.isArray(data.hiddenNames) && data.hiddenNames.every(function(n) { return typeof n === 'string'; }))) {
    throw new Error('Geçersiz yedek kayıtları');
  }
  return { ...data, incomes: data.incomes || [], adjustments: data.adjustments || [], payments: data.payments || [], hiddenNames: data.hiddenNames || [] };
}
function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = validateBackup(JSON.parse(e.target.result));
      if (hasLocalSyncData()) {
        if (!confirm('Dosyadaki ' + data.debts.length + ' borç ve ' + data.incomes.length + ' gelir kaydı telefondaki mevcut kayıtların yerini alacak. Devam edilsin mi?')) return;
      }
      applySyncPayload(data);
      markSyncDirty();
      updateSyncUI();
      showToast('Veriler yüklendi');
      renderAll();
    } catch (err) { showToast('Geçersiz dosya'); }
  };
  reader.readAsText(file);
  event.target.value = '';
  closeSettings();
}
function clearAllData() {
  if (syncRunning) { showToast('Eşitlemenin bitmesini bekle'); return; }
  if (!confirm('Telefondaki kayıtlar silinecek, Drive yedeği korunacak. Otomatik eşitleme duraklatılacak. Devam edilsin mi?')) return;
  setSyncMeta({ paused: true, dirty: false, baseline: null, lastSync: null });
      applySyncPayload({ debts: [], incomes: [], adjustments: [], payments: [], hiddenNames: [] });
  updateSyncUI();
  showToast('Telefon kayıtları silindi');
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
const STORAGE_SYNC_WELCOME = 'borc_takip_sync_welcome_seen';
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
let syncAgain = false;
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
  setSyncMeta({ dirty: true, revision: (meta.revision || 0) + 1, updatedAt: new Date().toISOString() });
  if (!meta.signedIn || meta.paused) return;
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
  document.getElementById('btn-drive-delete')?.classList.toggle('hidden', !meta.signedIn);
  if (!meta.signedIn) {
    status.textContent = 'Giriş yapılmadı · Kayıtlar bu telefonda';
    signIn.classList.remove('hidden'); sync.classList.add('hidden'); signOut.classList.add('hidden');
    return;
  }
  signIn.classList.add('hidden'); sync.classList.remove('hidden'); signOut.classList.remove('hidden');
  sync.textContent = meta.paused ? 'Eşitlemeyi başlat' : 'Şimdi eşitle';
  if (meta.paused) status.textContent = 'Otomatik eşitleme duraklatıldı';
  else if (meta.error) status.textContent = 'Eşitleme başarısız · Yeniden dene';
  else if (!navigator.onLine || meta.dirty) status.textContent = 'Eşitleme bekliyor';
  else if (meta.lastSync) status.textContent = 'Eşitlendi · ' + new Date(meta.lastSync).toLocaleString('tr-TR');
  else status.textContent = 'Google Drive bağlı';
}
function buildSyncPayload() {
  const meta = getSyncMeta();
  return {
    version: 4,
    updatedAt: meta.updatedAt || new Date().toISOString(),
    debts: debts,
    incomes: incomes,
    adjustments: adjustments,
    payments: payments,
    hiddenNames: hiddenNames
  };
}
function hasLocalSyncData() {
  return debts.length > 0 || incomes.length > 0 || adjustments.length > 0 || payments.length > 0 || hiddenNames.length > 0;
}
function applySyncPayload(data) {
  if (!data || !Array.isArray(data.debts)) return false;
  debts = data.debts || [];
  incomes = data.incomes || [];
  adjustments = data.adjustments || [];
  payments = data.payments || [];
  hiddenNames = data.hiddenNames || [];
  localStorage.setItem(STORAGE_DEBTS, JSON.stringify(debts));
  localStorage.setItem(STORAGE_INCOMES, JSON.stringify(incomes));
  localStorage.setItem(STORAGE_ADJUST, JSON.stringify(adjustments));
  localStorage.setItem(STORAGE_PAYMENTS, JSON.stringify(payments));
  localStorage.setItem(STORAGE_HIDDEN_NAMES, JSON.stringify(hiddenNames));
  loadData();
  renderAll();
  scheduleDueNotifications();
  return true;
}
async function driveRequest(url, options, token) {
  options = options || {};
  options.headers = Object.assign({}, options.headers || {}, { Authorization: 'Bearer ' + token });
  const response = await fetch(url, options);
  if (!response.ok) throw new Error('Drive yanıtı: ' + response.status);
  return response;
}
async function findDriveFiles(token, all) {
  const q = "name='" + DRIVE_FILE_NAME + "'";
  const url = 'https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&orderBy=modifiedTime%20desc&fields=nextPageToken,files(id,version)&q=' + encodeURIComponent(q);
  const files = [];
  let page;
  do {
    const response = await driveRequest(url + (page ? '&pageToken=' + encodeURIComponent(page) : ''), {}, token);
    const data = await response.json();
    if (!Array.isArray(data.files)) throw new Error('Drive yedek listesi okunamadı');
    files.push(...data.files);
    page = data.nextPageToken;
  } while (page && (all || !files.length));
  return files;
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
  const response = await driveRequest(url + '&fields=id,version', { method: fileId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + boundary }, body: body }, token);
  return response.json();
}
function openDrivePermission() {
  document.getElementById('modal-drive-permission').classList.remove('hidden');
}
function closeDrivePermission() {
  document.getElementById('modal-drive-permission').classList.add('hidden');
}
function acceptSyncWelcome() {
  localStorage.setItem(STORAGE_SYNC_WELCOME, '1');
  document.getElementById('modal-sync-welcome').classList.add('hidden');
  openDrivePermission();
}
function dismissSyncWelcome() {
  localStorage.setItem(STORAGE_SYNC_WELCOME, '1');
  document.getElementById('modal-sync-welcome').classList.add('hidden');
}
function showSyncWelcomeIfNeeded() {
  if (!getSyncMeta().signedIn && !localStorage.getItem(STORAGE_SYNC_WELCOME)) {
    document.getElementById('modal-sync-welcome').classList.remove('hidden');
  }
}
function googleSignIn() {
  openDrivePermission();
}
async function continueGoogleSignIn() {
  closeDrivePermission();
  const plugin = googleAuthPlugin();
  if (!plugin || syncRunning) { showToast('Google girişi şu anda kullanılamıyor'); return; }
  syncRunning = true;
  let connected = false;
  try {
    showToast('Google hesabı açılıyor…');
    const auth = await plugin.signIn();
    const meta = getSyncMeta();
    if (!auth.email) throw new Error('Google hesabı belirlenemedi');
    if (meta.account !== auth.email) {
      setSyncMeta({ account: auth.email, baseline: null, lastSync: null });
    }
    setSyncMeta({ signedIn: true, paused: false, error: false, baseline: null });
    connected = true;
  } catch (e) { showToast('Google girişi tamamlanamadı'); }
  finally { syncRunning = false; }
  if (connected) await syncNow(true);
}
async function googleSignOut() {
  const plugin = googleAuthPlugin();
  if (syncRunning) { showToast('Eşitlemenin bitmesini bekle'); return; }
  syncRunning = true;
  try {
    if (plugin) await plugin.signOut();
    setSyncMeta({ signedIn: false, paused: true, baseline: null });
    showToast('Google hesabından çıkış yapıldı');
  } catch (e) { showToast('Google hesabından çıkış yapılamadı'); }
  finally { syncRunning = false; }
}
function backupContents(data) {
  return JSON.stringify([data.debts, data.incomes, data.adjustments, data.payments || [], data.hiddenNames]);
}
function driveVersion(file) {
  if (!file?.id || !file.version) throw new Error('Drive yedek sürümü okunamadı');
  return file.id + ':' + file.version;
}
async function deleteDuplicateDriveFiles(token, files, keepId) {
  for (const file of files) {
    if (file.id !== keepId) {
      await driveRequest('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(file.id), { method: 'DELETE' }, token);
    }
  }
}
async function syncNow(manual) {
  let meta = getSyncMeta();
  const plugin = googleAuthPlugin();
  if (!meta.signedIn || !plugin || (meta.paused && !manual)) return;
  if (syncRunning) { syncAgain = true; return; }
  if (!navigator.onLine) { if (manual) showToast('Eşitlemek için internet bağlantısı gerekiyor'); return; }
  syncRunning = true;
  try {
    if (meta.paused) setSyncMeta({ paused: false, baseline: null });
    const auth = await plugin.getToken();
    if (!auth.email || !auth.accessToken || (meta.account && meta.account !== auth.email)) {
      throw new Error('Google hesabını yeniden bağla');
    }
    const token = auth.accessToken;
    const files = await findDriveFiles(token, true);
    const file = files[0];
    const remote = file ? validateBackup(await downloadDrivePayload(token, file.id)) : null;
    const version = file ? driveVersion(file) : null;
    meta = getSyncMeta();
    const local = buildSyncPayload();
    const same = remote && backupContents(remote) === backupContents(local);
    const firstConnection = !meta.baseline;
    const remoteChanged = !!meta.baseline && version !== meta.baseline;
    const localExists = hasLocalSyncData();
    let baseline = version;
    let restored = false;
    if (remote && !same && (firstConnection || (!meta.dirty && remoteChanged))) {
      applySyncPayload(remote);
      restored = true;
    } else if (!same && (meta.dirty || (!remote && localExists))) {
      baseline = driveVersion(await uploadDrivePayload(token, file?.id, local));
    }
    if (files.length > 1) await deleteDuplicateDriveFiles(token, files, file && file.id);
    const editedWhileUploading = meta.revision !== getSyncMeta().revision;
    setSyncMeta({ account: auth.email, baseline: baseline, dirty: editedWhileUploading, error: false, lastSync: new Date().toISOString() });
    syncAgain = syncAgain || editedWhileUploading;
    if (manual || restored) showToast(restored ? 'Drive yedeği geri yüklendi' : 'Google Drive ile eşitlendi');
  } catch (e) {
    console.log('sync', e);
    setSyncMeta({ error: true });
    if (manual) showToast('Eşitleme yapılamadı · Bağlantıyı ve Drive iznini kontrol et');
  } finally {
    syncRunning = false;
    if (syncAgain) {
      syncAgain = false;
      syncNow(false);
    }
  }
}
async function deleteDriveBackup() {
  const meta = getSyncMeta();
  const plugin = googleAuthPlugin();
  if (!meta.signedIn || !plugin || syncRunning) { showToast('Eşitlemenin bitmesini bekle'); return; }
  if (!navigator.onLine) { showToast('Drive yedeğini silmek için internete bağlan'); return; }
  if (!confirm('Bağlı Google hesabındaki Borç Takip yedeği kalıcı olarak silinecek. Telefonda bulunan kayıtlar korunacak ve otomatik eşitleme duraklatılacak. Devam edilsin mi?')) return;
  syncRunning = true;
  setSyncMeta({ paused: true, baseline: null, lastSync: null });
  try {
    const auth = await plugin.getToken();
    if (!auth.email || (meta.account && meta.account !== auth.email)) throw new Error('Google hesabını yeniden bağla');
    const files = await findDriveFiles(auth.accessToken, true);
    for (const file of files) {
      await driveRequest('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(file.id), { method: 'DELETE' }, auth.accessToken);
    }
    showToast(files.length ? 'Drive yedeği silindi' : 'Drive yedeği bulunamadı');
  } catch (e) {
    showToast('Drive yedeğinin silindiği doğrulanamadı');
  } finally { syncRunning = false; }
}
function restoreGoogleSession() {
  showSyncWelcomeIfNeeded();
  syncNow(false);
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
    if (state && state.isActive) { syncNow(false); refreshRates(); }
  });
  window.Capacitor.Plugins.App.addListener('backButton', function(e) {
    const modals = ['modal-drive-permission', 'modal-sync-welcome', 'modal-debt-saved', 'modal-edit-scope', 'modal-debt', 'modal-income', 'modal-partial', 'modal-pay-source', 'modal-settings', 'modal-payment-history', 'modal-legal', 'modal-months', 'modal-month-debts', 'modal-name-picker'];
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
  try { rateCache = JSON.parse(localStorage.getItem('borc_takip_rate_cache')); } catch (e) { rateCache = null; }
  updateRateInfo();
  refreshRates();
  updateSyncUI();
  restoreGoogleSession();
  window.addEventListener('online', function() { updateSyncUI(); syncNow(false); refreshRates(); });
  window.addEventListener('offline', updateSyncUI);
  fillCurrencySelects();
  renderAll();
  scheduleDueNotifications();
  const accessibleActions = {
    'closeDebtModal()': 'Geri', 'closeIncomeModal()': 'Geri', 'closeMonthDebtsModal()': 'Geri',
    'closeNamePicker()': 'Kapat', 'openNamePicker()': 'Kayıtlı borç adlarını aç'
  };
  document.querySelectorAll('button').forEach(function(button) {
    if (button.textContent.trim() || button.getAttribute('aria-label')) return;
    const action = button.getAttribute('onclick') || '';
    const label = accessibleActions[action] || button.getAttribute('title');
    if (label) button.setAttribute('aria-label', label);
  });
  document.getElementById('btn-add-debt').addEventListener('click', function() {
    openDebtModal(null, null, selectedFilterMonthKey());
  });
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
