const LOW_STOCK_THRESHOLD = 10;
const THEME_KEY = 'sims_theme';
const API_BASE = 'http://localhost:5000/api';

let editingProductId = null;
let paletteCommands = [];
let products = [];
let movements = [];

// ─── API Helpers ───────────────────────────────────────────────────────────────

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...getAuthHeaders(), ...(options.headers || {}) }
  });

  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
    throw new Error('Unauthorized');
  }

  return res;
}

async function loadProducts() {
  const res = await apiFetch('/products');
  if (!res.ok) throw new Error('Failed to load products');
  products = await res.json();
  return products;
}

async function loadMovements() {
  const res = await apiFetch('/movements?limit=300');
  if (!res.ok) throw new Error('Failed to load movements');
  movements = await res.json();
  return movements;
}

// ─── Session ───────────────────────────────────────────────────────────────────

function ensureSession() {
  const token = localStorage.getItem('token');
  const rawUser = localStorage.getItem('user');

  if (!token || !rawUser || rawUser === 'undefined' || rawUser === 'null') {
    window.location.href = 'login.html';
    return null;
  }

  let user;
  try {
    user = JSON.parse(rawUser);
  } catch {
    window.location.href = 'login.html';
    return null;
  }

  if (!user || typeof user.fullName !== 'string' || user.fullName.trim() === '') {
    window.location.href = 'login.html';
    return null;
  }

  const userNameEl = document.getElementById('userName');
  const businessNameEl = document.getElementById('businessName');
  if (userNameEl) userNameEl.textContent = user.fullName;
  if (businessNameEl) businessNameEl.textContent = user.businessName || 'Business Account';

  return user;
}

// ─── Theme ─────────────────────────────────────────────────────────────────────

function isDarkMode() {
  return document.documentElement.classList.contains('dark');
}

function applyTheme(theme) {
  const root = document.documentElement;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const shouldUseDark = theme === 'dark' || (!theme && prefersDark);
  root.classList.remove('dark');
  if (shouldUseDark) root.classList.add('dark');
  document.body.style.colorScheme = shouldUseDark ? 'dark' : 'light';
}

function updateThemeButtonLabel() {
  const btn = document.getElementById('themeToggleBtn');
  const icon = document.getElementById('themeIcon');
  const label = document.getElementById('themeLabel');
  if (!btn || !icon || !label) return;

  const dark = isDarkMode();
  label.textContent = dark ? 'Light Mode' : 'Dark Mode';
  btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
  btn.setAttribute('title', dark ? 'Switch to light mode' : 'Switch to dark mode');

  icon.innerHTML = dark
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-4 w-4"><circle cx="12" cy="12" r="4"></circle><path stroke-linecap="round" d="M12 2v2.5M12 19.5V22M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M2 12h2.5M19.5 12H22M4.93 19.07l1.77-1.77M17.3 6.7l1.77-1.77"></path></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3c0 .25-.01.5-.01.75A9 9 0 0 0 21 12.79Z"></path></svg>';
}

function toggleTheme() {
  const nextTheme = isDarkMode() ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, nextTheme);
  applyTheme(nextTheme);
  updateThemeButtonLabel();
  showToast(`Switched to ${nextTheme} mode.`, 'info');
}

// ─── Toast ─────────────────────────────────────────────────────────────────────

function ensureToastContainer() {
  let container = document.getElementById('toastContainer');
  if (container) return container;
  container = document.createElement('div');
  container.id = 'toastContainer';
  container.className = 'fixed right-4 top-4 z-[90] flex w-[22rem] max-w-[calc(100vw-2rem)] flex-col gap-2';
  document.body.appendChild(container);
  return container;
}

