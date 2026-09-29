import type { NavKey } from '../App'

const NAV_ITEMS: Array<{ key: NavKey; label: string }> = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'transactions', label: 'Transactions' },
  { key: 'budget', label: 'Budget' },
  { key: 'bills', label: 'Bills' },
  { key: 'debt', label: 'Debt' },
  { key: 'savings', label: 'Savings' },
  { key: 'accounts', label: 'Accounts' },
  { key: 'settings', label: 'Settings' }
]

interface SidebarProps {
  active: NavKey
  onSelect: (key: NavKey) => void
}

export default function Sidebar({ active, onSelect }: SidebarProps): JSX.Element {
  return (
    <nav className="sidebar">
      <div className="sidebar-title">Budgeting</div>
      <ul>
        {NAV_ITEMS.map((item) => (
          <li key={item.key}>
            <button
              className={item.key === active ? 'nav-item active' : 'nav-item'}
              onClick={() => onSelect(item.key)}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
