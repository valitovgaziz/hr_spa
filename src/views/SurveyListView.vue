<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSurveyStore } from '../stores/survey.js'

const router = useRouter()
const store = useSurveyStore()
const filter = ref('all')

const props = defineProps({
  showToast: Function
})

onMounted(async () => {
  try {
    await store.loadSurveys()
  } catch {
    props.showToast?.('Ошибка загрузки опросов', 'error')
  }
})

const filteredSurveys = computed(() => {
  if (filter.value === 'all') return store.surveys
  return store.surveys.filter(s => s.status === filter.value)
})

const statusLabels = {
  draft: { label: 'Черновик', cls: 'badge-yellow' },
  active: { label: 'Активный', cls: 'badge-green' },
  completed: { label: 'Завершён', cls: 'badge' },
  archived: { label: 'Архив', cls: '' }
}

function statusBadge(s) {
  const info = statusLabels[s.status] || { label: s.status, cls: '' }
  return { ...info }
}

function getStatuses() {
  const counts = {}
  store.surveys.forEach(s => { counts[s.status] = (counts[s.status] || 0) + 1 })
  return [
    { key: 'all', label: 'Все', count: store.surveys.length },
    { key: 'draft', label: 'Черновики', count: counts.draft || 0 },
    { key: 'active', label: 'Активные', count: counts.active || 0 },
    { key: 'completed', label: 'Завершённые', count: counts.completed || 0 },
    { key: 'archived', label: 'Архив', count: counts.archived || 0 }
  ]
}
</script>

<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">📋 Все опросы</h1>
      <button class="btn btn-primary" @click="router.push('/hr/surveys/new')">➕ Создать опрос</button>
    </div>

    <div class="tabs">
      <button v-for="t in getStatuses()" :key="t.key" class="tab" :class="{ active: filter === t.key }" @click="filter=t.key">
        {{ t.label }} ({{ t.count }})
      </button>
    </div>

    <div v-if="store.loading" style="text-align:center;padding:60px;">
      <div class="spinner" style="width:36px;height:36px;"></div>
    </div>

    <div v-else-if="filteredSurveys.length === 0" class="empty-state">
      <h3>Нет опросов</h3>
      <p>Создайте первый опрос, чтобы начать</p>
    </div>

    <div v-else class="grid-2">
      <div v-for="s in filteredSurveys" :key="s.id" class="card" style="cursor:pointer;" @click="router.push('/hr/surveys/' + s.id + '/edit')">
        <div class="flex-between">
          <h3 style="font-weight:700;">{{ s.title }}</h3>
          <span :class="['badge', statusBadge(s).cls]">{{ statusBadge(s).label }}</span>
        </div>
        <p v-if="s.description" style="color:#6B7280;font-size:14px;margin:8px 0;">{{ s.description }}</p>
        <div style="font-size:13px;color:#6B7280;margin-top:12px;">
          <span>📅 {{ s.startDate }} — {{ s.endDate }}</span>
          <span style="margin-left:16px;">{{ s.responseCount }}/{{ s.targetCount }} ответов</span>
          <span style="margin-left:16px;">{{ s.anonymous ? '🔒 Анонимный' : '🔓 Идентифицированный' }}</span>
        </div>
        <div style="margin-top:12px;">
          <span v-for="q in s.questions.slice(0, 3)" :key="q.id" class="badge" style="margin-right:6px;margin-bottom:4px;">
            {{ q.type === 'single' ? 'Одиночный' : q.type === 'multiple' ? 'Множественный' : q.type === 'scale' ? 'Шкала' : q.type === 'text' ? 'Текст' : 'Матрица' }}
          </span>
          <span v-if="s.questions.length > 3" class="badge" style="background:#E2E8F0;">+{{ s.questions.length - 3 }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
