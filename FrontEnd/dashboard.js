const LOW_STOCK_THRESHOLD = 10;
const THEME_KEY = 'sims_theme';
const API_BASE = 'http://localhost:5000/api';

let stockMixChart = null;
let categoryValueChart = null;
let paletteCommands = [];
let products = [];

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

async function loadAdvisoryData(retries = 2) {
  const tbody = document.getElementById('aiForecastTableBody');
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="6" class="px-4 py-8 text-center">
      <div class="flex items-center justify-center gap-3">
        <div class="h-5 w-5 animate-spin rounded-full border-2 border-purple-300 border-t-purple-600"></div>
        <span class="text-purple-600 dark:text-purple-300 font-medium">Analyzing demand patterns...</span>
      </div>
    </td></tr>`;
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await apiFetch('/advisory');
      if (!res.ok) throw new Error('Failed to load advisory data');
      const data = await res.json();
      renderAdvisoryData(data);
      return;
    } catch (err) {
      console.error(`Advisory data error (attempt ${attempt + 1}):`, err);
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="px-4 py-8 text-center">
          <div class="text-red-500 dark:text-red-400 font-medium">⚠ Failed to load AI insights.</div>
          <p class="text-xs text-slate-500 mt-1">Ensure the Python AI service is running on port 5001 and the backend is connected.</p>
          <button onclick="loadAdvisoryData()" class="mt-3 rounded-lg bg-purple-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-purple-500 transition">Retry</button>
        </td></tr>`;
      }
    }
  }
}

function renderAdvisoryData(data) {
  const turnoverEl = document.getElementById('turnoverRate');
  if (turnoverEl) turnoverEl.textContent = data.turnoverRate;

  const tbody = document.getElementById('aiForecastTableBody');
  if (!tbody) return;

  if (!data.aiForecasts || data.aiForecasts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="px-4 py-8 text-center text-slate-500">No AI forecasts available yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = data.aiForecasts.map(forecast => {
    let statusClass = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300';
    if (forecast.alertStatus === 'CRITICAL') statusClass = 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300';
    else if (forecast.alertStatus === 'LOW') statusClass = 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300';

    return `
      <tr class="transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
        <td class="whitespace-nowrap px-4 py-3 font-medium text-slate-900 dark:text-slate-100">${forecast.name}</td>
        <td class="whitespace-nowrap px-4 py-3">${forecast.currentStock}</td>
        <td class="whitespace-nowrap px-4 py-3 font-semibold text-purple-700 dark:text-purple-300">${forecast.predictedDemand7Days}</td>
        <td class="whitespace-nowrap px-4 py-3 font-semibold text-indigo-700 dark:text-indigo-300">${forecast.recommendedReorderLevel}</td>
        <td class="whitespace-nowrap px-4 py-3">${forecast.suggestedRestockQty}</td>
        <td class="whitespace-nowrap px-4 py-3">
          <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClass}">
            ${forecast.alertStatus}
          </span>
        </td>
      </tr>
    `;
  }).join('');
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

  const nameEl = document.getElementById('userName');
  const businessEl = document.getElementById('businessName');
  if (nameEl) nameEl.textContent = user.fullName;
  if (businessEl) businessEl.textContent = user.businessName;

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
  renderDashboard();
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

// ─── Stats & Charts ────────────────────────────────────────────────────────────

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(value);
}

function calculateStats(prods) {
  const totalProducts = prods.length;
  const totalUnits = prods.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const inventoryValue = prods.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0);

  const outOfStock = prods.filter((item) => Number(item.quantity || 0) === 0);
  const lowStock = prods.filter((item) => { const q = Number(item.quantity || 0); return q > 0 && q < LOW_STOCK_THRESHOLD; });
  const healthy = prods.filter((item) => Number(item.quantity || 0) >= LOW_STOCK_THRESHOLD);

  return {
    totalProducts, totalUnits, inventoryValue, lowStock, outOfStock,
    healthyCount: healthy.length, lowCount: lowStock.length, outCount: outOfStock.length,
    criticalAlerts: [...outOfStock, ...lowStock]
  };
}

function percentage(value, total) {
  if (total === 0) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}

