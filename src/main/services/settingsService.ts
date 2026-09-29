import { getDatabase } from '../database/db'
import type { AppSettings } from '@shared/types'

const DEFAULT_SETTINGS: AppSettings = {
  currency: 'PHP',
  monthlySalaryCentavos: 0,
  firstCutoffDay: 15,
  secondCutoffDay: 30,
  firstCutoffIncomeCentavos: 0,
  secondCutoffIncomeCentavos: 0,
  defaultAccountId: null,
  theme: 'light'
}

export function getSettings(): AppSettings {
  const rows = getDatabase().prepare('SELECT key, value FROM settings').all() as Array<{
    key: string
    value: string
  }>
  const stored = Object.fromEntries(rows.map((r) => [r.key, JSON.parse(r.value)]))
  return { ...DEFAULT_SETTINGS, ...stored }
}

export function updateSettings(partial: Partial<AppSettings>): AppSettings {
  const db = getDatabase()
  const upsert = db.prepare(
    `INSERT INTO settings (key, value) VALUES (@key, @value)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  )
  const applyAll = db.transaction((entries: Array<[string, unknown]>) => {
    for (const [key, value] of entries) upsert.run({ key, value: JSON.stringify(value) })
  })
  applyAll(Object.entries(partial))
  return getSettings()
}
