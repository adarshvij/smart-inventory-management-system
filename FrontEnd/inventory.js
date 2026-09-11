const LOW_STOCK_THRESHOLD = 10;
const THEME_KEY = 'sims_theme';
const API_BASE = 'http://localhost:5000/api';

let editingProductId = null;
let paletteCommands = [];
let products = [];
let movements = [];
let currentPage = 1;
const itemsPerPage = 10;
let selectedItems = new Set();

// ─── API Helpers ───────────────────────────────────────────────────────────────

async function loadProducts() {
  products = await window.api.get('/products');
  return products;
}

async function loadMovements() {
  movements = await window.api.get('/movements?limit=300');
  return movements;
}

// ─── Session ───────────────────────────────────────────────────────────────────

function ensureSession() {
  if (!window.api.isAuthenticated()) {
    window.location.href = 'login.html';
    return null;
  }

  const user = window.api.getUser();
  if (!user || !user.fullName) {
    window.location.href = 'login.html';
    return null;
  }

  const userNameEl = document.getElementById('userName');
  const businessNameEl = document.getElementById('businessName');
  if (userNameEl) userNameEl.textContent = user.fullName;
  if (businessNameEl) businessNameEl.textContent = user.businessName || 'Business Account';
  if (window.renderRoleBadge) window.renderRoleBadge();

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
  applyTheme(nextTheme);
  updateThemeButtonLabel();
  window.toast.show(`Switched to ${nextTheme} mode.`, 'info');
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

function renderTable() {
  const tbody = document.getElementById('productsTbody');
  const emptyState = document.getElementById('emptyState');
  const searchInput = document.getElementById('searchInput');
  const categoryFilter = document.getElementById('categoryFilter');
  const sortFilter = document.getElementById('sortFilter');
  
  if (!tbody || !emptyState) return;

  const query = (searchInput?.value || '').trim().toLowerCase();
  const category = categoryFilter?.value || 'ALL';
  const sort = sortFilter?.value || 'newest';

  let filtered = products.filter((item) => {
    if (category !== 'ALL' && item.category !== category) return false;
    if (query) {
      return `${item.name} ${item.category} ${item.sku}`.toLowerCase().includes(query);
    }
    return true;
  });

  if (sort === 'name_asc') filtered.sort((a, b) => a.name.localeCompare(b.name));
  else if (sort === 'stock_asc') filtered.sort((a, b) => Number(a.quantity || 0) - Number(b.quantity || 0));
  else if (sort === 'stock_desc') filtered.sort((a, b) => Number(b.quantity || 0) - Number(a.quantity || 0));
  else filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // newest first

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  if (currentPage > totalPages) currentPage = totalPages;

  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const paginated = filtered.slice(startIdx, endIdx);

  const selectAllCheckbox = document.getElementById('selectAllCheckbox');
  if (selectAllCheckbox) {
    selectAllCheckbox.checked = paginated.length > 0 && paginated.every(p => selectedItems.has(p._id || p.id));
  }

  if (paginated.length === 0) {
    tbody.innerHTML = '';
    emptyState.classList.remove('hidden');
    document.getElementById('showingCount').textContent = '0';
    document.getElementById('prevPageBtn').disabled = true;
    document.getElementById('nextPageBtn').disabled = true;
    return;
  }

  emptyState.classList.add('hidden');
  document.getElementById('showingCount').textContent = `${startIdx + 1}-${Math.min(endIdx, totalItems)} of ${totalItems}`;
  document.getElementById('prevPageBtn').disabled = currentPage === 1;
  document.getElementById('nextPageBtn').disabled = currentPage === totalPages;

  tbody.innerHTML = paginated
    .map((item) => {
      const id = item._id || item.id;
      const quantity = Number(item.quantity || 0);
      const reorderLevel = Number(item.reorderLevel || 0);
      const price = Number(item.unitPrice || 0);
      const totalValue = quantity * price;

      return `
        <tr class="border-b border-slate-100 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50 last:border-0 ${selectedItems.has(id) ? 'bg-sky-50/50 dark:bg-sky-900/10' : ''}">
          <td class="px-3 py-3 align-top">
            <input type="checkbox" data-action="select" data-id="${id}" class="rounded border-slate-300 dark:border-slate-600 dark:bg-slate-800" ${selectedItems.has(id) ? 'checked' : ''} ${window.api.canDelete() ? '' : 'disabled'}>
          </td>
          <td class="px-3 py-3 align-top">
            <div class="flex items-center gap-3">
              ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.name}" class="h-10 w-10 rounded-lg object-cover bg-slate-100 dark:bg-slate-800" onerror="this.outerHTML='<div class=\\'grid h-10 w-10 place-items-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400\\'><svg class=\\'h-5 w-5\\' fill=\\'none\\' viewBox=\\'0 0 24 24\\' stroke=\\'currentColor\\'><path stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\' stroke-width=\\'2\\' d=\\'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z\\' /></svg></div>'" />` : `<div class="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300 font-bold">${item.name.charAt(0).toUpperCase()}</div>`}
              <div>
                <p class="font-semibold text-slate-900 dark:text-slate-100">${item.name}</p>
                <p class="text-xs text-slate-500 dark:text-slate-400">${item.category} | SKU ${item.sku}</p>
              </div>
            </div>
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
            ${window.api.canEdit() ? `
            <div class="inline-flex items-center gap-1">
              <button data-action="adjust" data-id="${id}" data-delta="-1" class="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">-1</button>
              <button data-action="adjust" data-id="${id}" data-delta="1" class="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">+1</button>
              <button data-action="adjust" data-id="${id}" data-delta="10" class="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">+10</button>
              <input data-delta-input-id="${id}" type="number" class="w-16 rounded-lg border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" placeholder="qty" />
              <button data-action="apply-delta" data-id="${id}" class="rounded-lg bg-sky-600 px-2 py-1 text-xs font-semibold text-white hover:bg-sky-500">Apply</button>
            </div>
            ` : '-'}
          </td>
          <td class="px-3 py-3 text-right align-top">
            <div class="inline-flex gap-2">
              ${window.api.canEdit() ? `<button data-action="edit" data-id="${id}" class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:shadow dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">Edit</button>` : ''}
              ${window.api.canDelete() ? `<button data-action="delete" data-id="${id}" class="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100">Delete</button>` : ''}
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

function updateCategoryFilter() {
  const categoryFilter = document.getElementById('categoryFilter');
  if (!categoryFilter) return;
  const currentVal = categoryFilter.value;
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))].sort();
  
  categoryFilter.innerHTML = '<option value="ALL">All Categories</option>' + 
    categories.map(c => `<option value="${c}">${c}</option>`).join('');
    
  if (categories.includes(currentVal)) {
    categoryFilter.value = currentVal;
  }
}