function renderLowStockList(criticalAlerts) {
  const container = document.getElementById('lowStockList');
  const badge = document.getElementById('alertBadge');
  if (!container || !badge) return;

  badge.textContent = `${criticalAlerts.length} alert${criticalAlerts.length === 1 ? '' : 's'}`;

  if (criticalAlerts.length === 0) {
    container.innerHTML = '<div class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-700/50 dark:bg-emerald-500/10">Great news. No low or out-of-stock items.</div>';
    return;
  }

  const sorted = [...criticalAlerts].sort((a, b) => Number(a.quantity || 0) - Number(b.quantity || 0));

  container.innerHTML = sorted
    .map((item) => {
      const quantity = Number(item.quantity || 0);
      const isOut = quantity === 0;
      const cardClass = isOut
        ? 'border-red-200 bg-red-50 dark:border-red-700/50 dark:bg-red-500/10'
        : 'border-amber-200 bg-amber-50 dark:border-amber-700/50 dark:bg-amber-500/10';
      const textClass = isOut ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300';
      const statusLabel = isOut ? 'OUT OF STOCK' : 'LOW STOCK';

      return `
        <div class="rounded-xl border ${cardClass} p-4">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="text-sm font-semibold text-slate-900 dark:text-slate-100">${item.name || 'Unnamed Product'}</p>
              <p class="text-xs text-slate-600 dark:text-slate-300">${item.category || 'General'} | SKU ${item.sku || 'N/A'}</p>
            </div>
            <div class="text-sm sm:text-right">
              <p class="font-semibold ${textClass}">${statusLabel} | Qty ${quantity}</p>
              <p class="text-xs ${textClass}">${isOut ? 'Restock immediately' : `Need at least ${Math.max(LOW_STOCK_THRESHOLD - quantity, 0)} units to be healthy`}</p>
            </div>
          </div>
        </div>
      `;
    })
    .join('');
}

function renderTopValue(prods) {
  const topValueList = document.getElementById('topValueList');
  if (!topValueList) return;

  if (prods.length === 0) {
    topValueList.innerHTML = '<p class="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">No products yet.</p>';
    return;
  }

  const topItems = [...prods]
    .map((item) => ({ ...item, totalValue: Number(item.quantity || 0) * Number(item.unitPrice || 0) }))
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 5);

  topValueList.innerHTML = topItems
    .map((item) => `
      <div class="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
        <div>
          <p class="text-sm font-semibold text-slate-900 dark:text-slate-100">${item.name}</p>
          <p class="text-xs text-slate-500 dark:text-slate-400">${item.category} | Qty ${item.quantity}</p>
        </div>
        <p class="text-sm font-semibold text-slate-900 dark:text-slate-100">${formatCurrency(item.totalValue)}</p>
      </div>
    `)
    .join('');
}

function destroyCharts() {
  if (stockMixChart) { stockMixChart.destroy(); stockMixChart = null; }
  if (categoryValueChart) { categoryValueChart.destroy(); categoryValueChart = null; }
}

function renderCharts(prods, stats) {
  if (typeof Chart === 'undefined') return;

  const stockMixCanvas = document.getElementById('stockMixChart');
  const categoryValueCanvas = document.getElementById('categoryValueChart');
  if (!stockMixCanvas || !categoryValueCanvas) return;

  destroyCharts();

  const labelColor = isDarkMode() ? '#cbd5e1' : '#475569';
  const gridColor = isDarkMode() ? 'rgba(148,163,184,0.18)' : 'rgba(100,116,139,0.18)';

  stockMixChart = new Chart(stockMixCanvas, {
    type: 'doughnut',
    data: {
      labels: ['Healthy', 'Low', 'Out'],
      datasets: [{ data: [stats.healthyCount, stats.lowCount, stats.outCount], backgroundColor: ['#10b981', '#f59e0b', '#ef4444'], borderWidth: 0 }]
    },
    options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { color: labelColor } } } }
  });

  const categoryMap = prods.reduce((acc, item) => {
    const key = item.category || 'General';
    const value = Number(item.quantity || 0) * Number(item.unitPrice || 0);
    acc[key] = (acc[key] || 0) + value;
    return acc;
  }, {});

  const topCategories = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]).slice(0, 6);

  categoryValueChart = new Chart(categoryValueCanvas, {
    type: 'bar',
    data: {
      labels: topCategories.map(([name]) => name),
      datasets: [{ label: 'Value (INR)', data: topCategories.map(([, value]) => value), backgroundColor: '#0284c7', borderRadius: 8, maxBarThickness: 40 }]
    },
    options: {
      responsive: true,
      scales: {
        x: { ticks: { color: labelColor }, grid: { color: gridColor } },
        y: { ticks: { color: labelColor, callback(value) { return formatCurrency(value); } }, grid: { color: gridColor } }
      },
      plugins: { legend: { display: false } }
    }
  });
}

function renderDashboard() {
  const stats = calculateStats(products);

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = String(val); };
  set('totalProducts', stats.totalProducts);
  set('totalUnits', stats.totalUnits);
  set('lowStockCount', stats.lowCount);
  set('outStockCount', stats.outCount);
  set('sidebarLowCount', stats.lowCount);
  set('sidebarOutCount', stats.outCount);

  const inventoryValueEl = document.getElementById('inventoryValue');
  if (inventoryValueEl) inventoryValueEl.textContent = formatCurrency(stats.inventoryValue);

  const total = stats.totalProducts;
  const set2 = (id, style) => { const el = document.getElementById(id); if (el) el.style.width = style; };
  set2('healthyBar', percentage(stats.healthyCount, total));
  set2('lowBar', percentage(stats.lowCount, total));
  set2('outBar', percentage(stats.outCount, total));
  set('healthyCount', stats.healthyCount);
  set('lowCount', stats.lowCount);
  set('outCount', stats.outCount);

  renderLowStockList(stats.criticalAlerts);
  renderTopValue(products);
  renderCharts(products, stats);
}

