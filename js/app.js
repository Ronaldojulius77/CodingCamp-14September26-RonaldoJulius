// js/app.js — Expense & Budget Visualizer application logic

// ─── 1. CONSTANTS & CONFIG ──────────────────────────────────────────────────

const STORAGE_KEYS = {
  transactions: 'ebv_transactions',
  categories:   'ebv_categories',
  theme:        'ebv_theme'
};

const BUILT_IN_CATEGORIES = ['Food', 'Transport', 'Fun'];

const VALIDATION = {
  NAME_MAX:          100,
  AMOUNT_MIN:        0.01,
  AMOUNT_MAX:        999999999.99,
  CATEGORY_NAME_MAX: 50
};

const CHART_COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6',
  '#ec4899', '#14b8a6', '#f97316', '#8b5cf6', '#84cc16',
  '#06b6d4', '#e11d48'
];

// ─── 2. STATE ────────────────────────────────────────────────────────────────

const state = {
  transactions:  [],      // Transaction[]
  categories:    [],      // string[] — built-ins + custom
  activeFilter:  null,    // { year: number, month: number } | null
  theme:         'light', // 'light' | 'dark'
  chartInstance: null     // Chart.js instance or null
};

// ─── 3. LOCAL STORAGE ────────────────────────────────────────────────────────

/**
 * Reads all persisted state from localStorage and populates the `state` object.
 * Wrapped in a single try/catch so any localStorage unavailability (e.g. private
 * browsing with storage blocked) is caught in one place.
 *
 * Individual value failures fall back to safe defaults:
 *   - ebv_transactions → [] if missing, unparsable, or not an array
 *   - ebv_categories   → [] if missing, unparsable, or not an array
 *   - ebv_theme        → 'light' if missing, unparsable, or not 'light'/'dark'
 *
 * If anything goes wrong a persistent warning toast is queued via setTimeout so
 * it fires after showToast is defined later in the file.
 *
 * Requirements: 5.3, 5.4, 7.5, 9.4
 */
function loadFromStorage() {
  let hadError = false;

  // ── transactions ──
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.transactions);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      state.transactions = Array.isArray(parsed) ? parsed : [];
      if (!Array.isArray(parsed)) hadError = true;
    } else {
      state.transactions = [];
    }
  } catch (_e) {
    state.transactions = [];
    hadError = true;
  }

  // ── categories (custom only; built-ins are merged later by initCategories) ──
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.categories);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      state.categories = Array.isArray(parsed) ? parsed : [];
      if (!Array.isArray(parsed)) hadError = true;
    } else {
      state.categories = [];
    }
  } catch (_e) {
    state.categories = [];
    hadError = true;
  }

  // ── theme ──
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.theme);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (parsed === 'light' || parsed === 'dark') {
        state.theme = parsed;
      } else {
        state.theme = 'light';
        hadError = true;
      }
    } else {
      state.theme = 'light';
    }
  } catch (_e) {
    state.theme = 'light';
    hadError = true;
  }

  // Queue a persistent warning toast if anything went wrong.
  // setTimeout(0) ensures showToast (defined later in the file) is available.
  if (hadError) {
    setTimeout(() => {
      if (typeof showToast === 'function') {
        showToast(
          'Some saved data could not be loaded. Your data may have been reset.',
          'warning',
          true // persistent — do not auto-dismiss
        );
      }
    }, 0);
  }
}

/**
 * Serializes `state.transactions` and writes it to localStorage.
 * Throws on failure so the caller (deleteTransaction, addTransaction) can roll back.
 *
 * Requirements: 5.1, 5.2
 */
function saveTransactions() {
  try {
    localStorage.setItem(
      STORAGE_KEYS.transactions,
      JSON.stringify(state.transactions)
    );
  } catch (e) {
    throw e; // propagate — caller is responsible for rollback and toast
  }
}

/**
 * Serializes `state.categories` (custom names only) and writes it to localStorage.
 * Throws on failure so the caller (addCategory) can handle rollback and show a toast.
 *
 * Requirements: 7.6
 */
