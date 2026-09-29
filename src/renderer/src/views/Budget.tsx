import { useEffect, useState } from 'react'
import type { AppSettings, BudgetLine, CutoffSummary } from '@shared/types'
import { formatPHP, pesosToCentavos, centavosToPesos } from '@shared/money'
import ProgressBar from '../components/ProgressBar'

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

export default function Budget(): JSX.Element {
  const [month, setMonth] = useState(currentMonth())
  const [lines, setLines] = useState<BudgetLine[]>([])
  const [cutoff, setCutoff] = useState<CutoffSummary | null>(null)
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [firstIncome, setFirstIncome] = useState('')
  const [secondIncome, setSecondIncome] = useState('')

  async function refresh(): Promise<void> {
    setLines(await window.api.budgets.list(month))
    setCutoff(await window.api.cutoff.summary(month))
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month])

  useEffect(() => {
    window.api.settings.get().then((s) => {
      setSettings(s)
      setFirstIncome(String(centavosToPesos(s.firstCutoffIncomeCentavos)))
      setSecondIncome(String(centavosToPesos(s.secondCutoffIncomeCentavos)))
    })
  }, [])

  async function handleBudgetChange(categoryId: number, value: string): Promise<void> {
    const budgetCentavos = pesosToCentavos(Number(value || '0'))
    await window.api.budgets.set(month, categoryId, budgetCentavos)
    refresh()
  }

  async function handleSaveCutoffIncome(): Promise<void> {
    await window.api.settings.update({
      firstCutoffIncomeCentavos: pesosToCentavos(Number(firstIncome || '0')),
      secondCutoffIncomeCentavos: pesosToCentavos(Number(secondIncome || '0'))
    })
    refresh()
  }

  return (
    <div className="view">
      <h1>Budget</h1>

      <div className="filters">
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
      </div>

      <section>
        <h2>Category Budgets</h2>
        {lines.length === 0 ? (
          <p className="empty">No expense categories found.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Budget</th>
                <th>Spent</th>
                <th>Remaining</th>
                <th>Usage</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.categoryId}>
                  <td>{line.categoryName}</td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      defaultValue={centavosToPesos(line.budgetCentavos)}
                      onBlur={(e) => handleBudgetChange(line.categoryId, e.target.value)}
                    />
                  </td>
                  <td>{formatPHP(line.spentCentavos)}</td>
                  <td>{formatPHP(line.remainingCentavos)}</td>
                  <td>
                    <ProgressBar percentage={line.percentageUsed} />
                    <span className="tag">{line.percentageUsed}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2>Cutoff Planning</h2>
        <div className="quick-add">
          <label>
            First Cutoff Income
            <input
              type="number"
              step="0.01"
              value={firstIncome}
              onChange={(e) => setFirstIncome(e.target.value)}
              onBlur={handleSaveCutoffIncome}
            />
          </label>
          <label>
            Second Cutoff Income
            <input
              type="number"
              step="0.01"
              value={secondIncome}
              onChange={(e) => setSecondIncome(e.target.value)}
              onBlur={handleSaveCutoffIncome}
            />
          </label>
        </div>

        {cutoff && settings && (
          <div className="card-grid">
            <div className="card">
              <div className="card-label">First Cutoff</div>
              <div className="card-value">{formatPHP(cutoff.first.incomeCentavos)}</div>
              <div className="card-sub">Spent: {formatPHP(cutoff.first.outflowCentavos)}</div>
              <div className="card-sub">
                Remaining:{' '}
                <strong>{formatPHP(cutoff.first.remainingCentavos)}</strong>
              </div>
            </div>
            <div className="card">
              <div className="card-label">Second Cutoff</div>
              <div className="card-value">{formatPHP(cutoff.second.incomeCentavos)}</div>
              <div className="card-sub">Spent: {formatPHP(cutoff.second.outflowCentavos)}</div>
              <div className="card-sub">
                Remaining:{' '}
                <strong>{formatPHP(cutoff.second.remainingCentavos)}</strong>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
