import { useEffect, useState } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './views/Dashboard'
import Transactions from './views/Transactions'
import Accounts from './views/Accounts'
import Budget from './views/Budget'
import Bills from './views/Bills'
import DebtView from './views/Debt'
import Savings from './views/Savings'
import Settings from './views/Settings'

export type NavKey =
  | 'dashboard'
  | 'transactions'
  | 'budget'
  | 'bills'
  | 'debt'
  | 'savings'
  | 'accounts'
  | 'settings'

const VIEWS: Record<NavKey, () => JSX.Element> = {
  dashboard: Dashboard,
  transactions: Transactions,
  budget: Budget,
  bills: Bills,
  debt: DebtView,
  savings: Savings,
  accounts: Accounts,
  settings: Settings
}

export default function App(): JSX.Element {
  const [active, setActive] = useState<NavKey>('dashboard')
  const ActiveView = VIEWS[active]

  useEffect(() => {
    window.api.settings.get().then((s) => {
      document.documentElement.dataset.theme = s.theme
    })
  }, [])

  return (
    <div className="app-shell">
      <Sidebar active={active} onSelect={setActive} />
      <main className="app-content">
        <ActiveView />
      </main>
    </div>
  )
}
