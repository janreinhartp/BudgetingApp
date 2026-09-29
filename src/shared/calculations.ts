/**
 * Pure financial calculation functions. Kept separate from the UI and from
 * database access so they are easy to unit test. All money values are
 * integer centavos (see money.ts) — never floating point pesos.
 */

export interface CalcTransaction {
  type: 'Income' | 'Expense' | 'Debt Payment' | 'Savings' | 'Transfer'
  date: string // YYYY-MM-DD
  amountCentavos: number
  cutoff?: CutoffAssignment
}

export type CutoffAssignment = 'First' | 'Second' | 'Both' | 'Unassigned'

export interface CalcBill {
  amountCentavos: number
  status: 'Upcoming' | 'Paid' | 'Overdue'
  lastPaidDate?: string | null // YYYY-MM-DD
}

export interface CalcDebt {
  currentBalanceCentavos: number
  plannedPaymentCentavos: number
}

export interface CalcSavingsGoal {
  targetCentavos: number
  currentCentavos: number
}

function isInMonth(date: string, month: string): boolean {
  return date.startsWith(month)
}

function sumByType(
  transactions: CalcTransaction[],
  month: string,
  type: CalcTransaction['type']
): number {
  return transactions
    .filter((t) => t.type === type && isInMonth(t.date, month))
    .reduce((total, t) => total + t.amountCentavos, 0)
}

export function calculateMonthlyIncome(transactions: CalcTransaction[], month: string): number {
  return sumByType(transactions, month, 'Income')
}

export function calculateMonthlyExpenses(transactions: CalcTransaction[], month: string): number {
  return sumByType(transactions, month, 'Expense')
}

export function calculateMonthlyDebtPayments(
  transactions: CalcTransaction[],
  month: string
): number {
  return sumByType(transactions, month, 'Debt Payment')
}

export function calculateMonthlySavings(transactions: CalcTransaction[], month: string): number {
  return sumByType(transactions, month, 'Savings')
}

export function calculateMonthlyBills(bills: CalcBill[], month: string): number {
  return bills
    .filter((b) => b.status === 'Paid' && b.lastPaidDate && isInMonth(b.lastPaidDate, month))
    .reduce((total, b) => total + b.amountCentavos, 0)
}

export function calculateRemainingMoney(params: {
  incomeCentavos: number
  expensesCentavos: number
  billsCentavos: number
  debtPaymentsCentavos: number
  savingsCentavos: number
}): number {
  const { incomeCentavos, expensesCentavos, billsCentavos, debtPaymentsCentavos, savingsCentavos } =
    params
  return incomeCentavos - expensesCentavos - billsCentavos - debtPaymentsCentavos - savingsCentavos
}

export interface BudgetUsage {
  budgetCentavos: number
  spentCentavos: number
  remainingCentavos: number
  percentageUsed: number
}

export function calculateBudgetUsage(budgetCentavos: number, spentCentavos: number): BudgetUsage {
  const remainingCentavos = budgetCentavos - spentCentavos
  const percentageUsed = budgetCentavos > 0 ? Math.round((spentCentavos / budgetCentavos) * 100) : 0
  return { budgetCentavos, spentCentavos, remainingCentavos, percentageUsed }
}

export function calculateDebtBalance(debts: CalcDebt[]): number {
  return debts.reduce((total, d) => total + d.currentBalanceCentavos, 0)
}

export function calculateMonthlyDebtObligations(debts: CalcDebt[]): number {
  return debts.reduce((total, d) => total + d.plannedPaymentCentavos, 0)
}

export interface SavingsProgress {
  targetCentavos: number
  currentCentavos: number
  remainingCentavos: number
  percentageComplete: number
}

export function calculateSavingsProgress(goal: CalcSavingsGoal): SavingsProgress {
  const remainingCentavos = Math.max(goal.targetCentavos - goal.currentCentavos, 0)
  const percentageComplete =
    goal.targetCentavos > 0
      ? Math.round((goal.currentCentavos / goal.targetCentavos) * 100)
      : 0
  return {
    targetCentavos: goal.targetCentavos,
    currentCentavos: goal.currentCentavos,
    remainingCentavos,
    percentageComplete
  }
}

export function calculateCutoffBalance(
  incomeCentavos: number,
  expenseCentavosList: number[]
): number {
  const totalExpenses = expenseCentavosList.reduce((total, amount) => total + amount, 0)
  return incomeCentavos - totalExpenses
}

/**
 * Amounts assigned to 'Both' cutoffs are split evenly so the two cutoffs
 * never double-count money that only exists once.
 */
export function amountForCutoff(
  amountCentavos: number,
  transactionCutoff: CutoffAssignment,
  targetCutoff: 'First' | 'Second'
): number {
  if (transactionCutoff === targetCutoff) return amountCentavos
  if (transactionCutoff === 'Both') return Math.round(amountCentavos / 2)
  return 0
}

/** Recomputes a bill's status from today's date rather than trusting stale stored state. */
export function computeBillStatus(
  bill: { dueDay: number; lastPaidDate: string | null },
  today: Date = new Date()
): 'Upcoming' | 'Paid' | 'Overdue' {
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  if (bill.lastPaidDate && isInMonth(bill.lastPaidDate, currentMonth)) return 'Paid'
  return today.getDate() > bill.dueDay ? 'Overdue' : 'Upcoming'
}