function showToast(message, type = 'info') {
  const container = ensureToastContainer();
  const toneMap = {
    info: 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-700 dark:bg-sky-500/10 dark:text-sky-200',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200',
    error: 'border-red-200 bg-red-50 text-red-800 dark:border-red-700 dark:bg-red-500/10 dark:text-red-200'
  };
  const toast = document.createElement('div');
  toast.className = `rounded-xl border px-4 py-3 text-sm font-medium shadow-lg backdrop-blur ${toneMap[type] || toneMap.info}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('opacity-0', 'transition', 'duration-300');
    setTimeout(() => toast.remove(), 300);
  }, 2400);
}

// ─── Alert ─────────────────────────────────────────────────────────────────────

function showAlert(message, type = 'info') {
  const alertBox = document.getElementById('alertBox');
  if (!alertBox) return;
  const styleMap = {
    info: 'border-sky-200 bg-sky-50 text-sky-700',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    error: 'border-red-200 bg-red-50 text-red-700'
  };
  alertBox.className = `mt-4 rounded-xl border px-4 py-3 text-sm ${styleMap[type] || styleMap.info}`;
  alertBox.textContent = message;
  alertBox.classList.remove('hidden');
}

function clearAlert() {
  const alertBox = document.getElementById('alertBox');
  if (!alertBox) return;
  alertBox.classList.add('hidden');
  alertBox.textContent = '';
}

// ─── Format Helpers ────────────────────────────────────────────────────────────

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(value);
}

function formatDateTime(isoDate) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function getStatusBadge(quantity) {
  if (quantity === 0) return '<span class="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">Out</span>';
  if (quantity < LOW_STOCK_THRESHOLD) return '<span class="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">Low</span>';
  return '<span class="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">Healthy</span>';
}

// ─── Stats Render ──────────────────────────────────────────────────────────────

function renderStats(prods) {
  const totalProducts = prods.length;
  const totalUnits = prods.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const lowStockCount = prods.filter((item) => { const qty = Number(item.quantity || 0); return qty > 0 && qty < LOW_STOCK_THRESHOLD; }).length;
  const outStockCount = prods.filter((item) => Number(item.quantity || 0) === 0).length;
  const criticalStockCount = lowStockCount + outStockCount;
  const inventoryValue = prods.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0);

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = String(val); };
  set('totalProducts', totalProducts);
  set('totalUnits', totalUnits);
  set('lowStockCount', criticalStockCount);
  set('outStockCount', outStockCount);
  set('sidebarLowCount', criticalStockCount);
  set('sidebarOutCount', outStockCount);
  const invEl = document.getElementById('inventoryValue');
  if (invEl) invEl.textContent = formatCurrency(inventoryValue);
}

// ─── Table Render ──────────────────────────────────────────────────────────────

function renderTable(prods, query = '') {
  const tbody = document.getElementById('productsTbody');
  const emptyState = document.getElementById('emptyState');
  if (!tbody || !emptyState) return;

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery
    ? prods.filter((item) => `${item.name} ${item.category} ${item.sku}`.toLowerCase().includes(normalizedQuery))
    : prods;

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  tbody.innerHTML = filtered
    .map((item) => {
      const id = item._id || item.id;
      const quantity = Number(item.quantity || 0);
      const reorderLevel = Number(item.reorderLevel || 0);
      const price = Number(item.unitPrice || 0);
      const totalValue = quantity * price;

      return `
        <tr class="border-b border-slate-100 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50 last:border-0">
          <td class="px-3 py-3 align-top">
            <p class="font-semibold text-slate-900 dark:text-slate-100">${item.name}</p>
            <p class="text-xs text-slate-500 dark:text-slate-400">${item.category} | SKU ${item.sku}</p>
          </td>
          <td class="px-3 py-3 align-top">
            <p class="font-semibold text-slate-900 dark:text-slate-100">${quantity}</p>
            <p class="text-xs text-slate-500 dark:text-slate-400">Low below ${LOW_STOCK_THRESHOLD} | Reorder ${reorderLevel}</p>
          </td>
          <td class="px-3 py-3 align-top">
            <p class="font-semibold text-slate-900 dark:text-slate-100">${formatCurrency(price)}</p>
            <p class="text-xs text-slate-500 dark:text-slate-400">Value ${formatCurrency(totalValue)}</p>
          </td>
          <td class="px-3 py-3 align-top">${getStatusBadge(quantity)}</td>
          <td class="px-3 py-3 align-top text-right">
            <div class="inline-flex items-center gap-1">
              <button data-action="adjust" data-id="${id}" data-delta="-1" class="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">-1</button>
              <button data-action="adjust" data-id="${id}" data-delta="1" class="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">+1</button>
              <button data-action="adjust" data-id="${id}" data-delta="10" class="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">+10</button>
              <input data-delta-input-id="${id}" type="number" class="w-16 rounded-lg border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" placeholder="qty" />
              <button data-action="apply-delta" data-id="${id}" class="rounded-lg bg-sky-600 px-2 py-1 text-xs font-semibold text-white hover:bg-sky-500">Apply</button>
            </div>
          </td>
          <td class="px-3 py-3 text-right align-top">
            <div class="inline-flex gap-2">
              <button data-action="edit" data-id="${id}" class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:shadow dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">Edit</button>
              <button data-action="delete" data-id="${id}" class="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100">Delete</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');
}

