import { getDatabase } from '../database/db'
import {
  calculateMonthlyBills,
  calculateMonthlyDebtPayments,
  calculateMonthlyExpenses,
  calculateMonthlyIncome,
  calculateMonthlySavings,
  calculateRemainingMoney
} from '@shared/calculations'
import type { CalcTransaction } from '@shared/calculations'
import type { DashboardSummary } from '@shared/types'

/** Returns the current month in Asia/Manila as YYYY-MM. */
export function currentMonth(): string {
  const now = new Date()
  const manila = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
  const year = manila.getFullYear()
  const month = String(manila.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

export function getDashboardSummary(month: string = currentMonth()): DashboardSummary {
  const rows = getDatabase()
    .prepare(
      `SELECT t.type, t.date, t.amount_centavos as amountCentavos, t.cutoff, p.type as paymentType
       FROM transactions t
       LEFT JOIN payments p ON p.transaction_id = t.id
       WHERE strftime('%Y-%m', t.date) = ?`
    )
    .all(month) as CalcTransaction[]

  const incomeCentavos = calculateMonthlyIncome(rows, month)
  const expensesCentavos = calculateMonthlyExpenses(rows, month)
  const debtPaymentsCentavos = calculateMonthlyDebtPayments(rows, month)
  const savingsCentavos = calculateMonthlySavings(rows, month)
  const billsCentavos = (getDatabase()
    .prepare("SELECT COALESCE(SUM(amount_centavos), 0) AS total FROM payments WHERE type = 'BILL_PAYMENT' AND strftime('%Y-%m', date) = ?")
    .get(month) as { total: number }).total

  const remainingCentavos = calculateRemainingMoney({
    incomeCentavos,
    expensesCentavos,
    billsCentavos,
    debtPaymentsCentavos,
    savingsCentavos
  })

  const spendingByCategory = getDatabase()
    .prepare(
      `SELECT c.name as categoryName, SUM(t.amount_centavos) as amountCentavos
       FROM transactions t
       JOIN categories c ON c.id = t.category_id
       WHERE t.type = 'Expense' AND strftime('%Y-%m', t.date) = ?
       GROUP BY c.name
       ORDER BY amountCentavos DESC`
    )
    .all(month) as Array<{ categoryName: string; amountCentavos: number }>

  return {
    month,
    incomeCentavos,
    expensesCentavos,
    billsCentavos,
    debtPaymentsCentavos,
    savingsCentavos,
    remainingCentavos,
    spendingByCategory
  }
}
