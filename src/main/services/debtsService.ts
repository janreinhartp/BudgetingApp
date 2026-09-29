import { getDatabase } from '../database/db'
import { calculateDebtBalance, calculateMonthlyDebtObligations } from '@shared/calculations'
import type { Debt, DebtSummary, NewDebt, NewPayment, Payment } from '@shared/types'
import { createTransaction } from './transactionsService'

interface DebtRow {
  id: number
  name: string
  original_balance_centavos: number
  current_balance_centavos: number
  minimum_payment_centavos: number
  planned_payment_centavos: number
  due_day: number | null
  account_id: number | null
}

function toDebt(row: DebtRow): Debt {
  return {
    id: row.id,
    name: row.name,
    originalBalanceCentavos: row.original_balance_centavos,
    currentBalanceCentavos: row.current_balance_centavos,
    minimumPaymentCentavos: row.minimum_payment_centavos,
    plannedPaymentCentavos: row.planned_payment_centavos,
    dueDay: row.due_day,
    accountId: row.account_id
  }
}

export function listDebts(): Debt[] {
  const rows = getDatabase().prepare('SELECT * FROM debts ORDER BY name').all() as DebtRow[]
  return rows.map(toDebt)
}

export function createDebt(debt: NewDebt): Debt {
  const result = getDatabase()
    .prepare(
      `INSERT INTO debts
         (name, original_balance_centavos, current_balance_centavos, minimum_payment_centavos, planned_payment_centavos, due_day, account_id)
       VALUES
         (@name, @originalBalanceCentavos, @currentBalanceCentavos, @minimumPaymentCentavos, @plannedPaymentCentavos, @dueDay, @accountId)`
    )
    .run(debt)
  return { ...debt, id: Number(result.lastInsertRowid) }
}

export function updateDebt(debt: Debt): void {
  getDatabase()
    .prepare(
      `UPDATE debts
       SET name = @name, original_balance_centavos = @originalBalanceCentavos,
           current_balance_centavos = @currentBalanceCentavos,
           minimum_payment_centavos = @minimumPaymentCentavos,
           planned_payment_centavos = @plannedPaymentCentavos,
           due_day = @dueDay, account_id = @accountId
       WHERE id = @id`
    )
    .run(debt)
}

export function deleteDebt(id: number): void {
  getDatabase().prepare('DELETE FROM debts WHERE id = ?').run(id)
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

export function listDebtPayments(debtId: number): Payment[] {
  const rows = getDatabase()
    .prepare('SELECT id, date, amount_centavos, account_id, notes, transaction_id FROM payments WHERE debt_id = ? ORDER BY date DESC, id DESC')
    .all(debtId) as PaymentRow[]
  return rows.map(toPayment)
}

export function recordDebtPayment(id: number, payment: NewPayment): Payment {
  const db = getDatabase()
  const debt = db.prepare('SELECT * FROM debts WHERE id = ?').get(id) as DebtRow | undefined
  if (!debt) throw new Error('Debt not found')
  if (!payment.date || !Number.isInteger(payment.amountCentavos) || payment.amountCentavos <= 0) {
    throw new Error('Enter a valid payment date and amount')
  }
  if (payment.amountCentavos > debt.current_balance_centavos) {
    throw new Error('Payment exceeds the remaining debt balance')
  }

  return db.transaction(() => {
    const transaction = createTransaction({
      date: payment.date,
      type: 'Debt Payment',
      categoryId: null,
      description: debt.name,
      amountCentavos: payment.amountCentavos,
      accountId: payment.accountId,
      notes: payment.notes,
      cutoff: 'Unassigned'
    })
    const result = db.prepare(
      `INSERT INTO payments (type, debt_id, date, amount_centavos, account_id, notes, transaction_id)
       VALUES ('DEBT_PAYMENT', ?, ?, ?, ?, ?, ?)`
    ).run(id, payment.date, payment.amountCentavos, payment.accountId, payment.notes, transaction.id)
    db.prepare('UPDATE debts SET current_balance_centavos = current_balance_centavos - ? WHERE id = ?')
      .run(payment.amountCentavos, id)
    if (payment.accountId != null) {
      db.prepare('UPDATE accounts SET balance_centavos = balance_centavos - ? WHERE id = ?')
        .run(payment.amountCentavos, payment.accountId)
    }
    return {
      id: Number(result.lastInsertRowid),
      date: payment.date,
      amountCentavos: payment.amountCentavos,
      accountId: payment.accountId,
      notes: payment.notes,
      transactionId: transaction.id
    }
  })()
}

export function getDebtSummary(): DebtSummary {
  const debts = listDebts()
  return {
    totalDebtCentavos: calculateDebtBalance(debts),
    monthlyDebtPaymentsCentavos: calculateMonthlyDebtObligations(debts)
  }
}
