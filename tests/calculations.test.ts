import { describe, expect, it } from 'vitest'
import {
  amountForCutoff,
  calculateBudgetUsage,
  calculateCutoffBalance,
  calculateDebtBalance,
  calculateMonthlyDebtObligations,
  calculateMonthlyDebtPayments,
  calculateMonthlyExpenses,
  calculateMonthlyIncome,
  calculateMonthlySavings,
  calculateMonthlyBills,
  calculateRemainingMoney,
  calculateSavingsProgress,
  computeBillStatus,
  type CalcTransaction,
  type CalcBill,
  type CalcDebt
} from '../src/shared/calculations'

const transactions: CalcTransaction[] = [
  { type: 'Income', date: '2026-09-01', amountCentavos: 2_000_000 },
  { type: 'Expense', date: '2026-09-05', amountCentavos: 1_200_000 },
  { type: 'Debt Payment', date: '2026-09-10', amountCentavos: 800_000 },
  { type: 'Savings', date: '2026-09-12', amountCentavos: 500_000 },
  // outside the target month, should be ignored
  { type: 'Income', date: '2026-08-15', amountCentavos: 9_999_999 }
]

describe('calculateMonthlyIncome', () => {
  it('sums income transactions for the given month', () => {
    expect(calculateMonthlyIncome(transactions, '2026-09')).toBe(2_000_000)
  })
})

describe('calculateMonthlyExpenses', () => {
  it('sums expense transactions for the given month', () => {
    expect(calculateMonthlyExpenses(transactions, '2026-09')).toBe(1_200_000)
  })

  it('excludes bill payments so bills are not counted as spending twice', () => {
    const entries: CalcTransaction[] = [
      { type: 'Expense', date: '2026-09-05', amountCentavos: 200_000 },
      { type: 'Expense', date: '2026-09-15', amountCentavos: 150_000, paymentType: 'BILL_PAYMENT' }
    ]
    expect(calculateMonthlyExpenses(entries, '2026-09')).toBe(200_000)
  })
})

describe('calculateMonthlyDebtPayments', () => {
  it('sums debt payment transactions for the given month', () => {
    expect(calculateMonthlyDebtPayments(transactions, '2026-09')).toBe(800_000)
  })
})

describe('calculateMonthlySavings', () => {
  it('sums savings transactions for the given month', () => {
    expect(calculateMonthlySavings(transactions, '2026-09')).toBe(500_000)
  })
})

describe('calculateMonthlyBills', () => {
  it('sums bills paid within the given month', () => {
    const bills: CalcBill[] = [
      { amountCentavos: 620_000, status: 'Paid', lastPaidDate: '2026-09-05' },
      { amountCentavos: 149_900, status: 'Upcoming', lastPaidDate: null },
      { amountCentavos: 100_000, status: 'Paid', lastPaidDate: '2026-08-01' }
    ]
    expect(calculateMonthlyBills(bills, '2026-09')).toBe(620_000)
  })
})

describe('calculateRemainingMoney', () => {
  it('matches the ₱20,000 income minus ₱12,000 expenses example', () => {
    const remaining = calculateRemainingMoney({
      incomeCentavos: 2_000_000,
      expensesCentavos: 1_200_000,
      billsCentavos: 0,
      debtPaymentsCentavos: 0,
      savingsCentavos: 0
    })
    expect(remaining).toBe(800_000)
  })
})

describe('calculateBudgetUsage', () => {
  it('computes remaining and percentage used', () => {
    const usage = calculateBudgetUsage(500_000, 320_000)
    expect(usage.remainingCentavos).toBe(180_000)
    expect(usage.percentageUsed).toBe(64)
  })

  it('reaches 100% when fully spent', () => {
    const usage = calculateBudgetUsage(149_900, 149_900)
    expect(usage.remainingCentavos).toBe(0)
    expect(usage.percentageUsed).toBe(100)
  })
})

describe('calculateDebtBalance', () => {
  it('sums current balances across debts', () => {
    const debts: CalcDebt[] = [
      { currentBalanceCentavos: 11_749_378, plannedPaymentCentavos: 1_000_000 },
      { currentBalanceCentavos: 9_156_978, plannedPaymentCentavos: 759_646 }
    ]
    expect(calculateDebtBalance(debts)).toBe(20_906_356)
    expect(calculateMonthlyDebtObligations(debts)).toBe(1_759_646)
  })
})

describe('calculateSavingsProgress', () => {
  it('computes remaining amount and percentage complete', () => {
    const progress = calculateSavingsProgress({ targetCentavos: 24_000_000, currentCentavos: 4_000_000 })
    expect(progress.remainingCentavos).toBe(20_000_000)
    expect(progress.percentageComplete).toBe(17)
  })
})

describe('calculateCutoffBalance', () => {
  it('subtracts assigned expenses from cutoff income', () => {
    const remaining = calculateCutoffBalance(2_000_000, [620_000, 150_000, 250_000, 500_000])
    expect(remaining).toBe(480_000)
  })
})

describe('amountForCutoff', () => {
  it('assigns the full amount when it matches the target cutoff', () => {
    expect(amountForCutoff(500_000, 'First', 'First')).toBe(500_000)
    expect(amountForCutoff(500_000, 'Second', 'First')).toBe(0)
  })

  it('splits amounts assigned to Both cutoffs evenly', () => {
    expect(amountForCutoff(500_000, 'Both', 'First')).toBe(250_000)
    expect(amountForCutoff(500_000, 'Both', 'Second')).toBe(250_000)
  })

  it('excludes Unassigned amounts from either cutoff', () => {
    expect(amountForCutoff(500_000, 'Unassigned', 'First')).toBe(0)
    expect(amountForCutoff(500_000, 'Unassigned', 'Second')).toBe(0)
  })
})

describe('computeBillStatus', () => {
  it('is Paid when the bill was last paid this month', () => {
    const today = new Date('2026-09-20')
    expect(computeBillStatus({ dueDay: 15, lastPaidDate: '2026-09-05' }, today)).toBe('Paid')
  })

  it('is Overdue when unpaid and past the due day', () => {
    const today = new Date('2026-09-20')
    expect(computeBillStatus({ dueDay: 15, lastPaidDate: null }, today)).toBe('Overdue')
  })

  it('is Upcoming when unpaid and before the due day', () => {
    const today = new Date('2026-09-05')
    expect(computeBillStatus({ dueDay: 15, lastPaidDate: null }, today)).toBe('Upcoming')
  })
})
