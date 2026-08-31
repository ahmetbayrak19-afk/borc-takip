#!/usr/bin/env python3
from pathlib import Path
import sys

p = Path(sys.argv[1] if len(sys.argv) > 1 else "www/index.html")
c = p.read_text(encoding="utf-8")
if 'id="income-type-recurring"' in c:
    print("html already patched")
    raise SystemExit(0)

old = """        <div>
          <label class="block text-sm font-medium text-gray-600 mb-1.5">Gelir Adı</label>
          <input type="text" id="income-name" required placeholder="Örn: Maaş..." class="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium text-gray-600 mb-1.5">Aylık Tutar</label>
"""
new = """        <div>
          <label class="block text-sm font-medium text-gray-600 mb-1.5">Gelir Adı</label>
          <input type="text" id="income-name" required placeholder="Örn: Maaş..." class="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-600 mb-1.5">Gelir türü</label>
          <div class="grid grid-cols-2 gap-2">
            <button type="button" id="income-type-recurring" onclick="setIncomeType('recurring')" class="py-3 px-2 rounded-xl border-2 border-blue-500 bg-blue-50 text-blue-700 text-sm font-semibold">Düzenli</button>
            <button type="button" id="income-type-once" onclick="setIncomeType('once')" class="py-3 px-2 rounded-xl border-2 border-gray-200 bg-white text-gray-600 text-sm font-medium">Tek seferlik</button>
          </div>
          <p id="income-type-hint" class="text-xs text-gray-500 mt-2">Maaş, kira gibi. Girdiğin aydan itibaren her aya yansır.</p>
        </div>
        <div id="income-date-wrap" class="hidden">
          <label class="block text-sm font-medium text-gray-600 mb-1.5">Tarih</label>
          <input type="date" id="income-date" class="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none" />
          <p class="text-xs text-gray-500 mt-1.5">Sadece seçtiğin ayın gelirine ve üstteki toplama eklenir.</p>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label id="income-amount-label" class="block text-sm font-medium text-gray-600 mb-1.5">Aylık Tutar</label>
"""
if old not in c:
    raise SystemExit("income form block missing")
p.write_text(c.replace(old, new, 1), encoding="utf-8")
print("patched html", p)
