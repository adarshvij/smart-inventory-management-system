const THEME_KEY = 'sims_theme';

let products = [];
let movements = [];

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
  window.toast.show(`Switched to ${nextTheme} mode.`, 'info');
}

// ─── Data fetching ─────────────────────────────────────────────────────────────

async function loadData() {
  try {
    const [prods, movs] = await Promise.all([
      window.api.get('/products'),
      window.api.get('/movements?limit=1000') // fetch large chunk for reports
    ]);
    products = prods;
    movements = movs;
  } catch (err) {
    if (err.message !== 'Session expired') window.toast.show('Failed to load data for reports.', 'error');
  }
}

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
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(date);
}

// ─── Reporting Logic ───────────────────────────────────────────────────────────

function generateCSV(headers, rows, filename) {
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => '"' + String(cell).replace(/"/g, '""') + '"').join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function handleGenerateReport(e) {
  e.preventDefault();
  const type = document.getElementById('reportType').value;
  const format = document.getElementById('reportFormat').value;
  
  const thead = document.getElementById('previewThead');
  const tbody = document.getElementById('previewTbody');
  
  const printHeader = document.getElementById('printHeader');
  const printSubtitle = document.getElementById('printSubtitle');
  const printDate = document.getElementById('printDate');
  
  const dateFrom = document.getElementById('dateFrom').value;
  const dateTo = document.getElementById('dateTo').value;

  const now = new Date().toLocaleString();
  printDate.textContent = now;

  let headers = [];
  let rows = [];
  let htmlHeaders = '';
  let htmlRows = '';

  if (type === 'inventory') {
    printHeader.querySelector('h1').textContent = 'Inventory Status Report';
    printSubtitle.innerHTML = `Generated on <strong>${now}</strong>`;
    
    headers = ['Product Name', 'SKU', 'Category', 'Quantity', 'Unit Price', 'Total Value'];
    htmlHeaders = `
      <tr class="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
        <th class="px-3 py-3">Product Name</th>
        <th class="px-3 py-3">SKU</th>
        <th class="px-3 py-3">Category</th>
        <th class="px-3 py-3">Quantity</th>
        <th class="px-3 py-3">Unit Price</th>
        <th class="px-3 py-3">Total Value</th>
      </tr>
    `;
    
    rows = products.map(p => [
      p.name, p.sku, p.category, p.quantity, p.unitPrice, p.quantity * p.unitPrice
    ]);
    
    htmlRows = products.map(p => `
      <tr class="border-b border-slate-100 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50 last:border-0">
        <td class="px-3 py-3 font-medium text-slate-900 dark:text-slate-100">${p.name}</td>
        <td class="px-3 py-3 text-slate-500">${p.sku}</td>
        <td class="px-3 py-3">${p.category}</td>
        <td class="px-3 py-3 font-semibold ${p.quantity === 0 ? 'text-red-600' : p.quantity < 10 ? 'text-amber-600' : 'text-emerald-600'}">${p.quantity}</td>
        <td class="px-3 py-3">${formatCurrency(p.unitPrice)}</td>
        <td class="px-3 py-3 font-bold text-slate-900 dark:text-slate-100">${formatCurrency(p.quantity * p.unitPrice)}</td>
      </tr>
    `).join('');
    
    if (products.length === 0) {
      htmlRows = '<tr><td colspan="6" class="px-4 py-8 text-center text-slate-500">No inventory found.</td></tr>';
    }

  } else if (type === 'transactions') {
    printHeader.querySelector('h1').textContent = 'Transaction History Report';
    let subtitleStr = `Generated on <strong>${now}</strong>`;
    if (dateFrom || dateTo) {
      subtitleStr += `<br>Date Range: <strong>${dateFrom || 'Start'}</strong> to <strong>${dateTo || 'End'}</strong>`;
    }
    printSubtitle.innerHTML = subtitleStr;
    
    headers = ['Date', 'Product', 'SKU', 'Type', 'Quantity', 'Previous Qty', 'New Qty', 'Note'];
    htmlHeaders = `
      <tr class="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
        <th class="px-3 py-3">Date</th>
        <th class="px-3 py-3">Product</th>
        <th class="px-3 py-3">SKU</th>
        <th class="px-3 py-3">Type</th>
        <th class="px-3 py-3">Change</th>
        <th class="px-3 py-3">Note</th>
      </tr>
    `;
    
    let filteredMovs = [...movements];
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      filteredMovs = filteredMovs.filter(m => new Date(m.createdAt) >= fromDate);
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      filteredMovs = filteredMovs.filter(m => new Date(m.createdAt) <= toDate);
    }

    rows = filteredMovs.map(m => [
      formatDateTime(m.createdAt), m.productName, m.sku, m.type, m.delta, m.previousQty, m.newQty, m.note
    ]);
    
    htmlRows = filteredMovs.map(m => {
      const isIn = Number(m.delta || 0) > 0;
      const typeClass = isIn ? 'text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full text-xs font-bold' : 'text-red-700 bg-red-100 px-2 py-1 rounded-full text-xs font-bold';
      return `
      <tr class="border-b border-slate-100 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50 last:border-0">
        <td class="px-3 py-3 text-sm whitespace-nowrap">${formatDateTime(m.createdAt)}</td>
        <td class="px-3 py-3 font-medium text-slate-900 dark:text-slate-100">${m.productName}</td>
        <td class="px-3 py-3 text-slate-500">${m.sku}</td>
        <td class="px-3 py-3"><span class="${typeClass}">${m.type}</span></td>
        <td class="px-3 py-3 font-semibold ${isIn ? 'text-emerald-600' : 'text-red-600'}">${isIn ? '+' : ''}${m.delta}</td>
        <td class="px-3 py-3 text-sm text-slate-500">${m.note || '-'}</td>
      </tr>
      `;
    }).join('');
    
    if (filteredMovs.length === 0) {
      htmlRows = '<tr><td colspan="6" class="px-4 py-8 text-center text-slate-500">No transactions found for the selected range.</td></tr>';
    }
  }

  thead.innerHTML = htmlHeaders;
  tbody.innerHTML = htmlRows;

  if (format === 'csv') {
    generateCSV(headers, rows, 'sims_' + type + '_report_' + Date.now() + '.csv');
    window.toast.show('CSV Report generated and downloaded.', 'success');
  } else if (format === 'pdf') {
    // Show the print header temporarily
    printHeader.classList.remove('hidden');
    window.print();
    printHeader.classList.add('hidden');
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

  const nameEl = document.getElementById('userName');
  const businessEl = document.getElementById('businessName');
  if (nameEl) nameEl.textContent = user.fullName;
  if (businessEl) businessEl.textContent = user.businessName;
  if (window.renderRoleBadge) window.renderRoleBadge();

  return user;
}

// ─── Init ──────────────────────────────────────────────────────────────────────

function wireActions() {
  const reportType = document.getElementById('reportType');
  const dateRangeWrapper = document.getElementById('dateRangeWrapper');
  const reportForm = document.getElementById('reportForm');
  
  if (reportType && dateRangeWrapper) {
    reportType.addEventListener('change', (e) => {
      if (e.target.value === 'transactions') {
        dateRangeWrapper.classList.remove('hidden');
      } else {
        dateRangeWrapper.classList.add('hidden');
      }
    });
  }
  
  if (reportForm) {
    reportForm.addEventListener('submit', handleGenerateReport);
  }

  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');
  const logoutBtn = document.getElementById('logoutBtn');

  if (themeToggleBtn) themeToggleBtn.addEventListener('click', toggleTheme);
  if (sidebarToggle) sidebarToggle.addEventListener('click', () => toggleSidebar());
  if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', () => toggleSidebar(false));

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      window.api.clearAuth();
      window.location.href = 'login.html';
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 't' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const target = event.target;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) return;
      toggleTheme();
    }
  });
}

async function init() {
  const session = ensureSession();
  if (!session) return;

  applyTheme(localStorage.getItem(THEME_KEY));
  wireActions();
  updateThemeButtonLabel();

  await loadData();
  
  window.addEventListener('storage', (event) => {
    if (event.key === THEME_KEY) {
      applyTheme(event.newValue);
      updateThemeButtonLabel();
    }
  });
}

init();