function updateBulkActionBtn() {
  const btn = document.getElementById('bulkActionBtn');
  if (!btn) return;
  if (selectedItems.size > 0) {
    btn.classList.remove('hidden');
    btn.textContent = `Bulk Actions (${selectedItems.size})`;
  } else {
    btn.classList.add('hidden');
  }
}

async function refreshUI() {
  try {
    await Promise.all([loadProducts(), loadMovements()]);
  } catch (err) {
    if (err.message !== 'Session expired') window.toast.show('Error refreshing data.', 'error');
  }
  updateCategoryFilter();
  renderStats(products);
  renderTable();
  renderMovementHistory();
  updateBulkActionBtn();
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
  document.getElementById('imageUrl').value = product.imageUrl || '';

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
    unitPrice: Number(document.getElementById('unitPrice')?.value || 0),
    imageUrl: document.getElementById('imageUrl')?.value.trim() || ''
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
    if (editingProductId) {
      await window.api.put(`/products/${editingProductId}`, payload);
    } else {
      await window.api.post('/products', payload);
    }

    window.toast.show(editingProductId ? 'Product updated successfully.' : 'Product added successfully.', 'success');
    resetForm();
    await refreshUI();
  } catch (err) {
    if (err.message !== 'Session expired') {
      showAlert(err.message || 'Server error. Please try again.', 'error');
    }
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = editingProductId ? 'Update Product' : 'Add Product'; }
  }
}

// ─── Table Actions ─────────────────────────────────────────────────────────────