function saveCategories() {
  try {
    // Only persist custom categories (exclude built-ins) so built-ins are always
    // injected fresh at startup and never depend on stored data.
    const customOnly = state.categories.filter(
      c => !BUILT_IN_CATEGORIES.map(b => b.toLowerCase()).includes(c.toLowerCase())
    );
    localStorage.setItem(
      STORAGE_KEYS.categories,
      JSON.stringify(customOnly)
    );
  } catch (e) {
    throw e; // propagate — caller is responsible for rollback and toast
  }
}

/**
 * Persists the current theme value to localStorage.
 * Silently ignores any failure — theme is still applied in memory.
 *
 * Requirements: 9.3
 */
function saveTheme() {
  try {
    localStorage.setItem(
      STORAGE_KEYS.theme,
      JSON.stringify(state.theme)
    );
  } catch (_e) {
    // Silent fail — theme is applied in memory; no rollback or toast needed.
  }
}

// ─── 4. VALIDATOR ────────────────────────────────────────────────────────────

/**
 * Validates a transaction form submission.
 *
 * Rules (from design Validation Rules table):
 *   name     — non-empty after trimming; length ≤ VALIDATION.NAME_MAX (100)
 *   amount   — parsable as a finite number; in range [VALIDATION.AMOUNT_MIN, VALIDATION.AMOUNT_MAX]
 *   category — not null/undefined/empty string
 *
 * @param {{ name: string, amount: string|number, category: string }} fields
 * @returns {{ valid: boolean, errors: { name?: string, amount?: string, category?: string } }}
 *
 * Requirements: 1.2, 1.3, 1.4, 1.5
 */