// ─── Movement History Render ───────────────────────────────────────────────────

function renderMovementHistory() {
  const tbody = document.getElementById('movementTbody');
  const emptyState = document.getElementById('movementEmptyState');
  if (!tbody || !emptyState) return;

  const recent = [...movements].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 30);

  if (recent.length === 0) {
    tbody.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  tbody.innerHTML = recent
    .map((entry) => {
      const isIn = Number(entry.delta || 0) > 0;
      const typeClass = isIn ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700';
      const deltaLabel = `${isIn ? '+' : ''}${entry.delta}`;

      return `
        <tr class="border-b border-slate-100 dark:border-slate-800 last:border-0">
          <td class="px-3 py-3 align-top text-xs text-slate-600 dark:text-slate-400">${formatDateTime(entry.createdAt)}</td>
          <td class="px-3 py-3 align-top">
            <p class="font-semibold text-slate-900 dark:text-slate-100">${entry.productName || 'Unknown Product'}</p>
            <p class="text-xs text-slate-500 dark:text-slate-400">SKU ${entry.sku || 'N/A'}</p>
          </td>
          <td class="px-3 py-3 align-top">
            <span class="rounded-full px-2 py-1 text-xs font-semibold ${typeClass}">${entry.type || 'OUT'}</span>
          </td>
          <td class="px-3 py-3 align-top font-semibold ${isIn ? 'text-emerald-700' : 'text-red-700'}">${deltaLabel}</td>
          <td class="px-3 py-3 align-top text-xs text-slate-600 dark:text-slate-400">${entry.previousQty} → ${entry.newQty}</td>
          <td class="px-3 py-3 align-top text-xs text-slate-600 dark:text-slate-400">${entry.note || '-'}</td>
        </tr>
      `;
    })
    .join('');
}

// ─── Refresh UI ────────────────────────────────────────────────────────────────

async function refreshUI() {
  try {
    await Promise.all([loadProducts(), loadMovements()]);
  } catch (err) {
    showToast('Error refreshing data.', 'error');
  }
  const searchInput = document.getElementById('searchInput');
  renderStats(products);
  renderTable(products, searchInput?.value || '');
  renderMovementHistory();
}

// ─── Form ──────────────────────────────────────────────────────────────────────

function resetForm() {
  editingProductId = null;
  const form = document.getElementById('productForm');
  const formTitle = document.getElementById('formTitle');
  const submitBtn = document.getElementById('submitBtn');
  const cancelEditBtn = document.getElementById('cancelEditBtn');

  if (form) form.reset();
  if (formTitle) formTitle.textContent = 'Add Product';
  if (submitBtn) { submitBtn.textContent = 'Add Product'; submitBtn.disabled = false; }
  if (cancelEditBtn) cancelEditBtn.classList.add('hidden');
}

function fillFormForEdit(product) {
  editingProductId = product._id || product.id;

  document.getElementById('name').value = product.name;
  document.getElementById('category').value = product.category;
  document.getElementById('sku').value = product.sku;
  document.getElementById('quantity').value = String(product.quantity);
  document.getElementById('reorderLevel').value = String(product.reorderLevel);
  document.getElementById('unitPrice').value = String(product.unitPrice);

  const formTitle = document.getElementById('formTitle');
  const submitBtn = document.getElementById('submitBtn');
  const cancelEditBtn = document.getElementById('cancelEditBtn');

  if (formTitle) formTitle.textContent = 'Edit Product';
  if (submitBtn) submitBtn.textContent = 'Update Product';
  if (cancelEditBtn) cancelEditBtn.classList.remove('hidden');
}

