// ==================== BORÇ TAKİP APP ====================
// LocalStorage keys
const STORAGE_DEBTS = 'borc_takip_debts';
const STORAGE_INCOMES = 'borc_takip_incomes';

// State
let debts = [];
let incomes = [];
let editingDebtId = null;

// ==================== UTILS ====================
function formatMoney(amount) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2
  }).format(amount || 0);
}

function formatDateTR(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} ${days[d.getDay()]}`;
}

function todayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function addMonths(dateStr, months) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function isSameMonth(dateStr, ref = new Date()) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear();
}

function isNextMonth(dateStr) {
  const next = new Date();
  next.setMonth(next.getMonth() + 1);
  return isSameMonth(dateStr, next);
}

function isLater(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const nextNext = new Date();
  nextNext.setMonth(nextNext.getMonth() + 2);
  nextNext.setDate(1);
  return d >= nextNext;
}

function isOverdue(dateStr) {
  return dateStr < todayStr();
}

function isToday(dateStr) {
  return dateStr === todayStr();
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('opacity-0');
  t.classList.add('opacity-100');
  setTimeout(() => {
    t.classList.remove('opacity-100');
    t.classList.add('opacity-0');
  }, 2200);
}

// ==================== STORAGE ====================
function loadData() {
  try {
    debts = JSON.parse(localStorage.getItem(STORAGE_DEBTS) || '[]');
    incomes = JSON.parse(localStorage.getItem(STORAGE_INCOMES) || '[]');
  } catch (e) {
    debts = [];
    incomes = [];
  }
}

function saveDebts() {
  localStorage.setItem(STORAGE_DEBTS, JSON.stringify(debts));
}

function saveIncomes() {
  localStorage.setItem(STORAGE_INCOMES, JSON.stringify(incomes));
}

// ==================== CALCULATIONS ====================
function getActiveInstallments() {
  const result = [];
  debts.forEach(debt => {
    if (debt.paid) return;
    const paidCount = debt.paidInstallments || 0;
    if (paidCount >= debt.installmentCount) return;

    const currentIdx = paidCount;
    const dueDate = addMonths(debt.startDate, currentIdx);
    const amount = debt.installmentAmount;

    result.push({
      debtId: debt.id,
      name: debt.name,
      category: debt.category,
      note: debt.note,
      amount,
      dueDate,
      installmentLabel: `${currentIdx + 1}/${debt.installmentCount}`,
      isRecurring: debt.recurring,
      totalAmount: debt.totalAmount,
      remaining: debt.installmentCount - paidCount
    });
  });
  return result;
}

function calcSummaries() {
  const items = getActiveInstallments();
  let overdue = 0, today = 0, thisMonth = 0, nextMonth = 0, later = 0, total = 0;

  items.forEach(item => {
    total += item.amount;
    if (isOverdue(item.dueDate)) overdue += item.amount;
    else if (isToday(item.dueDate)) today += item.amount;
    else if (isSameMonth(item.dueDate)) thisMonth += item.amount;
    else if (isNextMonth(item.dueDate)) nextMonth += item.amount;
    else if (isLater(item.dueDate)) later += item.amount;
  });

  return { overdue, today, thisMonth, nextMonth, later, total };
}

function getMonthlyIncome() {
  return incomes.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
}

function getThisMonthDebtTotal() {
  const items = getActiveInstallments();
  return items
    .filter(i => isSameMonth(i.dueDate))
    .reduce((s, i) => s + i.amount, 0);
}

// ==================== RENDER ====================
function renderBalance() {
  const income = getMonthlyIncome();
  const thisMonthDebt = getThisMonthDebtTotal();
  const balance = income - thisMonthDebt;
  const banner = document.getElementById('balance-banner');
  const text = document.getElementById('balance-text');
  const sub = document.getElementById('balance-sub');
  const icon = document.getElementById('balance-icon');

  if (income === 0 && thisMonthDebt === 0) {
    banner.classList.add('hidden');
    return;
  }

  banner.classList.remove('hidden');
  text.textContent = formatMoney(Math.abs(balance));

  if (balance >= 0) {
    banner.className = 'mt-4 rounded-2xl p-4 text-white fade-in bg-gradient-to-r from-emerald-500 to-green-600';
    sub.textContent = `Artıdasınız • Aylık gelir: ${formatMoney(income)} | Bu ay borç: ${formatMoney(thisMonthDebt)}`;
    icon.innerHTML = '<i class="fas fa-arrow-up"></i>';
  } else {
    banner.className = 'mt-4 rounded-2xl p-4 text-white fade-in bg-gradient-to-r from-rose-500 to-red-600';
    sub.textContent = `Eksidesiniz • Aylık gelir: ${formatMoney(income)} | Bu ay borç: ${formatMoney(thisMonthDebt)}`;
    icon.innerHTML = '<i class="fas fa-arrow-down"></i>';
  }
}

function renderSummaries() {
  const s = calcSummaries();
  document.getElementById('sum-overdue').textContent = formatMoney(s.overdue);
  document.getElementById('sum-today').textContent = formatMoney(s.today);
  document.getElementById('sum-this-month').textContent = formatMoney(s.thisMonth + s.today);
  document.getElementById('sum-next-month').textContent = formatMoney(s.nextMonth);
  document.getElementById('sum-later').textContent = formatMoney(s.later);
  document.getElementById('sum-total').textContent = formatMoney(s.total);
}

function renderIncomes() {
  const list = document.getElementById('income-list');
  const empty = document.getElementById('income-empty');
  list.innerHTML = '';

  if (incomes.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  incomes.forEach(inc => {
    const el = document.createElement('div');
    el.className = 'bg-white rounded-xl p-3.5 card-shadow flex items-center justify-between fade-in';
    el.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
          <i class="fas fa-wallet"></i>
        </div>
        <div>
          <p class="font-medium text-gray-900">${escapeHtml(inc.name)}</p>
          <p class="text-xs text-gray-500">Aylık</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="font-semibold text-emerald-600">${formatMoney(inc.amount)}</span>
        <button onclick="deleteIncome('${inc.id}')" class="text-gray-400 hover:text-red-500 p-1.5">
          <i class="fas fa-trash-alt text-sm"></i>
        </button>
      </div>
    `;
    list.appendChild(el);
  });
}

