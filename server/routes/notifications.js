import { Router } from 'express'
import pool from '../db/pool.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

// GET /api/notifications/settings — настройки уведомлений
router.get('/settings', authMiddleware, async (req, res) => {
  try {
    const user = await pool.query(
      `SELECT push_enabled, telegram_linked, quiet_mode,
               quiet_start, quiet_end, preferred_time,
               sms_enabled, email_enabled
       FROM users WHERE id = $1`,
      [req.user.id]
    )
    if (user.rowCount === 0) return res.status(404).json({ error: 'Не найден' })

    const devices = await pool.query(
      `SELECT id, name, last_active FROM user_devices WHERE user_id = $1 ORDER BY last_active DESC`,
      [req.user.id]
    )

    res.json({
      ...user.rows[0],
      devices: devices.rows
    })
  } catch (err) {
    console.error('[NOTIF] get settings error:', err)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// PUT /api/notifications/settings — обновить настройки
router.put('/settings', authMiddleware, async (req, res) => {
  try {
    const { pushEnabled, telegramLinked, quietMode, quietStart, quietEnd, preferredTime, smsEnabled, emailEnabled } = req.body

    await pool.query(
      `UPDATE users SET
        push_enabled = COALESCE($1, push_enabled),
        telegram_linked = COALESCE($2, telegram_linked),
        quiet_mode = COALESCE($3, quiet_mode),
        quiet_start = $4, quiet_end = $5,
        preferred_time = COALESCE($6, preferred_time),
        sms_enabled = COALESCE($7, sms_enabled),
        email_enabled = COALESCE($8, email_enabled),
        updated_at = NOW()
       WHERE id = $9`,
      [pushEnabled, telegramLinked, quietMode, quietStart || null, quietEnd || null, preferredTime, smsEnabled, emailEnabled, req.user.id]
    )

    const updated = await pool.query(
      `SELECT id, phone, name, role, department, position,
              push_enabled, telegram_linked, quiet_mode,
              quiet_start, quiet_end, preferred_time,
              sms_enabled, email_enabled
       FROM users WHERE id = $1`,
      [req.user.id]
    )
    res.json(updated.rows[0])
  } catch (err) {
    console.error('[NOTIF] update settings error:', err)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// POST /api/notifications/telegram/link — привязка Telegram
router.post('/telegram/link', authMiddleware, async (req, res) => {
  try {
    await pool.query(
      'UPDATE users SET telegram_linked = true, updated_at = NOW() WHERE id = $1',
      [req.user.id]
    )
    res.json({
      success: true,
      qrCode: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxN…',
      botUrl: 'https://t.me/PulseHRBot'
    })
  } catch (err) {
    console.error('[NOTIF] telegram link error:', err)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// POST /api/notifications/push/subscribe — подписка на Web Push
router.post('/push/subscribe', authMiddleware, async (req, res) => {
  try {
    const { deviceName, endpoint, p256dh, auth } = req.body
    await pool.query(
      `INSERT INTO user_devices (user_id, name, push_endpoint, push_p256dh, push_auth)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING`,
      [req.user.id, deviceName || 'Браузер', endpoint, p256dh, auth]
    )
    res.json({ success: true })
  } catch (err) {
    console.error('[NOTIF] push subscribe error:', err)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// DELETE /api/notifications/devices/:id — отвязать устройство
router.delete('/devices/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM user_devices WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    )
    res.json({ success: true })
  } catch (err) {
    console.error('[NOTIF] delete device error:', err)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// GET /api/notifications/users — список пользователей (HR)
router.get('/users', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, phone, name, role, department FROM users ORDER BY name'
    )
    res.json(result.rows)
  } catch (err) {
    console.error('[NOTIF] users error:', err)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

export default router
