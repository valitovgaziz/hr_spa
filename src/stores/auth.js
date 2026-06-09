import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '../services/api.js'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(null)
  const loading = ref(false)

  const isAuthenticated = computed(() => !!token.value)
  const isHR = computed(() => user.value?.role === 'hr')
  const roleLabel = computed(() => user.value?.role === 'hr' ? 'HR / Администратор' : 'Сотрудник')
  const needsConsent = computed(() => isAuthenticated.value && !user.value?.consentGiven)

  async function requestOtp(phone) {
    loading.value = true
    try {
      return await api.requestOtp(phone)
    } finally {
      loading.value = false
    }
  }

  async function verifyOtp(phone, code) {
    loading.value = true
    try {
      const result = await api.verifyOtp(phone, code)
      token.value = result.token
      user.value = result.user
      localStorage.setItem('pulsehr_token', result.token)
      localStorage.setItem('pulsehr_user', JSON.stringify(result.user))
      return result
    } finally {
      loading.value = false
    }
  }

  function restoreSession() {
    const saved = localStorage.getItem('pulsehr_token')
    const savedUser = localStorage.getItem('pulsehr_user')
    if (saved && savedUser) {
      token.value = saved
      user.value = JSON.parse(savedUser)
    }
  }

  async function giveConsent() {
    await api.giveConsent()
    if (user.value) {
      user.value.consentGiven = true
      localStorage.setItem('pulsehr_user', JSON.stringify(user.value))
    }
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('pulsehr_token')
    localStorage.removeItem('pulsehr_user')
  }

  return { user, token, loading, isAuthenticated, isHR, roleLabel, needsConsent, requestOtp, verifyOtp, restoreSession, giveConsent, logout }
})
