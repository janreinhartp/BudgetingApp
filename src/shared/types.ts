/** Domain types shared between the Electron main process and the renderer. */
import type { CutoffAssignment } from './calculations'

export type AccountType = 'Cash' | 'Bank' | 'E-Wallet' | 'Credit Card'

export interface Account {
  id: number
  name: string
  type: AccountType
  balanceCentavos: number
  creditLimitCentavos: number | null
  notes: string | null
}

export type CategoryGroup = 'Income' | 'Expense' | 'Debt' | 'Savings'

export interface Category {
  id: number
  name: string
  group: CategoryGroup
  isCustom: boolean
}

export type TransactionType = 'Income' | 'Expense' | 'Debt Payment' | 'Savings' | 'Transfer'

export interface Transaction {
  id: number
  date: string // ISO date (YYYY-MM-DD)
  type: TransactionType
  categoryId: number | null
  description: string | null
  amountCentavos: number
  accountId: number | null
  notes: string | null
  cutoff: CutoffAssignment
}

export type NewTransaction = Omit<Transaction, 'id'>

export interface DashboardSummary {
  month: string // YYYY-MM
  incomeCentavos: number
  expensesCentavos: number
  billsCentavos: number
  debtPaymentsCentavos: number
  savingsCentavos: number
  remainingCentavos: number
  spendingByCategory: Array<{ categoryName: string; amountCentavos: number }>
}

export interface TransactionFilter {
  month?: string // YYYY-MM
  categoryId?: number
  accountId?: number
  search?: string
}

export interface Budget {
  id: number
  month: string // YYYY-MM
  categoryId: number
  budgetCentavos: number
}

export interface BudgetLine {
  categoryId: number
  categoryName: string
  budgetCentavos: number
  spentCentavos: number
  remainingCentavos: number
  percentageUsed: number
}

export interface CutoffSummary {
  month: string
  first: {
    incomeCentavos: number
    outflowCentavos: number
    remainingCentavos: number
  }
  second: {
    incomeCentavos: number
    outflowCentavos: number
    remainingCentavos: number
  }
}

export type BillFrequency = 'Monthly' | 'Weekly' | 'Yearly' | 'One-time'
export type BillStatus = 'Upcoming' | 'Partially Paid' | 'Paid' | 'Overdue'
export type DurationUnit = 'Weeks' | 'Months'

export interface Bill {
  id: number
  name: string
  amountCentavos: number
  dueDay: number // day of month, 1-31
  frequency: BillFrequency
  categoryId: number | null
  accountId: number | null
  status: BillStatus
  lastPaidDate: string | null
  paidCentavos: number
  remainingCentavos: number
  durationValue: number | null // e.g. 6, for installment plans like Buy Now Pay Later
  durationUnit: DurationUnit | null
}

export type NewBill = Omit<Bill, 'id' | 'status' | 'lastPaidDate'>

export interface AppSettings {
  currency: string
  monthlySalaryCentavos: number
  firstCutoffDay: number
  secondCutoffDay: number
  firstCutoffIncomeCentavos: number
  secondCutoffIncomeCentavos: number
  defaultAccountId: number | null
  theme: 'dark' | 'light'
}

export interface Debt {
  id: number
  name: string
  originalBalanceCentavos: number
  currentBalanceCentavos: number
  minimumPaymentCentavos: number
  plannedPaymentCentavos: number
  dueDay: number | null
  accountId: number | null
}

export type NewDebt = Omit<Debt, 'id'>

export interface DebtSummary {
  totalDebtCentavos: number
  monthlyDebtPaymentsCentavos: number
}

export interface Payment {
  id: number
  date: string
  amountCentavos: number
  accountId: number | null
  notes: string | null
  transactionId: number | null
}

export interface NewPayment {
  date: string
  amountCentavos: number
  accountId: number | null
  notes: string | null
}

export interface SavingsGoal {
  id: number
  name: string
  targetCentavos: number
  currentCentavos: number
  targetDate: string | null
  monthlyContributionCentavos: number
}

export type NewSavingsGoal = Omit<SavingsGoal, 'id'>
