import { useEffect, useState } from 'react'
import type { SavingsGoal } from '@shared/types'
import { calculateSavingsProgress } from '@shared/calculations'
import { formatPHP, pesosToCentavos, centavosToPesos } from '@shared/money'
import ProgressBar from '../components/ProgressBar'
import Field from '../components/Field'

interface FormState {
  name: string
  target: string
  current: string
  targetDate: string
  monthlyContribution: string
}

function emptyForm(): FormState {
  return { name: '', target: '', current: '0', targetDate: '', monthlyContribution: '' }
}

export default function Savings(): JSX.Element {
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [form, setForm] = useState<FormState>(emptyForm())
  const [editingId, setEditingId] = useState<number | null>(null)

  async function refresh(): Promise<void> {
    setGoals(await window.api.savings.list())
  }

  useEffect(() => {
    refresh()
  }, [])

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!form.name || !form.target) return

    const payload = {
      name: form.name,
      targetCentavos: pesosToCentavos(Number(form.target)),
      currentCentavos: pesosToCentavos(Number(form.current || '0')),
      targetDate: form.targetDate || null,
      monthlyContributionCentavos: pesosToCentavos(Number(form.monthlyContribution || '0'))
    }

    if (editingId != null) {
      await window.api.savings.update({ ...payload, id: editingId })
    } else {
      await window.api.savings.create(payload)
    }

    setForm(emptyForm())
    setEditingId(null)
    refresh()
  }

  function handleEdit(goal: SavingsGoal): void {
    setEditingId(goal.id)
    setForm({
      name: goal.name,
      target: String(centavosToPesos(goal.targetCentavos)),
      current: String(centavosToPesos(goal.currentCentavos)),
      targetDate: goal.targetDate ?? '',
      monthlyContribution: String(centavosToPesos(goal.monthlyContributionCentavos))
    })
  }

  async function handleDelete(id: number): Promise<void> {
    await window.api.savings.delete(id)
    refresh()
  }

  return (
    <div className="view">
      <h1>Savings</h1>

      <form className="quick-add" onSubmit={handleSubmit}>
        <Field label="Goal Name">
          <input
            type="text"
            placeholder="e.g. Emergency Fund"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </Field>
        <Field label="Target Amount">
          <input
            type="number"
            step="0.01"
            value={form.target}
            onChange={(e) => setForm({ ...form, target: e.target.value })}
            required
          />
        </Field>
        <Field label="Current Amount">
          <input
            type="number"
            step="0.01"
            value={form.current}
            onChange={(e) => setForm({ ...form, current: e.target.value })}
          />
        </Field>
        <Field label="Target Date">
          <input
            type="date"
            value={form.targetDate}
            onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
          />
        </Field>
        <Field label="Monthly Contribution">
          <input
            type="number"
            step="0.01"
            value={form.monthlyContribution}
            onChange={(e) => setForm({ ...form, monthlyContribution: e.target.value })}
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
        {goals.map((goal) => {
          const progress = calculateSavingsProgress(goal)
          return (
            <div key={goal.id} className="card">
              <div className="card-label">{goal.name}</div>
              <div className="card-value">{formatPHP(goal.targetCentavos)}</div>
              <div className="card-sub">Current: {formatPHP(goal.currentCentavos)}</div>
              <div className="card-sub">Remaining: {formatPHP(progress.remainingCentavos)}</div>
              {goal.targetDate && <div className="card-sub">Target date: {goal.targetDate}</div>}
              <ProgressBar percentage={progress.percentageComplete} />
              <div className="card-sub">{progress.percentageComplete}% complete</div>
              <div className="card-actions">
                <button onClick={() => handleEdit(goal)}>Edit</button>
                <button onClick={() => handleDelete(goal.id)}>Delete</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
