import { useEffect, useMemo, useState } from 'react'
import type { Account, Category, Transaction, TransactionType } from '@shared/types'
import type { CutoffAssignment } from '@shared/calculations'
import { formatPHP, pesosToCentavos, centavosToPesos } from '@shared/money'
import Field from '../components/Field'

const TRANSACTION_TYPES: TransactionType[] = [
  'Income',
  'Expense',
  'Debt Payment',
  'Savings',
  'Transfer'
]

const CUTOFF_OPTIONS: CutoffAssignment[] = ['Unassigned', 'First', 'Second', 'Both']

interface FormState {
  date: string
  type: TransactionType
  categoryId: string
  description: string
  amount: string
  accountId: string
  notes: string
  cutoff: CutoffAssignment
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function emptyForm(): FormState {
  return {
    date: todayIso(),
    type: 'Expense',
    categoryId: '',
    description: '',
    amount: '',
    accountId: '',
    notes: '',
    cutoff: 'Unassigned'
  }
}

export default function Transactions(): JSX.Element {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [form, setForm] = useState<FormState>(emptyForm())
  const [editingId, setEditingId] = useState<number | null>(null)

  const [monthFilter, setMonthFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [accountFilter, setAccountFilter] = useState('')
  const [search, setSearch] = useState('')

  async function refresh(): Promise<void> {
    const list = await window.api.transactions.list({
      month: monthFilter || undefined,
      categoryId: categoryFilter ? Number(categoryFilter) : undefined,
      accountId: accountFilter ? Number(accountFilter) : undefined,
      search: search || undefined
    })
    setTransactions(list)
  }

  useEffect(() => {
    window.api.categories.list().then(setCategories)
    window.api.accounts.list().then(setAccounts)
  }, [])

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthFilter, categoryFilter, accountFilter, search])

  const categoryOptions = useMemo(() => categories, [categories])

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!form.date || !form.type || !form.amount) return

    const payload = {
      date: form.date,
      type: form.type,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      description: form.description || null,
      amountCentavos: pesosToCentavos(Number(form.amount)),
      accountId: form.accountId ? Number(form.accountId) : null,
      notes: form.notes || null,
      cutoff: form.cutoff
    }

    if (editingId != null) {
      await window.api.transactions.update({ ...payload, id: editingId })
    } else {
      await window.api.transactions.create(payload)
    }

    setForm(emptyForm())
    setEditingId(null)
    refresh()
  }

  function handleEdit(t: Transaction): void {
    setEditingId(t.id)
    setForm({
      date: t.date,
      type: t.type,
      categoryId: t.categoryId != null ? String(t.categoryId) : '',
      description: t.description ?? '',
      amount: String(centavosToPesos(t.amountCentavos)),
      accountId: t.accountId != null ? String(t.accountId) : '',
      notes: t.notes ?? '',
      cutoff: t.cutoff
    })
  }

  async function handleDelete(id: number): Promise<void> {
    await window.api.transactions.delete(id)
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
      <h1>Transactions</h1>

      <form className="quick-add" onSubmit={handleSubmit}>
        <Field label="Date">
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            required
          />
        </Field>
        <Field label="Type">
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as TransactionType })}
          >
            {TRANSACTION_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Category">
          <select
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            required
          >
            <option value="">Category...</option>
            {categoryOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
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
        <Field label="Description">
          <input
            type="text"
            placeholder="Optional"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
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
        <Field label="Notes">
          <input
            type="text"
            placeholder="Optional"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </Field>
        <Field label="Cutoff">
          <select
            value={form.cutoff}
            onChange={(e) => setForm({ ...form, cutoff: e.target.value as typeof form.cutoff })}
          >
            {CUTOFF_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c} Cutoff
              </option>
            ))}
          </select>
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

      <div className="filters">
        <input
          type="month"
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
        />
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">All categories</option>
          {categoryOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select value={accountFilter} onChange={(e) => setAccountFilter(e.target.value)}>
          <option value="">All accounts</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Search description/notes"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Category</th>
            <th>Description</th>
            <th>Amount</th>
            <th>Account</th>
            <th>Notes</th>
            <th>Cutoff</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => (
            <tr key={t.id}>
              <td>{t.date}</td>
              <td>{t.type}</td>
              <td>{categoryName(t.categoryId)}</td>
              <td>{t.description ?? '—'}</td>
              <td>{formatPHP(t.amountCentavos)}</td>
              <td>{accountName(t.accountId)}</td>
              <td>{t.notes ?? '—'}</td>
              <td>{t.cutoff}</td>
              <td>
                {t.isPayment ? (
                  <span className="tag">Linked payment</span>
                ) : (
                  <>
                    <button onClick={() => handleEdit(t)}>Edit</button>
                    <button onClick={() => handleDelete(t.id)}>Delete</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
