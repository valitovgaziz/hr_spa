import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '../services/api.js'

export const useSurveyStore = defineStore('survey', () => {
  const surveys = ref([])
  const currentSurvey = ref(null)
  const loading = ref(false)
  const submitting = ref(false)

  async function loadSurveys() {
    loading.value = true
    try {
      surveys.value = await api.fetchSurveys()
    } finally {
      loading.value = false
    }
  }

  async function loadSurvey(id) {
    loading.value = true
    try {
      currentSurvey.value = await api.fetchSurvey(id)
    } finally {
      loading.value = false
    }
  }

  async function createSurvey(data) {
    loading.value = true
    try {
      const result = await api.createSurvey(data)
      surveys.value.unshift(result)
      return result
    } finally {
      loading.value = false
    }
  }

  async function updateSurvey(id, data) {
    loading.value = true
    try {
      const result = await api.updateSurvey(id, data)
      const idx = surveys.value.findIndex(s => s.id === Number(id))
      if (idx !== -1) surveys.value[idx] = { ...surveys.value[idx], ...data }
      return result
    } finally {
      loading.value = false
    }
  }

  async function publishSurvey(id) {
    const s = surveys.value.find(s => s.id === id)
    if (s) s.status = 'active'
    return await api.publishSurvey(id)
  }

  async function submitResponse(surveyId, answers) {
    submitting.value = true
    try {
      return await api.submitSurveyResponse(surveyId, answers)
    } finally {
      submitting.value = false
    }
  }

  return { surveys, currentSurvey, loading, submitting, loadSurveys, loadSurvey, createSurvey, updateSurvey, publishSurvey, submitResponse }
})
