import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pool from '../db/pool.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const STAFF_FILE = path.resolve(__dirname, '..', 'staff.txt')

export async function importStaff() {
  if (!fs.existsSync(STAFF_FILE)) {
    console.log('[IMPORT] staff.txt not found, skipping')
    return { added: 0, skipped: 0 }
  }

  const raw = fs.readFileSync(STAFF_FILE, 'utf-8').trim()
  if (!raw) return { added: 0, skipped: 0 }

  const lines = raw.split('\n')
  const header = lines[0].toLowerCase().split(',')
  const phoneIdx = header.indexOf('phone')
  const nameIdx = header.indexOf('name')
  const roleIdx = header.indexOf('role')
  const deptIdx = header.indexOf('department')
  const posIdx = header.indexOf('position')

  if (phoneIdx === -1) {
    console.error('[IMPORT] Missing "phone" column in staff.txt')
    return { added: 0, skipped: 0 }
  }

  let added = 0, skipped = 0

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',')
    const phone = (cols[phoneIdx] || '').trim()
    if (!phone) continue

    const name = (cols[nameIdx] || '').trim() || ''
    const role = (cols[roleIdx] || '').trim().toLowerCase() || 'employee'
    const department = (cols[deptIdx] || '').trim() || ''
    const position = (cols[posIdx] || '').trim() || ''

    const existing = await pool.query('SELECT id FROM users WHERE phone = $1', [phone])
    if (existing.rowCount > 0) {
      skipped++
      continue
    }

    await pool.query(
      `INSERT INTO users (phone, name, role, department, position)
       VALUES ($1, $2, $3, $4, $5)`,
      [phone, name, role, department, position]
    )
    added++
  }

  if (added > 0) console.log(`[IMPORT] Added ${added} user(s), skipped ${skipped}`)
  return { added, skipped }
}
