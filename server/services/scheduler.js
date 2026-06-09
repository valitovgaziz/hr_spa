import { processQueue, checkDeadlines } from './notifier.js'

let queueInterval = null
let deadlineInterval = null

export function startScheduler() {
  console.log('[SCHEDULER] Started (queue every 60s, deadlines every 60min)')

  // Обработка очереди уведомлений — каждые 60 секунд
  queueInterval = setInterval(async () => {
    try {
      const count = await processQueue()
      if (count > 0) console.log(`[SCHEDULER] Processed ${count} queue item(s)`)
    } catch (err) {
      console.error('[SCHEDULER] Queue error:', err)
    }
  }, 60 * 1000)

  // Проверка приближающихся дедлайнов — каждые 60 минут
  deadlineInterval = setInterval(async () => {
    try {
      await checkDeadlines()
    } catch (err) {
      console.error('[SCHEDULER] Deadline check error:', err)
    }
  }, 60 * 60 * 1000)

  // Первый запуск сразу
  processQueue().catch(err => console.error('[SCHEDULER] Initial queue run error:', err))
  checkDeadlines().catch(err => console.error('[SCHEDULER] Initial deadline check error:', err))
}

export function stopScheduler() {
  if (queueInterval) clearInterval(queueInterval)
  if (deadlineInterval) clearInterval(deadlineInterval)
}
