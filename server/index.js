import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import { importStaff } from './scripts/import-staff.js'
import { startScheduler } from './services/scheduler.js'
import { getVapidPublicKey } from './services/push.js'

import authRoutes from './routes/auth.js'
import surveyRoutes from './routes/surveys.js'
import answerRoutes from './routes/answers.js'
import analyticsRoutes from './routes/analytics.js'
import notificationRoutes from './routes/notifications.js'

const app = express()
const PORT = process.env.PORT || 4000

app.use(cors())
app.use(express.json())

// Роуты
app.use('/api/auth', authRoutes)
app.use('/api/surveys', surveyRoutes)
app.use('/api/answers', answerRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/notifications', notificationRoutes)

// Ручной импорт сотрудников из staff.txt
app.post('/api/staff/import', async (req, res) => {
  try {
    const result = await importStaff()
    res.json(result)
  } catch (err) {
    console.error('[IMPORT] error:', err)
    res.status(500).json({ error: 'Ошибка импорта' })
  }
})

// VAPID public key для подписки на push
app.get('/api/push/vapid-key', (req, res) => {
  res.json({ publicKey: getVapidPublicKey() })
})

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// Ошибки
app.use((err, req, res, next) => {
  console.error('[SERVER] Unhandled error:', err)
  res.status(500).json({ error: 'Внутренняя ошибка сервера' })
})

app.listen(PORT, () => {
  console.log(`[PulseHR API] Running on http://localhost:${PORT}`)
  // Автоматический импорт staff.txt каждый час
  importStaff()
  setInterval(importStaff, 60 * 60 * 1000)
  // Запуск обработчика очереди уведомлений
  startScheduler()
})
