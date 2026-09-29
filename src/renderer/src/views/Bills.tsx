import { useEffect, useState } from 'react'
import type { Bill, BillFrequency, Category, Account, DurationUnit } from '@shared/types'
import { formatPHP, pesosToCentavos, centavosToPesos } from '@shared/money'
import Field from '../components/Field'

const FREQUENCIES: BillFrequency[] = ['Monthly', 'Weekly', 'Yearly', 'One-time']
const DURATION_UNITS: DurationUnit[] = ['Months', 'Weeks']

interface FormState {
  name: string
  amount: string
  dueDay: string
  frequency: BillFrequency
  categoryId: string
  accountId: string
  durationValue: string
  durationUnit: DurationUnit
}

function emptyForm(): FormState {
  return {
    name: '',
    amount: '',
    dueDay: '1',
    frequency: 'Monthly',
    categoryId: '',
    accountId: '',
    durationValue: '',
    durationUnit: 'Months'
  }
}

export default function Bills(): JSX.Element {
  const [bills, setBills] = useState<Bill[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [form, setForm] = useState<FormState>(emptyForm())
  const [editingId, setEditingId] = useState<number | null>(null)

  async function refresh(): Promise<void> {
    setBills(await window.api.bills.list())
  }

  useEffect(() => {
    refresh()
    window.api.categories.list().then(setCategories)
    window.api.accounts.list().then(setAccounts)
  }, [])

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!form.name || !form.amount) return

    const payload = {
      name: form.name,
      amountCentavos: pesosToCentavos(Number(form.amount)),
      dueDay: Number(form.dueDay),
      frequency: form.frequency,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      accountId: form.accountId ? Number(form.accountId) : null,
      durationValue: form.durationValue ? Number(form.durationValue) : null,
      durationUnit: form.durationValue ? form.durationUnit : null
    }

    if (editingId != null) {
      const existing = bills.find((b) => b.id === editingId)
      await window.api.bills.update({
        ...payload,
        id: editingId,
        lastPaidDate: existing?.lastPaidDate ?? null
      })
    } else {
      await window.api.bills.create(payload)
    }

    setForm(emptyForm())
    setEditingId(null)
    refresh()
  }

  function handleEdit(bill: Bill): void {
    setEditingId(bill.id)
    setForm({
      name: bill.name,
      amount: String(centavosToPesos(bill.amountCentavos)),
      dueDay: String(bill.dueDay),
      frequency: bill.frequency,
      categoryId: bill.categoryId != null ? String(bill.categoryId) : '',
      accountId: bill.accountId != null ? String(bill.accountId) : '',
      durationValue: bill.durationValue != null ? String(bill.durationValue) : '',
      durationUnit: bill.durationUnit ?? 'Months'
    })
  }

  async function handleDelete(id: number): Promise<void> {
    await window.api.bills.delete(id)
    refresh()
  }

  async function handleMarkPaid(id: number): Promise<void> {
    const createExpense = window.confirm('Also record this as an expense transaction?')
    await window.api.bills.markPaid(id, createExpense)
    refresh()
  }

  function categoryName(id: number | null): string {
    if (id == null) return '—'
    return categories.find((c) => c.id === id)?.name ?? '—'
  }

  function accountName(id: number | null): string {
    if (id == null) return '—'
    return accounts.find((a) => a.id === id)?.name ?? '—'
  }

  return (
    <div className="view">
      <h1>Bills</h1>

      <form className="quick-add" onSubmit={handleSubmit}>
        <Field label="Bill Name">
          <input
            type="text"
            placeholder="e.g. Mortgage"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </Field>
        <Field label="Amount">
          <input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            required
          />
        </Field>
        <Field label="Due Day">
          <input
            type="number"
            min="1"
            max="31"
            value={form.dueDay}
            onChange={(e) => setForm({ ...form, dueDay: e.target.value })}
            required
          />
        </Field>
        <Field label="Frequency">
          <select
            value={form.frequency}
            onChange={(e) => setForm({ ...form, frequency: e.target.value as BillFrequency })}
          >
            {FREQUENCIES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Category">
          <select
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
          >
            <option value="">None</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Account">
          <select
            value={form.accountId}
            onChange={(e) => setForm({ ...form, accountId: e.target.value })}
          >
            <option value="">None</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Runs For (e.g. Buy Now Pay Later term)">
          <div className="field-group">
            <input
              type="number"
              min="1"
              placeholder="Number"
              value={form.durationValue}
              onChange={(e) => setForm({ ...form, durationValue: e.target.value })}
            />
            <select
              value={form.durationUnit}
              onChange={(e) => setForm({ ...form, durationUnit: e.target.value as DurationUnit })}
            >
              {DURATION_UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
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
        {bills.map((bill) => (
          <div key={bill.id} className="card">
            <div className="card-label">
              {bill.name} <span className="tag">{bill.status}</span>
            </div>
            <div className="card-value">{formatPHP(bill.amountCentavos)}</div>
            <div className="card-sub">
              Due: {bill.dueDay} · {bill.frequency}
            </div>
            <div className="card-sub">
              {categoryName(bill.categoryId)} · {accountName(bill.accountId)}
            </div>
            {bill.durationValue != null && (
              <div className="card-sub">
                Runs for {bill.durationValue} {bill.durationUnit}
              </div>
            )}
            <div className="card-actions">
              {bill.status !== 'Paid' && (
                <button onClick={() => handleMarkPaid(bill.id)}>Mark Paid</button>
              )}
              <button onClick={() => handleEdit(bill)}>Edit</button>
              <button onClick={() => handleDelete(bill.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
