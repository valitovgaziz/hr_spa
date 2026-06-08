const delay = (ms = 400) => new Promise(r => setTimeout(r, ms))

const mockUser = {
  id: 1,
  phone: '+7 (999) 123-45-67',
  name: 'Анна Сергеева',
  role: 'hr',
  department: 'HR',
  position: 'HR-специалист',
  avatar: null,
  pushEnabled: true,
  telegramLinked: false,
  quietMode: false,
  quietStart: null,
  quietEnd: null,
  preferredTime: '12:00-18:00',
  devices: [
    { id: 1, name: 'Chrome / ПК', lastActive: '2026-03-20T14:30:00' },
    { id: 2, name: 'Safari / iPhone', lastActive: '2026-03-18T09:15:00' }
  ]
}

const mockEmployee = {
  ...mockUser,
  id: 2,
  name: 'Иван Петров',
  role: 'employee',
  department: 'Разработка',
  position: 'Frontend-разработчик',
  pushEnabled: false,
  telegramLinked: false
}

const mockSurveys = [
  {
    id: 1,
    title: 'Pulse-опрос: март 2026',
    description: 'Ежемесячный опрос вовлечённости сотрудников',
    startDate: '2026-03-25',
    endDate: '2026-04-05',
    status: 'active',
    anonymous: true,
    targetRoles: ['employee'],
    responseCount: 142,
    targetCount: 340,
    createdAt: '2026-03-20T10:00:00',
    questions: [
      {
        id: 1,
        type: 'single',
        title: 'Ваша роль в компании?',
        required: true,
        options: ['Товаровед', 'Руководитель', 'Офисный сотрудник'],
        branching: {
          'Товаровед': [2],
          'Руководитель': [3, 4],
          'Офисный сотрудник': [5]
        }
      },
      {
        id: 2,
        type: 'scale',
        title: 'Оцените удобство рабочего места',
        scaleMin: 1,
        scaleMax: 5,
        required: true,
        branching: {
          1: [6],
          2: [6]
        }
      },
      {
        id: 3,
        type: 'single',
        title: 'Как вы оцениваете нагрузку на команду?',
        required: true,
        options: ['Низкая', 'Нормальная', 'Высокая', 'Критическая']
      },
      {
        id: 4,
        type: 'text',
        title: 'Ваши предложения по улучшению управления',
        required: false
      },
      {
        id: 5,
        type: 'scale',
        title: 'Насколько вы удовлетворены офисной средой?',
        scaleMin: 1,
        scaleMax: 10,
        required: true
      },
      {
        id: 6,
        type: 'text',
        title: 'Что именно неудобно? Опишите подробнее',
        required: true
      },
      {
        id: 7,
        type: 'scale',
        title: 'Насколько вероятно, что вы порекомендуете нашу компанию как место работы? (eNPS)',
        scaleMin: 0,
        scaleMax: 10,
        required: true
      },
      {
        id: 8,
        type: 'multiple',
        title: 'Какие факторы влияют на вашу удовлетворённость?',
        required: false,
        options: ['Зарплата', 'Коллектив', 'Карьерный рост', 'Удалёнка', 'Обучение', 'Инфраструктура']
      }
    ]
  },
  {
    id: 2,
    title: 'Выходное интервью',
    description: 'Опрос для увольняющихся сотрудников',
    startDate: '2026-03-01',
    endDate: '2026-12-31',
    status: 'active',
    anonymous: false,
    targetRoles: ['employee'],
    responseCount: 8,
    targetCount: 12,
    createdAt: '2026-03-01T09:00:00',
    questions: [
      {
        id: 1,
        type: 'single',
        title: 'Основная причина ухода?',
        required: true,
        options: ['Зарплата', 'Карьера', 'Коллектив', 'Переезд', 'Личные причины', 'Другое']
      },
      {
        id: 2,
        type: 'text',
        title: 'Расскажите подробнее о вашем решении',
        required: true
      },
      {
        id: 3,
        type: 'scale',
        title: 'Оцените вероятность рекомендации компании',
        scaleMin: 0,
        scaleMax: 10,
        required: true
      }
    ]
  },
  {
    id: 3,
    title: 'Оценка обучения за Q1',
    description: 'Оценка качества проведённых тренингов',
    startDate: '2026-03-01',
    endDate: '2026-03-20',
    status: 'completed',
    anonymous: true,
    targetRoles: ['employee'],
    responseCount: 56,
    targetCount: 60,
    createdAt: '2026-02-25T11:00:00',
    questions: [
      {
        id: 1,
        type: 'matrix',
        title: 'Оцените тренинг по параметрам (1-5)',
        required: true,
        rows: ['Материал', 'Подача', 'Практика', 'Организация'],
        columns: ['1', '2', '3', '4', '5']
      }
    ]
  },
  {
    id: 4,
    title: 'Опрос удовлетворённости соцпакетом',
    description: null,
    startDate: '2026-02-01',
    endDate: '2026-02-28',
    status: 'archived',
    anonymous: true,
    targetRoles: ['employee'],
    responseCount: 120,
    targetCount: 300,
    createdAt: '2026-01-28T10:00:00',
    questions: []
  },
  {
    id: 5,
    title: 'Pulse-настроение: неделя 12',
    description: 'Быстрый опрос настроения (5 вопросов)',
    startDate: '2026-03-28',
    endDate: '2026-03-28',
    status: 'draft',
    anonymous: true,
    targetRoles: ['employee'],
    responseCount: 0,
    targetCount: 340,
    createdAt: '2026-03-22T16:00:00',
    questions: [
      {
        id: 1,
        type: 'scale',
        title: 'Как ваше настроение сегодня?',
        scaleMin: 1,
        scaleMax: 5,
        required: true
      }
    ]
  }
]

