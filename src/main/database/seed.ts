import { getDatabase } from './db'
import type { CategoryGroup } from '@shared/types'

const DEFAULT_CATEGORIES: Array<{ name: string; group: CategoryGroup }> = [
  { name: 'Salary', group: 'Income' },
  { name: 'Freelance', group: 'Income' },
  { name: 'Business', group: 'Income' },
  { name: 'Other Income', group: 'Income' },
  { name: 'Food', group: 'Expense' },
  { name: 'Groceries', group: 'Expense' },
  { name: 'Transportation', group: 'Expense' },
  { name: 'Utilities', group: 'Expense' },
  { name: 'Internet', group: 'Expense' },
  { name: 'Subscriptions', group: 'Expense' },
  { name: 'Shopping', group: 'Expense' },
  { name: 'Entertainment', group: 'Expense' },
  { name: 'Household', group: 'Expense' },
  { name: 'Healthcare', group: 'Expense' },
  { name: 'Travel', group: 'Expense' },
  { name: 'Other', group: 'Expense' },
  { name: 'Credit Card', group: 'Debt' },
  { name: 'Loan', group: 'Debt' },
  { name: 'Buy Now Pay Later', group: 'Debt' },
  { name: 'Mortgage', group: 'Debt' },
  { name: 'Emergency Fund', group: 'Savings' },
  { name: 'Wedding', group: 'Savings' },
  { name: 'Travel', group: 'Savings' },
  { name: 'General Savings', group: 'Savings' }
]

/** Inserts the default category set the first time the app runs (no-op if categories already exist). */
export function seedDefaultCategories(): void {
  const db = getDatabase()
  const count = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number }
  if (count.count > 0) return

  const insert = db.prepare(
    'INSERT INTO categories (name, "group", is_custom) VALUES (@name, @group, 0)'
  )
  const insertMany = db.transaction((categories: typeof DEFAULT_CATEGORIES) => {
    for (const category of categories) insert.run(category)
  })
  insertMany(DEFAULT_CATEGORIES)
}
