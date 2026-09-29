# Budgeting App

A simple, fast, fully offline personal budgeting desktop app for Windows.
Built with Electron + React + TypeScript, backed by a local SQLite database
(`better-sqlite3`). All money is stored and calculated as integer centavos
(PHP) to avoid floating-point rounding errors.

## Status: Feature-complete (Phases 1-4)

All 8 screens are implemented:

- **Dashboard** — current month (or any selected month) income/expenses/bills/debt
  payments/savings/remaining, budget progress, upcoming bills, debt balance,
  savings progress, spending by category, and recent transactions
- **Transactions** — fast add, edit, delete, filter by month/category/account,
  search, cutoff assignment (First/Second/Both/Unassigned)
- **Budget** — per-category monthly budget vs. actual spend with progress bars,
  plus First/Second Cutoff income and remaining balance planning
- **Bills** — add/edit/delete, mark as paid with optional linked expense
  transaction, status auto-computed as Upcoming/Paid/Overdue
- **Debt** — track balances/payments per debt, total debt, monthly debt
  payments, and paid-off progress bars
- **Savings** — savings goals with target/current/remaining and % complete
- **Accounts** — Cash/Bank/E-Wallet/Credit Card with available-credit display
- **Settings** — currency, monthly salary, cutoff dates/income, default
  account, theme (light/dark), database export/import, and CSV export for
  transactions

Default theme is **light**. Toggle to dark from the Settings screen.

## Getting started

```powershell
npm install
npm run dev     # launches the Electron app with hot reload
npm run build    # production build (out/)
npm test         # runs unit tests for the financial calculation functions
```

## Installing on Windows

To install the app like a normal desktop program (Start Menu shortcut,
uninstaller, etc.) instead of running it from source every time:

```powershell
npm run dist
```

This produces a Windows installer at `release\Budgeting App Setup <version>.exe`.
Run that `.exe` and follow the prompts to install.

> **One-time fix if the build fails with "Cannot create symbolic link":**
> Windows blocks regular user accounts from creating symlinks, which
> electron-builder needs the first time it downloads its packaging tools.
> Either:
> - Enable **Developer Mode** (Settings > Privacy & security > For developers), or
> - Run `npm run dist` once from a PowerShell window opened as **Administrator**.
>
> After that first successful run, the tools are cached and `npm run dist`
> works normally from a regular (non-admin) terminal.

If you'd rather not build an installer, you can also just run the app
directly with `npm run dev` (development) or `npm run build && npm start`
(production build, no installer) any time you want to use it.

## Project structure

```
src/
  main/         Electron main process (SQLite access, IPC handlers)
    database/   Schema + seed data
    services/   accounts, categories, transactions, dashboard, budgets,
                 bills, debts, savings, cutoff, settings, backup, csv
  preload/      contextBridge API exposed to the renderer
  renderer/     React UI (views, components)
  shared/       Types, PHP money helpers, and pure calculation functions
                 (calculations.ts) shared between main and renderer/tests
tests/          Vitest unit tests for calculations.ts
```

The database file lives in Electron's user data directory (never inside the
source tree), e.g. `%APPDATA%/budgeting-app/budgeting-app.sqlite3` on Windows.
Use Settings > Export Database / Import Database for manual backups, and
Settings > Export Transactions (CSV) for a spreadsheet-friendly export.
