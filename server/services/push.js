import webpush from 'web-push'
import pool from '../db/pool.js'

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@pulsehr.local'

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
}

export function getVapidPublicKey() {
  if (VAPID_PUBLIC_KEY) return VAPID_PUBLIC_KEY
  const keys = webpush.generateVAPIDKeys()
  console.log('[PUSH] Generated VAPID keys — add to .env:')
  console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`)
  console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`)
  return keys.publicKey
}

export async function sendPushNotification(userId, surveyId, title, body, surveyUrl) {
  const devices = await pool.query(
    'SELECT id, push_endpoint, push_p256dh, push_auth FROM user_devices WHERE user_id = $1 AND push_endpoint IS NOT NULL',
    [userId]
  )

  if (devices.rowCount === 0) return { success: false, reason: 'no_devices' }

  let sent = 0, failed = 0
  const payload = JSON.stringify({
    title,
    body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: { surveyId, url: surveyUrl },
    actions: [{ action: 'open', title: 'Пройти опрос', url: surveyUrl }]
  })

  for (const d of devices.rows) {
    try {
      const sub = {
        endpoint: d.push_endpoint,
        keys: { p256dh: d.push_p256dh, auth: d.push_auth }
      }
      if (!sub.endpoint || !sub.keys.p256dh || !sub.keys.auth) continue
      await webpush.sendNotification(sub, payload)
      sent++
    } catch (err) {
      failed++
      if (err.statusCode === 410 || err.statusCode === 404) {
        await pool.query('DELETE FROM user_devices WHERE id = $1', [d.id])
      }
    }
  }

  return { success: sent > 0, sent, failed }
}
