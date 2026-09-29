import { ipcMain, BrowserWindow } from 'electron'
import * as accountsService from './services/accountsService'
import * as categoriesService from './services/categoriesService'
import * as transactionsService from './services/transactionsService'
import * as dashboardService from './services/dashboardService'
import * as budgetsService from './services/budgetsService'
import * as billsService from './services/billsService'
import * as settingsService from './services/settingsService'
import * as cutoffService from './services/cutoffService'
import * as debtsService from './services/debtsService'
import * as savingsService from './services/savingsService'
import * as backupService from './services/backupService'
import * as csvService from './services/csvService'
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

/** Registers all ipcMain handlers exposed to the renderer via the preload API. */
export function registerIpcHandlers(): void {
  ipcMain.handle('accounts:list', () => accountsService.listAccounts())
  ipcMain.handle('accounts:create', (_e, account: Omit<Account, 'id'>) =>
    accountsService.createAccount(account)
  )
  ipcMain.handle('accounts:update', (_e, account: Account) =>
    accountsService.updateAccount(account)
  )
  ipcMain.handle('accounts:delete', (_e, id: number) => accountsService.deleteAccount(id))

  ipcMain.handle('categories:list', () => categoriesService.listCategories())
  ipcMain.handle('categories:create', (_e, name: string, group: Category['group']) =>
    categoriesService.createCategory(name, group)
  )
  ipcMain.handle('categories:delete', (_e, id: number) => categoriesService.deleteCategory(id))

  ipcMain.handle('transactions:list', (_e, filter: TransactionFilter | undefined) =>
    transactionsService.listTransactions(filter)
  )
  ipcMain.handle('transactions:create', (_e, transaction: NewTransaction) =>
    transactionsService.createTransaction(transaction)
  )
  ipcMain.handle('transactions:update', (_e, transaction: Transaction) =>
    transactionsService.updateTransaction(transaction)
  )
  ipcMain.handle('transactions:delete', (_e, id: number) =>
    transactionsService.deleteTransaction(id)
  )

  ipcMain.handle('dashboard:summary', (_e, month: string | undefined) =>
    dashboardService.getDashboardSummary(month)
  )

  ipcMain.handle('budgets:list', (_e, month: string) => budgetsService.getBudgetLines(month))
  ipcMain.handle('budgets:set', (_e, month: string, categoryId: number, budgetCentavos: number) =>
    budgetsService.setBudget(month, categoryId, budgetCentavos)
  )

  ipcMain.handle('cutoff:summary', (_e, month: string) => cutoffService.getCutoffSummary(month))

  ipcMain.handle('bills:list', () => billsService.listBills())
  ipcMain.handle('bills:create', (_e, bill: NewBill) => billsService.createBill(bill))
  ipcMain.handle('bills:update', (_e, bill: Omit<Bill, 'status' | 'paidCentavos' | 'remainingCentavos'>) =>
    billsService.updateBill(bill)
  )
  ipcMain.handle('bills:delete', (_e, id: number) => billsService.deleteBill(id))
  ipcMain.handle('bills:payments', (_e, id: number) => billsService.listBillPayments(id))
  ipcMain.handle('bills:pay', (_e, id: number, payment: NewPayment) =>
    billsService.recordBillPayment(id, payment)
  )

  ipcMain.handle('settings:get', () => settingsService.getSettings())
  ipcMain.handle('settings:update', (_e, partial: Partial<AppSettings>) =>
    settingsService.updateSettings(partial)
  )

  ipcMain.handle('debts:list', () => debtsService.listDebts())
  ipcMain.handle('debts:summary', () => debtsService.getDebtSummary())
  ipcMain.handle('debts:create', (_e, debt: NewDebt) => debtsService.createDebt(debt))
  ipcMain.handle('debts:update', (_e, debt: Debt) => debtsService.updateDebt(debt))
  ipcMain.handle('debts:delete', (_e, id: number) => debtsService.deleteDebt(id))
  ipcMain.handle('debts:payments', (_e, id: number) => debtsService.listDebtPayments(id))
  ipcMain.handle('debts:pay', (_e, id: number, payment: NewPayment) =>
    debtsService.recordDebtPayment(id, payment)
  )

  ipcMain.handle('savings:list', () => savingsService.listSavingsGoals())
  ipcMain.handle('savings:create', (_e, goal: NewSavingsGoal) =>
    savingsService.createSavingsGoal(goal)
  )
  ipcMain.handle('savings:update', (_e, goal: SavingsGoal) =>
    savingsService.updateSavingsGoal(goal)
  )
  ipcMain.handle('savings:delete', (_e, id: number) => savingsService.deleteSavingsGoal(id))

  ipcMain.handle('backup:export', (e) =>
    backupService.exportDatabase(BrowserWindow.fromWebContents(e.sender) ?? undefined)
  )
  ipcMain.handle('backup:import', (e) =>
    backupService.importDatabase(BrowserWindow.fromWebContents(e.sender) ?? undefined)
  )
  ipcMain.handle('csv:exportTransactions', (e) =>
    csvService.exportTransactionsCsv(BrowserWindow.fromWebContents(e.sender) ?? undefined)
  )
}