function getFormPayload() {
  const quantity = Number.parseInt(document.getElementById('quantity')?.value || '0', 10);
  const reorderLevel = Number.parseInt(document.getElementById('reorderLevel')?.value || '0', 10);

  return {
    name: document.getElementById('name')?.value.trim() || '',
    category: document.getElementById('category')?.value.trim() || '',
    sku: (document.getElementById('sku')?.value.trim() || '').toUpperCase(),
    quantity: Number.isNaN(quantity) ? -1 : quantity,
    reorderLevel: Number.isNaN(reorderLevel) ? -1 : reorderLevel,
    unitPrice: Number(document.getElementById('unitPrice')?.value || 0)
  };
}

function validatePayload(payload) {
  if (!payload.name || !payload.category || !payload.sku) return 'Product name, category, and SKU are required.';
  if (payload.quantity < 0 || payload.reorderLevel < 0 || payload.unitPrice < 0) return 'Quantity, reorder level, and unit price cannot be negative.';
  if (!Number.isInteger(payload.quantity) || !Number.isInteger(payload.reorderLevel)) return 'Quantity and reorder level must be whole numbers.';
  return null;
}

async function saveProduct(event) {
  event.preventDefault();
  clearAlert();

  const payload = getFormPayload();
  const validationError = validatePayload(payload);

  if (validationError) {
    showAlert(validationError, 'error');
    return;
  }

  const submitBtn = document.getElementById('submitBtn');
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Saving...'; }

  try {
    let res;
    if (editingProductId) {
      res = await apiFetch(`/products/${editingProductId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
    } else {
      res = await apiFetch('/products', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }

    const data = await res.json();

    if (!res.ok) {
      showAlert(data.message || 'Failed to save product.', 'error');
      return;
    }

    showToast(editingProductId ? 'Product updated successfully.' : 'Product added successfully.', 'success');
    resetForm();
    await refreshUI();
  } catch (err) {
    if (err.message !== 'Unauthorized') {
      showAlert('Server error. Please try again.', 'error');
    }
  } finally {
    if (submitBtn) { submitBtn.disabled = false; }
  }
}

// ─── Table Actions ─────────────────────────────────────────────────────────────

async function handleTableActions(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const action = button.getAttribute('data-action');
  const id = button.getAttribute('data-id');
  if (!action || !id) return;

  const target = products.find((item) => (item._id || item.id) === id);
  if (!target) return;

  if (action === 'edit') {
    clearAlert();
    fillFormForEdit(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  if (action === 'delete') {
    if (!window.confirm(`Delete "${target.name}"?`)) return;

    try {
      const res = await apiFetch(`/products/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        showToast(data.message || 'Failed to delete product.', 'error');
        return;
      }
      if (editingProductId === id) resetForm();
      showToast('Product deleted successfully.', 'success');
      await refreshUI();
    } catch (err) {
      if (err.message !== 'Unauthorized') showToast('Server error. Could not delete.', 'error');
    }
    return;
  }

  if (action === 'adjust') {
    const delta = Number(button.getAttribute('data-delta') || 0);
    if (delta === 0) return;

    try {
      const res = await apiFetch(`/products/${id}/adjust`, {
        method: 'PATCH',
        body: JSON.stringify({ delta })
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.message || 'Adjustment failed.', 'error'); return; }
      if (data.actualDelta !== 0) {
        showToast(`${target.name} stock updated by ${data.actualDelta > 0 ? '+' : ''}${data.actualDelta}.`, 'info');
      }
      await refreshUI();
    } catch (err) {
      if (err.message !== 'Unauthorized') showToast('Server error.', 'error');
    }
    return;
  }

  if (action === 'apply-delta') {
    const input = document.querySelector(`[data-delta-input-id="${id}"]`);
    const delta = Math.trunc(Number(input?.value || 0));

    if (!delta) {
      showAlert('Enter a stock delta to apply.', 'error');
      return;
    }

    try {
      const res = await apiFetch(`/products/${id}/adjust`, {
        method: 'PATCH',
        body: JSON.stringify({ delta })
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.message || 'Adjustment failed.', 'error'); return; }
      if (data.actualDelta !== 0) {
        showToast(`${target.name} stock updated by ${data.actualDelta > 0 ? '+' : ''}${data.actualDelta}.`, 'success');
      }
      if (input) input.value = '';
      await refreshUI();
    } catch (err) {
      if (err.message !== 'Unauthorized') showToast('Server error.', 'error');
    }
  }
}

