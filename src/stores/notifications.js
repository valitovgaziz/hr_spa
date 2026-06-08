import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '../services/api.js'

export const useNotificationStore = defineStore('notifications', () => {
  const channels = ref('push')
  const telegramLinked = ref(false)
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
      channels.value = data.channels
      telegramLinked.value = data.telegramLinked
      quietMode.value = data.quietMode
      quietStart.value = data.quietStart
      quietEnd.value = data.quietEnd
      preferredTime.value = data.preferredTime
      devices.value = data.devices
    } finally {
      loading.value = false
    }
  }

  async function saveSettings() {
    loading.value = true
    try {
      return await api.updateNotificationSettings({
        channels: channels.value,
        quietMode: quietMode.value,
        quietStart: quietStart.value,
        quietEnd: quietEnd.value,
        preferredTime: preferredTime.value
      })
    } finally {
      loading.value = false
    }
  }

  async function linkTelegram() {
    return await api.linkTelegram()
  }

  return {
    channels, telegramLinked, quietMode, quietStart, quietEnd,
    preferredTime, devices, loading,
    loadSettings, saveSettings, linkTelegram
  }
})