function validateTransaction({ name, amount, category }) {
  const errors = {};

  // ── name ──────────────────────────────────────────────────────────────────
  const trimmedName = (name ?? '').toString().trim();
  if (trimmedName.length === 0) {
    errors.name = 'Item name is required.';
  } else if (trimmedName.length > VALIDATION.NAME_MAX) {
    errors.name = `Item name cannot exceed ${VALIDATION.NAME_MAX} characters.`;
  }

  // ── amount ────────────────────────────────────────────────────────────────
  const parsedAmount = parseFloat(amount);
  if (amount === '' || amount === null || amount === undefined) {
    errors.amount = 'Amount is required.';
  } else if (!isFinite(parsedAmount) || isNaN(parsedAmount)) {
    errors.amount = 'Amount must be a valid number.';
  } else if (parsedAmount < VALIDATION.AMOUNT_MIN || parsedAmount > VALIDATION.AMOUNT_MAX) {
    errors.amount = `Amount must be between ${VALIDATION.AMOUNT_MIN} and ${VALIDATION.AMOUNT_MAX}.`;
  }

  // ── category ──────────────────────────────────────────────────────────────
  const trimmedCategory = (category ?? '').toString().trim();
  if (trimmedCategory.length === 0) {
    errors.category = 'Please select a category.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Validates a new custom category name.
 *
 * Rules:
 *   - Non-empty after trimming → error "Category name cannot be empty."
 *   - Length > VALIDATION.CATEGORY_NAME_MAX (50) → error "Category name cannot exceed 50 characters."
 *   - Case-insensitive duplicate in `existing` → error "Category already exists."
 *
 * @param {{ name: string, existing: string[] }} params
 * @returns {{ valid: boolean, error?: string }}
 *
 * Requirements: 7.2, 7.3
 */
function validateCategory({ name, existing }) {
  const trimmed = (name ?? '').toString().trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Category name cannot be empty.' };
  }

  if (trimmed.length > VALIDATION.CATEGORY_NAME_MAX) {
    return { valid: false, error: `Category name cannot exceed ${VALIDATION.CATEGORY_NAME_MAX} characters.` };
  }

  const lowerTrimmed = trimmed.toLowerCase();
  const isDuplicate = (existing ?? []).some(
    c => c.toLowerCase() === lowerTrimmed
  );
  if (isDuplicate) {
    return { valid: false, error: 'Category already exists.' };
  }

  return { valid: true };
}

// ─── 5. TRANSACTION OPERATIONS ───────────────────────────────────────────────

/**
 * Convenience helper — re-renders all UI regions that depend on transactions.
 * Called after any state mutation that affects the visible transaction set.
 */
function renderAll() {
  const visible = getVisibleTransactions();
  renderBalance(visible);
  renderTransactionList(visible);
  renderChart(visible);
  updateFilterRange();
}

/**
 * Creates a new transaction, persists it, and re-renders the UI.
 *
 * @param {string} name      - Item name (will be trimmed)
 * @param {string|number} amount   - Expense amount (will be parsed as a float)
 * @param {string} category  - Category name
 *
 * Requirements: 1.6, 5.1
 */
function addTransaction(name, amount, category) {
  const transaction = {
    id:        crypto.randomUUID(),
    name:      name.toString().trim(),
    amount:    parseFloat(amount),
    category,
    timestamp: new Date().toISOString()
  };

  state.transactions.push(transaction);
  saveTransactions();
  renderAll();
}

/**
 * Removes a transaction by ID using a backup/rollback pattern so state stays
 * consistent if the localStorage write fails.
 *
 * @param {string} id - The UUID of the transaction to remove
 *
 * Requirements: 2.4, 2.5, 5.2
 */
function deleteTransaction(id) {
  const backup = [...state.transactions];
  state.transactions = state.transactions.filter(t => t.id !== id);

  try {
    saveTransactions();
  } catch (_e) {
    state.transactions = backup; // rollback on storage failure
    showToast('Deletion failed. Please try again.', 'error');
    return;
  }

  renderAll();
}

// ─── 6. CATEGORY OPERATIONS ──────────────────────────────────────────────────

/**
 * Merges BUILT_IN_CATEGORIES with any custom categories loaded from localStorage,
 * deduplicating case-insensitively. Built-ins are always present regardless of
 * what was stored.
 *
 * Call order: after loadFromStorage() and before renderCategoryDropdown().
 *
 * Requirements: 6.1, 6.2, 6.3, 7.5
 */
function initCategories() {
  const merged = [...BUILT_IN_CATEGORIES];
  for (const name of state.categories) {
    const isDuplicate = merged.some(
      existing => existing.toLowerCase() === name.toLowerCase()
    );
    if (!isDuplicate) merged.push(name);
  }
  state.categories = merged;
}

/**
 * Validates and adds a new custom category to state, persists it, and
 * re-renders the category dropdown.
 *
 * Returns the error string if validation fails, or null/undefined on success.
 * On storage failure the push is rolled back so state stays consistent.
 *
 * @param {string} name - The new category name to add
 * @returns {string|undefined} Error message string on failure, undefined on success
 *
 * Requirements: 7.1, 7.3, 7.4, 7.6
 */
function addCategory(name) {
  const result = validateCategory({ name, existing: state.categories });
  if (!result.valid) return result.error;

  state.categories.push(name.trim());
  try {
    saveCategories();
  } catch (_e) {
    state.categories.pop(); // rollback on storage failure
    showToast('Category could not be saved.', 'error');
    return;
  }
  renderCategoryDropdown();
}

// ─── 7. FILTER STATE ─────────────────────────────────────────────────────────

/**
 * Returns the subset of transactions visible under the current filter.
 * If no filter is active (`state.activeFilter === null`) the full list is
 * returned as a shallow copy so callers cannot accidentally mutate state.
 *
 * When a filter is active only transactions whose `timestamp` falls in the
 * matching calendar year and 1-indexed month are included.
 *
 * @returns {Transaction[]}
 *
 * Requirements: 8.2, 8.6
 */
function getVisibleTransactions() {
  if (!state.activeFilter) return [...state.transactions];
  const { year, month } = state.activeFilter;
  return state.transactions.filter(tx => {
    const d = new Date(tx.timestamp);
    return d.getFullYear() === year && (d.getMonth() + 1) === month;
  });
}

/**
 * Activates a month/year filter and re-renders all UI regions.
 *
 * @param {number} year  - Full 4-digit year (e.g. 2025)
 * @param {number} month - 1-indexed month (1 = January … 12 = December)
 *
 * Requirements: 8.2, 8.3, 8.4
 */
function setMonthFilter(year, month) {
  state.activeFilter = { year, month };
  renderAll();
}

/**
 * Clears any active month filter and re-renders all UI regions so the full
 * transaction list is shown again.
 *
 * Requirements: 8.5
 */
function clearMonthFilter() {
  state.activeFilter = null;
  renderAll();
}

// ─── 8. RENDER: BALANCE DISPLAY ──────────────────────────────────────────────

/**
 * Sums the `amount` fields of `transactions` and writes the result, formatted
 * to exactly 2 decimal places, into `#balance-display`.
 * An empty array results in "0.00".
 *
 * @param {Transaction[]} transactions - The currently visible transactions
 *
 * Requirements: 3.1, 3.5
 */
function renderBalance(transactions) {
  const total = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  const display = document.getElementById('balance-display');
  if (display) {
    display.textContent = total.toFixed(2);
  }
}

// ─── 9. RENDER: TRANSACTION LIST ─────────────────────────────────────────────

/**
 * Renders `transactions` into `#transaction-list` as `<li>` elements sorted in
 * reverse-chronological order (most recent first).
 *
 * Each list item shows:
 *   - item name (capped at 100 characters by the data model; displayed as-is)
 *   - amount formatted to exactly 2 decimal places
 *   - category label
 *   - a delete button carrying `data-id` set to the transaction's UUID
 *
 * When `transactions` is empty a single empty-state `<li>` is rendered instead.
 *
 * The function rebuilds the list from scratch on every call (simple and
 * deterministic; acceptable because the list is bounded to 1 000 entries per
 * Requirement 11.4).
 *
 * @param {Transaction[]} transactions - The currently visible transactions
 *
 * Requirements: 2.1, 2.2, 2.3, 2.6
 */
function renderTransactionList(transactions) {
  const list = document.getElementById('transaction-list');
  if (!list) return;

  // Clear existing content
  list.innerHTML = '';

  if (transactions.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'transaction-item transaction-item--empty';
    empty.textContent = 'No transactions recorded yet.';
    list.appendChild(empty);
    return;
  }

  // Sort a copy — most recent timestamp first
  const sorted = [...transactions].sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );

  const fragment = document.createDocumentFragment();

  for (const tx of sorted) {
    const li = document.createElement('li');
    li.className = 'transaction-item';
    li.dataset.id = tx.id;

    // ── Info block (name + meta) ─────────────────────────────────────────────
    const infoDiv = document.createElement('div');
    infoDiv.className = 'transaction-item__info';

    // Name
    const nameSpan = document.createElement('span');
    nameSpan.className = 'transaction-item__name';
    nameSpan.textContent = tx.name;

    // Meta row: category + date
    const metaDiv = document.createElement('div');
    metaDiv.className = 'transaction-item__meta';

    const categorySpan = document.createElement('span');
    categorySpan.className = 'transaction-item__category';
    categorySpan.textContent = tx.category;

    // Formatted date (locale-aware short format)
    const dateSpan = document.createElement('span');
    dateSpan.className = 'transaction-item__date';
    dateSpan.textContent = new Date(tx.timestamp).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric'
    });

    metaDiv.appendChild(categorySpan);
    metaDiv.appendChild(dateSpan);

    infoDiv.appendChild(nameSpan);
    infoDiv.appendChild(metaDiv);

    // ── Amount ───────────────────────────────────────────────────────────────
    const amountSpan = document.createElement('span');
    amountSpan.className = 'transaction-item__amount';
    amountSpan.textContent = tx.amount.toFixed(2);

    // ── Delete button ─────────────────────────────────────────────────────────
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn btn--delete';
    deleteBtn.dataset.id = tx.id;
    deleteBtn.setAttribute('aria-label', `Delete transaction: ${tx.name}`);
    deleteBtn.textContent = '✕';

    li.appendChild(infoDiv);
    li.appendChild(amountSpan);
    li.appendChild(deleteBtn);

    fragment.appendChild(li);
  }

  list.appendChild(fragment);
}

