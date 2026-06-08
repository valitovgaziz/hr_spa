<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSurveyStore } from '../stores/survey.js'

const router = useRouter()
const store = useSurveyStore()

const props = defineProps({
  showToast: Function
})

onMounted(async () => {
  try {
    await store.loadSurveys()
  } catch {
    props.showToast?.('Ошибка загрузки', 'error')
  }
})

const available = computed(() =>
  store.surveys.filter(s => s.status === 'active')
)
</script>

<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">📋 Доступные опросы</h1>
    </div>

    <div v-if="store.loading" style="text-align:center;padding:60px;">
      <div class="spinner" style="width:36px;height:36px;"></div>
    </div>

    <div v-else-if="available.length === 0" class="empty-state">
      <h3>Нет доступных опросов</h3>
      <p>Когда HR опубликует новый опрос, вы получите уведомление</p>
    </div>

    <div v-else class="grid-2">
      <div v-for="s in available" :key="s.id"
        class="card"
        style="cursor:pointer;"
        @click="router.push('/surveys/' + s.id + '/take')"
      >
        <div class="flex-between">
          <h3 style="font-weight:700;">{{ s.title }}</h3>
          <span class="badge" :class="s.anonymous ? 'badge-green' : ''">
            {{ s.anonymous ? '🔒 Анонимно' : '🔓 С именем' }}
          </span>
        </div>
        <p v-if="s.description" style="color:#6B7280;font-size:14px;margin:8px 0;">{{ s.description }}</p>
        <div style="font-size:13px;color:#6B7280;margin-top:12px;">
          ⏳ до {{ s.endDate }} • {{ (s.questions || []).length }} вопросов • ~{{ (s.questions || []).length * 0.7 }} мин
        </div>
        <div style="margin-top:16px;">
          <div v-if="s.anonymous" class="alert alert-info" style="margin:0;">
            🔒 Ваши ответы анонимны. HR не увидит, кто что ответил.
          </div>
          <div v-else class="alert alert-warning" style="margin:0;">
            🔓 Ваши ответы будут видны HR с указанием имени.
          </div>
        </div>
        <button class="btn btn-primary" style="margin-top:16px;width:100%;justify-content:center;">
          Пройти опрос →
        </button>
      </div>
    </div>
  </div>
</template>
