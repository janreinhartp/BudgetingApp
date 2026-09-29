import { useEffect, useState } from 'react'
import type { Account, AccountType } from '@shared/types'
import { formatPHP, pesosToCentavos, centavosToPesos } from '@shared/money'
import Field from '../components/Field'

const ACCOUNT_TYPES: AccountType[] = ['Cash', 'Bank', 'E-Wallet', 'Credit Card']

interface FormState {
  name: string
  type: AccountType
  balance: string
  creditLimit: string
  notes: string
}

function emptyForm(): FormState {
  return { name: '', type: 'Bank', balance: '0', creditLimit: '', notes: '' }
}

export default function Accounts(): JSX.Element {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [form, setForm] = useState<FormState>(emptyForm())
  const [editingId, setEditingId] = useState<number | null>(null)

  async function refresh(): Promise<void> {
    setAccounts(await window.api.accounts.list())
  }

  useEffect(() => {
    refresh()
  }, [])

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!form.name) return

    const payload = {
      name: form.name,
      type: form.type,
      balanceCentavos: pesosToCentavos(Number(form.balance || '0')),
      creditLimitCentavos: form.creditLimit ? pesosToCentavos(Number(form.creditLimit)) : null,
      notes: form.notes || null
    }

    if (editingId != null) {
      await window.api.accounts.update({ ...payload, id: editingId })
    } else {
      await window.api.accounts.create(payload)
    }

    setForm(emptyForm())
    setEditingId(null)
    refresh()
  }

  function handleEdit(a: Account): void {
    setEditingId(a.id)
    setForm({
      name: a.name,
      type: a.type,
      balance: String(centavosToPesos(a.balanceCentavos)),
      creditLimit: a.creditLimitCentavos != null ? String(centavosToPesos(a.creditLimitCentavos)) : '',
      notes: a.notes ?? ''
    })
  }

  async function handleDelete(id: number): Promise<void> {
    await window.api.accounts.delete(id)
    refresh()
  }

  return (
    <div className="view">
      <h1>Accounts</h1>

      <form className="quick-add" onSubmit={handleSubmit}>
        <Field label="Account Name">
          <input
            type="text"
            placeholder="e.g. BPI Savings"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </Field>
        <Field label="Type">
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as AccountType })}
          >
            {ACCOUNT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Balance">
          <input
            type="number"
            step="0.01"
            value={form.balance}
            onChange={(e) => setForm({ ...form, balance: e.target.value })}
          />
        </Field>
        {form.type === 'Credit Card' && (
          <Field label="Credit Limit">
            <input
              type="number"
              step="0.01"
              value={form.creditLimit}
              onChange={(e) => setForm({ ...form, creditLimit: e.target.value })}
            />
          </Field>
        )}
        <Field label="Notes">
          <input
            type="text"
            placeholder="Optional"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </Field>
        <button type="submit">{editingId != null ? 'Update' : 'Add'}</button>
        {editingId != null && (
          <button
            type="button"
            onClick={() => {
              setEditingId(null)
              setForm(emptyForm())
            }}
          >
            Cancel
          </button>
        )}
      </form>

      <div className="card-grid">
        {accounts.map((a) => (
          <div key={a.id} className="card">
            <div className="card-label">
              {a.name} <span className="tag">{a.type}</span>
            </div>
            <div className="card-value">{formatPHP(a.balanceCentavos)}</div>
            {a.type === 'Credit Card' && a.creditLimitCentavos != null && (
              <div className="card-sub">
                Available credit: {formatPHP(a.creditLimitCentavos - a.balanceCentavos)}
              </div>
            )}
            <div className="card-actions">
              <button onClick={() => handleEdit(a)}>Edit</button>
              <button onClick={() => handleDelete(a.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
