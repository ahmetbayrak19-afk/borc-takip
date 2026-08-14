// ==================== BORÇ TAKİP APP ====================
const STORAGE_DEBTS = 'borc_takip_debts';
const STORAGE_INCOMES = 'borc_takip_incomes';

let debts = [];
let incomes = [];
let editingDebtId = null;

function formatMoney(amount) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 }).format(amount || 0);
}
function formatDateTR(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
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
function todayStr() { return new Date().toISOString().slice(0, 10); }
function addMonths(dateStr, months) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}
function isSameMonth(dateStr, ref) {
  if (!ref) ref = new Date();
  const d = new Date(dateStr + 'T00:00:00');
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
  setTimeout(function() { t.classList.remove('opacity-100'); t.classList.add('opacity-0'); }, 2500);
}
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&').replace(/</g,'<').replace(/>/g,'>').replace(/"/g,'"');
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
  var result = [];
  debts.forEach(function(debt) {
    var paidCount = debt.paidInstallments || 0;
    if (paidCount >= debt.installmentCount) return;
    var currentIdx = paidCount;
    var dueDate = addMonths(debt.startDate, currentIdx);
    result.push({
      debtId: debt.id, name: debt.name, amount: debt.installmentAmount, dueDate: dueDate,
      installmentLabel: (currentIdx + 1) + '/' + debt.installmentCount,
      isRecurring: debt.recurring, totalAmount: debt.totalAmount,
      remaining: debt.installmentCount - paidCount
    });
  });
  return result;
}