async function handleTableActions(event) {
  const checkbox = event.target.closest('input[type="checkbox"][data-action="select"]');
  if (checkbox) {
    const id = checkbox.getAttribute('data-id');
    if (checkbox.checked) selectedItems.add(id);
    else selectedItems.delete(id);
    updateBulkActionBtn();
    
    // Highlight row
    const tr = checkbox.closest('tr');
    if (tr) {
      if (checkbox.checked) tr.classList.add('bg-sky-50/50', 'dark:bg-sky-900/10');
      else tr.classList.remove('bg-sky-50/50', 'dark:bg-sky-900/10');
    }
    
    // Check/uncheck selectAll if appropriate
    const paginatedIds = Array.from(document.querySelectorAll('input[type="checkbox"][data-action="select"]')).map(cb => cb.getAttribute('data-id'));
    const allSelected = paginatedIds.length > 0 && paginatedIds.every(id => selectedItems.has(id));
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    if (selectAllCheckbox) selectAllCheckbox.checked = allSelected;
    return;
  }

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
    const confirmed = await window.modal.confirm({
      title: 'Delete Product',
      message: `Are you sure you want to delete "${target.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      type: 'danger'
    });
    if (!confirmed) return;

    try {
      await window.api.delete(`/products/${id}`);
      if (editingProductId === id) resetForm();
      window.toast.show('Product deleted successfully.', 'success');
      await refreshUI();
    } catch (err) {
      if (err.message !== 'Session expired') window.toast.show(err.message || 'Server error. Could not delete.', 'error');
    }
    return;
  }

  if (action === 'adjust') {
    const delta = Number(button.getAttribute('data-delta') || 0);
    if (delta === 0) return;

    try {
      const data = await window.api.patch(`/products/${id}/adjust`, { delta });
      if (data.actualDelta !== 0) {
        window.toast.show(`${target.name} stock updated by ${data.actualDelta > 0 ? '+' : ''}${data.actualDelta}.`, 'info');
      }
      await refreshUI();
    } catch (err) {
      if (err.message !== 'Session expired') window.toast.show(err.message || 'Server error.', 'error');
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
      const data = await window.api.patch(`/products/${id}/adjust`, { delta });
      if (data.actualDelta !== 0) {
        window.toast.show(`${target.name} stock updated by ${data.actualDelta > 0 ? '+' : ''}${data.actualDelta}.`, 'success');
      }
      if (input) input.value = '';
      await refreshUI();
    } catch (err) {
      if (err.message !== 'Session expired') window.toast.show(err.message || 'Server error.', 'error');
    }
  }
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

function handleBulkActions() {
  if (selectedItems.size === 0) return;
  const action = window.prompt('Bulk Action on ' + selectedItems.size + ' items.\\nType "DELETE" to delete them all.');
  if (action === 'DELETE') {
    Promise.all(Array.from(selectedItems).map(id => window.api.delete(`/products/${id}`)))
      .then(() => {
        window.toast.show(`${selectedItems.size} products deleted.`, 'success');
        selectedItems.clear();
        refreshUI();
      })
      .catch(err => {
        if (err.message !== 'Session expired') window.toast.show('Error deleting some products.', 'error');
      });
  }
}

function wireActions() {
  const form = document.getElementById('productForm');
  const tbody = document.getElementById('productsTbody');
  const searchInput = document.getElementById('searchInput');
  const categoryFilter = document.getElementById('categoryFilter');
  const sortFilter = document.getElementById('sortFilter');
  const prevPageBtn = document.getElementById('prevPageBtn');
  const nextPageBtn = document.getElementById('nextPageBtn');
  const selectAllCheckbox = document.getElementById('selectAllCheckbox');
  const bulkActionBtn = document.getElementById('bulkActionBtn');
  
  const cancelEditBtn = document.getElementById('cancelEditBtn');
  const imageUpload = document.getElementById('imageUpload');
  const logoutBtn = document.getElementById('logoutBtn');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');
  const themeToggleBtn = document.getElementById('themeToggleBtn');

  if (form) form.addEventListener('submit', saveProduct);
  if (tbody) tbody.addEventListener('click', handleTableActions);
  
  if (searchInput) searchInput.addEventListener('input', () => { currentPage = 1; renderTable(); });
  if (categoryFilter) categoryFilter.addEventListener('change', () => { currentPage = 1; renderTable(); });
  if (sortFilter) sortFilter.addEventListener('change', () => { currentPage = 1; renderTable(); });
  if (prevPageBtn) prevPageBtn.addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderTable(); }});
  if (nextPageBtn) nextPageBtn.addEventListener('click', () => { currentPage++; renderTable(); });
  
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      const checkboxes = document.querySelectorAll('input[type="checkbox"][data-action="select"]');
      checkboxes.forEach(cb => {
        cb.checked = isChecked;
        const id = cb.getAttribute('data-id');
        if (isChecked) selectedItems.add(id);
        else selectedItems.delete(id);
        
        const tr = cb.closest('tr');
        if (tr) {
          if (isChecked) tr.classList.add('bg-sky-50/50', 'dark:bg-sky-900/10');
          else tr.classList.remove('bg-sky-50/50', 'dark:bg-sky-900/10');
        }
      });
      updateBulkActionBtn();
    });
  }

  if (bulkActionBtn) bulkActionBtn.addEventListener('click', handleBulkActions);
  
  if (cancelEditBtn) cancelEditBtn.addEventListener('click', () => { clearAlert(); resetForm(); });
  
  if (imageUpload) {
    imageUpload.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) { // 2MB limit for base64
        window.toast.show('Image must be under 2MB.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (evt) => {
        const imageUrlInput = document.getElementById('imageUrl');
        if (imageUrlInput) imageUrlInput.value = evt.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  if (themeToggleBtn) themeToggleBtn.addEventListener('click', toggleTheme);

  if (sidebarToggle) sidebarToggle.addEventListener('click', () => toggleSidebar());
  if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', () => toggleSidebar(false));

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      window.api.clearAuth();
      window.location.href = 'login.html';
    });
  }

  // Enforce RBAC
  if (!window.api.canEdit()) {
    const addProductBtn = document.getElementById('addProductBtn');
    if (addProductBtn) addProductBtn.style.display = 'none';
  }
  if (!window.api.canDelete()) {
    const bulkActionBtn = document.getElementById('bulkActionBtn');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    if (bulkActionBtn) bulkActionBtn.style.display = 'none';
    if (selectAllCheckbox) selectAllCheckbox.disabled = true;
  }

  document.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 't' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const target = event.target;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) return;
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
