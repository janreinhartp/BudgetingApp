import { getDatabase } from '../database/db'
import type { Account } from '@shared/types'

interface AccountRow {
  id: number
  name: string
  type: Account['type']
  balance_centavos: number
  credit_limit_centavos: number | null
  notes: string | null
}

function toAccount(row: AccountRow): Account {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    balanceCentavos: row.balance_centavos,
    creditLimitCentavos: row.credit_limit_centavos,
    notes: row.notes
  }
}

export function listAccounts(): Account[] {
  const rows = getDatabase()
    .prepare('SELECT * FROM accounts ORDER BY name')
    .all() as AccountRow[]
  return rows.map(toAccount)
}

export function createAccount(account: Omit<Account, 'id'>): Account {
  const result = getDatabase()
    .prepare(
      `INSERT INTO accounts (name, type, balance_centavos, credit_limit_centavos, notes)
       VALUES (@name, @type, @balanceCentavos, @creditLimitCentavos, @notes)`
    )
    .run(account)
  return { ...account, id: Number(result.lastInsertRowid) }
}

export function updateAccount(account: Account): void {
  getDatabase()
    .prepare(
      `UPDATE accounts
       SET name = @name, type = @type, balance_centavos = @balanceCentavos,
           credit_limit_centavos = @creditLimitCentavos, notes = @notes
       WHERE id = @id`
    )
    .run(account)
}

export function deleteAccount(id: number): void {
  getDatabase().prepare('DELETE FROM accounts WHERE id = ?').run(id)
}
