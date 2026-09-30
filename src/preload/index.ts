import { contextBridge, ipcRenderer } from 'electron'
import type {
  Account,
  AppSettings,
  Bill,
  Category,
  Debt,
  NewBill,
  NewDebt,
  NewPayment,
  NewSavingsGoal,
  NewTransaction,
  SavingsGoal,
  Transaction,
  TransactionFilter
} from '@shared/types'
import type { BudgetingApi } from '@shared/api'

const api: BudgetingApi = {
  accounts: {
    list: (): Promise<Account[]> => ipcRenderer.invoke('accounts:list'),
    create: (account: Omit<Account, 'id'>): Promise<Account> =>
      ipcRenderer.invoke('accounts:create', account),
    update: (account: Account): Promise<void> => ipcRenderer.invoke('accounts:update', account),
    delete: (id: number): Promise<void> => ipcRenderer.invoke('accounts:delete', id)
  },
  categories: {
    list: (): Promise<Category[]> => ipcRenderer.invoke('categories:list'),
    create: (name: string, group: Category['group']): Promise<Category> =>
      ipcRenderer.invoke('categories:create', name, group),
    delete: (id: number): Promise<void> => ipcRenderer.invoke('categories:delete', id)
  },
  transactions: {
    list: (filter?: TransactionFilter): Promise<Transaction[]> =>
      ipcRenderer.invoke('transactions:list', filter),
    create: (transaction: NewTransaction): Promise<Transaction> =>
      ipcRenderer.invoke('transactions:create', transaction),
    update: (transaction: Transaction): Promise<void> =>
      ipcRenderer.invoke('transactions:update', transaction),
    delete: (id: number): Promise<void> => ipcRenderer.invoke('transactions:delete', id)
  },
  dashboard: {
    summary: (month?: string) => ipcRenderer.invoke('dashboard:summary', month)
  },
  budgets: {
    list: (month: string) => ipcRenderer.invoke('budgets:list', month),
    set: (month: string, categoryId: number, budgetCentavos: number) =>
      ipcRenderer.invoke('budgets:set', month, categoryId, budgetCentavos)
  },
  cutoff: {
    summary: (month: string) => ipcRenderer.invoke('cutoff:summary', month)
  },
  bills: {
    list: (): Promise<Bill[]> => ipcRenderer.invoke('bills:list'),
    create: (bill: NewBill): Promise<Bill> => ipcRenderer.invoke('bills:create', bill),
    update: (bill: Omit<Bill, 'status' | 'paidCentavos' | 'remainingCentavos'>): Promise<void> =>
      ipcRenderer.invoke('bills:update', bill),
    delete: (id: number): Promise<void> => ipcRenderer.invoke('bills:delete', id),
    payments: (id: number) => ipcRenderer.invoke('bills:payments', id),
    pay: (id: number, payment: NewPayment) => ipcRenderer.invoke('bills:pay', id, payment)
  },
  settings: {
    get: (): Promise<AppSettings> => ipcRenderer.invoke('settings:get'),
    update: (partial: Partial<AppSettings>): Promise<AppSettings> =>
      ipcRenderer.invoke('settings:update', partial)
  },
  debts: {
    list: (): Promise<Debt[]> => ipcRenderer.invoke('debts:list'),
    summary: () => ipcRenderer.invoke('debts:summary'),
    create: (debt: NewDebt): Promise<Debt> => ipcRenderer.invoke('debts:create', debt),
    update: (debt: Debt): Promise<void> => ipcRenderer.invoke('debts:update', debt),
    delete: (id: number): Promise<void> => ipcRenderer.invoke('debts:delete', id),
    payments: (id: number) => ipcRenderer.invoke('debts:payments', id),
    pay: (id: number, payment: NewPayment) => ipcRenderer.invoke('debts:pay', id, payment)
  },
  savings: {
    list: (): Promise<SavingsGoal[]> => ipcRenderer.invoke('savings:list'),
    create: (goal: NewSavingsGoal): Promise<SavingsGoal> =>
      ipcRenderer.invoke('savings:create', goal),
    update: (goal: SavingsGoal): Promise<void> => ipcRenderer.invoke('savings:update', goal),
    delete: (id: number): Promise<void> => ipcRenderer.invoke('savings:delete', id)
  },
  backup: {
    exportDatabase: () => ipcRenderer.invoke('backup:export'),
    importDatabase: () => ipcRenderer.invoke('backup:import'),
    exportTransactionsCsv: () => ipcRenderer.invoke('csv:exportTransactions')
  }
}

contextBridge.exposeInMainWorld('api', api)
