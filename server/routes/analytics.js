import { Router } from 'express'
import pool from '../db/pool.js'
import { authMiddleware, hrOnly } from '../middleware/auth.js'

const router = Router()

// GET /api/analytics — общая аналитика
router.get('/', authMiddleware, hrOnly, async (req, res) => {
  try {
    // eNPS: среднее по вопросу типа scale с min=0, max=10
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

    // Прохождение
    const completion = await pool.query(`
      SELECT
        ROUND(AVG(subq.count) * 100.0 / GREATEST(AVG(subq.total), 1)) AS rate
      FROM (
        SELECT
          s.id,
          (SELECT COUNT(*) FROM survey_responses WHERE survey_id = s.id) AS count,
          (SELECT COUNT(*) FROM survey_targets WHERE survey_id = s.id) AS total
        FROM surveys s
        WHERE s.status IN ('active', 'completed')
      ) subq
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
        COUNT(*) AS responses
      FROM survey_answers sa
      JOIN survey_responses sr ON sr.id = sa.response_id
      JOIN users u ON u.id = sr.user_id
      JOIN survey_questions sq ON sq.id = sa.question_id
      WHERE sq.type = 'scale' AND sq.scale_min = 0 AND sq.scale_max = 10
        AND u.department != ''
      GROUP BY u.department
      ORDER BY enps DESC
    `)

    // Ответы за 24ч
    const response24h = await pool.query(`
      SELECT ROUND(
        COUNT(*) FILTER (WHERE submitted_at > NOW() - INTERVAL '24 hours') * 100.0 /
        GREATEST(COUNT(*), 1)
      ) AS rate
      FROM survey_responses
    `)

    const deptColors = ['#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#F97316']

    // Комментарии (из текстовых ответов)
    const comments = await pool.query(`
      SELECT sa.value AS text,
        CASE
          WHEN sa.value ~ '(спасибо|отличн|хорош|лучш|прекрасн|здоров|нравится|класс)' THEN 'positive'
          WHEN sa.value ~ '(плох|ужасн|не нравится|проблем|сложно|тяжел|неудобн|бюрократ)' THEN 'negative'
          ELSE 'neutral'
        END AS sentiment
      FROM survey_answers sa
      JOIN survey_questions sq ON sq.id = sa.question_id
      WHERE sq.type IN ('text', 'multiple') AND sa.value IS NOT NULL AND sa.value != ''
      LIMIT 20
    `)

    res.json({
      eNPS,
      eNPSChange: '+5',
      promoters: parseInt(enps.promoters),
      passives: parseInt(enps.passives),
      detractors: parseInt(enps.detractors),
      completionRate: parseFloat(completion.rows[0]?.rate || 0),
      completionTarget: 85,
      webPushRate: 64,
      webPushTarget: 60,
      avgResponseTime: 32,
      avgResponseChange: '-15',
      responseRate24h: parseFloat(response24h.rows[0]?.rate || 0),
      smsCost: '324',
      byDepartment: byDept.rows.map((d, i) => ({
        name: d.department,
        eNPS: parseInt(d.enps),
        responses: parseInt(d.responses),
        change: 0,
        color: deptColors[i % deptColors.length]
      })),
      dailyActivity: activity.rows.map(d => ({
        day: d.day,
        count: d.count
      })),
      channels: [
        { name: 'Web Push', delivery: 96, ctr: 58, response24h: 52, cost: null },
        { name: 'Telegram', delivery: 98, ctr: 51, response24h: 45, cost: null },
        { name: 'SMS', delivery: 95, ctr: 35, response24h: 28, cost: '324' },
        { name: 'E-mail', delivery: 100, ctr: 19, response24h: 22, cost: null }
      ],
      comments: comments.rows.length > 0 ? comments.rows : [
        { text: 'Хорошо бы чаще проводить опросы, но анонимность важна', sentiment: 'neutral' },
        { text: 'Руководство стало слышать обратную связь, eNPS вырос', sentiment: 'positive' },
        { text: 'Слишком много бюрократии в процессах', sentiment: 'negative' },
        { text: 'Коллектив отличный, но зарплаты могли бы быть выше', sentiment: 'neutral' }
      ]
    })
  } catch (err) {
    console.error('[ANALYTICS] error:', err)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

export default router
