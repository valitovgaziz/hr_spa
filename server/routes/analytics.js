import { Router } from 'express'
import pool from '../db/pool.js'
import { authMiddleware, hrOnly } from '../middleware/auth.js'

const router = Router()

// GET /api/analytics — общая аналитика (только HR)
router.get('/', authMiddleware, hrOnly, async (req, res) => {
  try {
    // eNPS: среднее по scale 0-10
    const enpsResult = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE sa.value::int >= 9) AS promoters,
        COUNT(*) FILTER (WHERE sa.value::int BETWEEN 7 AND 8) AS passives,
        COUNT(*) FILTER (WHERE sa.value::int <= 6) AS detractors,
        ROUND(AVG(sa.value::int)) AS avg_enps
      FROM survey_answers sa
      JOIN survey_questions sq ON sq.id = sa.question_id
      WHERE sq.type = 'scale' AND sq.scale_min = 0 AND sq.scale_max = 10
    `)
    const enps = enpsResult.rows[0]
    const total = (parseInt(enps.promoters) + parseInt(enps.passives) + parseInt(enps.detractors)) || 1
    const eNPS = total > 0
      ? Math.round(((parseInt(enps.promoters) - parseInt(enps.detractors)) / total) * 100)
      : 0

    // eNPS за предыдущий период (30–60 дней назад)
    const prevEnps = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE sa.value::int >= 9) AS promoters,
        COUNT(*) FILTER (WHERE sa.value::int BETWEEN 7 AND 8) AS passives,
        COUNT(*) FILTER (WHERE sa.value::int <= 6) AS detractors
      FROM survey_answers sa
      JOIN survey_questions sq ON sq.id = sa.question_id
      JOIN survey_responses sr ON sr.id = sa.response_id
      WHERE sq.type = 'scale' AND sq.scale_min = 0 AND sq.scale_max = 10
        AND sr.submitted_at BETWEEN NOW() - INTERVAL '60 days' AND NOW() - INTERVAL '30 days'
    `)
    const prev = prevEnps.rows[0]
    const prevTotal = (parseInt(prev.promoters) + parseInt(prev.passives) + parseInt(prev.detractors)) || 1
    const prevENPS = prevTotal > 0
      ? Math.round(((parseInt(prev.promoters) - parseInt(prev.detractors)) / prevTotal) * 100)
      : 0
    const eNPSChange = eNPS - prevENPS

    // Прохождение опросов
    const completion = await pool.query(`
      SELECT ROUND(
        COUNT(*) FILTER (WHERE sr.id IS NOT NULL) * 100.0 /
        GREATEST(COUNT(DISTINCT st.id), 1)
      ) AS rate
      FROM surveys s
      LEFT JOIN survey_targets st ON st.survey_id = s.id
      LEFT JOIN survey_responses sr ON sr.survey_id = s.id
      WHERE s.status IN ('active', 'completed')
    `)

    // Активность по дням
    const activity = await pool.query(`
      SELECT
        to_char(submitted_at, 'Dy') AS day,
        COUNT(*)::int AS count
      FROM survey_responses
      WHERE submitted_at > NOW() - INTERVAL '7 days'
      GROUP BY day
      ORDER BY MIN(submitted_at)
    `)

    // eNPS по подразделениям
    const byDept = await pool.query(`
      SELECT
        u.department,
        ROUND(AVG(sa.value::int)) AS enps,
        COUNT(*)::int AS responses
      FROM survey_answers sa
      JOIN survey_responses sr ON sr.id = sa.response_id
      JOIN users u ON u.id = sr.user_id
      JOIN survey_questions sq ON sq.id = sa.question_id
      WHERE sq.type = 'scale' AND sq.scale_min = 0 AND sq.scale_max = 10
        AND u.department != ''
      GROUP BY u.department
      ORDER BY enps DESC
    `)

    // Ответы за 24ч среди ответивших
    const response24h = await pool.query(`
      SELECT ROUND(
        COUNT(*) FILTER (WHERE submitted_at > NOW() - INTERVAL '24 hours') * 100.0 /
        GREATEST(COUNT(*), 1)
      ) AS rate
      FROM survey_responses
    `)

    // Среднее время до первого ответа (от создания опроса до первого ответа)
    const avgResponse = await pool.query(`
      SELECT ROUND(AVG(EXTRACT(EPOCH FROM (first.submitted_at - s.created_at)) / 60))::int AS mins
      FROM surveys s
      JOIN LATERAL (
        SELECT submitted_at FROM survey_responses
        WHERE survey_id = s.id
        ORDER BY submitted_at LIMIT 1
      ) first ON true
      WHERE s.status IN ('active', 'completed')
        AND first.submitted_at IS NOT NULL
    `)

    // Среднее время за предыдущий период
    const prevAvg = await pool.query(`
      SELECT ROUND(AVG(EXTRACT(EPOCH FROM (first.submitted_at - s.created_at)) / 60))::int AS mins
      FROM surveys s
      JOIN LATERAL (
        SELECT submitted_at FROM survey_responses
        WHERE survey_id = s.id
        ORDER BY submitted_at LIMIT 1
      ) first ON true
      WHERE s.created_at BETWEEN NOW() - INTERVAL '90 days' AND NOW() - INTERVAL '30 days'
        AND first.submitted_at IS NOT NULL
    `)

    const avgTime = avgResponse.rows[0]?.mins || 0
    const prevAvgTime = prevAvg.rows[0]?.mins || avgTime
    const avgChange = prevAvgTime > 0
      ? Math.round(((avgTime - prevAvgTime) / prevAvgTime) * 100)
      : 0

    // Статистика по каналам из notification_log
    const channels = await pool.query(`
      SELECT
        channel,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status IN ('sent', 'delivered'))::int AS delivered,
        COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
        SUM(cost)::numeric(10,2) AS cost
      FROM notification_log
      WHERE sent_at > NOW() - INTERVAL '90 days'
      GROUP BY channel
      ORDER BY channel
    `)

    const channelNames = { push: 'Web Push', telegram: 'Telegram', sms: 'SMS', email: 'E-mail' }
    const channelData = channels.rows.map(ch => ({
      name: channelNames[ch.channel] || ch.channel,
      delivery: ch.total > 0 ? Math.round((ch.delivered / ch.total) * 100) : 0,
      total: ch.total,
      failed: ch.failed,
      cost: ch.cost > 0 ? ch.cost : null
    }))

    // Комментарии (из текстовых ответов)
    const comments = await pool.query(`
      SELECT sa.value AS text,
        CASE
          WHEN sa.value ~ '(спасибо|отличн|хорош|лучш|прекрасн|здоров|нравится|класс|круто|удобн)' THEN 'positive'
          WHEN sa.value ~ '(плох|ужасн|не нравится|проблем|сложно|тяжел|неудобн|бюрократ|беспокоят|не хватает)' THEN 'negative'
          ELSE 'neutral'
        END AS sentiment
      FROM survey_answers sa
      JOIN survey_questions sq ON sq.id = sa.question_id
      WHERE sq.type = 'text' AND sa.value IS NOT NULL AND sa.value != ''
      ORDER BY RANDOM()
      LIMIT 20
    `)

    const deptColors = ['#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#F97316']

    res.json({
      eNPS,
      eNPSChange,
      promoters: parseInt(enps.promoters),
      passives: parseInt(enps.passives),
      detractors: parseInt(enps.detractors),
      completionRate: parseFloat(completion.rows[0]?.rate || 0),
      avgResponseTime: avgTime,
      avgResponseChange: avgChange,
      responseRate24h: parseFloat(response24h.rows[0]?.rate || 0),
      byDepartment: byDept.rows.map((d, i) => ({
        name: d.department,
        eNPS: parseInt(d.enps),
        responses: parseInt(d.responses),
        change: 0,
        color: deptColors[i % deptColors.length]
      })),
      dailyActivity: activity.rows.length > 0
        ? activity.rows.map(d => ({ day: d.day, count: d.count }))
        : [{ day: 'Нет', count: 0 }],
      channels: channelData.length > 0 ? channelData : [
        { name: 'Web Push', delivery: 0, total: 0, failed: 0, cost: null },
        { name: 'Telegram', delivery: 0, total: 0, failed: 0, cost: null },
        { name: 'SMS', delivery: 0, total: 0, failed: 0, cost: null },
        { name: 'E-mail', delivery: 0, total: 0, failed: 0, cost: null }
      ],
      comments: comments.rows
    })
  } catch (err) {
    console.error('[ANALYTICS] error:', err)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// GET /api/analytics/questions/:surveyId — распределение ответов по вопросам
router.get('/questions/:surveyId', authMiddleware, async (req, res) => {
  try {
    const surveyId = parseInt(req.params.surveyId)
    if (isNaN(surveyId)) return res.status(400).json({ error: 'Invalid survey id' })

    // Все вопросы опроса
    const questions = await pool.query(
      'SELECT * FROM survey_questions WHERE survey_id = $1 ORDER BY sort_order',
      [surveyId]
    )

    const result = []
    for (const q of questions.rows) {
      const dist = { id: q.id, type: q.type, title: q.title, options: q.options, scaleMin: q.scale_min, scaleMax: q.scale_max }

      if (q.type === 'single') {
        const rows = await pool.query(
          `SELECT value, COUNT(*)::int AS count
           FROM survey_answers WHERE question_id = $1
           GROUP BY value ORDER BY count DESC`,
          [q.id]
        )
        const totalResp = rows.rows.reduce((s, r) => s + r.count, 0) || 1
        dist.distribution = rows.rows.map(r => ({
          label: r.value,
          count: r.count,
          percent: Math.round((r.count / totalResp) * 100)
        }))
      } else if (q.type === 'multiple') {
        const rows = await pool.query(
          `SELECT jsonb_array_elements_text(value::jsonb) AS opt, COUNT(*)::int AS count
           FROM survey_answers
           WHERE question_id = $1 AND value IS NOT NULL AND value != '' AND value != '[]'
           GROUP BY opt ORDER BY count DESC`,
          [q.id]
        )
        // Для multiple считаем % от числа ответивших на вопрос
        const respondents = await pool.query(
          'SELECT COUNT(*)::int AS cnt FROM survey_answers WHERE question_id = $1',
          [q.id]
        )
        const totalResp = respondents.rows[0]?.cnt || 1
        dist.distribution = rows.rows.map(r => ({
          label: r.opt,
          count: r.count,
          percent: Math.round((r.count / totalResp) * 100)
        }))
      } else if (q.type === 'scale') {
        const rows = await pool.query(
          `SELECT value::int AS val, COUNT(*)::int AS count
           FROM survey_answers
           WHERE question_id = $1 AND value ~ '^\\d+$'
           GROUP BY val ORDER BY val`,
          [q.id]
        )
        dist.distribution = rows.rows.map(r => ({ value: r.val, count: r.count }))
        // Среднее и медиана
        const stats = await pool.query(
          `SELECT
            ROUND(AVG(value::int), 1) AS avg,
            ROUND(AVG(value::int) / $2 * 100) AS avg_percent
           FROM survey_answers
           WHERE question_id = $1 AND value ~ '^\\d+$'`,
          [q.id, q.scale_max || 10]
        )
        dist.avg = parseFloat(stats.rows[0]?.avg || 0)
        dist.avgPercent = parseInt(stats.rows[0]?.avg_percent || 0)
      } else if (q.type === 'text') {
        // Для текстовых — показать последние ответы
        const rows = await pool.query(
          `SELECT value, response_id, submitted_at
           FROM survey_answers sa
           JOIN survey_responses sr ON sr.id = sa.response_id
           WHERE sa.question_id = $1 AND sa.value IS NOT NULL AND sa.value != ''
           ORDER BY sr.submitted_at DESC LIMIT 30`,
          [q.id]
        )
        dist.texts = rows.rows.map(r => ({
          text: r.value.length > 200 ? r.value.slice(0, 200) + '…' : r.value,
          submittedAt: r.submitted_at
        }))
      }

      result.push(dist)
    }

    // Общая статистика по опросу
    const surveyInfo = await pool.query(
      `SELECT
        (SELECT COUNT(*)::int FROM survey_responses WHERE survey_id = $1) AS total_responses,
        (SELECT COUNT(*)::int FROM survey_targets WHERE survey_id = $1) AS target_count
       FROM surveys WHERE id = $1`,
      [surveyId]
    )

    res.json({
      surveyId,
      totalResponses: surveyInfo.rows[0]?.total_responses || 0,
      targetCount: surveyInfo.rows[0]?.target_count || 0,
      questions: result
    })
  } catch (err) {
    console.error('[ANALYTICS] questions error:', err)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

export default router
