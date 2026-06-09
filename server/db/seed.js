import pool from './pool.js'

const HR_ID = 1 // Анна Сергеева
const EMP_ID = 2 // Иван Петров

async function seed() {
  console.log('[SEED] Starting demo data…')

  // ── 1. Дополнительные сотрудники ─────────────────────────
  const employees = [
    { phone: '+79991110001', name: 'Алексей Смирнов',   department: 'Разработка',    position: 'Backend-разработчик' },
    { phone: '+79991110002', name: 'Елена Козлова',     department: 'Разработка',    position: 'Frontend-разработчик' },
    { phone: '+79991110003', name: 'Дмитрий Новиков',   department: 'Разработка',    position: 'Team Lead' },
    { phone: '+79991110004', name: 'Ольга Попова',      department: 'HR',             position: 'HR-менеджер' },
    { phone: '+79991110005', name: 'Сергей Васильев',   department: 'Продажи',        position: 'Менеджер по продажам' },
    { phone: '+79991110006', name: 'Анна Морозова',     department: 'Продажи',        position: 'Руководитель отдела продаж' },
    { phone: '+79991110007', name: 'Иван Крылов',       department: 'Маркетинг',      position: 'SMM-менеджер' },
    { phone: '+79991110008', name: 'Мария Волкова',     department: 'Маркетинг',      position: 'Маркетолог' },
  ]

  const empIds = {}
  for (const e of employees) {
    const existing = await pool.query('SELECT id FROM users WHERE phone = $1', [e.phone])
    if (existing.rowCount > 0) {
      empIds[e.name] = existing.rows[0].id
      continue
    }
    const ins = await pool.query(
      `INSERT INTO users (phone, name, role, department, position, consent_given, consent_at)
       VALUES ($1, $2, 'employee', $3, $4, true, NOW()) RETURNING id`,
      [e.phone, e.name, e.department, e.position]
    )
    empIds[e.name] = ins.rows[0].id
  }

  // Явные маппинги для предсозданных пользователей
  empIds['Анна Сергеева'] = HR_ID
  empIds['Иван Петров'] = EMP_ID

  const U = { ...empIds }
  const allUsers = [...new Set(Object.values(U))]

  // ── 2. Опрос 1: eNPS Q2 2026 (завершён, архивирован) ──
  const s1 = await upsertSurvey('eNPS — Q2 2026', 'Ежеквартальный замер лояльности сотрудников',
    '2026-04-01', '2026-04-15', 'archived', true, false, HR_ID)
  await upsertTarget(s1, 'employee')
  const s1q1 = await upsertQuestion(s1, 'scale', 'Оцените от 0 до 10, насколько вероятно, что вы порекомендуете нашу компанию как место работы?', 0, 10)
  const s1q2 = await upsertQuestion(s1, 'text', 'Что вам больше всего нравится в работе?')
  const s1q3 = await upsertQuestion(s1, 'text', 'Что хотелось бы улучшить?')

  // Ответы на eNPS (ANNA + 8 сотрудников)
  const enpsAnswers = {
    [U['Анна Сергеева']]: [9, 'Гибкий график и возможность работать удалённо', 'Хочется больше прозрачности в принятии решений'],
    [U['Иван Петров']]:   [8, 'Интересные задачи и современный стек технологий', 'Иногда не хватает code review и менторства'],
    [U['Алексей Смирнов']]:  [7, 'Хорошая команда, адекватные сроки', 'Нагрузка неравномерная, бывают переработки'],
    [U['Елена Козлова']]:    [9, 'Дизайн-система и продуктовый подход', 'Хочется больше влиять на продуктовые решения'],
    [U['Дмитрий Новиков']]:  [8, 'Сильная команда, хороший тимлид', 'Бюрократия в согласованиях задач'],
    [U['Ольга Попова']]:     [10, 'Коллектив и атмосфера, HR-команда топ', 'Всё устраивает'],
    [U['Сергей Васильев']]:  [6, 'Клиенты интересные, продукт понятный', 'Мало бонусов за перевыполнение плана'],
    [U['Анна Морозова']]:    [7, 'Рыночная зарплата, соцпакет', 'Много ручной отчётности, хочется автоматизации CRM'],
    [U['Иван Крылов']]:      [8, 'Креативная свобода, интересные проекты', 'Не хватает бюджета на эксперименты'],
    [U['Мария Волкова']]:    [9, 'Коллеги отзывчивые, культура классная', 'Хочется больше офлайн-мероприятий'],
  }
  for (const [uid, [score, likes, wishes]] of Object.entries(enpsAnswers)) {
    await submitResponse(s1, Number(uid), { [s1q1]: String(score), [s1q2]: likes, [s1q3]: wishes })
  }

  // ── 3. Опрос 2: Удовлетворённость рабочим местом (активен) ──
  const s2 = await upsertSurvey('Удовлетворённость рабочим местом', 'Оцените комфорт и обеспечение',
    '2026-05-20', '2026-06-20', 'active', true, false, HR_ID)
  await upsertTarget(s2, 'employee')
  const s2q1 = await upsertQuestion(s2, 'single', 'Как вы оцениваете своё рабочее место?',
    null, null, ['Отлично', 'Хорошо', 'Удовлетворительно', 'Плохо'])
  const s2q2 = await upsertQuestion(s2, 'multiple', 'Каких ресурсов вам не хватает?',
    null, null, ['Ноутбук мощнее', 'Монитор', 'Софт/лицензии', 'Доступ к AI-инструментам', 'Другое'])
  const s2q3 = await upsertQuestion(s2, 'scale', 'Оцените комфорт офиса (1 — ужасно, 5 — идеально)', 1, 5)

  const workplaceAnswers = [
    [U['Иван Петров'], 'Хорошо', ['Монитор', 'Софт/лицензии'], 4],
    [U['Алексей Смирнов'], 'Отлично', ['Ноутбук мощнее'], 5],
    [U['Елена Козлова'], 'Хорошо', ['Монитор'], 3],
    [U['Дмитрий Новиков'], 'Отлично', ['Доступ к AI-инструментам'], 5],
    [U['Ольга Попова'], 'Хорошо', [], 4],
    [U['Сергей Васильев'], 'Удовлетворительно', ['Ноутбук мощнее', 'Софт/лицензии'], 2],
    [U['Анна Морозова'], 'Хорошо', ['Софт/лицензии'], 4],
    [U['Иван Крылов'], 'Отлично', ['Доступ к AI-инструментам'], 5],
    [U['Мария Волкова'], 'Хорошо', ['Монитор', 'Доступ к AI-инструментам'], 4],
  ]
  for (const [uid, q1, q2arr, q3] of workplaceAnswers) {
    await submitResponse(s2, uid, { [s2q1]: q1, [s2q2]: q2arr, [s2q3]: String(q3) })
  }

  // ── 4. Опрос 3: Выходное интервью (активен, критичный) ──
  const s3 = await upsertSurvey('Выходное интервью', 'Обязательный опрос при увольнении',
    '2026-01-01', '2026-12-31', 'active', false, true, HR_ID)
  await upsertTarget(s3, 'employee')
  await upsertQuestion(s3, 'single', 'Основная причина ухода',
    null, null, ['Зарплата', 'Карьерный рост', 'Коллектив', 'Руководство', 'Переезд', 'Другое'])
  await upsertQuestion(s3, 'matrix', 'Оцените атмосферу в команде',
    null, null, null, ['Поддержка', 'Коммуникация', 'Признание'], ['1', '2', '3', '4', '5'])
  await upsertQuestion(s3, 'text', 'Что бы вы хотели сказать руководству?')

  // ── 5. Опрос 4: Командная работа (черновик) ──
  const s4 = await upsertSurvey('Командная работа', 'Оценка эффективности командного взаимодействия',
    '2026-06-01', '2026-06-30', 'draft', true, false, HR_ID)
  await upsertTarget(s4, 'employee')
  await upsertQuestion(s4, 'single', 'Как часто ваша команда проводит ретроспективы?',
    null, null, ['Каждую неделю', 'Раз в месяц', 'Раз в квартал', 'Никогда'])
  await upsertQuestion(s4, 'text', 'Ваши пожелания по командным процессам')

  // ── 6. Опрос 5: Компенсации и льготы (активен) ──
  const s5 = await upsertSurvey('Компенсации и льготы 2026', 'Голосование по соцпакету на следующий год',
    '2026-06-01', '2026-07-01', 'active', false, false, HR_ID)
  await upsertTarget(s5, 'employee')
  const s5q1 = await upsertQuestion(s5, 'multiple', 'Какими льготами вы пользуетесь?',
    null, null, ['ДМС', 'Спорт', 'Обучение', 'Питание', 'Транспорт'])
  const s5q2 = await upsertQuestion(s5, 'text', 'Какие льготы хотели бы добавить?')

  const benefitsAnswers = [
    [U['Иван Петров'], ['ДМС', 'Обучение'], 'Абонемент в бассейн'],
    [U['Алексей Смирнов'], ['ДМС', 'Питание'], 'Стоматология'],
    [U['Елена Козлова'], ['ДМС', 'Спорт'], 'Больше курсов английского'],
    [U['Дмитрий Новиков'], ['ДМС', 'Обучение', 'Питание'], 'Конференции за счёт компании'],
    [U['Ольга Попова'], ['ДМС', 'Спорт', 'Транспорт'], 'Компенсация бензина'],
    [U['Сергей Васильев'], ['ДМС'], 'Премии за сделки'],
    [U['Анна Морозова'], ['ДМС', 'Транспорт'], 'Автомобиль компании'],
  ]
  for (const [uid, q1arr, q2text] of benefitsAnswers) {
    await submitResponse(s5, uid, { [s5q1]: q1arr, [s5q2]: q2text })
  }

  // ── 7. Опрос 6: Пульс настроения (завершён) ──
  const s6 = await upsertSurvey('Пульс настроения — Май 2026', 'Еженедельный замер настроения',
    '2026-05-26', '2026-05-27', 'completed', true, false, HR_ID)
  await upsertTarget(s6, 'employee')
  const s6q1 = await upsertQuestion(s6, 'scale', 'Ваше настроение сегодня (0 — ужасно, 10 — отлично)', 0, 10)

  const moodScores = [8, 7, 9, 6, 8, 5, 7, 9, 8, 7]
  for (let i = 0; i < allUsers.length; i++) {
    await submitResponse(s6, allUsers[i], { [s6q1]: String(moodScores[i % moodScores.length]) })
  }

  // ── 8. Логи уведомлений (для eNPS и рабочего места) ──
  const channels = ['push', 'telegram', 'sms', 'email']
  for (const uid of allUsers) {
    for (const ch of channels) {
      const sent = Math.random() > 0.2
      await pool.query(
        `INSERT INTO notification_log (survey_id, user_id, channel, status, sent_at, cost)
         VALUES ($1, $2, $3, $4, NOW() - INTERVAL '1 day' * floor(random() * 30 + 1)::int, $5)`,
        [s1, uid, ch, sent ? 'sent' : 'failed', sent ? 0 : Math.random() * 2]
      )
    }
  }

  console.log('[SEED] Demo data inserted successfully')
  console.log(`[SEED] Surveys: ${[s1,s2,s3,s4,s5,s6].length}, Users: ${allUsers.length}`)
}

