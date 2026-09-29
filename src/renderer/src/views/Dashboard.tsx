import { useEffect, useState } from 'react'
import Card from '../components/Card'
import ProgressBar from '../components/ProgressBar'
import type { Bill, BudgetLine, DashboardSummary, SavingsGoal, Transaction } from '@shared/types'
import { calculateSavingsProgress } from '@shared/calculations'
import { formatPHP } from '@shared/money'

export default function Dashboard(): JSX.Element {
  const [month, setMonth] = useState('')
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [recent, setRecent] = useState<Transaction[]>([])
  const [upcomingBills, setUpcomingBills] = useState<Bill[]>([])
  const [budgetLines, setBudgetLines] = useState<BudgetLine[]>([])
  const [debtTotal, setDebtTotal] = useState(0)
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([])

  useEffect(() => {
    window.api.dashboard.summary(month || undefined).then((s) => {
      setSummary(s)
      window.api.budgets.list(s.month).then(setBudgetLines)
    })
    window.api.transactions
      .list({ month: month || undefined })
      .then((all) => setRecent(all.slice(0, 5)))
    window.api.bills.list().then((bills) =>
      setUpcomingBills(
        bills
          .filter((b) => b.status !== 'Paid')
          .sort((a, b) => a.dueDay - b.dueDay)
          .slice(0, 5)
      )
    )
    window.api.debts.summary().then((d) => setDebtTotal(d.totalDebtCentavos))
    window.api.savings.list().then(setSavingsGoals)
  }, [month])

  if (!summary) return <div className="view">Loading dashboard...</div>

  return (
    <div className="view">
      <div className="dashboard-header">
        <h1>{monthLabel(summary.month)}</h1>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
      </div>

      <section className="card-grid">
        <Card label="Income" value={formatPHP(summary.incomeCentavos)} tone="positive" />
        <Card label="Expenses" value={formatPHP(summary.expensesCentavos)} />
        <Card label="Bills" value={formatPHP(summary.billsCentavos)} />
        <Card label="Debt Payments" value={formatPHP(summary.debtPaymentsCentavos)} />
        <Card label="Savings" value={formatPHP(summary.savingsCentavos)} />
        <Card
          label="Remaining"
          value={formatPHP(summary.remainingCentavos)}
          tone={summary.remainingCentavos >= 0 ? 'positive' : 'negative'}
        />
      </section>

      <div className="dashboard-columns">
        <section>
          <h2>Budget Progress</h2>
          {budgetLines.filter((l) => l.budgetCentavos > 0).length === 0 ? (
            <p className="empty">Set category budgets on the Budget tab.</p>
          ) : (
            budgetLines
              .filter((l) => l.budgetCentavos > 0)
              .slice(0, 5)
              .map((line) => (
                <div key={line.categoryId} className="budget-row">
                  <div className="budget-row-label">
                    <span>{line.categoryName}</span>
                    <span>{line.percentageUsed}%</span>
                  </div>
                  <ProgressBar percentage={line.percentageUsed} />
                </div>
              ))
          )}
        </section>

        <section>
          <h2>Upcoming Bills</h2>
          {upcomingBills.length === 0 ? (
            <p className="empty">No upcoming bills.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Bill</th>
                  <th>Amount</th>
                  <th>Due</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {upcomingBills.map((bill) => (
                  <tr key={bill.id}>
                    <td>{bill.name}</td>
                    <td>{formatPHP(bill.amountCentavos)}</td>
                    <td>{bill.dueDay}</td>
                    <td>{bill.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <div className="dashboard-columns">
        <section>
          <h2>Debt Balance</h2>
          <Card
            label="Total Debt"
            value={formatPHP(debtTotal)}
            tone={debtTotal > 0 ? 'negative' : 'default'}
          />
        </section>

        <section>
          <h2>Savings Progress</h2>
          {savingsGoals.length === 0 ? (
            <p className="empty">No savings goals yet.</p>
          ) : (
            savingsGoals.slice(0, 4).map((goal) => {
              const progress = calculateSavingsProgress(goal)
              return (
                <div key={goal.id} className="budget-row">
                  <div className="budget-row-label">
                    <span>{goal.name}</span>
                    <span>{progress.percentageComplete}%</span>
                  </div>
                  <ProgressBar percentage={progress.percentageComplete} />
                </div>
              )
            })
          )}
        </section>
      </div>

      <section>
        <h2>Spending by Category</h2>
        {summary.spendingByCategory.length === 0 ? (
          <p className="empty">No expenses recorded this month.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {summary.spendingByCategory.map((row) => (
                <tr key={row.categoryName}>
                  <td>{row.categoryName}</td>
                  <td>{formatPHP(row.amountCentavos)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2>Recent Transactions</h2>
        {recent.length === 0 ? (
          <p className="empty">No transactions yet. Add one from the Transactions tab.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Description</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((t) => (
                <tr key={t.id}>
                  <td>{t.date}</td>
                  <td>{t.type}</td>
                  <td>{t.description ?? '—'}</td>
                  <td>{formatPHP(t.amountCentavos)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}

function monthLabel(month: string): string {
  const [year, monthNum] = month.split('-').map(Number)
  const date = new Date(year, monthNum - 1, 1)
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}
