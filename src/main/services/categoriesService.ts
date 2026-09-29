import { getDatabase } from '../database/db'
import type { Category } from '@shared/types'

interface CategoryRow {
  id: number
  name: string
  group: Category['group']
  is_custom: number
}

function toCategory(row: CategoryRow): Category {
  return { id: row.id, name: row.name, group: row.group, isCustom: row.is_custom === 1 }
}

export function listCategories(): Category[] {
  const rows = getDatabase()
    .prepare('SELECT id, name, "group" as "group", is_custom FROM categories ORDER BY "group", name')
    .all() as CategoryRow[]
  return rows.map(toCategory)
}

export function createCategory(name: string, group: Category['group']): Category {
  const result = getDatabase()
    .prepare('INSERT INTO categories (name, "group", is_custom) VALUES (?, ?, 1)')
    .run(name, group)
  return { id: Number(result.lastInsertRowid), name, group, isCustom: true }
}

export function deleteCategory(id: number): void {
  getDatabase().prepare('DELETE FROM categories WHERE id = ?').run(id)
}
