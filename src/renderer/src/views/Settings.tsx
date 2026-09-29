import { useEffect, useState } from 'react'
import type { Account, AppSettings } from '@shared/types'
import { pesosToCentavos, centavosToPesos } from '@shared/money'

interface FormState {
  currency: string
  monthlySalary: string
  firstCutoffDay: string
  secondCutoffDay: string
  firstCutoffIncome: string
  secondCutoffIncome: string
  defaultAccountId: string
  theme: 'dark' | 'light'
}

function toForm(s: AppSettings): FormState {
  return {
    currency: s.currency,
    monthlySalary: String(centavosToPesos(s.monthlySalaryCentavos)),
    firstCutoffDay: String(s.firstCutoffDay),
    secondCutoffDay: String(s.secondCutoffDay),
    firstCutoffIncome: String(centavosToPesos(s.firstCutoffIncomeCentavos)),
    secondCutoffIncome: String(centavosToPesos(s.secondCutoffIncomeCentavos)),
    defaultAccountId: s.defaultAccountId != null ? String(s.defaultAccountId) : '',
    theme: s.theme
  }
}

export default function Settings(): JSX.Element {
  const [form, setForm] = useState<FormState | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    window.api.settings.get().then((s) => setForm(toForm(s)))
    window.api.accounts.list().then(setAccounts)
  }, [])

  async function handleSave(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!form) return

    const updated = await window.api.settings.update({
      currency: form.currency,
      monthlySalaryCentavos: pesosToCentavos(Number(form.monthlySalary || '0')),
      firstCutoffDay: Number(form.firstCutoffDay || '15'),
      secondCutoffDay: Number(form.secondCutoffDay || '30'),
      firstCutoffIncomeCentavos: pesosToCentavos(Number(form.firstCutoffIncome || '0')),
      secondCutoffIncomeCentavos: pesosToCentavos(Number(form.secondCutoffIncome || '0')),
      defaultAccountId: form.defaultAccountId ? Number(form.defaultAccountId) : null,
      theme: form.theme
    })
    document.documentElement.dataset.theme = updated.theme
    setMessage('Settings saved.')
  }

  async function handleExportDatabase(): Promise<void> {
    const result = await window.api.backup.exportDatabase()
    setMessage(result.message)
  }

  async function handleImportDatabase(): Promise<void> {
    if (!window.confirm('Importing will replace your current data. Continue?')) return
    const result = await window.api.backup.importDatabase()
    setMessage(result.message)
  }

  async function handleExportCsv(): Promise<void> {
    const result = await window.api.backup.exportTransactionsCsv()
    setMessage(result.message)
  }

  if (!form) return <div className="view">Loading settings...</div>

  return (
    <div className="view">
      <h1>Settings</h1>

      <form className="settings-form" onSubmit={handleSave}>
        <label>
          Currency
          <input
            type="text"
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
          />
        </label>
        <label>
          Monthly Salary
          <input
            type="number"
            step="0.01"
            value={form.monthlySalary}
            onChange={(e) => setForm({ ...form, monthlySalary: e.target.value })}
          />
        </label>
        <label>
          First Cutoff Date (day of month)
          <input
            type="number"
            min="1"
            max="31"
            value={form.firstCutoffDay}
            onChange={(e) => setForm({ ...form, firstCutoffDay: e.target.value })}
          />
        </label>
        <label>
          Second Cutoff Date (day of month)
          <input
            type="number"
            min="1"
            max="31"
            value={form.secondCutoffDay}
            onChange={(e) => setForm({ ...form, secondCutoffDay: e.target.value })}
          />
        </label>
        <label>
          First Cutoff Income
          <input
            type="number"
            step="0.01"
            value={form.firstCutoffIncome}
            onChange={(e) => setForm({ ...form, firstCutoffIncome: e.target.value })}
          />
        </label>
        <label>
          Second Cutoff Income
          <input
            type="number"
            step="0.01"
            value={form.secondCutoffIncome}
            onChange={(e) => setForm({ ...form, secondCutoffIncome: e.target.value })}
          />
        </label>
        <label>
          Default Account
          <select
            value={form.defaultAccountId}
            onChange={(e) => setForm({ ...form, defaultAccountId: e.target.value })}
          >
            <option value="">None</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Theme
          <select
            value={form.theme}
            onChange={(e) => setForm({ ...form, theme: e.target.value as 'dark' | 'light' })}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <button type="submit">Save Settings</button>
      </form>

      <section>
        <h2>Backup</h2>
        <div className="quick-add">
          <button onClick={handleExportDatabase}>Export Database</button>
          <button onClick={handleImportDatabase}>Import Database</button>
          <button onClick={handleExportCsv}>Export Transactions (CSV)</button>
        </div>
      </section>

      {message && <p className="empty">{message}</p>}
    </div>
  )
}