function renderDebts() {
  const filter = document.getElementById('debt-filter').value;
  const list = document.getElementById('debt-list');
  const empty = document.getElementById('debt-empty');
  list.innerHTML = '';

  let items = getActiveInstallments();

  if (filter === 'this-month') {
    items = items.filter(i => isSameMonth(i.dueDate));
  } else if (filter === 'overdue') {
    items = items.filter(i => isOverdue(i.dueDate));
  } else if (filter === 'upcoming') {
    items = items.filter(i => !isOverdue(i.dueDate));
  }

  items.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  if (items.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  items.forEach(item => {
    const isLate = isOverdue(item.dueDate);
    const isTod = isToday(item.dueDate);
    const el = document.createElement('div');
    el.className = 'bg-white rounded-xl p-4 card-shadow fade-in';
    el.innerHTML = `
      <div class="flex justify-between items-start">
        <div class="flex-1 min-w-0">
          <p class="text-xs text-gray-500 mb-0.5">${formatDateTR(item.dueDate)}</p>
          <p class="font-semibold text-gray-900 truncate">${escapeHtml(item.name)}</p>
          <p class="text-xs text-gray-400 mt-0.5">${escapeHtml(item.category)}${item.note ? ' • ' + escapeHtml(item.note) : ''}</p>
          <p class="text-xs font-medium text-blue-600 mt-1">(${item.installmentLabel})</p>
        </div>
        <div class="text-right ml-3">
          <p class="font-bold text-gray-900 ${isLate ? 'text-red-600' : ''}">${formatMoney(item.amount)}</p>
          ${isLate ? '<span class="text-xs text-red-500 font-medium">Gecikmiş</span>' : isTod ? '<span class="text-xs text-orange-500 font-medium">Bugün</span>' : ''}
        </div>
      </div>
      <div class="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
        <button onclick="markPaid('${item.debtId}')" class="text-green-600 hover:text-green-700 flex items-center gap-1.5 text-sm font-medium" title="Ödendi olarak işaretle">
          <i class="fas fa-check-circle"></i> Ödendi
        </button>
        <button onclick="editDebt('${item.debtId}')" class="text-blue-600 hover:text-blue-700 flex items-center gap-1.5 text-sm font-medium">
          <i class="fas fa-pen"></i> Düzenle
        </button>
        <button onclick="deleteDebt('${item.debtId}')" class="text-red-500 hover:text-red-600 flex items-center gap-1.5 text-sm font-medium ml-auto">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
    list.appendChild(el);
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"');
}

function renderAll() {
  renderBalance();
  renderSummaries();
  renderIncomes();
  renderDebts();
}

// ==================== DEBT ACTIONS ====================
function openDebtModal(editId = null) {
  editingDebtId = editId;
  const modal = document.getElementById('modal-debt');
  const title = document.getElementById('debt-modal-title');
  const form = document.getElementById('form-debt');

  form.reset();
  document.getElementById('debt-id').value = '';
  document.getElementById('debt-installments').value = 1;
  document.getElementById('installment-preview').classList.add('hidden');

  if (editId) {
    const debt = debts.find(d => d.id === editId);
    if (!debt) return;
    title.textContent = 'Borcu Düzenle';
    document.getElementById('debt-id').value = debt.id;
    document.getElementById('debt-name').value = debt.name;
    document.getElementById('debt-category').value = debt.category;
    document.getElementById('debt-total').value = debt.totalAmount;
    document.getElementById('debt-installments').value = debt.installmentCount;
    document.getElementById('debt-due').value = debt.startDate;
    document.getElementById('debt-note').value = debt.note || '';
    document.getElementById('debt-recurring').checked = !!debt.recurring;
    updateInstallmentPreview();
  } else {
    title.textContent = 'Yeni Borç Ekle';
    const d = new Date();
    d.setDate(d.getDate() + 7);
    document.getElementById('debt-due').value = d.toISOString().slice(0, 10);
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
  const total = parseFloat(document.getElementById('debt-total').value) || 0;
  const count = parseInt(document.getElementById('debt-installments').value) || 1;
  const preview = document.getElementById('installment-preview');
  const info = document.getElementById('installment-info');

  if (count > 1 && total > 0) {
    const each = Math.round((total / count) * 100) / 100;
    info.textContent = `${count} taksit × ${formatMoney(each)} = ${formatMoney(total)}`;
    preview.classList.remove('hidden');
  } else {
    preview.classList.add('hidden');
  }
}

function saveDebt(e) {
  e.preventDefault();
  const id = document.getElementById('debt-id').value || uid();
  const name = document.getElementById('debt-name').value.trim();
  const category = document.getElementById('debt-category').value;
  const totalAmount = parseFloat(document.getElementById('debt-total').value);
  const installmentCount = parseInt(document.getElementById('debt-installments').value) || 1;
  const startDate = document.getElementById('debt-due').value;
  const note = document.getElementById('debt-note').value.trim();
  const recurring = document.getElementById('debt-recurring').checked;

  if (!name || !totalAmount || !startDate) {
    showToast('Lütfen zorunlu alanları doldurun');
    return;
  }

  const installmentAmount = Math.round((totalAmount / installmentCount) * 100) / 100;

  const existingIdx = debts.findIndex(d => d.id === id);
  const debtObj = {
    id,
    name,
    category,
    totalAmount,
    installmentCount,
    installmentAmount,
    startDate,
    note,
    recurring,
    paidInstallments: existingIdx >= 0 ? (debts[existingIdx].paidInstallments || 0) : 0,
    createdAt: existingIdx >= 0 ? debts[existingIdx].createdAt : new Date().toISOString()
  };

  if (existingIdx >= 0) {
    debts[existingIdx] = debtObj;
    showToast('Borç güncellendi');
  } else {
    debts.push(debtObj);
    showToast('Borç eklendi');
  }

  saveDebts();
  closeDebtModal();
  renderAll();
}

function markPaid(debtId) {
  const debt = debts.find(d => d.id === debtId);
  if (!debt) return;
  debt.paidInstallments = (debt.paidInstallments || 0) + 1;
  if (debt.paidInstallments >= debt.installmentCount) {
    if (debt.recurring) {
      debt.startDate = addMonths(debt.startDate, debt.installmentCount);
      debt.paidInstallments = 0;
      showToast('Taksit ödendi (tekrar eden borç yenilendi)');
    } else {
      showToast('Borç tamamen ödendi 🎉');
    }
  } else {
    showToast(`Taksit ödendi (${debt.paidInstallments}/${debt.installmentCount})`);
  }
  saveDebts();
  renderAll();
}

function editDebt(debtId) {
  openDebtModal(debtId);
}

function deleteDebt(debtId) {
  if (!confirm('Bu borcu silmek istediğinize emin misiniz?')) return;
  debts = debts.filter(d => d.id !== debtId);
  saveDebts();
  showToast('Borç silindi');
  renderAll();
}

// ==================== INCOME ACTIONS ====================
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

  incomes.push({
    id: uid(),
    name,
    amount,
    createdAt: new Date().toISOString()
  });
  saveIncomes();
  closeIncomeModal();
  showToast('Gelir eklendi');
  renderAll();
}

function deleteIncome(id) {
  if (!confirm('Bu geliri silmek istiyor musunuz?')) return;
  incomes = incomes.filter(i => i.id !== id);
  saveIncomes();
  showToast('Gelir silindi');
  renderAll();
}

// ==================== SETTINGS ====================
function openSettings() {
  document.getElementById('modal-settings').classList.remove('hidden');
}

function closeSettings() {
  document.getElementById('modal-settings').classList.add('hidden');
}

function exportData() {
  const data = { debts, incomes, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `borc-takip-${todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Veriler indirildi');
  closeSettings();
}

function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      if (data.debts) debts = data.debts;
      if (data.incomes) incomes = data.incomes;
      saveDebts();
      saveIncomes();
      renderAll();
      showToast('Veriler yüklendi');
      closeSettings();
    } catch (err) {
      showToast('Geçersiz dosya');
    }
  };
  reader.readAsText(file);
}

function clearAllData() {
  if (!confirm('TÜM borç ve gelir verileri silinecek. Emin misiniz?')) return;
  debts = [];
  incomes = [];
  saveDebts();
  saveIncomes();
  renderAll();
  showToast('Tüm veriler silindi');
  closeSettings();
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  renderAll();

  document.getElementById('btn-add-debt').addEventListener('click', () => openDebtModal());
  document.getElementById('btn-add-income').addEventListener('click', openIncomeModal);
  document.getElementById('btn-settings').addEventListener('click', openSettings);
  document.getElementById('form-debt').addEventListener('submit', saveDebt);
  document.getElementById('form-income').addEventListener('submit', saveIncome);
  document.getElementById('debt-filter').addEventListener('change', renderDebts);

  document.getElementById('debt-total').addEventListener('input', updateInstallmentPreview);
  document.getElementById('debt-installments').addEventListener('input', updateInstallmentPreview);

  document.getElementById('btn-custom-cat').addEventListener('click', () => {
    const cat = prompt('Yeni kategori adı:');
    if (cat && cat.trim()) {
      const sel = document.getElementById('debt-category');
      const opt = document.createElement('option');
      opt.value = cat.trim();
      opt.textContent = cat.trim();
      opt.selected = true;
      sel.appendChild(opt);
    }
  });
});
