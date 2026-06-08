import jwt from 'jsonwebtoken'
import pool from '../db/pool.js'

const JWT_SECRET = process.env.JWT_SECRET || 'pulsehr-secret-key'

export async function authMiddleware(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Требуется авторизация' })
  }

  const token = header.slice(7)
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    const result = await pool.query(
      'SELECT id, phone, name, role, department, position FROM users WHERE id = $1',
      [decoded.userId]
    )
    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'Пользователь не найден' })
    }
    req.user = result.rows[0]
    next()
  } catch {
    return res.status(401).json({ error: 'Недействительный токен' })
  }
}

export function hrOnly(req, res, next) {
  if (req.user?.role !== 'hr') {
    return res.status(403).json({ error: 'Доступ только для HR' })
  }
  next()
}
