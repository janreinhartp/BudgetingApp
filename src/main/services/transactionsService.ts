import { getDatabase } from '../database/db'
import type { NewTransaction, Transaction, TransactionFilter } from '@shared/types'

interface TransactionRow {
  id: number
  date: string
  type: Transaction['type']
  category_id: number | null
  description: string | null
  amount_centavos: number
  account_id: number | null
  notes: string | null
  cutoff: Transaction['cutoff']
  is_payment: number
}

function toTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    date: row.date,
    type: row.type,
    categoryId: row.category_id,
    description: row.description,
    amountCentavos: row.amount_centavos,
    accountId: row.account_id,
    notes: row.notes,
    cutoff: row.cutoff,
    isPayment: row.is_payment === 1
  }
}

export function listTransactions(filter: TransactionFilter = {}): Transaction[] {
  const clauses: string[] = []
  const params: Record<string, unknown> = {}

  if (filter.month) {
    clauses.push("strftime('%Y-%m', date) = @month")
    params.month = filter.month
  }
  if (filter.categoryId != null) {
    clauses.push('category_id = @categoryId')
    params.categoryId = filter.categoryId
  }
  if (filter.accountId != null) {
    clauses.push('account_id = @accountId')
    params.accountId = filter.accountId
  }
  if (filter.search) {
    clauses.push('(description LIKE @search OR notes LIKE @search)')
    params.search = `%${filter.search}%`
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''
  const rows = getDatabase()
    .prepare(
      `SELECT t.*, EXISTS(SELECT 1 FROM payments p WHERE p.transaction_id = t.id) AS is_payment
       FROM transactions t ${where} ORDER BY t.date DESC, t.id DESC`
    )
    .all(params) as TransactionRow[]
  return rows.map(toTransaction)
}

export function createTransaction(transaction: NewTransaction): Transaction {
  const result = getDatabase()
    .prepare(
      `INSERT INTO transactions (date, type, category_id, description, amount_centavos, account_id, notes, cutoff)
       VALUES (@date, @type, @categoryId, @description, @amountCentavos, @accountId, @notes, @cutoff)`
    )
    .run(transaction)
  return { ...transaction, id: Number(result.lastInsertRowid) }
}

export function updateTransaction(transaction: Transaction): void {
  const db = getDatabase()
  if (db.prepare('SELECT 1 FROM payments WHERE transaction_id = ?').get(transaction.id)) {
    throw new Error('Payment transactions must be managed from their bill or debt.')
  }
  db
    .prepare(
      `UPDATE transactions
       SET date = @date, type = @type, category_id = @categoryId, description = @description,
           amount_centavos = @amountCentavos, account_id = @accountId, notes = @notes, cutoff = @cutoff
       WHERE id = @id`
    )
    .run(transaction)
}

export function deleteTransaction(id: number): void {
  const db = getDatabase()
  if (db.prepare('SELECT 1 FROM payments WHERE transaction_id = ?').get(id)) {
    throw new Error('Payment transactions cannot be deleted from Transactions.')
  }
  db.prepare('DELETE FROM transactions WHERE id = ?').run(id)
}
