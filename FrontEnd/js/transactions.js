const THEME_KEY = 'sims_theme';

let movements = [];
let products = [];
let currentPage = 1;
const itemsPerPage = 15;

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

// ─── Format Helpers ────────────────────────────────────────────────────────────

function formatDateTime(isoDate) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date);
}

// ─── Data & Rendering ──────────────────────────────────────────────────────────

async function loadProducts() {
  try {
    products = await window.api.get('/products');
  } catch (err) {
    if (err.message !== 'Session expired') window.toast.show('Failed to load products.', 'error');
  }
}

async function loadMovements() {
  try {
    movements = await window.api.get('/movements?limit=1000'); // Load a larger set for client-side pagination
  } catch (err) {
    if (err.message !== 'Session expired') window.toast.show('Failed to load transactions.', 'error');
  }
}

function renderStats(filteredMovements) {
  const total = filteredMovements.length;
  
  const now = new Date();
  const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
  
  let stockIn30d = 0;
  let stockOut30d = 0;
  let adjustments = 0;

  for (const mov of movements) {
    const d = new Date(mov.createdAt);
    if (d >= thirtyDaysAgo) {
      if (mov.type === 'IN') stockIn30d += mov.delta;
      if (mov.type === 'OUT') stockOut30d += Math.abs(mov.delta);
    }
    // "Adjustment" logic could be inferred if note contains "adjustment" or type is ADJ, but let's count all movements as adjustments if they aren't standard IN/OUT. Actually, the backend records IN and OUT based on positive/negative delta. Let's just count total distinct adjustments.
    adjustments++;
  }

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = String(val); };
  set('totalTransactions', total);
  set('totalStockIn', stockIn30d);
  set('totalStockOut', stockOut30d);
  set('totalAdjustments', adjustments);
}

