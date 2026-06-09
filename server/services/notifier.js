import pool from '../db/pool.js'
import { sendPushNotification } from './push.js'
import { sendTelegramMessage } from './telegram.js'
import { sendSms } from './sms.js'
import { sendEmail } from './email.js'

const APP_URL = process.env.APP_URL || 'http://localhost:8080'
const DAILY_LIMIT = Number(process.env.NOTIFY_DAILY_LIMIT) || 5

async function log(level, msg) {
  console.log(`[NOTIFIER] ${msg}`)
}

async function enqueue(surveyId, userId, channel, priority, scheduledAt) {
  const existing = await pool.query(
    `SELECT id FROM notification_queue
     WHERE survey_id = $1 AND user_id = $2 AND channel = $3 AND priority = $4 AND sent = false`,
    [surveyId, userId, channel, priority]
  )
  if (existing.rowCount > 0) return
  if (scheduledAt === 'now') {
    await pool.query(
      `INSERT INTO notification_queue (survey_id, user_id, channel, priority, scheduled_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [surveyId, userId, channel, priority]
    )
  } else {
    await pool.query(
      `INSERT INTO notification_queue (survey_id, user_id, channel, priority, scheduled_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [surveyId, userId, channel, priority, scheduledAt]
    )
  }
}

async function logSkipped(surveyId, userId, channel, reason) {
  await pool.query(
    `INSERT INTO notification_log (survey_id, user_id, channel, status, sent_at, error)
     VALUES ($1, $2, $3, 'skipped', NOW(), $4)`,
    [surveyId, userId, channel, reason]
  )
}

async function dailyLimitReached(userId) {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS cnt FROM notification_log
     WHERE user_id = $1
       AND status IN ('sent', 'delivered')
       AND sent_at >= NOW() - INTERVAL '24 hours'`,
    [userId]
  )
  return result.rows[0].cnt >= DAILY_LIMIT
}

// Отправить уведомление по конкретному каналу и записать в лог
async function dispatch(surveyId, userId, channel, title, body, surveyUrl) {
  let result

  switch (channel) {
    case 'push': {
      result = await sendPushNotification(userId, surveyId, title, body, surveyUrl)
      break
    }
    case 'telegram': {
      result = await sendTelegramMessage(userId, surveyId, title, surveyUrl)
      break
    }
    case 'sms': {
      const u = await pool.query('SELECT phone FROM users WHERE id = $1', [userId])
      const phone = u.rows[0]?.phone || ''
      result = await sendSms(phone, `${title}. Пройти: ${surveyUrl}`)
      break
    }
    case 'email': {
      result = await sendEmail(userId, '', title, `${title}\n\n${body}\n\n${surveyUrl}`)
      break
    }
    default:
      return
  }

  const status = result.success ? 'sent' : 'failed'
  await pool.query(
    `INSERT INTO notification_log (survey_id, user_id, channel, status, sent_at, cost, error)
     VALUES ($1, $2, $3, $4, NOW(), $5, $6)`,
    [surveyId, userId, channel, status, result.cost || 0, result.error || null]
  )

  return result
}

// Запланировать каскад для одного пользователя
async function scheduleCascade(surveyId, userId, surveyTitle, endDate, isCritical) {
  const surveyUrl = `${APP_URL}/surveys/${surveyId}/take`
  const body = `До окончания — ${endDate}. Время прохождения — ~2 мин.`

  if (isCritical) {
    // Критичные опросы — все каналы сразу, приоритет 0 (самый высокий)
    // Без ожидания — доставка гарантируется всеми доступными каналами
    await enqueue(surveyId, userId, 'push', 0, 'now')
    await enqueue(surveyId, userId, 'sms', 0, 'now')
    await enqueue(surveyId, userId, 'email', 0, 'now')
    await enqueue(surveyId, userId, 'telegram', 0, 'now')
    await log('info', `Critical cascade scheduled for user ${userId}, survey ${surveyId}`)
    return
  }

  // 1. Push — сразу
  await enqueue(surveyId, userId, 'push', 1, 'now')

  // 2. Telegram — через 4 часа
  const telTime = new Date(Date.now() + 4 * 60 * 60 * 1000)
  await enqueue(surveyId, userId, 'telegram', 2, telTime.toISOString())

  // 3. SMS — через 8 часов
  const smsTime = new Date(Date.now() + 8 * 60 * 60 * 1000)
  await enqueue(surveyId, userId, 'sms', 3, smsTime.toISOString())

  // 4-6. Зависит от endDate
  if (endDate) {
    const days = Math.ceil((new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24))
    if (days > 7) {
      const emailTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      await enqueue(surveyId, userId, 'email', 4, emailTime.toISOString())
    }
    if (days > 2) {
      const remind48 = new Date(endDate)
      remind48.setDate(remind48.getDate() - 2)
      await enqueue(surveyId, userId, 'push', 5, remind48.toISOString())
    }
    if (days > 1) {
      const remind24 = new Date(endDate)
      remind24.setDate(remind24.getDate() - 1)
      await enqueue(surveyId, userId, 'push', 6, remind24.toISOString())
    }
  }

  await log('info', `Cascade scheduled for user ${userId}, survey ${surveyId}`)
}

// Обработать одну запись очереди
async function processQueueItem(item) {
  const survey = await pool.query(
    'SELECT title, end_date, is_critical FROM surveys WHERE id = $1',
    [item.survey_id]
  )
  if (survey.rowCount === 0) return

  const { title, end_date, is_critical } = survey.rows[0]
  const surveyUrl = `${APP_URL}/surveys/${item.survey_id}/take`

  let body
  if (item.priority === 5) {
    body = `Опрос «${title}» закроется через 48 часов. Пройдите сейчас — осталось мало времени!`
  } else if (item.priority === 6) {
    body = `Опрос «${title}» закрывается завтра. Последний шанс пройти!`
  } else if (is_critical) {
    body = `🔴 Критичный опрос «${title}». Требуется ваше участие!`
  } else {
    body = `До окончания — ${end_date}. Время прохождения — ~2 мин.`
  }

  // Проверяем, не прошёл ли уже опрос
  const completed = await pool.query(
    'SELECT id FROM survey_completions WHERE survey_id = $1 AND user_id = $2',
    [item.survey_id, item.user_id]
  )
  if (completed.rowCount > 0) {
    await pool.query('UPDATE notification_queue SET sent = true WHERE id = $1', [item.id])
    await logSkipped(item.survey_id, item.user_id, item.channel, 'already_completed')
    return
  }

  if (!is_critical) {
    // Проверяем настройки пользователя (только для некритичных опросов)
    const user = await pool.query(
      `SELECT push_enabled, telegram_linked, sms_enabled, email_enabled
       FROM users WHERE id = $1`,
      [item.user_id]
    )
    if (user.rowCount === 0) return
    const prefs = user.rows[0]

    // Пропускаем, если канал отключён
    if ((item.channel === 'push' && !prefs.push_enabled) ||
        (item.channel === 'telegram' && !prefs.telegram_linked) ||
        (item.channel === 'sms' && !prefs.sms_enabled) ||
        (item.channel === 'email' && !prefs.email_enabled)) {
      await pool.query('UPDATE notification_queue SET sent = true WHERE id = $1', [item.id])
      await logSkipped(item.survey_id, item.user_id, item.channel, 'channel_disabled')
      return
    }

    // Анти-спам: дневной лимит отправок
    if (await dailyLimitReached(item.user_id)) {
      await pool.query('UPDATE notification_queue SET sent = true WHERE id = $1', [item.id])
      await logSkipped(item.survey_id, item.user_id, item.channel, 'daily_limit')
      return
    }
  }

  await dispatch(item.survey_id, item.user_id, item.channel, title, body, surveyUrl)
  await pool.query('UPDATE notification_queue SET sent = true WHERE id = $1', [item.id])
}

// Запустить каскад для всей целевой аудитории опроса
export async function triggerCascade(surveyId) {
  const survey = await pool.query(
    `SELECT s.title, s.end_date, s.is_critical, s.anonymous, st.target_role
     FROM surveys s
     LEFT JOIN survey_targets st ON st.survey_id = s.id
     WHERE s.id = $1`,
    [surveyId]
  )
  if (survey.rowCount === 0) return

  const title = survey.rows[0].title
  const endDate = survey.rows[0].end_date
  const isCritical = survey.rows[0].is_critical

  // Собираем целевую аудиторию
  const targetRoles = [...new Set(survey.rows.map(r => r.target_role).filter(Boolean))]
  let users
  if (targetRoles.length > 0) {
    users = await pool.query(
      `SELECT id FROM users WHERE role = ANY($1) AND id != ALL(
         SELECT user_id FROM survey_completions WHERE survey_id = $2
       )`,
      [targetRoles, surveyId]
    )
  } else {
    users = await pool.query(
      `SELECT id FROM users WHERE id != ALL(
         SELECT user_id FROM survey_completions WHERE survey_id = $1
       )`,
      [surveyId]
    )
  }

  for (const u of users.rows) {
    await scheduleCascade(surveyId, u.id, title, endDate, isCritical)
  }

  await log('info', `Cascade triggered for survey ${surveyId}, ${users.rowCount} users`)
}

// Создать напоминания (48h / 24h) для всех непрошедших опрос, у которых подходит дедлайн
export async function checkDeadlines() {
  // Опросы, заканчивающиеся через 46–50 часов
  const soon48 = await pool.query(
    `SELECT id, title, end_date FROM surveys
     WHERE status = 'active'
       AND end_date BETWEEN NOW() + INTERVAL '46 hours' AND NOW() + INTERVAL '50 hours'`
  )
  // Опросы, заканчивающиеся через 22–26 часов
  const soon24 = await pool.query(
    `SELECT id, title, end_date FROM surveys
     WHERE status = 'active'
       AND end_date BETWEEN NOW() + INTERVAL '22 hours' AND NOW() + INTERVAL '26 hours'`
  )

  for (const survey of soon48.rows) {
    await scheduleDeadlineReminders(survey.id, 5)
  }
  for (const survey of soon24.rows) {
    await scheduleDeadlineReminders(survey.id, 6)
  }
}

async function scheduleDeadlineReminders(surveyId, priority) {
  // Непрошедшие пользователи
  const users = await pool.query(
    `SELECT id FROM users WHERE id != ALL(
       SELECT user_id FROM survey_completions WHERE survey_id = $1
     )`,
    [surveyId]
  )

  for (const u of users.rows) {
    await enqueue(surveyId, u.id, 'push', priority, 'now')
  }

  const label = priority === 5 ? '48h' : '24h'
  console.log(`[DEADLINES] ${label} reminders queued for survey ${surveyId}, ${users.rowCount} users`)
}

// Обработать просроченные элементы очереди
export async function processQueue() {
  const items = await pool.query(
    `SELECT * FROM notification_queue
     WHERE sent = false AND scheduled_at <= NOW()
     ORDER BY priority, scheduled_at
     LIMIT 50`
  )

  for (const item of items.rows) {
    try {
      await processQueueItem(item)
    } catch (err) {
      console.error(`[NOTIFIER] Queue item ${item.id} error:`, err)
      await pool.query(
        `INSERT INTO notification_log (survey_id, user_id, channel, status, sent_at, error)
         VALUES ($1, $2, $3, 'failed', NOW(), $4)`,
        [item.survey_id, item.user_id, item.channel, err.message]
      )
    }
  }

  return items.rowCount
}