// ── Helpers ──────────────────────────────────────────────────

async function upsertSurvey(title, desc, start, end, status, anon, critical, creatorId) {
  const existing = await pool.query('SELECT id FROM surveys WHERE title = $1', [title])
  if (existing.rowCount > 0) return existing.rows[0].id

  const ins = await pool.query(
    `INSERT INTO surveys (title, description, start_date, end_date, status, anonymous, is_critical, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [title, desc, start, end, status, anon, critical, creatorId]
  )
  return ins.rows[0].id
}

async function upsertTarget(surveyId, role) {
  const existing = await pool.query(
    'SELECT id FROM survey_targets WHERE survey_id = $1 AND target_role = $2',
    [surveyId, role]
  )
  if (existing.rowCount > 0) return
  await pool.query('INSERT INTO survey_targets (survey_id, target_role) VALUES ($1, $2)', [surveyId, role])
}

async function upsertQuestion(surveyId, type, title, min, max, options, rows, cols) {
  const existing = await pool.query(
    'SELECT id FROM survey_questions WHERE survey_id = $1 AND title = $2',
    [surveyId, title]
  )
  if (existing.rowCount > 0) return existing.rows[0].id

  const ins = await pool.query(
    `INSERT INTO survey_questions (survey_id, type, title, sort_order, scale_min, scale_max, options, rows, columns)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    [
      surveyId, type, title,
      Math.floor(Math.random() * 100),
      min ?? null, max ?? null,
      options ? JSON.stringify(options) : null,
      rows ? JSON.stringify(rows) : null,
      cols ? JSON.stringify(cols) : null,
    ]
  )
  return ins.rows[0].id
}

