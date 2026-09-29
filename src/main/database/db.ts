import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'

let db: Database.Database | null = null

export function getDatabasePath(): string {
  return join(app.getPath('userData'), 'budgeting-app.sqlite3')
}

/** Opens (or creates) the SQLite database in the app's user data directory and applies the schema. */
export function getDatabase(): Database.Database {
  if (db) return db

  const dbPath = getDatabasePath()
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  applySchema(db)
  return db
}

function applySchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('Cash', 'Bank', 'E-Wallet', 'Credit Card')),
      balance_centavos INTEGER NOT NULL DEFAULT 0,
      credit_limit_centavos INTEGER,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      "group" TEXT NOT NULL CHECK ("group" IN ('Income', 'Expense', 'Debt', 'Savings')),
      is_custom INTEGER NOT NULL DEFAULT 0,
      UNIQUE(name, "group")
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('Income', 'Expense', 'Debt Payment', 'Savings', 'Transfer')),
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      description TEXT,
      amount_centavos INTEGER NOT NULL,
      account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
      notes TEXT,
      cutoff TEXT NOT NULL DEFAULT 'Unassigned' CHECK (cutoff IN ('First', 'Second', 'Both', 'Unassigned'))
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month TEXT NOT NULL,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      budget_centavos INTEGER NOT NULL DEFAULT 0,
      UNIQUE(month, category_id)
    );

    CREATE TABLE IF NOT EXISTS bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      amount_centavos INTEGER NOT NULL,
      due_day INTEGER NOT NULL,
      frequency TEXT NOT NULL DEFAULT 'Monthly',
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'Upcoming' CHECK (status IN ('Upcoming', 'Paid', 'Overdue')),
      last_paid_date TEXT,
      duration_value INTEGER,
      duration_unit TEXT CHECK (duration_unit IN ('Weeks', 'Months'))
    );

    CREATE TABLE IF NOT EXISTS debts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      original_balance_centavos INTEGER NOT NULL,
      current_balance_centavos INTEGER NOT NULL,
      minimum_payment_centavos INTEGER NOT NULL DEFAULT 0,
      planned_payment_centavos INTEGER NOT NULL DEFAULT 0,
      due_day INTEGER,
      account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK (type IN ('BILL_PAYMENT', 'DEBT_PAYMENT')),
      bill_id INTEGER REFERENCES bills(id) ON DELETE SET NULL,
      debt_id INTEGER REFERENCES debts(id) ON DELETE SET NULL,
      occurrence_month TEXT,
      date TEXT NOT NULL,
      amount_centavos INTEGER NOT NULL CHECK (amount_centavos > 0),
      account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
      notes TEXT,
      transaction_id INTEGER UNIQUE REFERENCES transactions(id) ON DELETE SET NULL,
      CHECK (
        (type = 'BILL_PAYMENT' AND bill_id IS NOT NULL AND debt_id IS NULL AND occurrence_month IS NOT NULL) OR
        (type = 'DEBT_PAYMENT' AND debt_id IS NOT NULL AND bill_id IS NULL AND occurrence_month IS NULL)
      )
    );

    CREATE INDEX IF NOT EXISTS payments_bill_occurrence
      ON payments(bill_id, occurrence_month);
    CREATE INDEX IF NOT EXISTS payments_debt
      ON payments(debt_id, date);

    CREATE TABLE IF NOT EXISTS savings_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      target_centavos INTEGER NOT NULL,
      current_centavos INTEGER NOT NULL DEFAULT 0,
      target_date TEXT,
      monthly_contribution_centavos INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)

  migrateBillsDuration(database)
}

/** Adds the duration_value/duration_unit columns for databases created before this feature existed. */
function migrateBillsDuration(database: Database.Database): void {
  const columns = database.prepare('PRAGMA table_info(bills)').all() as Array<{ name: string }>
  const hasDurationValue = columns.some((c) => c.name === 'duration_value')
  if (!hasDurationValue) {
    database.exec('ALTER TABLE bills ADD COLUMN duration_value INTEGER')
    database.exec('ALTER TABLE bills ADD COLUMN duration_unit TEXT')
  }
}

export function closeDatabase(): void {
  db?.close()
  db = null
}
