#!/usr/bin/env python3
from pathlib import Path
import sys

p = Path(sys.argv[1] if len(sys.argv) > 1 else "www/app.js")
c = p.read_text(encoding="utf-8")
if "function removeSavedName(" in c:
    print("names already patched")
    raise SystemExit(0)

old_picker = """function openNamePicker() {
  const list = document.getElementById('name-picker-list');
  const empty = document.getElementById('name-picker-empty');
  list.innerHTML = '';
  const names = [];
  const seen = {};
  debts.forEach(function(d) {
    if (d.name && !seen[d.name]) { seen[d.name] = true; names.push(d.name); }
  });
  if (names.length === 0) empty.classList.remove('hidden');
  else {
    empty.classList.add('hidden');
    names.sort().forEach(function(n) {
      const el = document.createElement('button');
      el.className = 'w-full text-left p-3 rounded-xl bg-gray-50 hover:bg-blue-50 font-medium text-gray-900';
      el.textContent = n;
      el.onclick = function() { document.getElementById('debt-name').value = n; closeNamePicker(); };
      list.appendChild(el);
    });
  }
  document.getElementById('modal-name-picker').classList.remove('hidden');
}
function closeNamePicker() { document.getElementById('modal-name-picker').classList.add('hidden'); }"""

new_picker = """const STORAGE_HIDDEN_NAMES = 'borc_takip_hidden_names';
let hiddenNames = [];
function loadHiddenNames() {
  try { hiddenNames = JSON.parse(localStorage.getItem(STORAGE_HIDDEN_NAMES) || '[]'); }
  catch (e) { hiddenNames = []; }
  if (!Array.isArray(hiddenNames)) hiddenNames = [];
}
function saveHiddenNames() {
  localStorage.setItem(STORAGE_HIDDEN_NAMES, JSON.stringify(hiddenNames));
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
function closeNamePicker() { document.getElementById('modal-name-picker').classList.add('hidden'); }"""

if old_picker not in c:
    raise SystemExit("name picker block missing")
c = c.replace(old_picker, new_picker, 1)

old_load_end = """    if (!i.startMonth) {
      i.startMonth = (i.createdAt && String(i.createdAt).substring(0, 7)) || '2020-01';
    }
  });
}
function saveDebts()"""
new_load_end = """    if (!i.startMonth) {
      i.startMonth = (i.createdAt && String(i.createdAt).substring(0, 7)) || '2020-01';
    }
  });
  loadHiddenNames();
}
function saveDebts()"""
if old_load_end in c:
    c = c.replace(old_load_end, new_load_end, 1)
else:
    print("warn: loadHiddenNames hook skipped")

old_save = """  saveDebts();
  closeDebtModal();
  showToast(editingDebtId ? 'Borç güncellendi' : 'Borç eklendi');"""
new_save = """  saveDebts();
  if (hiddenNames.indexOf(name) >= 0) {
    hiddenNames = hiddenNames.filter(function(x) { return x !== name; });
    saveHiddenNames();
  }
  closeDebtModal();
  showToast(editingDebtId ? 'Borç güncellendi' : 'Borç eklendi');"""
if old_save not in c:
    raise SystemExit("saveDebt hook missing")
c = c.replace(old_save, new_save, 1)

p.write_text(c, encoding="utf-8")
print("patched names", p, p.stat().st_size)
