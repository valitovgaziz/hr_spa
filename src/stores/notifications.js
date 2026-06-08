import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '../services/api.js'

export const useNotificationStore = defineStore('notifications', () => {
  const pushEnabled = ref(true)
  const telegramLinked = ref(false)
  const smsEnabled = ref(true)
  const emailEnabled = ref(true)
  const quietMode = ref(false)
  const quietStart = ref(null)
  const quietEnd = ref(null)
  const preferredTime = ref('12:00-18:00')
  const devices = ref([])
  const loading = ref(false)

  async function loadSettings() {
    loading.value = true
    try {
      const data = await api.fetchNotifications()
      pushEnabled.value = !!data.pushEnabled
      telegramLinked.value = !!data.telegramLinked
      smsEnabled.value = data.smsEnabled !== false
      emailEnabled.value = data.emailEnabled !== false
      quietMode.value = !!data.quietMode
      quietStart.value = data.quietStart || null
      quietEnd.value = data.quietEnd || null
      preferredTime.value = data.preferredTime || '12:00-18:00'
      devices.value = data.devices || []
    } finally {
      loading.value = false
    }
  }

  async function saveSettings() {
    loading.value = true
    try {
      const data = await api.updateNotificationSettings({
        pushEnabled: pushEnabled.value,
        telegramLinked: telegramLinked.value,
        smsEnabled: smsEnabled.value,
        emailEnabled: emailEnabled.value,
        quietMode: quietMode.value,
        quietStart: quietStart.value,
        quietEnd: quietEnd.value,
        preferredTime: preferredTime.value
      })
      telegramLinked.value = !!data.telegramLinked
      return data
    } finally {
      loading.value = false
    }
  }

  async function linkTelegram() {
    return await api.linkTelegram()
  }

  return {
    pushEnabled, telegramLinked, smsEnabled, emailEnabled,
    quietMode, quietStart, quietEnd,
    preferredTime, devices, loading,
    loadSettings, saveSettings, linkTelegram
  }
})
