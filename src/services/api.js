const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? 'http://localhost:4000' : '') + '/api'

let _token = localStorage.getItem('pulsehr_token') || null

export function setApiToken(token) {
  _token = token
}

function toCamel(row) {
  if (!row || typeof row !== 'object') return row
  if (Array.isArray(row)) return row.map(toCamel)
  const result = {}
  for (const [key, val] of Object.entries(row)) {
    result[key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = typeof val === 'object' && val !== null ? toCamel(val) : val
  }
  return result
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
  async fetchMe() {
    const data = await request('/auth/me')
    return toCamel(data)
  },

  async updateProfile(data) {
    return toCamel(await request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    }))
  },

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

  async deleteSurvey(id) {
    return request('/surveys/' + id, { method: 'DELETE' })
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

  async fetchQuestionAnalytics(surveyId) {
    return request('/analytics/questions/' + surveyId)
  },

  async fetchNotifications() {
    const data = await request('/notifications/settings')
    return toCamel(data)
  },

  async updateNotificationSettings(settings) {
    const data = await request('/notifications/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    })
    return toCamel(data)
  },

  async linkTelegram() {
    return request('/notifications/telegram/link', { method: 'POST' })
  },

  async fetchVapidKey() {
    const data = await request('/push/vapid-key')
    return data.publicKey
  },

  async subscribePush(subscription) {
    function bufToBase64(buf) {
      const bytes = new Uint8Array(buf)
      let bin = ''
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
      return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    }
    return request('/notifications/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        p256dh: bufToBase64(subscription.getKey('p256dh')),
        auth: bufToBase64(subscription.getKey('auth')),
        deviceName: navigator.userAgent.slice(0, 100)
      })
    })
  },

  async deleteDevice(id) {
    return request('/notifications/devices/' + id, { method: 'DELETE' })
  },

  async fetchUsers() {
    return request('/notifications/users')
  },

  async giveConsent() {
    return request('/auth/consent', { method: 'POST' })
  }
}
