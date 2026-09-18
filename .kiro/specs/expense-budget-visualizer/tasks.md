# Implementation Plan: Expense & Budget Visualizer

## Overview

Implement a fully client-side, single-page expense tracker using HTML, CSS, and Vanilla JavaScript. All logic lives in three files: `index.html`, `css/style.css`, and `js/app.js`. Chart.js and fast-check are loaded via CDN. No build step is required.

The implementation follows the logical sections defined in the design: scaffolding → constants & state → localStorage → validator → transaction operations → category operations → filter state → render functions → theme → event handlers → initialisation → testing.

---

## Tasks

- [x] 1. Scaffold project files and HTML skeleton
  - Create `index.html` with the complete markup skeleton: `<header>` (title + `#theme-toggle`), `<main>` with left and right columns containing `#balance-section`, `#form-section`, `#category-section`, `#filter-section`, `#chart-section`, `#list-section`, and `#toast-container`
  - Add the Chart.js CDN `<script>` tag and the `<script src="js/app.js" defer>` tag
  - Create `css/style.css` as an empty file; add `<link>` in `<head>`
  - Create `js/app.js` as an empty file with the 14 section comment blocks as placeholders
  - _Requirements: 10.1, 10.3, 10.4_

- [x] 2. Implement constants, state, and CSS custom properties
  - [x] 2.1 Write Section 1 (Constants & Config) in `app.js`
    - Define `STORAGE_KEYS` object (`ebv_transactions`, `ebv_categories`, `ebv_theme`)
    - Define `BUILT_IN_CATEGORIES` array (`['Food', 'Transport', 'Fun']`)
    - Define `VALIDATION` bounds object (`NAME_MAX: 100`, `AMOUNT_MIN: 0.01`, `AMOUNT_MAX: 999999999.99`, `CATEGORY_NAME_MAX: 50`)
    - Define `CHART_COLORS` palette array (at least 10 visually distinguishable hex colors)
    - _Requirements: 1.1, 6.1, 10.1_

  - [x] 2.2 Write Section 2 (State) in `app.js`
    - Declare the single mutable `state` object with fields: `transactions`, `categories`, `activeFilter`, `theme`, `chartInstance`
    - _Requirements: 10.4_

  - [x] 2.3 Write all CSS custom properties and base styles in `style.css`
    - Define `:root` light-theme variables (`--color-bg`, `--color-surface`, `--color-text-primary`, `--color-text-secondary`, `--color-border`, `--color-accent`, `--color-danger`)
    - Define `[data-theme="dark"]` overrides for all variables
    - Write base layout styles (two-column `<main>`, header, sections, responsive breakpoints for 320 px–1920 px)
    - Write form, input, select, button, error message, and toast styles — all referencing only CSS variables, no hardcoded hex values
    - Write transaction list item styles including delete button and empty-state message
    - _Requirements: 9.1, 9.2, 10.3, 11.3_

- [x] 3. Implement localStorage layer (Section 3)
  - [x] 3.1 Write `loadFromStorage()` in `app.js`
    - Wrap all reads in `try/catch`; parse `ebv_transactions`, `ebv_categories`, `ebv_theme` from `localStorage`
    - On any parse error or unavailability, initialize `state.transactions = []`, `state.categories = []`, `state.theme = 'light'` and queue a persistent warning toast
    - _Requirements: 5.3, 5.4, 7.5, 9.4_

  - [x] 3.2 Write `saveTransactions()`, `saveCategories()`, and `saveTheme()` in `app.js`
    - Each wraps its `localStorage.setItem` in `try/catch`
    - `saveTransactions` and `saveCategories` throw on failure so callers can handle roll-back; `saveTheme` silently ignores failures
    - _Requirements: 5.1, 5.2, 7.6, 9.3_