function renderTable() {
  const filterType = document.getElementById('filterType')?.value || 'ALL';
  const query = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
  
  const filtered = movements.filter(mov => {
    if (filterType !== 'ALL' && mov.type !== filterType) return false;
    if (query) {
      const matchName = (mov.productName || '').toLowerCase().includes(query);
      const matchSku = (mov.sku || '').toLowerCase().includes(query);
      const matchNote = (mov.note || '').toLowerCase().includes(query);
      return matchName || matchSku || matchNote;
    }
    return true;
  });

  renderStats(filtered);

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  if (currentPage > totalPages) currentPage = totalPages;

  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const paginated = filtered.slice(startIdx, endIdx);

  const tbody = document.getElementById('movementTbody');
  const emptyState = document.getElementById('movementEmptyState');
  if (!tbody || !emptyState) return;

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
    .map((entry) => {
      const isIn = Number(entry.delta || 0) > 0;
      const typeClass = isIn ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700';
      const deltaLabel = `${isIn ? '+' : ''}${entry.delta}`;

      return \`
        <tr class="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
          <td class="whitespace-nowrap px-6 py-4 text-sm text-slate-500 dark:text-slate-400">\${formatDateTime(entry.createdAt)}</td>
          <td class="px-6 py-4">
            <div class="flex flex-col">
              <span class="font-semibold text-slate-900 dark:text-white">\${entry.productName || 'Unknown Product'}</span>
              <span class="text-xs text-slate-500 dark:text-slate-400">SKU: \${entry.sku || 'N/A'}</span>
            </div>
          </td>
          <td class="whitespace-nowrap px-6 py-4">
            <span class="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset \${isIn ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20' : 'bg-red-50 text-red-700 ring-red-600/10 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20'}">\${entry.type || 'OUT'}</span>
          </td>
          <td class="whitespace-nowrap px-6 py-4 text-right text-sm font-semibold \${isIn ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}">\${deltaLabel}</td>
          <td class="whitespace-nowrap px-6 py-4 text-right text-sm text-slate-600 dark:text-slate-300">
            <span class="text-slate-400 dark:text-slate-500">\${entry.previousQty} &rarr; </span>\${entry.newQty}
          </td>
          <td class="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 max-w-[200px] truncate" title="\${entry.note || ''}">\${entry.note || '<span class="text-slate-300 dark:text-slate-600">-</span>'}</td>
        </tr>
      \`;
    })
    .join('');
}

// ─── New Transaction Modal ───────────────────────────────────────────────────

function openTransactionModal(mode = 'ADJUST') {
  const modal = document.getElementById('transactionModal');
  const modalContent = document.getElementById('modalContentPanel');
  const modalBackdrop = document.getElementById('modalBackdrop');
  const form = document.getElementById('transactionForm');
  const select = document.getElementById('transProduct');
  const transType = document.getElementById('transType');
  const modalTitle = document.getElementById('modalTitle');
  const transNote = document.getElementById('transNote');
  
  if (!modal || !select || !form) return;

  form.reset();
  
  select.innerHTML = '<option value="">Select a product...</option>' + 
    products.map(p => `<option value="${p._id || p.id}">${p.name} (SKU: ${p.sku}) - In Stock: ${p.quantity}</option>`).join('');

  if (mode === 'SALE') {
    if (modalTitle) modalTitle.textContent = 'Record a Sale';
    if (transType) {
      transType.value = 'OUT';
      transType.disabled = true; // Lock to stock out for sale
    }
    if (transNote) transNote.value = 'Product Sale';
  } else {
    if (modalTitle) modalTitle.textContent = 'Record Transaction';
    if (transType) transType.disabled = false;
    if (transNote) transNote.value = '';
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
  
  if (modalBackdrop) {
    modalBackdrop.classList.remove('opacity-0');
    modalBackdrop.classList.add('opacity-100');
  }

  // Small delay to allow CSS transition
  setTimeout(() => {
    if (modalContent) {
      modalContent.classList.remove('scale-95', 'opacity-0');
      modalContent.classList.add('scale-100', 'opacity-100');
    }
  }, 10);
}

function closeTransactionModal() {
  const modal = document.getElementById('transactionModal');
  const modalContent = document.getElementById('modalContentPanel');
  const modalBackdrop = document.getElementById('modalBackdrop');
  
  if (!modal) return;

  if (modalContent) {
    modalContent.classList.remove('scale-100', 'opacity-100');
    modalContent.classList.add('scale-95', 'opacity-0');
  }
  
  if (modalBackdrop) {
    modalBackdrop.classList.remove('opacity-100');
    modalBackdrop.classList.add('opacity-0');
  }
  
  setTimeout(() => {
    modal.classList.remove('flex');
    modal.classList.add('hidden');
  }, 200);
}

async function handleTransactionSubmit(e) {
  e.preventDefault();
  
  const productId = document.getElementById('transProduct').value;
  const transTypeEl = document.getElementById('transType');
  const type = transTypeEl.disabled ? transTypeEl.value : transTypeEl.value;
  let qty = Number(document.getElementById('transQty').value);
  const note = document.getElementById('transNote').value.trim();
  
  if (!productId || !qty || qty <= 0) {
    window.toast.show('Please fill all required fields correctly.', 'error');
    return;
  }
  
  if (type === 'OUT') {
    qty = -qty;
  }
  
  const submitBtn = document.getElementById('saveTransBtn');
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Saving...'; }
  
  try {
    await window.api.patch(`/products/${productId}/adjust`, { delta: qty, note: note || (type === 'IN' ? 'Stock In' : 'Stock Out') });
    window.toast.show('Transaction recorded successfully.', 'success');
    closeTransactionModal();
    await loadMovements();
    renderTable();
  } catch (err) {
    if (err.message !== 'Session expired') {
      window.toast.show(err.message || 'Server error. Failed to record transaction.', 'error');
    }
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Record'; }
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

function wireActions() {
  const searchInput = document.getElementById('searchInput');
  const filterType = document.getElementById('filterType');
  const prevPageBtn = document.getElementById('prevPageBtn');
  const nextPageBtn = document.getElementById('nextPageBtn');
  
  const newSaleBtn = document.getElementById('newSaleBtn');
  const newTransactionBtn = document.getElementById('newTransactionBtn');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const cancelModalBtn = document.getElementById('cancelModalBtn');
  const transactionForm = document.getElementById('transactionForm');
  
  const logoutBtn = document.getElementById('logoutBtn');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');
  const themeToggleBtn = document.getElementById('themeToggleBtn');

  if (searchInput) searchInput.addEventListener('input', () => { currentPage = 1; renderTable(); });
  if (filterType) filterType.addEventListener('change', () => { currentPage = 1; renderTable(); });
  
  if (prevPageBtn) prevPageBtn.addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderTable(); }});
  if (nextPageBtn) nextPageBtn.addEventListener('click', () => { currentPage++; renderTable(); });

  if (newSaleBtn) newSaleBtn.addEventListener('click', () => openTransactionModal('SALE'));
  if (newTransactionBtn) newTransactionBtn.addEventListener('click', () => openTransactionModal('ADJUST'));
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeTransactionModal);
  if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeTransactionModal);
  if (transactionForm) transactionForm.addEventListener('submit', handleTransactionSubmit);

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
    if (newSaleBtn) newSaleBtn.style.display = 'none';
    if (newTransactionBtn) newTransactionBtn.style.display = 'none';
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeTransactionModal();
      return;
    }
    if (event.key.toLowerCase() === 't' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const target = event.target;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) return;
      toggleTheme();
    }
  });
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

// ─── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  const session = ensureSession();
  if (!session) return;

  applyTheme(localStorage.getItem(THEME_KEY));
  wireActions();
  updateThemeButtonLabel();

  await Promise.all([loadProducts(), loadMovements()]);
  renderTable();

  window.addEventListener('storage', (event) => {
    if (event.key === THEME_KEY) {
      applyTheme(event.newValue);
      updateThemeButtonLabel();
    }
  });
}

init();
