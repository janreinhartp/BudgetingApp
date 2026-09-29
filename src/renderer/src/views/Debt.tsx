import { useEffect, useState } from 'react'
import type { Account, Debt, DebtSummary, Payment } from '@shared/types'
import { formatPHP, pesosToCentavos, centavosToPesos } from '@shared/money'
import ProgressBar from '../components/ProgressBar'
import Card from '../components/Card'
import Field from '../components/Field'

interface FormState {
  name: string
  originalBalance: string
  currentBalance: string
  minimumPayment: string
  plannedPayment: string
  dueDay: string
  accountId: string
}

function emptyForm(): FormState {
  return {
    name: '',
    originalBalance: '',
    currentBalance: '',
    minimumPayment: '',
    plannedPayment: '',
    dueDay: '',
    accountId: ''
  }
}

export default function DebtView(): JSX.Element {
  const [debts, setDebts] = useState<Debt[]>([])
  const [summary, setSummary] = useState<DebtSummary | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [form, setForm] = useState<FormState>(emptyForm())
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [payingDebt, setPayingDebt] = useState<Debt | null>(null)
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10))
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentAccountId, setPaymentAccountId] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [paymentError, setPaymentError] = useState('')
  const [expandedHistory, setExpandedHistory] = useState<number | null>(null)
  const [paymentHistory, setPaymentHistory] = useState<Record<number, Payment[]>>({})

  async function refresh(): Promise<void> {
    setDebts(await window.api.debts.list())
    setSummary(await window.api.debts.summary())
  }

  useEffect(() => {
    refresh()
    window.api.accounts.list().then(setAccounts)
  }, [])

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!form.name) return

    const payload = {
      name: form.name,
      originalBalanceCentavos: pesosToCentavos(Number(form.originalBalance || '0')),
      currentBalanceCentavos: pesosToCentavos(Number(form.currentBalance || '0')),
      minimumPaymentCentavos: pesosToCentavos(Number(form.minimumPayment || '0')),
      plannedPaymentCentavos: pesosToCentavos(Number(form.plannedPayment || '0')),
      dueDay: form.dueDay ? Number(form.dueDay) : null,
      accountId: form.accountId ? Number(form.accountId) : null
    }

    if (editingId != null) {
      await window.api.debts.update({ ...payload, id: editingId })
    } else {
      await window.api.debts.create(payload)
    }

    setForm(emptyForm())
    setEditingId(null)
    setShowForm(false)
    refresh()
  }

  function handleEdit(debt: Debt): void {
    setEditingId(debt.id)
    setForm({
      name: debt.name,
      originalBalance: String(centavosToPesos(debt.originalBalanceCentavos)),
      currentBalance: String(centavosToPesos(debt.currentBalanceCentavos)),
      minimumPayment: String(centavosToPesos(debt.minimumPaymentCentavos)),
      plannedPayment: String(centavosToPesos(debt.plannedPaymentCentavos)),
      dueDay: debt.dueDay != null ? String(debt.dueDay) : '',
      accountId: debt.accountId != null ? String(debt.accountId) : ''
    })
  }

  async function handleDelete(id: number): Promise<void> {
    await window.api.debts.delete(id)
    refresh()
  }

  function handlePay(debt: Debt): void {
    setPayingDebt(debt)
    setPaymentDate(new Date().toISOString().slice(0, 10))
    const suggested = debt.plannedPaymentCentavos || debt.minimumPaymentCentavos
    setPaymentAmount(String(centavosToPesos(Math.min(suggested || debt.currentBalanceCentavos, debt.currentBalanceCentavos))))
    setPaymentAccountId(debt.accountId != null ? String(debt.accountId) : '')
    setPaymentNotes('')
    setPaymentError('')
  }

  async function handlePaymentSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!payingDebt) return
    try {
      await window.api.debts.pay(payingDebt.id, {
        date: paymentDate,
        amountCentavos: pesosToCentavos(Number(paymentAmount)),
        accountId: paymentAccountId ? Number(paymentAccountId) : null,
        notes: paymentNotes || null
      })
      setPayingDebt(null)
      refresh()
      if (expandedHistory === payingDebt.id) {
        window.api.debts.payments(payingDebt.id).then((items) =>
          setPaymentHistory((history) => ({ ...history, [payingDebt.id]: items }))
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
    const payments = await window.api.debts.payments(id)
    setPaymentHistory((history) => ({ ...history, [id]: payments }))
  }

  function accountName(id: number | null): string {
    if (id == null) return '—'
    return accounts.find((a) => a.id === id)?.name ?? '—'
  }

  return (
    <div className="view">
      <div className="dashboard-header">
        <h1>Debt</h1>
        <button onClick={() => { setEditingId(null); setForm(emptyForm()); setShowForm(true) }}>Add Debt</button>
      </div>

      {summary && (
        <section className="card-grid">
          <Card label="Total Debt" value={formatPHP(summary.totalDebtCentavos)} tone="negative" />
          <Card
            label="Monthly Debt Payments"
            value={formatPHP(summary.monthlyDebtPaymentsCentavos)}
          />
          <Card
            label="Total Paid Off"
            value={formatPHP(
              debts.reduce((t, d) => t + (d.originalBalanceCentavos - d.currentBalanceCentavos), 0)
            )}
            tone="positive"
          />
        </section>
      )}

      {showForm && <form className="quick-add" onSubmit={handleSubmit}>
        <Field label="Debt Name">
          <input
            type="text"
            placeholder="e.g. BPI Credit Card"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </Field>
        <Field label="Original Balance">
          <input
            type="number"
            step="0.01"
            value={form.originalBalance}
            onChange={(e) => setForm({ ...form, originalBalance: e.target.value })}
          />
        </Field>
        <Field label="Current Balance">
          <input
            type="number"
            step="0.01"
            value={form.currentBalance}
            onChange={(e) => setForm({ ...form, currentBalance: e.target.value })}
          />
        </Field>
        <Field label="Minimum Payment">
          <input
            type="number"
            step="0.01"
            value={form.minimumPayment}
            onChange={(e) => setForm({ ...form, minimumPayment: e.target.value })}
          />
        </Field>
        <Field label="Planned Payment">
          <input
            type="number"
            step="0.01"
            value={form.plannedPayment}
            onChange={(e) => setForm({ ...form, plannedPayment: e.target.value })}
          />
        </Field>
        <Field label="Due Day">
          <input
            type="number"
            min="1"
            max="31"
            value={form.dueDay}
            onChange={(e) => setForm({ ...form, dueDay: e.target.value })}
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
        {debts.length === 0 && <p className="empty">No debts yet. Add your first debt.</p>}
        {debts.map((debt) => {
          const paidOff = debt.originalBalanceCentavos - debt.currentBalanceCentavos
          const percentagePaid =
            debt.originalBalanceCentavos > 0
              ? Math.round((paidOff / debt.originalBalanceCentavos) * 100)
              : 0
          return (
            <div key={debt.id} className="card">
              <div className="card-label">{debt.name}</div>
              <div className="card-value">{formatPHP(debt.currentBalanceCentavos)}</div>
              <div className="card-sub">Original: {formatPHP(debt.originalBalanceCentavos)}</div>
              <div className="card-sub">Planned payment: {formatPHP(debt.plannedPaymentCentavos)}</div>
              <div className="card-sub">Account: {accountName(debt.accountId)}</div>
              <ProgressBar percentage={percentagePaid} />
              <div className="card-sub">{percentagePaid}% paid off</div>
              <div className="card-actions">
                {debt.currentBalanceCentavos > 0 && <button onClick={() => handlePay(debt)}>Record Payment</button>}
                <button onClick={() => { handleEdit(debt); setShowForm(true) }}>Edit</button>
                <button onClick={() => void toggleHistory(debt.id)}>Payment History</button>
                <button onClick={() => handleDelete(debt.id)}>Delete</button>
              </div>
              {expandedHistory === debt.id && (
                <div className="payment-history">
                  <strong>Payment History</strong>
                  {(paymentHistory[debt.id] ?? []).length === 0 ? (
                    <p className="empty">No payments recorded yet.</p>
                  ) : (
                    paymentHistory[debt.id].map((payment) => (
                      <div className="card-sub" key={payment.id}>
                        {payment.date} · {formatPHP(payment.amountCentavos)}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {payingDebt && (
        <div className="modal-backdrop">
          <form className="payment-dialog" onSubmit={handlePaymentSubmit}>
            <h2>Record Payment · {payingDebt.name}</h2>
            <div className="card-sub">Remaining balance {formatPHP(payingDebt.currentBalanceCentavos)}</div>
            <Field label="Amount">
              <input type="number" min="0.01" step="0.01" max={centavosToPesos(payingDebt.currentBalanceCentavos)}
                value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} required />
            </Field>
            <Field label="Payment Date">
              <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} required />
            </Field>
            <Field label="Paid From">
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
              <button type="button" onClick={() => setPayingDebt(null)}>Cancel</button>
              <button type="submit">Record Payment</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
