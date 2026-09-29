import type { BudgetingApi } from '@shared/api'

declare global {
  interface Window {
    api: BudgetingApi
  }
}
