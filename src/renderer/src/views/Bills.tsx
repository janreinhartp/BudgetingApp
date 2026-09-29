import { useEffect, useState } from 'react'
import type { Bill, BillFrequency, Category, Account, DurationUnit, Payment } from '@shared/types'
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
  const [showForm, setShowForm] = useState(false)
  const [payingBill, setPayingBill] = useState<Bill | null>(null)
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10))
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentAccountId, setPaymentAccountId] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [paymentError, setPaymentError] = useState('')
  const [expandedHistory, setExpandedHistory] = useState<number | null>(null)
  const [paymentHistory, setPaymentHistory] = useState<Record<number, Payment[]>>({})

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
    setShowForm(false)
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

  function handlePay(bill: Bill): void {
    setPayingBill(bill)
    setPaymentDate(new Date().toISOString().slice(0, 10))
    setPaymentAmount(String(centavosToPesos(bill.remainingCentavos)))
    setPaymentAccountId(bill.accountId != null ? String(bill.accountId) : '')
    setPaymentNotes('')
    setPaymentError('')
  }

  async function handlePaymentSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!payingBill) return
    try {
      await window.api.bills.pay(payingBill.id, {
        date: paymentDate,
        amountCentavos: pesosToCentavos(Number(paymentAmount)),
        accountId: paymentAccountId ? Number(paymentAccountId) : null,
        notes: paymentNotes || null
      })
      setPayingBill(null)
      refresh()
      if (expandedHistory === payingBill.id) {
        window.api.bills.payments(payingBill.id).then((items) =>
          setPaymentHistory((history) => ({ ...history, [payingBill.id]: items }))
        )
      }
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : 'Could not record payment')
    }
  }

  async function toggleHistory(id: number): Promise<void> {
    if (expandedHistory === id) {
      setExpandedHistory(null)
      return
    }
    setExpandedHistory(id)
    const payments = await window.api.bills.payments(id)
    setPaymentHistory((history) => ({ ...history, [id]: payments }))
  }

  function openAddBill(): void {
    setEditingId(null)
    setForm(emptyForm())
    setShowForm(true)
  }

  function handleMarkPaid(id: number): void {
    const bill = bills.find((item) => item.id === id)
    if (bill) handlePay(bill)
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
      <div className="dashboard-header">
        <h1>Bills</h1>
        <button onClick={openAddBill}>Add Bill</button>
      </div>

      {showForm && <form className="quick-add" onSubmit={handleSubmit}>
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
              setShowForm(false)
            }}
          >
            Cancel
          </button>
        )}
      </form>
      }

      <div className="card-grid">
        {bills.length === 0 && <p className="empty">No bills yet. Add your first bill.</p>}
        {bills.map((bill) => (
          <div key={bill.id} className="card">
            <div className="card-label">
              {bill.name} <span className="tag">{bill.status}</span>
            </div>
            <div className="card-value">{formatPHP(bill.remainingCentavos)}</div>
            {bill.paidCentavos > 0 && (
              <div className="card-sub">
                Paid {formatPHP(bill.paidCentavos)} · Remaining {formatPHP(bill.remainingCentavos)}
              </div>
            )}
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
                <button onClick={() => handleMarkPaid(bill.id)}>Pay</button>
              )}
              <button onClick={() => { handleEdit(bill); setShowForm(true) }}>Edit</button>
              <button onClick={() => void toggleHistory(bill.id)}>Payment History</button>
              <button onClick={() => handleDelete(bill.id)}>Delete</button>
            </div>
            {expandedHistory === bill.id && (
              <div className="payment-history">
                <strong>Payment History</strong>
                {(paymentHistory[bill.id] ?? []).length === 0 ? (
                  <p className="empty">No payments recorded yet.</p>
                ) : (
                  paymentHistory[bill.id].map((payment) => (
                    <div className="card-sub" key={payment.id}>
                      {payment.date} · {formatPHP(payment.amountCentavos)}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {payingBill && (
        <div className="modal-backdrop">
          <form className="payment-dialog" onSubmit={handlePaymentSubmit}>
            <h2>Pay {payingBill.name}</h2>
            <div className="card-sub">Remaining {formatPHP(payingBill.remainingCentavos)}</div>
            <Field label="Amount">
              <input type="number" min="0.01" step="0.01" max={centavosToPesos(payingBill.remainingCentavos)}
                value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} required />
            </Field>
            <Field label="Payment Date">
              <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} required />
            </Field>
            <Field label="Account">
              <select value={paymentAccountId} onChange={(e) => setPaymentAccountId(e.target.value)}>
                <option value="">Choose account (optional)</option>
                {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
              </select>
            </Field>
            <Field label="Notes">
              <input value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} />
            </Field>
            {paymentError && <p className="error">{paymentError}</p>}
            <div className="card-actions">
              <button type="button" onClick={() => setPayingBill(null)}>Cancel</button>
              <button type="submit">Record Payment</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
