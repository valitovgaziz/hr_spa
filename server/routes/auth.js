import { Router } from 'express'
import jwt from 'jsonwebtoken'
import pool from '../db/pool.js'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'pulsehr-secret-key'
const TEST_CODE = process.env.OTP_TEST_CODE || '111111'

function normalizePhone(phone) {
  return phone.replace(/[\s\-\(\)]/g, '')
}

// POST /api/auth/otp — запрос OTP-кода
router.post('/otp', async (req, res) => {
  try {
    const phone = normalizePhone(req.body.phone)
    if (!phone) return res.status(400).json({ error: 'Телефон обязателен' })

    const code = TEST_CODE // в продакшене — генерация + SMS
    await pool.query(
      'INSERT INTO otp_codes (phone, code) VALUES ($1, $2)',
      [phone, code]
    )

    res.json({ success: true, message: `OTP-код отправлен на ${phone}` })
  } catch (err) {
    console.error('[AUTH] otp error:', err)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// POST /api/auth/verify — проверка OTP, выдача JWT
router.post('/verify', async (req, res) => {
  try {
    const phone = normalizePhone(req.body.phone)
    const { code } = req.body
    if (!phone || !code) {
      return res.status(400).json({ error: 'Телефон и код обязательны' })
    }

    if (code !== TEST_CODE) {
      return res.status(400).json({ error: 'Неверный код подтверждения' })
    }

    const otp = await pool.query(
      `UPDATE otp_codes SET used = true
       WHERE phone = $1 AND code = $2 AND used = false AND expires_at > NOW()
       RETURNING id`,
      [phone, code]
    )

    // Ищем или создаём пользователя
    let user = await pool.query('SELECT * FROM users WHERE phone = $1', [phone])
    if (user.rowCount === 0) {
      const isHr = phone === '+79991234567'
      const result = await pool.query(
        `INSERT INTO users (phone, name, role, department, position)
         VALUES ($1, '', $2, '', '')
         RETURNING id, phone, name, role, department, position`,
        [phone, isHr ? 'hr' : 'employee']
      )
      user = result
    }

    const u = user.rows[0]
    const token = jwt.sign({ userId: u.id, role: u.role }, JWT_SECRET, { expiresIn: '30d' })

    await pool.query(
      'INSERT INTO sessions (user_id, token) VALUES ($1, $2)',
      [u.id, token]
    )

    res.json({
      success: true,
      token,
      user: {
        id: u.id,
        phone: u.phone,
        name: u.name,
        role: u.role,
        department: u.department,
        position: u.position,
        pushEnabled: u.push_enabled,
        telegramLinked: u.telegram_linked
      }
    })
  } catch (err) {
    console.error('[AUTH] verify error:', err)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// GET /api/auth/me — текущий пользователь
router.get('/me', async (req, res) => {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Не авторизован' })
  }
  try {
    const decoded = jwt.verify(header.slice(7), JWT_SECRET)
    const result = await pool.query(
      `SELECT id, phone, name, role, department, position,
              push_enabled, telegram_linked, quiet_mode,
              quiet_start, quiet_end, preferred_time
       FROM users WHERE id = $1`,
      [decoded.userId]
    )
    if (result.rowCount === 0) return res.status(404).json({ error: 'Не найден' })
    res.json(result.rows[0])
  } catch {
    res.status(401).json({ error: 'Недействительный токен' })
  }
})

export default router
