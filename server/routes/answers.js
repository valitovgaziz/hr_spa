import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import pool from '../db/pool.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

// POST /api/answers/:surveyId — отправить ответы на опрос
router.post('/:surveyId', authMiddleware, async (req, res) => {
  const client = await pool.connect()
  try {
    const { answers } = req.body // { questionId: value, ... }
    const surveyId = parseInt(req.params.surveyId)

    // Проверяем, не проходил ли уже
    const existing = await client.query(
      `SELECT id FROM survey_responses WHERE survey_id = $1 AND user_id = $2`,
      [surveyId, req.user.id]
    )
    if (existing.rowCount > 0) {
      return res.status(400).json({ error: 'Вы уже прошли этот опрос' })
    }

    // Получаем опрос для определения режима
    const survey = await client.query(
      'SELECT anonymous FROM surveys WHERE id = $1',
      [surveyId]
    )
    if (survey.rowCount === 0) {
      return res.status(404).json({ error: 'Опрос не найден' })
    }

    const isAnonymous = survey.rows[0].anonymous

    await client.query('BEGIN')

    const response = await client.query(
      `INSERT INTO survey_responses (survey_id, user_id, session_id)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [
        surveyId,
        isAnonymous ? null : req.user.id,
        isAnonymous ? uuidv4() : null
      ]
    )

    const responseId = response.rows[0].id

    for (const [questionId, value] of Object.entries(answers)) {
      const val = Array.isArray(value) ? JSON.stringify(value) : String(value)
      await client.query(
        'INSERT INTO survey_answers (response_id, question_id, value) VALUES ($1, $2, $3)',
        [responseId, parseInt(questionId), val]
      )
    }

    await client.query('COMMIT')
    res.json({ success: true, message: 'Спасибо, ответы сохранены!' })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('[ANSWERS] submit error:', err)
    res.status(500).json({ error: 'Ошибка сервера' })
  } finally {
    client.release()
  }
})

// GET /api/answers/:surveyId/results — результаты опроса (HR)
router.get('/:surveyId/results', authMiddleware, async (req, res) => {
  try {
    const surveyId = parseInt(req.params.surveyId)

    const questions = await pool.query(
      'SELECT * FROM survey_questions WHERE survey_id = $1 ORDER BY sort_order',
      [surveyId]
    )

    const responses = await pool.query(
      `SELECT sr.id, sr.submitted_at, u.name AS user_name, u.department
       FROM survey_responses sr
       LEFT JOIN users u ON u.id = sr.user_id
       WHERE sr.survey_id = $1
       ORDER BY sr.submitted_at`,
      [surveyId]
    )

    const answers = await pool.query(
      `SELECT sa.*, sq.type AS question_type, sq.title AS question_title
       FROM survey_answers sa
       JOIN survey_questions sq ON sq.id = sa.question_id
       WHERE sa.response_id IN (
         SELECT id FROM survey_responses WHERE survey_id = $1
       )
       ORDER BY sq.sort_order`,
      [surveyId]
    )

    res.json({
      questions: questions.rows,
      responses: responses.rows,
      answers: answers.rows
    })
  } catch (err) {
    console.error('[ANSWERS] results error:', err)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

export default router
