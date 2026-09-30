import { getDatabase } from '../database/db'
import { amountForCutoff, calculateCutoffBalance } from '@shared/calculations'
import type { CutoffAssignment } from '@shared/calculations'
import { getSettings } from './settingsService'
import type { CutoffSummary } from '@shared/types'

interface CutoffTransactionRow {
  type: string
  amount_centavos: number
  cutoff: CutoffAssignment
}

export function getCutoffSummary(month: string): CutoffSummary {
  const settings = getSettings()

  const rows = getDatabase()
    .prepare(
      `SELECT type, amount_centavos, cutoff FROM transactions
       WHERE strftime('%Y-%m', date) = ? AND type NOT IN ('Income', 'Transfer')`
    )
    .all(month) as CutoffTransactionRow[]

  const firstOutflows = rows.map((r) => amountForCutoff(r.amount_centavos, r.cutoff, 'First'))
  const secondOutflows = rows.map((r) => amountForCutoff(r.amount_centavos, r.cutoff, 'Second'))

  const firstOutflowCentavos = firstOutflows.reduce((total, amount) => total + amount, 0)
  const secondOutflowCentavos = secondOutflows.reduce((total, amount) => total + amount, 0)

  return {
    month,
    first: {
      incomeCentavos: settings.firstCutoffIncomeCentavos,
      outflowCentavos: firstOutflowCentavos,
      remainingCentavos: calculateCutoffBalance(settings.firstCutoffIncomeCentavos, firstOutflows)
    },
    second: {
      incomeCentavos: settings.secondCutoffIncomeCentavos,
      outflowCentavos: secondOutflowCentavos,
      remainingCentavos: calculateCutoffBalance(settings.secondCutoffIncomeCentavos, secondOutflows)
    }
  }
}
