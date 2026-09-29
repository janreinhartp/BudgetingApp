import { dialog, BrowserWindow } from 'electron'
import { copyFileSync } from 'fs'
import { closeDatabase, getDatabase, getDatabasePath } from '../database/db'

export interface BackupResult {
  success: boolean
  message: string
}

export async function exportDatabase(window?: BrowserWindow): Promise<BackupResult> {
  const { canceled, filePath } = await dialog.showSaveDialog(window ?? undefined, {
    title: 'Export Database',
    defaultPath: 'budgeting-app-backup.sqlite3',
    filters: [{ name: 'SQLite Database', extensions: ['sqlite3'] }]
  })
  if (canceled || !filePath) return { success: false, message: 'Export cancelled.' }

  getDatabase().pragma('wal_checkpoint(TRUNCATE)') // flush WAL so the copy is complete
  copyFileSync(getDatabasePath(), filePath)
  return { success: true, message: `Database exported to ${filePath}` }
}

export async function importDatabase(window?: BrowserWindow): Promise<BackupResult> {
  const { canceled, filePaths } = await dialog.showOpenDialog(window ?? undefined, {
    title: 'Import Database',
    filters: [{ name: 'SQLite Database', extensions: ['sqlite3'] }],
    properties: ['openFile']
  })
  if (canceled || filePaths.length === 0) return { success: false, message: 'Import cancelled.' }

  closeDatabase()
  copyFileSync(filePaths[0], getDatabasePath())
  getDatabase() // reopen and re-apply schema in case the imported file predates it
  return { success: true, message: 'Database imported. Restart the app to see all changes.' }
}
