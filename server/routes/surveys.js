import { Router } from 'express'
import pool from '../db/pool.js'
import { authMiddleware, hrOnly } from '../middleware/auth.js'

function toCamel(row) {
  if (!row || typeof row !== 'object') return row
  const result = {}
  for (const [key, val] of Object.entries(row)) {
    const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    result[camel] = val
  }
  return result
}

function mapList(rows) {
  return rows.map(r => toCamel(r))
}

const router = Router()

router.get('/', authMiddleware, async (req, res) => {
  try {
    const isHr = req.user.role === 'hr'
    const query = isHr
      ? `SELECT s.*, u.name AS created_by_name,
                (SELECT COUNT(*) FROM survey_responses WHERE survey_id = s.id) AS response_count,
                (SELECT COUNT(*) FROM survey_targets WHERE survey_id = s.id) AS target_count
         FROM surveys s
         JOIN users u ON u.id = s.created_by
         ORDER BY s.created_at DESC`
      : `SELECT s.*,
                (SELECT COUNT(*) FROM survey_responses WHERE survey_id = s.id) AS response_count
         FROM surveys s
         WHERE s.status = 'active'
         ORDER BY s.created_at DESC`

    const result = await pool.query(query)
    res.json(mapList(result.rows))
  } catch (err) {
    console.error('[SURVEYS] list error:', err)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const survey = await pool.query(
      `SELECT s.*, u.name AS created_by_name FROM surveys s
       JOIN users u ON u.id = s.created_by
       WHERE s.id = $1`,
      [req.params.id]
    )
    if (survey.rowCount === 0) return res.status(404).json({ error: 'Опрос не найден' })

    const questions = await pool.query(
      'SELECT * FROM survey_questions WHERE survey_id = $1 ORDER BY sort_order',
      [req.params.id]
    )

    const targets = await pool.query(
      'SELECT target_role FROM survey_targets WHERE survey_id = $1',
      [req.params.id]
    )

    res.json({
      ...toCamel(survey.rows[0]),
      questions: mapList(questions.rows),
      targetRoles: targets.rows.map(t => t.target_role)
    })
  } catch (err) {
    console.error('[SURVEYS] get error:', err)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.post('/', authMiddleware, hrOnly, async (req, res) => {
  const client = await pool.connect()
  try {
    const { title, description, startDate, endDate, anonymous, targetRoles, questions } = req.body

    await client.query('BEGIN')

    const survey = await client.query(
      `INSERT INTO surveys (title, description, start_date, end_date, anonymous, status, created_by)
       VALUES ($1, $2, $3, $4, $5, 'draft', $6)
       RETURNING *`,
      [title, description || null, startDate, endDate, anonymous, req.user.id]
    )

    const surveyId = survey.rows[0].id

    if (targetRoles?.length) {
      for (const role of targetRoles) {
        await client.query(
          'INSERT INTO survey_targets (survey_id, target_role) VALUES ($1, $2)',
          [surveyId, role]
        )
      }
    }

    if (questions?.length) {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i]
        await client.query(
          `INSERT INTO survey_questions (survey_id, type, title, required, sort_order, options, scale_min, scale_max, rows, columns, branching)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [surveyId, q.type, q.title, q.required ?? true, i,
           JSON.stringify(q.options) || null,
           q.scaleMin || null, q.scaleMax || null,
           JSON.stringify(q.rows) || null,
           JSON.stringify(q.columns) || null,
           JSON.stringify(q.branching) || null]
        )
      }
    }

    await client.query('COMMIT')
    res.status(201).json(toCamel(survey.rows[0]))
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('[SURVEYS] create error:', err)
    res.status(500).json({ error: 'Ошибка сервера' })
  } finally {
    client.release()
  }
})

router.put('/:id', authMiddleware, hrOnly, async (req, res) => {
  const client = await pool.connect()
  try {
    const { title, description, startDate, endDate, anonymous, questions } = req.body

    await client.query('BEGIN')

    await client.query(
      `UPDATE surveys SET title = $1, description = $2, start_date = $3, end_date = $4,
       anonymous = $5, updated_at = NOW() WHERE id = $6 AND created_by = $7`,
      [title, description, startDate, endDate, anonymous, req.params.id, req.user.id]
    )

    await client.query('DELETE FROM survey_questions WHERE survey_id = $1', [req.params.id])

    if (questions?.length) {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i]
        await client.query(
          `INSERT INTO survey_questions (survey_id, type, title, required, sort_order, options, scale_min, scale_max, rows, columns, branching)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [req.params.id, q.type, q.title, q.required ?? true, i,
           JSON.stringify(q.options) || null,
           q.scaleMin || null, q.scaleMax || null,
           JSON.stringify(q.rows) || null,
           JSON.stringify(q.columns) || null,
           JSON.stringify(q.branching) || null]
        )
      }
    }

    await client.query('COMMIT')
    res.json({ success: true })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('[SURVEYS] update error:', err)
    res.status(500).json({ error: 'Ошибка сервера' })
  } finally {
    client.release()
  }
})

router.post('/:id/publish', authMiddleware, hrOnly, async (req, res) => {
  try {
    await pool.query(
      `UPDATE surveys SET status = 'active', updated_at = NOW()
       WHERE id = $1 AND created_by = $2`,
      [req.params.id, req.user.id]
    )
    res.json({ success: true, message: 'Опрос опубликован. Уведомления отправлены целевой аудитории.' })
  } catch (err) {
    console.error('[SURVEYS] publish error:', err)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.get('/available/list', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*,
              (SELECT COUNT(*) FROM survey_responses WHERE survey_id = s.id) AS response_count
       FROM surveys s
       WHERE s.status = 'active'
       ORDER BY s.created_at DESC`
    )
    res.json(mapList(result.rows))
  } catch (err) {
    console.error('[SURVEYS] available error:', err)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

export default router