// ─── 10. RENDER: PIE CHART ───────────────────────────────────────────────────

/**
 * Updates the Chart.js doughnut chart to reflect the spending distribution of
 * `transactions`.
 *
 * Algorithm:
 *  1. Sum amounts per category.
 *  2. Filter to categories with total > 0.
 *  3. If no categories with positive totals → show placeholder, hide canvas.
 *  4. Otherwise → compute each category's percentage share (rounded to 1 dp),
 *     assign colors from CHART_COLORS (cycling if needed, no two adjacent colors
 *     the same), update chart data, call chart.update().
 *
 * Color assignment — adjacent-distinct guarantee:
 *   Colors are assigned by index modulo CHART_COLORS.length. If cycling would
 *   produce a repeated adjacent color the next palette index is tried until a
 *   distinct one is found.
 *
 * Guards: if `state.chartInstance` is not yet created (deferred init) the
 * function returns early so it never throws on startup.
 *
 * @param {Transaction[]} transactions - The currently visible transactions
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */
function renderChart(transactions) {
  const canvas      = document.getElementById('spending-chart');
  const placeholder = document.getElementById('chart-placeholder');

  // ── Compute per-category totals ──────────────────────────────────────────
  const totals = {};
  for (const tx of transactions) {
    if (!totals[tx.category]) totals[tx.category] = 0;
    totals[tx.category] += tx.amount;
  }

  // Only keep categories with a positive total
  const categories = Object.keys(totals).filter(cat => totals[cat] > 0);

  // ── No data path ─────────────────────────────────────────────────────────
  if (categories.length === 0) {
    if (canvas)      canvas.style.display      = 'none';
    if (placeholder) placeholder.style.display = '';
    return;
  }

  // ── Data path ─────────────────────────────────────────────────────────────
  if (canvas)      canvas.style.display      = '';
  if (placeholder) placeholder.style.display = 'none';

  // Bail out if chart instance isn't ready yet (init runs later)
  if (!state.chartInstance) return;

  const grandTotal = categories.reduce((sum, cat) => sum + totals[cat], 0);

  // Percentages (rounded to 1 decimal place)
  const percentages = categories.map(cat =>
    Math.round((totals[cat] / grandTotal) * 1000) / 10
  );

  // ── Color assignment — no two adjacent colors the same ───────────────────
  const colors = [];
  for (let i = 0; i < categories.length; i++) {
    let colorIndex = i % CHART_COLORS.length;
    // Ensure we don't repeat the immediately preceding color
    if (colors.length > 0 && CHART_COLORS[colorIndex] === colors[colors.length - 1]) {
      colorIndex = (colorIndex + 1) % CHART_COLORS.length;
    }
    colors.push(CHART_COLORS[colorIndex]);
  }

  // ── Update chart ─────────────────────────────────────────────────────────
  state.chartInstance.data.labels                      = categories;
  state.chartInstance.data.datasets[0].data            = percentages;
  state.chartInstance.data.datasets[0].backgroundColor = colors;
  state.chartInstance.update();
}

