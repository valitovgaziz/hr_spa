const API_BASE = 'http://localhost:4000/api'

let _token = localStorage.getItem('pulsehr_token') || null

export function setApiToken(token) {
  _token = token
}

async function request(path, options = {}) {
  const url = API_BASE + path
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (_token) headers['Authorization'] = 'Bearer ' + _token

  const res = await fetch(url, { ...options, headers })

  if (res.status === 401) {
    localStorage.removeItem('pulsehr_token')
    _token = null
    window.location.href = '/login'
    throw new Error('Сессия истекла')
  }

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `Ошибка ${res.status}`)
  return data
}

export const api = {
  async requestOtp(phone) {
    return request('/auth/otp', {
      method: 'POST',
      body: JSON.stringify({ phone })
    })
  },

  async verifyOtp(phone, code) {
    const data = await request('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, code })
    })
    _token = data.token
    localStorage.setItem('pulsehr_token', data.token)
    return data
  },

  async fetchSurveys() {
    return request('/surveys')
  },

  async fetchSurvey(id) {
    return request('/surveys/' + id)
  },

  async createSurvey(data) {
    return request('/surveys', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  },

  async updateSurvey(id, data) {
    return request('/surveys/' + id, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  },

  async publishSurvey(id) {
    return request('/surveys/' + id + '/publish', { method: 'POST' })
  },

  async submitSurveyResponse(surveyId, answers) {
    return request('/answers/' + surveyId, {
      method: 'POST',
      body: JSON.stringify({ answers })
    })
  },

  async fetchAnalytics() {
    return request('/analytics')
  },

  async fetchNotifications() {
    return request('/notifications/settings')
  },

  async updateNotificationSettings(settings) {
    return request('/notifications/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    })
  },

  async linkTelegram() {
    return request('/notifications/telegram/link', { method: 'POST' })
  },

  async requestPushPermission() {
    return { granted: true }
  },

  async fetchUsers() {
    return request('/notifications/users')
  }
}
