import { getDatabase } from '../database/db'
import { calculateDebtBalance, calculateMonthlyDebtObligations } from '@shared/calculations'
import type { Debt, DebtSummary, NewDebt } from '@shared/types'

interface DebtRow {
  id: number
  name: string
  original_balance_centavos: number
  current_balance_centavos: number
  minimum_payment_centavos: number
  planned_payment_centavos: number
  due_day: number | null
  account_id: number | null
}

function toDebt(row: DebtRow): Debt {
  return {
    id: row.id,
    name: row.name,
    originalBalanceCentavos: row.original_balance_centavos,
    currentBalanceCentavos: row.current_balance_centavos,
    minimumPaymentCentavos: row.minimum_payment_centavos,
    plannedPaymentCentavos: row.planned_payment_centavos,
    dueDay: row.due_day,
    accountId: row.account_id
  }
}

export function listDebts(): Debt[] {
  const rows = getDatabase().prepare('SELECT * FROM debts ORDER BY name').all() as DebtRow[]
  return rows.map(toDebt)
}

export function createDebt(debt: NewDebt): Debt {
  const result = getDatabase()
    .prepare(
      `INSERT INTO debts
         (name, original_balance_centavos, current_balance_centavos, minimum_payment_centavos, planned_payment_centavos, due_day, account_id)
       VALUES
         (@name, @originalBalanceCentavos, @currentBalanceCentavos, @minimumPaymentCentavos, @plannedPaymentCentavos, @dueDay, @accountId)`
    )
    .run(debt)
  return { ...debt, id: Number(result.lastInsertRowid) }
}

export function updateDebt(debt: Debt): void {
  getDatabase()
    .prepare(
      `UPDATE debts
       SET name = @name, original_balance_centavos = @originalBalanceCentavos,
           current_balance_centavos = @currentBalanceCentavos,
           minimum_payment_centavos = @minimumPaymentCentavos,
           planned_payment_centavos = @plannedPaymentCentavos,
           due_day = @dueDay, account_id = @accountId
       WHERE id = @id`
    )
    .run(debt)
}

export function deleteDebt(id: number): void {
  getDatabase().prepare('DELETE FROM debts WHERE id = ?').run(id)
}

export function getDebtSummary(): DebtSummary {
  const debts = listDebts()
  return {
    totalDebtCentavos: calculateDebtBalance(debts),
    monthlyDebtPaymentsCentavos: calculateMonthlyDebtObligations(debts)
  }
}