// ─── 11. RENDER: CATEGORY DROPDOWN ───────────────────────────────────────────

/**
 * Rebuilds the `<option>` list inside `#category-select` from `state.categories`.
 *
 * The first option is always the empty placeholder ("-- Select a category --")
 * so that no category is pre-selected. Each category in `state.categories`
 * (built-ins + any custom additions) gets its own `<option>` whose value and
 * text content are the category name string.
 *
 * Requirements: 1.1, 6.1, 7.4
 */
function renderCategoryDropdown() {
  const select = document.getElementById('category-select');
  if (!select) return;

  // Rebuild from scratch to stay deterministic
  select.innerHTML = '';

  // Placeholder option
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = '-- Select a category --';
  select.appendChild(placeholder);

  // One option per category
  for (const cat of state.categories) {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    select.appendChild(option);
  }
}

// ─── 12. THEME ───────────────────────────────────────────────────────────────

/**
 * Applies `theme` ('light' or 'dark') to the document, updates state, persists
 * the preference, and refreshes the chart legend/tooltip text colors so they
 * match the new theme.
 *
 * Reading chart text colors from `getComputedStyle` after the DOM write ensures
 * the CSS cascade has already applied the new custom properties.
 *
 * @param {'light'|'dark'} theme
 *
 * Requirements: 9.1, 9.2, 9.3
 */
