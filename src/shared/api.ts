import type {
  Account,
  AppSettings,
  Bill,
  Category,
  CutoffSummary,
  BudgetLine,
  DashboardSummary,
  Debt,
  DebtSummary,
  NewBill,
  NewDebt,
  NewSavingsGoal,
  NewTransaction,
  SavingsGoal,
  Transaction,
  TransactionFilter
} from './types'

/** Shape of the API exposed to the renderer via contextBridge (see preload/index.ts). */
export interface BudgetingApi {
  accounts: {
    list: () => Promise<Account[]>
    create: (account: Omit<Account, 'id'>) => Promise<Account>
    update: (account: Account) => Promise<void>
    delete: (id: number) => Promise<void>
  }
  categories: {
    list: () => Promise<Category[]>
    create: (name: string, group: Category['group']) => Promise<Category>
    delete: (id: number) => Promise<void>
  }
  transactions: {
    list: (filter?: TransactionFilter) => Promise<Transaction[]>
    create: (transaction: NewTransaction) => Promise<Transaction>
    update: (transaction: Transaction) => Promise<void>
    delete: (id: number) => Promise<void>
  }
  dashboard: {
    summary: (month?: string) => Promise<DashboardSummary>
  }
  budgets: {
    list: (month: string) => Promise<BudgetLine[]>
    set: (month: string, categoryId: number, budgetCentavos: number) => Promise<void>
  }
  cutoff: {
    summary: (month: string) => Promise<CutoffSummary>
  }
  bills: {
    list: () => Promise<Bill[]>
    create: (bill: NewBill) => Promise<Bill>
    update: (bill: Omit<Bill, 'status'>) => Promise<void>
    delete: (id: number) => Promise<void>
    markPaid: (id: number, createExpenseTransaction: boolean) => Promise<void>
  }
  settings: {
    get: () => Promise<AppSettings>
    update: (partial: Partial<AppSettings>) => Promise<AppSettings>
  }
  debts: {
    list: () => Promise<Debt[]>
    summary: () => Promise<DebtSummary>
    create: (debt: NewDebt) => Promise<Debt>
    update: (debt: Debt) => Promise<void>
    delete: (id: number) => Promise<void>
  }
  savings: {
    list: () => Promise<SavingsGoal[]>
    create: (goal: NewSavingsGoal) => Promise<SavingsGoal>
    update: (goal: SavingsGoal) => Promise<void>
    delete: (id: number) => Promise<void>
  }
  backup: {
    exportDatabase: () => Promise<{ success: boolean; message: string }>
    importDatabase: () => Promise<{ success: boolean; message: string }>
    exportTransactionsCsv: () => Promise<{ success: boolean; message: string }>
  }
}

