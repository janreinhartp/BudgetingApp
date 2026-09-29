import { getDatabase } from '../database/db'
import { computeBillStatus } from '@shared/calculations'
import type { Bill, BillFrequency, BillStatus, DurationUnit, NewBill } from '@shared/types'
import { createTransaction } from './transactionsService'

interface BillRow {
  id: number
  name: string
  amount_centavos: number
  due_day: number
  frequency: BillFrequency
  category_id: number | null
  account_id: number | null
  status: BillStatus
  last_paid_date: string | null
  duration_value: number | null
  duration_unit: DurationUnit | null
}

function toBill(row: BillRow): Bill {
  const status = computeBillStatus({ dueDay: row.due_day, lastPaidDate: row.last_paid_date })
  return {
    id: row.id,
    name: row.name,
    amountCentavos: row.amount_centavos,
    dueDay: row.due_day,
    frequency: row.frequency,
    categoryId: row.category_id,
    accountId: row.account_id,
    status,
    lastPaidDate: row.last_paid_date,
    durationValue: row.duration_value,
    durationUnit: row.duration_unit
  }
}

export function listBills(): Bill[] {
  const rows = getDatabase().prepare('SELECT * FROM bills ORDER BY due_day').all() as BillRow[]
  return rows.map(toBill)
}

export function createBill(bill: NewBill): Bill {
  const result = getDatabase()
    .prepare(
      `INSERT INTO bills (name, amount_centavos, due_day, frequency, category_id, account_id, status, duration_value, duration_unit)
       VALUES (@name, @amountCentavos, @dueDay, @frequency, @categoryId, @accountId, 'Upcoming', @durationValue, @durationUnit)`
    )
    .run(bill)
  return {
    ...bill,
    id: Number(result.lastInsertRowid),
    status: 'Upcoming',
    lastPaidDate: null
  }
}

export function updateBill(bill: Omit<Bill, 'status'>): void {
  getDatabase()
    .prepare(
      `UPDATE bills
       SET name = @name, amount_centavos = @amountCentavos, due_day = @dueDay,
           frequency = @frequency, category_id = @categoryId, account_id = @accountId,
           last_paid_date = @lastPaidDate, duration_value = @durationValue, duration_unit = @durationUnit
       WHERE id = @id`
    )
    .run(bill)
}

export function deleteBill(id: number): void {
  getDatabase().prepare('DELETE FROM bills WHERE id = ?').run(id)
}

/** Marks a bill paid today and, optionally, records the matching expense transaction. */
export function markBillPaid(id: number, createExpenseTransaction: boolean): void {
  const db = getDatabase()
  const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(id) as BillRow | undefined
  if (!bill) return

  const today = new Date().toISOString().slice(0, 10)
  db.prepare("UPDATE bills SET status = 'Paid', last_paid_date = ? WHERE id = ?").run(today, id)

  if (createExpenseTransaction) {
    createTransaction({
      date: today,
      type: 'Expense',
      categoryId: bill.category_id,
      description: bill.name,
      amountCentavos: bill.amount_centavos,
      accountId: bill.account_id,
      notes: null,
      cutoff: 'Unassigned'
    })
  }
}