function applyTheme(theme) {
  const resolved = (theme === 'dark') ? 'dark' : 'light';
  document.body.dataset.theme = resolved;
  state.theme = resolved;
  saveTheme();

  // Update theme-toggle button label
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.textContent = resolved === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
  }

  // Refresh chart colors to match new theme (legend text, tooltip bg, etc.)
  if (state.chartInstance) {
    const style = getComputedStyle(document.body);
    const textColor    = style.getPropertyValue('--color-text-primary').trim();
    const surfaceColor = style.getPropertyValue('--color-surface').trim();
    const borderColor  = style.getPropertyValue('--color-border').trim();

    state.chartInstance.options.plugins.legend.labels = {
      color: textColor
    };
    state.chartInstance.options.plugins.tooltip.backgroundColor = surfaceColor;
    state.chartInstance.options.plugins.tooltip.bodyColor        = textColor;
    state.chartInstance.options.plugins.tooltip.borderColor      = borderColor;
    state.chartInstance.options.plugins.tooltip.borderWidth      = 1;
    state.chartInstance.update();
  }
}

/**
 * Flips between 'light' and 'dark' themes.
 *
 * Requirements: 9.1, 9.2
 */
function toggleTheme() {
  applyTheme(state.theme === 'dark' ? 'light' : 'dark');
}

// ─── 13. TOAST NOTIFICATIONS ─────────────────────────────────────────────────

/**
 * Displays a non-blocking toast notification in `#toast-container`.
 *
 * @param {string}  message    - The message to display.
 * @param {'warning'|'error'} [type='error'] - Toast variant.
 * @param {boolean} [persistent=false] - If true, the toast does not auto-dismiss.
 *
 * Requirements: 5.4, 7.6
 */
function showToast(message, type = 'error', persistent = false) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', 'alert');

  const msg = document.createElement('span');
  msg.className = 'toast__message';
  msg.textContent = message;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'toast__close';
  closeBtn.setAttribute('aria-label', 'Dismiss notification');
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', () => toast.remove());

  toast.appendChild(msg);
  toast.appendChild(closeBtn);
  container.appendChild(toast);

  if (!persistent) {
    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, 5000);
  }
}

// ─── 14. EVENT HANDLERS ──────────────────────────────────────────────────────

/**
 * Handles the transaction form submit event.
 * Validates input, shows inline errors or creates a new transaction.
 *
 * Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7
 */
function handleFormSubmit(e) {
  e.preventDefault();

  const nameInput     = document.getElementById('item-name');
  const amountInput   = document.getElementById('item-amount');
  const categorySelect = document.getElementById('category-select');

  const name     = nameInput?.value ?? '';
  const amount   = amountInput?.value ?? '';
  const category = categorySelect?.value ?? '';

  // Clear previous inline errors
  ['item-name-error', 'item-amount-error', 'category-select-error'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  });

  const { valid, errors } = validateTransaction({ name, amount, category });

  if (!valid) {
    if (errors.name) {
      const el = document.getElementById('item-name-error');
      if (el) el.textContent = errors.name;
    }
    if (errors.amount) {
      const el = document.getElementById('item-amount-error');
      if (el) el.textContent = errors.amount;
    }
    if (errors.category) {
      const el = document.getElementById('category-select-error');
      if (el) el.textContent = errors.category;
    }
    return;
  }

  addTransaction(name, parseFloat(amount), category);

  // Reset form and focus name field within 500 ms (Requirement 1.7)
  e.target.reset();
  setTimeout(() => {
    if (nameInput) nameInput.focus();
  }, 0);
}

/**
 * Delegated click handler on `#transaction-list` for delete buttons.
 *
 * Requirements: 2.4
 */
function handleDeleteClick(e) {
  const btn = e.target.closest('[data-id].btn--delete');
  if (!btn) return;
  const id = btn.dataset.id;
  if (id) deleteTransaction(id);
}

/**
 * Handles the "Add Category" button click.
 * Displays inline error or clears input on success.
 *
 * Requirements: 7.1, 7.3, 7.4
 */
function handleAddCategory() {
  const input    = document.getElementById('new-category-input');
  const errorEl  = document.getElementById('new-category-error');
  const name     = input?.value ?? '';

  // Clear previous error
  if (errorEl) errorEl.textContent = '';

  const error = addCategory(name);
  if (error) {
    if (errorEl) errorEl.textContent = error;
    // Dismiss error when user modifies the input (Requirement 7.3)
    if (input) {
      const dismiss = () => {
        if (errorEl) errorEl.textContent = '';
        input.removeEventListener('input', dismiss);
      };
      input.addEventListener('input', dismiss);
    }
    return;
  }

  // Success — clear the input field
  if (input) input.value = '';
}