async function submitResponse(surveyId, userId, answers) {
  // Проверка дубликата
  const dup = await pool.query(
    'SELECT id FROM survey_completions WHERE survey_id = $1 AND user_id = $2',
    [surveyId, userId]
  )
  if (dup.rowCount > 0) return

  // Отвечаем со случайной временной меткой за последние 30 дней
  const daysAgo = Math.floor(Math.random() * 30)
  const submitted = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000 - Math.floor(Math.random() * 86400000))

  const resp = await pool.query(
    `INSERT INTO survey_responses (survey_id, user_id, submitted_at)
     VALUES ($1, $2, $3) RETURNING id`,
    [surveyId, userId, submitted]
  )
  const respId = resp.rows[0].id

  for (const [qId, val] of Object.entries(answers)) {
    const strVal = Array.isArray(val) ? JSON.stringify(val) : String(val)
    await pool.query(
      'INSERT INTO survey_answers (response_id, question_id, value) VALUES ($1, $2, $3)',
      [respId, qId, strVal]
    )
  }

  await pool.query(
    `INSERT INTO survey_completions (survey_id, user_id, completed_at)
     VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
    [surveyId, userId, submitted]
  )
}

seed().catch(err => {
  console.error('[SEED] Error:', err)
  process.exit(1)
})
