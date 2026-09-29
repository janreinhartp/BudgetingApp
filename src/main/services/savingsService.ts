import { getDatabase } from '../database/db'
import type { NewSavingsGoal, SavingsGoal } from '@shared/types'

interface SavingsGoalRow {
  id: number
  name: string
  target_centavos: number
  current_centavos: number
  target_date: string | null
  monthly_contribution_centavos: number
}

function toGoal(row: SavingsGoalRow): SavingsGoal {
  return {
    id: row.id,
    name: row.name,
    targetCentavos: row.target_centavos,
    currentCentavos: row.current_centavos,
    targetDate: row.target_date,
    monthlyContributionCentavos: row.monthly_contribution_centavos
  }
}

export function listSavingsGoals(): SavingsGoal[] {
  const rows = getDatabase()
    .prepare('SELECT * FROM savings_goals ORDER BY name')
    .all() as SavingsGoalRow[]
  return rows.map(toGoal)
}

export function createSavingsGoal(goal: NewSavingsGoal): SavingsGoal {
  const result = getDatabase()
    .prepare(
      `INSERT INTO savings_goals (name, target_centavos, current_centavos, target_date, monthly_contribution_centavos)
       VALUES (@name, @targetCentavos, @currentCentavos, @targetDate, @monthlyContributionCentavos)`
    )
    .run(goal)
  return { ...goal, id: Number(result.lastInsertRowid) }
}

export function updateSavingsGoal(goal: SavingsGoal): void {
  getDatabase()
    .prepare(
      `UPDATE savings_goals
       SET name = @name, target_centavos = @targetCentavos, current_centavos = @currentCentavos,
           target_date = @targetDate, monthly_contribution_centavos = @monthlyContributionCentavos
       WHERE id = @id`
    )
    .run(goal)
}

export function deleteSavingsGoal(id: number): void {
  getDatabase().prepare('DELETE FROM savings_goals WHERE id = ?').run(id)
}
