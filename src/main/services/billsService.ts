import { getDatabase } from '../database/db'
import { computeBillStatus } from '@shared/calculations'
import type { Bill, BillFrequency, BillStatus, DurationUnit, NewBill, NewPayment, Payment } from '@shared/types'
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
  paid_centavos: number
}

function toBill(row: BillRow): Bill {
  const status: BillStatus =
    row.paid_centavos >= row.amount_centavos
      ? 'Paid'
      : row.paid_centavos > 0
        ? 'Partially Paid'
        : computeBillStatus({ dueDay: row.due_day, lastPaidDate: row.last_paid_date })
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
    paidCentavos: row.paid_centavos,
    remainingCentavos: Math.max(0, row.amount_centavos - row.paid_centavos),
    durationValue: row.duration_value,
    durationUnit: row.duration_unit
  }
}

export function listBills(): Bill[] {
  const db = getDatabase()
  const today = new Date()
  const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const rows = db.prepare(
    `SELECT b.*, COALESCE(SUM(p.amount_centavos), 0) AS paid_centavos
     FROM bills b
     LEFT JOIN payments p ON p.bill_id = b.id AND p.occurrence_month = ?
     GROUP BY b.id
     ORDER BY b.due_day`
  ).all(month) as BillRow[]
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
    lastPaidDate: null,
    paidCentavos: 0,
    remainingCentavos: bill.amountCentavos
  }
}

export function updateBill(bill: Omit<Bill, 'status' | 'paidCentavos' | 'remainingCentavos'>): void {
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

interface PaymentRow {
  id: number
  date: string
  amount_centavos: number
  account_id: number | null
  notes: string | null
  transaction_id: number | null
}

function toPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    date: row.date,
    amountCentavos: row.amount_centavos,
    accountId: row.account_id,
    notes: row.notes,
    transactionId: row.transaction_id
  }
}

export function listBillPayments(billId: number): Payment[] {
  const rows = getDatabase()
    .prepare('SELECT id, date, amount_centavos, account_id, notes, transaction_id FROM payments WHERE bill_id = ? ORDER BY date DESC, id DESC')
    .all(billId) as PaymentRow[]
  return rows.map(toPayment)
}

export function recordBillPayment(id: number, payment: NewPayment): Payment {
  const db = getDatabase()
  const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(id) as BillRow | undefined
  if (!bill) throw new Error('Bill not found')
  if (!payment.date || !Number.isInteger(payment.amountCentavos) || payment.amountCentavos <= 0) {
    throw new Error('Enter a valid payment date and amount')
  }
  const occurrenceMonth = payment.date.slice(0, 7)
  const paid = db.prepare(
    'SELECT COALESCE(SUM(amount_centavos), 0) AS total FROM payments WHERE bill_id = ? AND occurrence_month = ?'
  ).get(id, occurrenceMonth) as { total: number }
  if (paid.total + payment.amountCentavos > bill.amount_centavos) {
    throw new Error('Payment exceeds the remaining bill amount')
  }

  const record = db.transaction(() => {
    const transaction = createTransaction({
      date: payment.date,
      type: 'Expense',
      categoryId: bill.category_id,
      description: bill.name,
      amountCentavos: payment.amountCentavos,
      accountId: payment.accountId,
      notes: payment.notes,
      cutoff: 'Unassigned'
    })
    const result = db.prepare(
      `INSERT INTO payments (type, bill_id, occurrence_month, date, amount_centavos, account_id, notes, transaction_id)
       VALUES ('BILL_PAYMENT', ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, occurrenceMonth, payment.date, payment.amountCentavos, payment.accountId, payment.notes, transaction.id)
    if (payment.accountId != null) {
      db.prepare('UPDATE accounts SET balance_centavos = balance_centavos - ? WHERE id = ?')
        .run(payment.amountCentavos, payment.accountId)
    }
    const newTotal = paid.total + payment.amountCentavos
    if (newTotal >= bill.amount_centavos) {
      db.prepare('UPDATE bills SET last_paid_date = ? WHERE id = ?').run(payment.date, id)
    }
    return {
      id: Number(result.lastInsertRowid),
      date: payment.date,
      amountCentavos: payment.amountCentavos,
      accountId: payment.accountId,
      notes: payment.notes,
      transactionId: transaction.id
    } satisfies Payment
  })
  return record()
}