- [x] 4. Implement the Validator (Section 4)
  - [x] 4.1 Write `validateTransaction({ name, amount, category })` in `app.js`
    - Return `{ valid: boolean, errors: { name?, amount?, category? } }`
    - Apply all rules from the design's Validation Rules table
    - _Requirements: 1.2, 1.3, 1.4, 1.5_

  - [x] 4.2 Write `validateCategory({ name, existing })` in `app.js`
    - Return `{ valid: boolean, error?: string }`
    - Check for empty/whitespace, length > 50, and case-insensitive duplicate against `existing`
    - _Requirements: 7.2, 7.3_

- [x] 5. Implement transaction operations (Section 5)
  - [x] 5.1 Write `addTransaction(name, amount, category)` in `app.js`
    - Generate UUID via `crypto.randomUUID()`; create `Transaction` object with `id`, `name`, `amount`, `category`, `timestamp`
    - Push to `state.transactions`, call `saveTransactions()`, call `renderAll()`
    - _Requirements: 1.6, 5.1_

  - [x] 5.3 Write `deleteTransaction(id)` in `app.js`
    - Back up `state.transactions`; filter out the target; call `saveTransactions()` inside `try/catch`; on failure restore backup and show error toast; on success call `renderAll()`
    - _Requirements: 2.4, 2.5, 5.2_

- [x] 6. Implement category operations (Section 6)
  - [x] 6.1 Write `initCategories()` in `app.js`
    - Merge `BUILT_IN_CATEGORIES` with `state.categories` (loaded custom names) deduplicating case-insensitively; ensure built-ins always present
    - _Requirements: 6.1, 6.2, 6.3, 7.5_

  - [x] 6.2 Write `addCategory(name)` in `app.js`
    - Call `validateCategory`; on failure return error string; on success push trimmed name to `state.categories`, call `saveCategories()` inside `try/catch` (show toast on error and do NOT push to state on failure), call `renderCategoryDropdown()`
    - _Requirements: 7.1, 7.3, 7.4, 7.6_

- [x] 7. Implement filter state (Section 7)
  - [x] 7.1 Write `getVisibleTransactions()`, `setMonthFilter(year, month)`, and `clearMonthFilter()` in `app.js`
    - `getVisibleTransactions` returns a copy of `state.transactions` filtered by `state.activeFilter` when set, else all transactions
    - `setMonthFilter` sets `state.activeFilter` then calls `renderAll()`
    - `clearMonthFilter` nulls `state.activeFilter` then calls `renderAll()`
    - _Requirements: 8.2, 8.5, 8.6_

- [x] 8. Implement render functions (Sections 8–11)
  - [x] 8.1 Write `renderBalance(transactions)` in `app.js`
    - Sum `amount` fields; format to exactly 2 decimal places; set `#balance-display` text content; handle empty array → `"0.00"`
    - _Requirements: 3.1, 3.5_

  - [x] 8.3 Write `renderTransactionList(transactions)` in `app.js`
    - Sort input in reverse-chronological order by `timestamp`; build `<li>` elements showing name (≤ 100 chars), amount (2 dp), category, and a delete button with `data-id` attribute; handle empty array → empty-state message
    - _Requirements: 2.1, 2.2, 2.3, 2.6_

  - [x] 8.6 Write `renderChart(transactions)` in `app.js`
    - Compute per-category sums; filter to categories with sum > 0; compute percentages (1 dp); assign colors from `CHART_COLORS` cycling if needed ensuring no two adjacent entries share the same color; if no data hide canvas and show placeholder; otherwise update `state.chartInstance.data` and call `state.chartInstance.update()`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 8.10 Write `renderCategoryDropdown()` in `app.js`
    - Rebuild all `<option>` elements in `#category-select` from `state.categories`; preserve a default empty/prompt option
    - _Requirements: 1.1, 6.1, 7.4_

- [x] 9. Checkpoint — core logic complete
  - Ensure all non-optional tasks in sections 2–8 are implemented and the application can add/delete transactions, render balance, list, and chart, and persist data.
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement theme (Section 12) and toast system
  - [x] 10.1 Write `applyTheme(theme)` and `toggleTheme()` in `app.js`
    - `applyTheme` sets `document.body.dataset.theme`, updates `state.theme`, calls `saveTheme()`; reads Chart.js legend/tooltip colors from `getComputedStyle` after switch and calls `state.chartInstance.update()` if chart exists
    - `toggleTheme` flips between `'light'` and `'dark'` by calling `applyTheme`
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 10.3 Write `showToast(message, type)` in `app.js`
    - Append a toast `<div>` to `#toast-container` with the message; auto-dismiss after 5 seconds; include a close button for immediate dismissal; support `type` values `'warning'` and `'error'` as CSS modifier classes
    - _Requirements: 5.4, 7.6_

