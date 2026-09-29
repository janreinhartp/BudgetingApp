import { getDatabase } from '../database/db'
import { calculateBudgetUsage } from '@shared/calculations'
import type { BudgetLine } from '@shared/types'

interface BudgetLineRow {
  categoryId: number
  categoryName: string
  budgetCentavos: number | null
  spentCentavos: number | null
}

/** Returns one line per expense category with its budget (if set) and actual spend for the month. */
export function getBudgetLines(month: string): BudgetLine[] {
  const rows = getDatabase()
    .prepare(
      `SELECT
         c.id as categoryId,
         c.name as categoryName,
         b.budget_centavos as budgetCentavos,
         (
           SELECT SUM(t.amount_centavos) FROM transactions t
           WHERE t.category_id = c.id AND t.type = 'Expense' AND strftime('%Y-%m', t.date) = @month
         ) as spentCentavos
       FROM categories c
       LEFT JOIN budgets b ON b.category_id = c.id AND b.month = @month
       WHERE c."group" = 'Expense'
       ORDER BY c.name`
    )
    .all({ month }) as BudgetLineRow[]

  return rows.map((row) => {
    const usage = calculateBudgetUsage(row.budgetCentavos ?? 0, row.spentCentavos ?? 0)
    return {
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      budgetCentavos: usage.budgetCentavos,
      spentCentavos: usage.spentCentavos,
      remainingCentavos: usage.remainingCentavos,
      percentageUsed: usage.percentageUsed
    }
  })
}

export function setBudget(month: string, categoryId: number, budgetCentavos: number): void {
  getDatabase()
    .prepare(
      `INSERT INTO budgets (month, category_id, budget_centavos)
       VALUES (@month, @categoryId, @budgetCentavos)
       ON CONFLICT(month, category_id) DO UPDATE SET budget_centavos = excluded.budget_centavos`
    )
    .run({ month, categoryId, budgetCentavos })
}