// ─── Demo / Clear ──────────────────────────────────────────────────────────────

async function loadDemoProducts() {
  const demoProducts = [
    { name: 'Premium Ball Pen Box', category: 'Stationery', sku: 'ST-001', quantity: 18, reorderLevel: 25, unitPrice: 5.5 },
    { name: 'A4 Copier Paper', category: 'Office Supplies', sku: 'OS-024', quantity: 120, reorderLevel: 60, unitPrice: 4.75 },
    { name: 'Wireless Barcode Scanner', category: 'Hardware', sku: 'HW-208', quantity: 4, reorderLevel: 8, unitPrice: 32 },
    { name: 'Thermal Label Roll', category: 'Packaging', sku: 'PK-077', quantity: 0, reorderLevel: 15, unitPrice: 2.2 },
    { name: 'Packing Tape 2-inch', category: 'Packaging', sku: 'PK-101', quantity: 12, reorderLevel: 12, unitPrice: 1.95 }
  ];

  showToast('Loading demo products...', 'info');

  let added = 0;
  for (const demo of demoProducts) {
    try {
      const res = await apiFetch('/products', { method: 'POST', body: JSON.stringify(demo) });
      if (res.ok) added++;
    } catch (err) {
      // Skip on auth error
      if (err.message === 'Unauthorized') return;
    }
  }

  showToast(`${added} demo product(s) loaded.`, 'success');
  resetForm();
  await refreshUI();
}

async function clearAllProducts() {
  if (!window.confirm('Clear all products from inventory? This cannot be undone.')) return;

  try {
    await loadProducts();
    for (const product of products) {
      const id = product._id || product.id;
      await apiFetch(`/products/${id}`, { method: 'DELETE' });
    }
    products = [];
    movements = [];
    resetForm();
    renderStats([]);
    renderTable([], '');
    renderMovementHistory();
    showToast('All products cleared.', 'success');
  } catch (err) {
    if (err.message !== 'Unauthorized') showToast('Failed to clear products.', 'error');
  }
}

// ─── Command Palette ───────────────────────────────────────────────────────────

function getInventoryCommands() {
  return [
    { label: 'Add New Product (focus form)', action: () => document.getElementById('name')?.focus() },
    { label: 'Load Demo Products', action: () => loadDemoProducts() },
    { label: 'Clear All Products', action: () => clearAllProducts() },
    { label: 'Open Dashboard', action: () => { window.location.href = 'dashboard.html'; } },
    { label: 'Toggle Theme', action: () => toggleTheme() },
    { label: 'Focus Search', action: () => document.getElementById('searchInput')?.focus() }
  ];
}

function renderCommandPalette(filterText = '') {
  const list = document.getElementById('commandPaletteList');
  if (!list) return;

  const query = filterText.trim().toLowerCase();
  paletteCommands = getInventoryCommands().filter((cmd) => cmd.label.toLowerCase().includes(query));

  if (paletteCommands.length === 0) {
    list.innerHTML = '<p class="rounded-xl px-3 py-2 text-sm text-slate-500 dark:text-slate-400">No matching commands.</p>';
    return;
  }

  list.innerHTML = paletteCommands
    .map((cmd, index) => `<button data-cmd-index="${index}" class="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">${cmd.label}</button>`)
    .join('');
}

function openCommandPalette() {
  const modal = document.getElementById('commandPaletteModal');
  const input = document.getElementById('commandPaletteInput');
  if (!modal || !input) return;
  modal.classList.remove('hidden');
  renderCommandPalette('');
  input.value = '';
  setTimeout(() => input.focus(), 0);
}

function closeCommandPalette() {
  const modal = document.getElementById('commandPaletteModal');
  if (!modal) return;
  modal.classList.add('hidden');
}