const mockAnalytics = {
  eNPS: 42,
  eNPSChange: '+5',
  promoters: 38,
  passives: 32,
  detractors: 30,
  completionRate: 78,
  completionTarget: 85,
  webPushRate: 64,
  webPushTarget: 60,
  avgResponseTime: 32,
  avgResponseChange: '-15',
  responseRate24h: 52,
  smsCost: '324',
  byDepartment: [
    { name: 'Продажи', eNPS: 38, change: -2, color: '#F59E0B' },
    { name: 'Разработка', eNPS: 52, change: 7, color: '#10B981' },
    { name: 'HR', eNPS: 45, change: 3, color: '#3B82F6' },
    { name: 'Логистика', eNPS: 34, change: 0, color: '#8B5CF6' },
    { name: 'Маркетинг', eNPS: 48, change: 5, color: '#EC4899' },
    { name: 'Финансы', eNPS: 40, change: -1, color: '#F97316' }
  ],
  channels: [
    { name: 'Web Push', delivery: 96, ctr: 58, response24h: 52, cost: null },
    { name: 'Telegram', delivery: 98, ctr: 51, response24h: 45, cost: null },
    { name: 'SMS', delivery: 95, ctr: 35, response24h: 28, cost: '324' },
    { name: 'E-mail', delivery: 100, ctr: 19, response24h: 22, cost: null }
  ],
  comments: [
    { text: 'Хорошо бы чаще проводить опросы, но анонимность важна', sentiment: 'neutral' },
    { text: 'Руководство стало слышать обратную связь, eNPS вырос', sentiment: 'positive' },
    { text: 'Слишком много бюрократии в процессах', sentiment: 'negative' },
    { text: 'Коллектив отличный, но зарплаты могли бы быть выше', sentiment: 'neutral' }
  ],
  dailyActivity: [
    { day: 'Пн', count: 45 },
    { day: 'Вт', count: 78 },
    { day: 'Ср', count: 62 },
    { day: 'Чт', count: 55 },
    { day: 'Пт', count: 38 },
    { day: 'Сб', count: 12 },
    { day: 'Вс', count: 8 }
  ]
}

function simulateError(prob = 0.05) {
  if (Math.random() < prob) throw new Error('Сетевая ошибка. Попробуйте снова.')
}

export const api = {
  async requestOtp(phone) {
    await delay(600)
    simulateError(0.02)
    return { success: true, message: 'OTP-код отправлен на ' + phone }
  },

  async verifyOtp(phone, code) {
    await delay(800)
    if (code !== '111111') {
      throw new Error('Неверный код подтверждения')
    }
    const user = phone === '+79991234567' || phone.includes('999') ? mockUser : mockEmployee
    return { success: true, token: 'mock-jwt-token-' + Date.now(), user }
  },

  async fetchSurveys() {
    await delay(500)
    simulateError()
    return [...mockSurveys]
  },

  async fetchSurvey(id) {
    await delay(300)
    simulateError()
    const s = mockSurveys.find(s => s.id === id)
    if (!s) throw new Error('Опрос не найден')
    return { ...s }
  },

  async createSurvey(data) {
    await delay(700)
    simulateError()
    const newSurvey = {
      ...data,
      id: Date.now(),
      status: 'draft',
      responseCount: 0,
      targetCount: 0,
      createdAt: new Date().toISOString()
    }
    return newSurvey
  },

  async updateSurvey(id, data) {
    await delay(500)
    simulateError()
    return { ...data, id }
  },

  async publishSurvey(id) {
    await delay(600)
    simulateError()
    return { success: true, message: 'Опрос опубликован' }
  },

  async submitSurveyResponse(surveyId, answers) {
    await delay(700)
    simulateError()
    return { success: true, message: 'Спасибо, ответы сохранены' }
  },

  async fetchAnalytics() {
    await delay(600)
    simulateError()
    return { ...mockAnalytics }
  },

  async fetchNotifications() {
    await delay(400)
    simulateError()
    return {
      channels: mockUser.pushEnabled ? 'push' : 'sms',
      telegramLinked: mockUser.telegramLinked,
      quietMode: mockUser.quietMode,
      quietStart: mockUser.quietStart,
      quietEnd: mockUser.quietEnd,
      preferredTime: mockUser.preferredTime,
      devices: mockUser.devices
    }
  },

  async updateNotificationSettings(settings) {
    await delay(500)
    simulateError()
    return { success: true, ...settings }
  },

  async linkTelegram() {
    await delay(300)
    simulateError()
    return { qrCode: 'data:image/svg+xml;base64,...', botUrl: 'https://t.me/PulseHRBot' }
  },

  async requestPushPermission() {
    await delay(200)
    return { granted: true }
  },

  async fetchUsers() {
    await delay(500)
    return [
      { id: 1, name: 'Анна Сергеева', role: 'hr', department: 'HR', phone: '+7 (999) 123-45-67' },
      { id: 2, name: 'Иван Петров', role: 'employee', department: 'Разработка', phone: '+7 (999) 234-56-78' },
      { id: 3, name: 'Мария Иванова', role: 'employee', department: 'Продажи', phone: '+7 (999) 345-67-89' },
      { id: 4, name: 'Пётр Сидоров', role: 'employee', department: 'Логистика', phone: '+7 (999) 456-78-90' }
    ]
  }
}