- [x] 11. Implement event handlers and initialisation (Sections 13–14)
  - [x] 11.1 Write all event handler functions in `app.js`
    - `handleFormSubmit(e)` — prevent default; read field values; call `validateTransaction`; on error display inline `<span class="error-msg">` adjacent to each invalid field; on success call `addTransaction`, reset form, focus name field within 500 ms
    - `handleDeleteClick(e)` — delegated on `#transaction-list`; read `data-id`; call `deleteTransaction`
    - `handleAddCategory(e)` — read `#new-category-input`; call `addCategory`; on error display inline error and dismiss on input change; on success clear input
    - `handleFilterChange(e)` — parse `YYYY-MM` value; call `setMonthFilter`; update `min`/`max` attributes of `#month-filter`
    - `handleClearFilter(e)` — call `clearMonthFilter`
    - _Requirements: 1.3, 1.4, 1.5, 1.7, 2.4, 7.3, 8.1, 8.4, 8.5_

  - [x] 11.2 Write `bindEventHandlers()` and `init()` in `app.js`
    - `bindEventHandlers` attaches all listeners as specified in the design
    - `init` calls `loadFromStorage`, `initCategories`, `applyTheme`, `renderCategoryDropdown`, then renders balance/list/chart from `getVisibleTransactions()`, then `bindEventHandlers`; also creates the Chart.js doughnut instance on `#spending-chart` with the configuration from the design
    - Register `init` on `DOMContentLoaded`
    - Add `script.onerror` / `window.onerror` guard for Chart.js CDN failure that shows a warning in `#chart-section`
    - _Requirements: 5.3, 6.2, 9.4, 9.5, 10.5_

  - [x] 11.3 Wire the month-filter min/max selector range
    - After `renderTransactionList` scans `state.transactions` for the earliest timestamp; compute `YYYY-MM` string; set `#month-filter` `min` attribute; always set `max` to the current month
    - _Requirements: 8.1_

- [x] 12. Final checkpoint — full integration
  - Verify the complete application works end-to-end: add transactions, delete transactions, category management, month filtering, theme toggle, localStorage persistence, responsive layout, and Chart.js rendering.
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property-based tests use [fast-check](https://cdn.jsdelivr.net/npm/fast-check/lib/bundle/fast-check.min.js) loaded via CDN in a separate test HTML file — they do **not** go into `index.html`
- All CSS uses only custom property references (`var(--...)`) — no hardcoded hex values anywhere
- Built-in categories are never written to `localStorage`; they are injected at runtime from `BUILT_IN_CATEGORIES`
- The Chart.js instance is created once in `init()` and updated in place by `renderChart()` to avoid flicker
- Delete uses a backup/rollback pattern to satisfy Requirement 2.5
- Each task references specific requirements for traceability

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1", "2.2", "2.3"] },
    { "id": 1, "tasks": ["3.1", "3.2"] },
    { "id": 2, "tasks": ["4.1", "4.2", "3.3"] },
    { "id": 3, "tasks": ["5.1", "6.1", "7.1", "4.3", "4.4"] },
    { "id": 4, "tasks": ["5.3", "6.2", "8.1", "8.3", "8.6", "8.10", "5.2"] },
    { "id": 5, "tasks": ["5.4", "6.3", "7.2", "7.3", "8.2", "8.4", "8.5", "8.7", "8.8", "8.9"] },
    { "id": 6, "tasks": ["10.1", "10.3"] },
    { "id": 7, "tasks": ["10.2", "11.1"] },
    { "id": 8, "tasks": ["11.2", "11.3"] }
  ]
}
```