// ─── Sidebar ───────────────────────────────────────────────────────────────────

function toggleSidebar(forceOpen) {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (!sidebar || !backdrop) return;

  const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : sidebar.classList.contains('-translate-x-full');
  sidebar.classList.toggle('-translate-x-full', !shouldOpen);
  backdrop.classList.toggle('hidden', !shouldOpen);
}

// ─── Wire Actions ──────────────────────────────────────────────────────────────

function wireActions() {
  const form = document.getElementById('productForm');
  const tbody = document.getElementById('productsTbody');
  const searchInput = document.getElementById('searchInput');
  const cancelEditBtn = document.getElementById('cancelEditBtn');
  const loadDemoBtn = document.getElementById('loadDemoBtn');
  const clearProductsBtn = document.getElementById('clearProductsBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const commandPaletteBtn = document.getElementById('commandPaletteBtn');
  const commandPaletteClose = document.getElementById('commandPaletteClose');
  const commandPaletteInput = document.getElementById('commandPaletteInput');
  const commandPaletteList = document.getElementById('commandPaletteList');
  const commandPaletteModal = document.getElementById('commandPaletteModal');

  if (form) form.addEventListener('submit', saveProduct);
  if (tbody) tbody.addEventListener('click', handleTableActions);
  if (searchInput) searchInput.addEventListener('input', () => renderTable(products, searchInput.value));
  if (cancelEditBtn) cancelEditBtn.addEventListener('click', () => { clearAlert(); resetForm(); });
  if (loadDemoBtn) loadDemoBtn.addEventListener('click', loadDemoProducts);
  if (clearProductsBtn) clearProductsBtn.addEventListener('click', clearAllProducts);
  if (themeToggleBtn) themeToggleBtn.addEventListener('click', toggleTheme);
  if (commandPaletteBtn) commandPaletteBtn.addEventListener('click', openCommandPalette);
  if (commandPaletteClose) commandPaletteClose.addEventListener('click', closeCommandPalette);

  if (commandPaletteInput) {
    commandPaletteInput.addEventListener('input', () => renderCommandPalette(commandPaletteInput.value));
    commandPaletteInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && paletteCommands.length > 0) {
        event.preventDefault();
        const selected = paletteCommands[0];
        closeCommandPalette();
        selected.action();
      }
    });
  }

  if (commandPaletteList) {
    commandPaletteList.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-cmd-index]');
      if (!btn) return;
      const index = Number(btn.getAttribute('data-cmd-index'));
      const cmd = paletteCommands[index];
      if (!cmd) return;
      closeCommandPalette();
      cmd.action();
    });
  }

  if (commandPaletteModal) {
    commandPaletteModal.addEventListener('click', (event) => {
      if (event.target === commandPaletteModal) closeCommandPalette();
    });
  }

  if (sidebarToggle) sidebarToggle.addEventListener('click', () => toggleSidebar());
  if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', () => toggleSidebar(false));

  // BUG FIX: logout now removes token AND user (was only removing SESSION_KEY before)
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = 'login.html';
    });
  }

  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      openCommandPalette();
      return;
    }
    if (event.key === 'Escape') { closeCommandPalette(); return; }
    if (event.key.toLowerCase() === 't' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const target = event.target;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      toggleTheme();
    }
  });
}

// ─── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  const session = ensureSession();
  if (!session) return;

  applyTheme(localStorage.getItem(THEME_KEY));
  wireActions();
  updateThemeButtonLabel();
  resetForm();

  // Show loading state
  const emptyState = document.getElementById('emptyState');
  if (emptyState) {
    emptyState.classList.remove('hidden');
    emptyState.querySelector('p')?.setAttribute('data-original', emptyState.querySelector('p')?.textContent || '');
    const p = emptyState.querySelector('p');
    if (p) p.textContent = 'Loading inventory data...';
  }

  await refreshUI();

  if (emptyState) {
    const p = emptyState.querySelector('p');
    if (p && p.getAttribute('data-original')) p.textContent = p.getAttribute('data-original');
  }

  window.addEventListener('storage', (event) => {
    if (event.key === THEME_KEY) {
      applyTheme(event.newValue);
      updateThemeButtonLabel();
    }
  });
}

init();