/**
 * Handles the month filter `change` event.
 * Parses the `YYYY-MM` value and activates the filter.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */
function handleFilterChange(e) {
  const value = e.target.value; // "YYYY-MM" or ""
  if (!value) {
    clearMonthFilter();
    return;
  }
  const [year, month] = value.split('-').map(Number);
  if (!isNaN(year) && !isNaN(month)) {
    setMonthFilter(year, month);
  }
}

/**
 * Handles the "Clear Filter" button click.
 *
 * Requirements: 8.5
 */
function handleClearFilter() {
  const monthFilter = document.getElementById('month-filter');
  if (monthFilter) monthFilter.value = '';
  clearMonthFilter();
}

/**
 * Computes the min and max values for the `#month-filter` input from the
 * current transaction list.
 *
 * min = earliest transaction month/year; max = current calendar month.
 *
 * Requirements: 8.1
 */
function updateFilterRange() {
  const input = document.getElementById('month-filter');
  if (!input) return;

  const now = new Date();
  const maxStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  input.max = maxStr;

  if (state.transactions.length === 0) {
    input.min = maxStr;
    return;
  }

  // Find earliest timestamp
  const earliest = state.transactions.reduce((min, tx) => {
    return tx.timestamp < min ? tx.timestamp : min;
  }, state.transactions[0].timestamp);

  const d = new Date(earliest);
  const minStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  input.min = minStr;
}

/**
 * Attaches all DOM event listeners.
 */
function bindEventHandlers() {
  document.getElementById('transaction-form')
    ?.addEventListener('submit', handleFormSubmit);

  document.getElementById('transaction-list')
    ?.addEventListener('click', handleDeleteClick);

  document.getElementById('add-category-btn')
    ?.addEventListener('click', handleAddCategory);

  document.getElementById('month-filter')
    ?.addEventListener('change', handleFilterChange);

  document.getElementById('clear-filter-btn')
    ?.addEventListener('click', handleClearFilter);

  document.getElementById('theme-toggle')
    ?.addEventListener('click', toggleTheme);
}

// ─── 15. INITIALISATION ──────────────────────────────────────────────────────

/**
 * Application entry point.
 *
 * Execution order:
 *  1. Load persisted state from localStorage.
 *  2. Merge built-in categories with any stored custom ones.
 *  3. Apply the stored (or default) theme before any rendering so the wrong
 *     theme is never briefly visible (Requirement 9.4).
 *  4. Create the Chart.js doughnut instance.
 *  5. Render all UI regions.
 *  6. Bind event handlers.
 *
 * Requirements: 5.3, 6.2, 9.4, 9.5, 10.5
 */
function init() {
  loadFromStorage();
  initCategories();
  applyTheme(state.theme);

  renderCategoryDropdown();

  // Create Chart.js doughnut instance — must exist before renderChart() can
  // update it in place.
  const canvas = document.getElementById('spending-chart');
  if (canvas && typeof Chart !== 'undefined') {
    state.chartInstance = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: [],
        datasets: [{
          data: [],
          backgroundColor: [],
          borderWidth: 2,
          borderColor: getComputedStyle(document.body)
            .getPropertyValue('--color-surface').trim() || '#ffffff'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: getComputedStyle(document.body)
                .getPropertyValue('--color-text-primary').trim() || '#111827',
              padding: 16,
              usePointStyle: true,
              pointStyleWidth: 10
            }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${ctx.parsed.toFixed(1)}%`
            }
          }
        }
      }
    });
  } else if (!canvas) {
    // Chart canvas not found — non-fatal
  } else {
    // Chart.js CDN failed to load
    const chartSection = document.getElementById('chart-section');
    if (chartSection) {
      const warn = document.createElement('p');
      warn.className = 'empty-state';
      warn.textContent = 'Chart unavailable — check your network connection.';
      chartSection.appendChild(warn);
    }
  }

  // Initial render
  const visible = getVisibleTransactions();
  renderBalance(visible);
  renderTransactionList(visible);
  renderChart(visible);

  updateFilterRange();
  bindEventHandlers();
}

document.addEventListener('DOMContentLoaded', init);