function calcSummaries() {
  var items = getActiveInstallments();
  var overdue = 0, today = 0, thisMonth = 0, next1 = 0, next2 = 0, later = 0, total = 0;
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

function renderBalance() {
  var income = getMonthlyIncome();
  var thisMonthDebt = getThisMonthDebtTotal();
  var balance = income - thisMonthDebt;
  var banner = document.getElementById('balance-banner');
  var text = document.getElementById('balance-text');
  var sub = document.getElementById('balance-sub');
  var icon = document.getElementById('balance-icon');
  if (income === 0 && thisMonthDebt === 0) { banner.classList.add('hidden'); return; }
  banner.classList.remove('hidden');
  text.textContent = formatMoney(Math.abs(balance));
  if (balance >= 0) {
    banner.className = 'mt-4 rounded-2xl p-4 text-white fade-in bg-gradient-to-r from-emerald-500 to-green-600';
    sub.textContent = 'Artıdasınız • Gelir: ' + formatMoney(income) + ' | Bu ay borç: ' + formatMoney(thisMonthDebt);
    icon.innerHTML = '<i class="fas fa-arrow-up"></i>';
  } else {
    banner.className = 'mt-4 rounded-2xl p-4 text-white fade-in bg-gradient-to-r from-rose-500 to-red-600';
    sub.textContent = 'Eksidesiniz • Gelir: ' + formatMoney(income) + ' | Bu ay borç: ' + formatMoney(thisMonthDebt);
    icon.innerHTML = '<i class="fas fa-arrow-down"></i>';
  }
}

function renderSummaries() {
  var s = calcSummaries();
  document.getElementById('sum-overdue').textContent = formatMoney(s.overdue);
  document.getElementById('sum-today').textContent = formatMoney(s.today);
  document.getElementById('sum-this-month').textContent = formatMoney(s.thisMonth + s.today);
  var cards = document.querySelectorAll('#summary-grid > div');
  if (cards.length >= 6) {
    cards[3].querySelector('p:first-child').textContent = monthNameTR(1);
    cards[3].querySelector('p:last-child').textContent = formatMoney(s.next1);
    cards[4].querySelector('p:first-child').textContent = monthNameTR(2);
    cards[4].querySelector('p:last-child').textContent = formatMoney(s.next2 + s.later);
  }
  document.getElementById('sum-total').textContent = formatMoney(s.total);
}

function renderIncomes() {
  var list = document.getElementById('income-list');
  var empty = document.getElementById('income-empty');
  list.innerHTML = '';
  if (incomes.length === 0) { empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  incomes.forEach(function(inc) {
    var el = document.createElement('div');
    el.className = 'bg-white rounded-xl p-3.5 card-shadow flex items-center justify-between fade-in';
    el.innerHTML = '<div class="flex items-center gap-3"><div class="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><i class="fas fa-wallet"></i></div><div><p class="font-medium text-gray-900">' + escapeHtml(inc.name) + '</p><p class="text-xs text-gray-500">Aylık</p></div></div><div class="flex items-center gap-2"><span class="font-semibold text-emerald-600">' + formatMoney(inc.amount) + '</span><button onclick="deleteIncome(\'' + inc.id + '\')" class="text-gray-400 hover:text-red-500 p-1.5"><i class="fas fa-trash-alt text-sm"></i></button></div>';
    list.appendChild(el);
  });
}

function renderDebts() {
  var filter = document.getElementById('debt-filter').value;
  var list = document.getElementById('debt-list');
  var empty = document.getElementById('debt-empty');
  list.innerHTML = '';
  var items = getActiveInstallments();
  if (filter === 'this-month') items = items.filter(function(i) { return isSameMonth(i.dueDate); });
  else if (filter === 'overdue') items = items.filter(function(i) { return isOverdue(i.dueDate); });
  else if (filter === 'upcoming') items = items.filter(function(i) { return !isOverdue(i.dueDate); });
  else if (filter.indexOf('month-') === 0) {
    var offset = parseInt(filter.split('-')[1], 10);
    items = items.filter(function(i) { return isMonthOffset(i.dueDate, offset); });
  }
  items.sort(function(a, b) { return a.dueDate.localeCompare(b.dueDate); });
  if (items.length === 0) { empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  items.forEach(function(item) {
    var isLate = isOverdue(item.dueDate);
    var isTod = isToday(item.dueDate);
    var el = document.createElement('div');
    el.className = 'bg-white rounded-xl p-4 card-shadow fade-in';
    el.innerHTML = '<div class="flex justify-between items-start"><div class="flex-1 min-w-0"><p class="text-xs text-gray-500 mb-0.5">' + formatDateTR(item.dueDate) + '</p><p class="font-semibold text-gray-900 truncate">' + escapeHtml(item.name) + '</p><p class="text-xs font-medium text-blue-600 mt-1">(' + item.installmentLabel + ')</p></div><div class="text-right ml-3"><p class="font-bold ' + (isLate ? 'text-red-600' : 'text-gray-900') + '">' + formatMoney(item.amount) + '</p>' + (isLate ? '<span class="text-xs text-red-500 font-medium">Gecikmiş</span>' : isTod ? '<span class="text-xs text-orange-500 font-medium">Bugün</span>' : '') + '</div></div><div class="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100"><button onclick="confirmMarkPaid(\'' + item.debtId + '\')" class="text-green-600 hover:text-green-700 flex items-center gap-1.5 text-sm font-medium"><i class="fas fa-check-circle"></i> Ödendi</button><button onclick="editDebt(\'' + item.debtId + '\')" class="text-blue-600 hover:text-blue-700 flex items-center gap-1.5 text-sm font-medium"><i class="fas fa-pen"></i> Düzenle</button><button onclick="deleteDebt(\'' + item.debtId + '\')" class="text-red-500 hover:text-red-600 flex items-center gap-1.5 text-sm font-medium ml-auto"><i class="fas fa-times"></i></button></div>';
    list.appendChild(el);
  });
}

function renderFilterOptions() {
  var sel = document.getElementById('debt-filter');
  var current = sel.value;
  sel.innerHTML = '<option value="this-month">Bu Ay</option><option value="overdue">Gecikmiş</option><option value="month-1">' + monthNameTR(1) + '</option><option value="month-2">' + monthNameTR(2) + '</option><option value="month-3">' + monthNameTR(3) + '</option><option value="upcoming">Yaklaşan (tümü)</option><option value="all">Tümü</option>';
  for (var i = 0; i < sel.options.length; i++) {
    if (sel.options[i].value === current) { sel.value = current; break; }
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
  var list = document.getElementById('name-picker-list');
  var empty = document.getElementById('name-picker-empty');
  list.innerHTML = '';
  var seen = {};
  var names = [];
  for (var i = debts.length - 1; i >= 0; i--) {
    var name = (debts[i].name || '').trim();
    if (name && !seen[name.toLowerCase()]) { seen[name.toLowerCase()] = true; names.push(name); }
  }
  if (names.length === 0) empty.classList.remove('hidden');
  else {
    empty.classList.add('hidden');
    names.forEach(function(n) {
      var btn = document.createElement('button');
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
  var modal = document.getElementById('modal-debt');
  var title = document.getElementById('debt-modal-title');
  var form = document.getElementById('form-debt');
  form.reset();
  document.getElementById('debt-id').value = '';
  document.getElementById('debt-installments').value = 1;
  document.getElementById('installment-fields').classList.add('hidden');
  document.getElementById('installment-preview').classList.add('hidden');
  document.getElementById('debt-recurring').checked = false;
  if (editId) {
    var debt = debts.find(function(d) { return d.id === editId; });
    if (!debt) return;
    title.textContent = 'Borcu Düzenle';
    document.getElementById('debt-id').value = debt.id;
    document.getElementById('debt-name').value = debt.name;
    document.getElementById('debt-total').value = debt.totalAmount;
    document.getElementById('debt-due').value = debt.startDate;
    document.getElementById('debt-installments').value = debt.installmentCount;
    document.getElementById('debt-recurring').checked = debt.installmentCount > 1 || !!debt.recurring;
    if (debt.installmentCount > 1 || debt.recurring) {
      document.getElementById('installment-fields').classList.remove('hidden');
      updateInstallmentPreview();
    }
  } else {
    title.textContent = 'Yeni Borç Ekle';
    var d = new Date(); d.setDate(d.getDate() + 7);
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
  var total = parseFloat(document.getElementById('debt-total').value) || 0;
  var count = parseInt(document.getElementById('debt-installments').value) || 1;
  var preview = document.getElementById('installment-preview');
  var info = document.getElementById('installment-info');
  if (count > 1 && total > 0) {
    var each = Math.round((total / count) * 100) / 100;
    info.textContent = count + ' taksit × ' + formatMoney(each) + ' = ' + formatMoney(total);
    preview.classList.remove('hidden');
  } else preview.classList.add('hidden');
}
function saveDebt(e) {
  e.preventDefault();
  var id = document.getElementById('debt-id').value || uid();
  var name = document.getElementById('debt-name').value.trim();
  var totalAmount = parseFloat(document.getElementById('debt-total').value);
  var startDate = document.getElementById('debt-due').value;
  var isRecurring = document.getElementById('debt-recurring').checked;
  var installmentCount = 1;
  if (isRecurring) {
    installmentCount = parseInt(document.getElementById('debt-installments').value) || 1;
    if (installmentCount < 1) installmentCount = 1;
  }
  if (!name || !totalAmount || !startDate) { showToast('Lütfen zorunlu alanları doldurun'); return; }
  var installmentAmount = Math.round((totalAmount / installmentCount) * 100) / 100;
  var existingIdx = debts.findIndex(function(d) { return d.id === id; });
  var paidInstallments = 0;
  if (existingIdx >= 0) {
    var old = debts[existingIdx];
    if (old.startDate === startDate && old.installmentCount === installmentCount) paidInstallments = old.paidInstallments || 0;
  }
  var debtObj = {
    id: id, name: name, category: '', totalAmount: totalAmount, installmentCount: installmentCount,
    installmentAmount: installmentAmount, startDate: startDate, note: '', recurring: isRecurring,
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
  var debt = debts.find(function(d) { return d.id === debtId; });
  if (!debt) return;
  debt.paidInstallments = (debt.paidInstallments || 0) + 1;
  if (debt.paidInstallments >= debt.installmentCount) {
    if (debt.recurring) {
      debt.startDate = addMonths(debt.startDate, debt.installmentCount);
      debt.paidInstallments = 0;
      showToast('Taksit ödendi (tekrar eden borç yenilendi)');
    } else showToast('Borç tamamen ödendi');
  } else showToast('Taksit ödendi (' + debt.paidInstallments + '/' + debt.installmentCount + ')');
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
  var name = document.getElementById('income-name').value.trim();
  var amount = parseFloat(document.getElementById('income-amount').value);
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
  var data = { debts: debts, incomes: incomes, exportedAt: new Date().toISOString() };
  var json = JSON.stringify(data, null, 2);
  if (navigator.share) {
    var blob = new Blob([json], { type: 'application/json' });
    var file = new File([blob], 'borc-takip-' + todayStr() + '.json', { type: 'application/json' });
    navigator.share({ title: 'Borç Takip Yedek', files: [file] }).then(function() {
      showToast('Paylaşım açıldı'); closeSettings();
    }).catch(function() { fallbackExport(json); });
    return;
  }
  fallbackExport(json);
}
function fallbackExport(json) {
  try {
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'borc-takip-' + todayStr() + '.json'; a.style.display = 'none';
    document.body.appendChild(a); a.click();
    setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
    showToast('Dosya indirildi');
  } catch (e) {
    if (navigator.clipboard) navigator.clipboard.writeText(json).then(function() { showToast('JSON panoya kopyalandı'); });
    else showToast('Dışa aktarma desteklenmiyor');
  }
  closeSettings();
}
function importData(e) {
  var file = e.target.files[0]; if (!file) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    try {
      var data = JSON.parse(ev.target.result);
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

function isModalOpen(id) {
  var el = document.getElementById(id);
  return el && !el.classList.contains('hidden');
}
function handleBackButton() {
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
  document.getElementById('debt-filter').addEventListener('change', renderDebts);
  document.getElementById('debt-total').addEventListener('input', updateInstallmentPreview);
  document.getElementById('debt-installments').addEventListener('input', updateInstallmentPreview);
  document.getElementById('debt-recurring').addEventListener('change', function(e) {
    var fields = document.getElementById('installment-fields');
    if (e.target.checked) {
      fields.classList.remove('hidden');
      if (parseInt(document.getElementById('debt-installments').value) < 2) document.getElementById('debt-installments').value = 2;
      updateInstallmentPreview();
    } else {
      fields.classList.add('hidden');
      document.getElementById('debt-installments').value = 1;
    }
  });
  var pickBtn = document.getElementById('btn-pick-name');
  if (pickBtn) pickBtn.addEventListener('click', openNamePicker);
});