// ─── Demo / Clear / Restock ────────────────────────────────────────────────────

async function loadDemoData() {
  const demoProducts = [
    { name: 'Premium Ball Pen Box', category: 'Stationery', sku: 'ST-001', quantity: 18, reorderLevel: 25, unitPrice: 5.5 },
    { name: 'A4 Copier Paper', category: 'Office Supplies', sku: 'OS-024', quantity: 120, reorderLevel: 60, unitPrice: 4.75 },
    { name: 'Wireless Barcode Scanner', category: 'Hardware', sku: 'HW-208', quantity: 4, reorderLevel: 8, unitPrice: 32 },
    { name: 'Thermal Label Roll', category: 'Packaging', sku: 'PK-077', quantity: 0, reorderLevel: 15, unitPrice: 2.2 },
    { name: 'Packing Tape 2-inch', category: 'Packaging', sku: 'PK-101', quantity: 12, reorderLevel: 12, unitPrice: 1.95 }
  ];

  showToast('Loading demo data...', 'info');
  let added = 0;
  for (const demo of demoProducts) {
    try {
      const res = await apiFetch('/products', { method: 'POST', body: JSON.stringify(demo) });
      if (res.ok) added++;
    } catch (err) {
      if (err.message === 'Unauthorized') return;
    }
  }

  try { await loadProducts(); } catch {}
  renderDashboard();
  showToast(`${added} demo product(s) loaded.`, 'success');
}

async function clearProducts() {
  try {
    await loadProducts();
    for (const product of products) {
      const id = product._id || product.id;
      await apiFetch(`/products/${id}`, { method: 'DELETE' });
    }
    products = [];
    renderDashboard();
    showToast('All product data cleared.', 'info');
  } catch (err) {
    if (err.message !== 'Unauthorized') showToast('Failed to clear products.', 'error');
  }
}

async function restockAllLowItems() {
  try {
    const res = await apiFetch('/products/bulk-restock', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) { showToast(data.message || 'Restock failed.', 'error'); return; }
    await loadProducts();
    renderDashboard();
    showToast(data.message || 'Low/out items were auto-restocked.', 'success');
  } catch (err) {
    if (err.message !== 'Unauthorized') showToast('Server error during restock.', 'error');
  }
}

// ─── Command Palette ───────────────────────────────────────────────────────────

function getDashboardCommands() {
  return [
    { label: 'Open Inventory Manager', action: () => { window.location.href = 'inventory.html'; } },
    { label: 'Load Demo Data', action: () => loadDemoData() },
    { label: 'Clear Product Data', action: () => clearProducts() },
    { label: 'Auto Restock Low Items', action: () => restockAllLowItems() },
    { label: 'Toggle Theme', action: () => toggleTheme() },
    { label: 'Go to Landing Page', action: () => { window.location.href = 'index.html'; } }
  ];
}

function renderCommandPalette(filterText = '') {
  const list = document.getElementById('commandPaletteList');
  if (!list) return;

  const query = filterText.trim().toLowerCase();
  paletteCommands = getDashboardCommands().filter((cmd) => cmd.label.toLowerCase().includes(query));

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
  const loadDemoBtn = document.getElementById('loadDemoBtn');
  const clearDataBtn = document.getElementById('clearDataBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const restockAllLowBtn = document.getElementById('restockAllLowBtn');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const commandPaletteBtn = document.getElementById('commandPaletteBtn');
  const commandPaletteClose = document.getElementById('commandPaletteClose');
  const commandPaletteInput = document.getElementById('commandPaletteInput');
  const commandPaletteList = document.getElementById('commandPaletteList');
  const commandPaletteModal = document.getElementById('commandPaletteModal');

  if (loadDemoBtn) loadDemoBtn.addEventListener('click', loadDemoData);
  if (clearDataBtn) clearDataBtn.addEventListener('click', clearProducts);
  if (restockAllLowBtn) restockAllLowBtn.addEventListener('click', restockAllLowItems);
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

async function initDashboard() {
  const session = ensureSession();
  if (!session) return;

  applyTheme(localStorage.getItem(THEME_KEY));
  wireActions();
  updateThemeButtonLabel();

  // Show initial empty state while loading
  renderDashboard();

  try {
    await loadProducts();
    renderDashboard();
  } catch (err) {
    if (err.message !== 'Unauthorized') {
      showToast('Failed to load inventory data. Is the server running?', 'error');
    }
  }

  // Load AI Advisory data
  await loadAdvisoryData();

  // Auto-refresh every 30 seconds
  setInterval(async () => {
    try {
      await loadProducts();
      renderDashboard();
      await loadAdvisoryData();
    } catch {}
  }, 30000);

  window.addEventListener('storage', (event) => {
    if (event.key === THEME_KEY) {
      applyTheme(event.newValue);
      updateThemeButtonLabel();
      renderDashboard();
    }
  });

  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
      try {
        await loadProducts();
        renderDashboard();
        await loadAdvisoryData();
      } catch {}
    }
  });
}

initDashboard();
