import { dialog, BrowserWindow } from 'electron'
import { writeFileSync } from 'fs'
import { listTransactions } from './transactionsService'
import { listCategories } from './categoriesService'
import { listAccounts } from './accountsService'
import { centavosToPesos } from '@shared/money'
import type { BackupResult } from './backupService'

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

export async function exportTransactionsCsv(window?: BrowserWindow): Promise<BackupResult> {
  const { canceled, filePath } = await dialog.showSaveDialog(window ?? undefined, {
    title: 'Export Transactions to CSV',
    defaultPath: 'transactions.csv',
    filters: [{ name: 'CSV', extensions: ['csv'] }]
  })
  if (canceled || !filePath) return { success: false, message: 'Export cancelled.' }

  const transactions = listTransactions()
  const categories = new Map(listCategories().map((c) => [c.id, c.name]))
  const accounts = new Map(listAccounts().map((a) => [a.id, a.name]))

  const header = ['ID', 'Date', 'Type', 'Category', 'Description', 'Amount', 'Account', 'Notes']
  const rows = transactions.map((t) => [
    String(t.id),
    t.date,
    t.type,
    t.categoryId != null ? (categories.get(t.categoryId) ?? '') : '',
    t.description ?? '',
    centavosToPesos(t.amountCentavos).toFixed(2),
    t.accountId != null ? (accounts.get(t.accountId) ?? '') : '',
    t.notes ?? ''
  ])

  const csv = [header, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n')
  writeFileSync(filePath, csv, 'utf-8')
  return { success: true, message: `Exported ${transactions.length} transactions to ${filePath}` }
}
