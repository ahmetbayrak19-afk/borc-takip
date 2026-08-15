// ==================== BORÇ TAKİP APP ====================
const STORAGE_DEBTS = 'borc_takip_debts';
const STORAGE_INCOMES = 'borc_takip_incomes';
let debts = [];
let incomes = [];
let editingDebtId = null;
let currentFilter = 'this-month';

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

function formatMoney(amount) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 }).format(amount || 0);
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
  return String(str).replace(/&/g,'&').replace(/</g,'<').replace(/>/g,'>').replace(/\"/g,'"');
}
function loadData() {
  try {
    debts = JSON.parse(localStorage.getItem(STORAGE_DEBTS) || '[]');
    incomes = JSON.parse(localStorage.getItem(STORAGE_INCOMES) || '[]');
  } catch (e) { debts = []; incomes = []; }
}
function saveDebts() { localStorage.setItem(STORAGE_DEBTS, JSON.stringify(debts)); }
function saveIncomes() { localStorage.setItem(STORAGE_INCOMES, JSON.stringify(incomes)); }

function getActiveInstallments() {
  const result = [];
  debts.forEach(function(debt) {
    const paidCount = debt.paidInstallments || 0;
    const count = debt.installmentCount || 1;
    const amount = debt.installmentAmount || debt.totalAmount || 0;
    for (let i = paidCount; i < count; i++) {
      result.push({
        debtId: debt.id, name: debt.name, amount: amount,
        dueDate: addMonths(debt.startDate, i),
        installmentLabel: (i + 1) + '/' + count,
        installmentIndex: i, isRecurring: !!debt.recurring,
        totalAmount: debt.totalAmount || (amount * count),
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
function getMonthlyIncome() {
  return incomes.reduce(function(sum, i) { return sum + (Number(i.amount) || 0); }, 0);
}
function getThisMonthDebtTotal() {
  return getActiveInstallments().filter(function(i) { return isSameMonth(i.dueDate); }).reduce(function(s, i) { return s + i.amount; }, 0);
}

function getFilterMonthOffset(filter) {
  if (filter === 'month-1') return 1;
  if (filter === 'month-2') return 2;
  return 0;
}
function getDebtTotalForOffset(offset) {
  return getActiveInstallments().filter(function(i) {
    if (offset === 0) return isSameMonth(i.dueDate);
    return isMonthOffset(i.dueDate, offset);
  }).reduce(function(s, i) { return s + i.amount; }, 0);
}
function balanceMonthName(filter) {
  return monthNameTR(getFilterMonthOffset(filter));
}

function renderBalance() {
  const income = getMonthlyIncome();
  const offset = getFilterMonthOffset(currentFilter);
  const monthDebt = getDebtTotalForOffset(offset);
  const balance = income - monthDebt;
  const monthName = balanceMonthName(currentFilter);
  const banner = document.getElementById('balance-banner');
  const text = document.getElementById('balance-text');
  const sub = document.getElementById('balance-sub');
  const icon = document.getElementById('balance-icon');
  const monthEl = document.getElementById('balance-month');
  if (income === 0 && monthDebt === 0) { banner.classList.add('hidden'); return; }
  banner.classList.remove('hidden');
  text.textContent = formatMoney(Math.abs(balance));
  if (monthEl) monthEl.textContent = monthName;
  if (balance >= 0) {
    banner.className = 'mt-4 rounded-2xl p-4 text-white fade-in bg-gradient-to-r from-emerald-500 to-green-600';
    sub.textContent = 'Artıdasınız • Gelir: ' + formatMoney(income) + ' | ' + monthName + ' borç: ' + formatMoney(monthDebt);
    icon.innerHTML = '<i class="fas fa-arrow-up"></i>';
  } else {
    banner.className = 'mt-4 rounded-2xl p-4 text-white fade-in bg-gradient-to-r from-rose-500 to-red-600';
    sub.textContent = 'Eksidesiniz • Gelir: ' + formatMoney(income) + ' | ' + monthName + ' borç: ' + formatMoney(monthDebt);
    icon.innerHTML = '<i class="fas fa-arrow-down"></i>';
  }
}

function renderSummaries() {
  const s = calcSummaries();
  document.getElementById('sum-overdue').textContent = formatMoney(s.overdue);
  document.getElementById('sum-today').textContent = formatMoney(s.today);
  document.getElementById('sum-this-month').textContent = formatMoney(s.thisMonth + s.today);
  const cards = document.querySelectorAll('#summary-grid > div');
  if (cards.length >= 6) {
    const filters = ['overdue', 'today', 'this-month', 'month-1', 'month-2', 'all'];
    cards[3].querySelector('p:first-child').textContent = monthNameTR(1);
    cards[3].querySelector('p:last-child').textContent = formatMoney(s.next1);
    cards[4].querySelector('p:first-child').textContent = monthNameTR(2);
    cards[4].querySelector('p:last-child').textContent = formatMoney(s.next2 + s.later);
    for (let i = 0; i < 6; i++) {
      cards[i].setAttribute('data-filter', filters[i]);
      cards[i].style.cursor = 'pointer';
      const th = getTheme(filters[i]);
      cards[i].className = (filters[i] === currentFilter) ? th.cardActive : th.card;
    }
  }
  document.getElementById('sum-total').textContent = formatMoney(s.total);
}

function renderIncomes() {
  const list = document.getElementById('income-list');
  const empty = document.getElementById('income-empty');
  list.innerHTML = '';
  if (incomes.length === 0) { empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  incomes.forEach(function(inc) {
    const el = document.createElement('div');
    el.className = 'bg-white rounded-xl p-3.5 card-shadow flex items-center justify-between fade-in';
    el.innerHTML = '<div class="flex items-center gap-3"><div class="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><i class="fas fa-wallet"></i></div><div><p class="font-medium text-gray-900">' + escapeHtml(inc.name) + '</p><p class="text-xs text-gray-500">Aylık</p></div></div><div class="flex items-center gap-2"><span class="font-semibold text-emerald-600">' + formatMoney(inc.amount) + '</span><button onclick="deleteIncome(\'' + inc.id + '\')" class="text-gray-400 hover:text-red-500 p-1.5"><i class="fas fa-trash-alt text-sm"></i></button></div>';
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
    const el = document.createElement('div');
    el.className = getTheme(filter).debt;
    el.innerHTML = '<div class="flex justify-between items-start"><div class="flex-1 min-w-0"><p class="text-xs text-gray-500 mb-0.5">' + formatDateTR(item.dueDate) + '</p><p class="font-semibold text-gray-900 truncate">' + escapeHtml(item.name) + '</p><p class="text-xs font-medium text-blue-600 mt-1">(' + item.installmentLabel + ')</p></div><div class="text-right ml-3"><p class="font-bold ' + (isLate ? 'text-red-600' : 'text-gray-900') + '">' + formatMoney(item.amount) + '</p>' + (isLate ? '<span class="text-xs text-red-500 font-medium">Gecikmiş</span>' : isTod ? '<span class="text-xs text-orange-500 font-medium">Bugün</span>' : '') + '</div></div><div class="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100"><button onclick="confirmMarkPaid(\'' + item.debtId + '\')" class="text-green-600 hover:text-green-700 flex items-center gap-1.5 text-sm font-medium"><i class="fas fa-check-circle"></i> Ödendi</button><button onclick="editDebt(\'' + item.debtId + '\')" class="text-blue-600 hover:text-blue-700 flex items-center gap-1.5 text-sm font-medium"><i class="fas fa-pen"></i> Düzenle</button><button onclick="deleteDebt(\'' + item.debtId + '\')" class="text-red-500 hover:text-red-600 flex items-center gap-1.5 text-sm font-medium ml-auto"><i class="fas fa-times"></i></button></div>';
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
  document.getElementById('debt-id').value = '';
  document.getElementById('debt-installments').value = 2;
  document.getElementById('installment-fields').classList.add('hidden');
  document.getElementById('installment-preview').classList.add('hidden');
  document.getElementById('debt-recurring').checked = false;
  if (editId) {
    const debt = debts.find(function(d) { return d.id === editId; });
    if (!debt) return;
    title.textContent = 'Borcu Düzenle';
    document.getElementById('debt-id').value = debt.id;
    document.getElementById('debt-name').value = debt.name;
    document.getElementById('debt-total').value = debt.installmentAmount || debt.totalAmount;
    document.getElementById('debt-due').value = debt.startDate;
    document.getElementById('debt-installments').value = debt.installmentCount || 1;
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
  const preview = document.getElementById('installment-preview');
  const info = document.getElementById('installment-info');
  if (count > 1 && amount > 0) {
    const total = Math.round(amount * count * 100) / 100;
    info.textContent = count + ' taksit × ' + formatMoney(amount) + ' = ' + formatMoney(total) + ' toplam';
    preview.classList.remove('hidden');
  } else preview.classList.add('hidden');
}
function saveDebt(e) {
  e.preventDefault();
  const id = document.getElementById('debt-id').value || uid();
  const name = document.getElementById('debt-name').value.trim();
  const installmentAmount = parseFloat(document.getElementById('debt-total').value);
  const startDate = document.getElementById('debt-due').value;
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
  if (existingIdx >= 0) {
    const old = debts[existingIdx];
    if (old.startDate === startDate && old.installmentCount === installmentCount && old.installmentAmount === installmentAmount)
      paidInstallments = old.paidInstallments || 0;
  }
  const debtObj = {
    id: id, name: name, category: '', totalAmount: totalAmount,
    installmentCount: installmentCount, installmentAmount: installmentAmount,
    startDate: startDate, note: '', recurring: isMulti,
    paidInstallments: paidInstallments,
    createdAt: existingIdx >= 0 ? debts[existingIdx].createdAt : new Date().toISOString()
  };
  if (existingIdx >= 0) { debts[existingIdx] = debtObj; showToast('Borç güncellendi'); }
  else { debts.push(debtObj); showToast('Borç eklendi'); }
  saveDebts(); closeDebtModal(); renderAll();
}
function confirmMarkPaid(debtId) {
  if (!confirm('Bu taksiti ödendi olarak işaretlemek istiyor musunuz?')) return;
  markPaid(debtId);
}
function markPaid(debtId) {
  const debt = debts.find(function(d) { return d.id === debtId; });
  if (!debt) return;
  debt.paidInstallments = (debt.paidInstallments || 0) + 1;
  if (debt.paidInstallments >= debt.installmentCount) showToast('Borç tamamen ödendi');
  else showToast('Taksit ödendi (' + debt.paidInstallments + '/' + debt.installmentCount + ')');
  saveDebts(); renderAll();
}
function editDebt(debtId) { openDebtModal(debtId); }
function deleteDebt(debtId) {
  if (!confirm('Bu borcu silmek istediğinize emin misiniz?')) return;
  debts = debts.filter(function(d) { return d.id !== debtId; });
  saveDebts(); showToast('Borç silindi'); renderAll();
}

function openIncomeModal() {
  document.getElementById('form-income').reset();
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
  if (!name || !amount) return;
  incomes.push({ id: uid(), name: name, amount: amount, createdAt: new Date().toISOString() });
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
  const data = { debts: debts, incomes: incomes, exportedAt: new Date().toISOString() };
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
        await FS.writeFile({
          path: filename,
          data: json,
          directory: 'DOCUMENTS',
          encoding: 'utf8',
          recursive: true
        });
        let uri = null;
        try {
          const uriResult = await FS.getUri({ path: filename, directory: 'DOCUMENTS' });
          uri = uriResult && (uriResult.uri || uriResult);
        } catch (e1) {}
        if (SharePlugin && SharePlugin.share) {
          try {
            const shareOpts = { title: 'Borç Takip Yedek', dialogTitle: 'Yedeği kaydet veya paylaş' };
            if (uri) shareOpts.url = uri;
            else shareOpts.text = json;
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
      console.error(err);
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
    navigator.clipboard.writeText(text).then(function() { showToast('JSON panoya kopyalandı'); }).catch(function() { showToast('Dışa aktarma başarısız'); });
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
      saveDebts(); saveIncomes(); renderAll();
      showToast('Veriler yüklendi'); closeSettings();
    } catch (err) { showToast('Geçersiz dosya'); }
  };
  reader.readAsText(file);
}
function clearAllData() {
  if (!confirm('TÜM borç ve gelir verileri silinecek. Emin misiniz?')) return;
  debts = []; incomes = []; saveDebts(); saveIncomes(); renderAll();
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
      btn.innerHTML = '<div><p class="font-semibold text-gray-900">' + monthTitleFromKey(key) + '</p><p class="text-xs text-gray-500">' + m.count + ' borç</p></div><span class="font-bold text-gray-800">' + formatMoney(m.total) + '</span>';
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
      el.innerHTML = '<div class="flex justify-between items-start"><div><p class="text-xs text-gray-500">' + formatDateTR(item.dueDate) + '</p><p class="font-semibold text-gray-900">' + escapeHtml(item.name) + '</p><p class="text-xs text-blue-600 mt-0.5">(' + item.installmentLabel + ')</p></div><p class="font-bold ' + (isLate ? 'text-red-600' : 'text-gray-900') + '">' + formatMoney(item.amount) + '</p></div>';
      list.appendChild(el);
    });
    totalEl.textContent = 'Toplam: ' + formatMoney(total);
  }
  document.getElementById('modal-month-debts').classList.remove('hidden');
}
function closeMonthDebtsModal() {
  const el = document.getElementById('modal-month-debts');
  if (el) el.classList.add('hidden');
}

function isModalOpen(id) {
  const el = document.getElementById(id);
  return el && !el.classList.contains('hidden');
}
function handleBackButton() {
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

document.addEventListener('DOMContentLoaded', function() {
  loadData(); renderAll(); setupBackButton();
  document.getElementById('btn-add-debt').addEventListener('click', function() { openDebtModal(); });
  document.getElementById('btn-add-income').addEventListener('click', openIncomeModal);
  document.getElementById('btn-settings').addEventListener('click', openSettings);
  document.getElementById('form-debt').addEventListener('submit', saveDebt);
  document.getElementById('form-income').addEventListener('submit', saveIncome);
  document.getElementById('debt-total').addEventListener('input', updateInstallmentPreview);
  document.getElementById('debt-installments').addEventListener('input', updateInstallmentPreview);
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
