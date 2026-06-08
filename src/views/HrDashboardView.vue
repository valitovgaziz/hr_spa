<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../services/api.js'

const router = useRouter()
const analytics = ref(null)
const surveys = ref([])
const loading = ref(true)

const props = defineProps({
  showToast: Function
})

onMounted(async () => {
  try {
    const [a, s] = await Promise.all([
      api.fetchAnalytics(),
      api.fetchSurveys()
    ])
    analytics.value = a
    surveys.value = s.filter(x => x.status === 'active' || x.status === 'completed')
  } catch (e) {
    props.showToast?.('Ошибка загрузки данных', 'error')
  } finally {
    loading.value = false
  }
})

const activeSurveys = computed(() => surveys.value.filter(s => s.status === 'active'))
</script>

<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">📊 Дашборд HR</h1>
        <div class="section-title" style="font-size:14px; font-weight:400; color:#5B6E8C; margin:0;">
          Pulse-мониторинг сотрудников • Анонимные опросы • eNPS аналитика
        </div>
      </div>
      <button class="btn btn-primary" @click="router.push('/hr/surveys/new')">➕ Новый опрос</button>
    </div>

    <div v-if="loading" style="text-align:center;padding:60px 0;">
      <div class="spinner" style="width:40px;height:40px;"></div>
    </div>

    <template v-else-if="analytics">
      <div style="display:flex;gap:20px;flex-wrap:wrap;margin-bottom:32px;">
        <div class="metric-card">
          <div class="metric-number">{{ analytics.eNPS }}</div>
          <div class="metric-label">Общий eNPS</div>
          <div :class="['metric-change', analytics.eNPSChange >= 0 ? 'positive' : 'negative']">
            {{ analytics.eNPSChange >= 0 ? '▲' : '▼' }} {{ analytics.eNPSChange }} пунктов
          </div>
          <div style="font-size:12px;color:#6B7280;margin-top:4px;">Промоутеры {{ analytics.promoters }}%</div>
        </div>
        <div class="metric-card">
          <div class="metric-number">{{ analytics.completionRate }}%</div>
          <div class="metric-label">Прохождение опросов</div>
          <div class="metric-change" :class="analytics.completionRate >= analytics.completionTarget ? 'positive' : 'negative'">
            цель {{ analytics.completionTarget }}%
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-number">{{ analytics.webPushRate }}%</div>
          <div class="metric-label">Web Push принято</div>
          <div class="metric-change" :class="analytics.webPushRate >= analytics.webPushTarget ? 'positive' : 'negative'">
            ≥{{ analytics.webPushTarget }}% целевой
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-number">{{ analytics.avgResponseTime }} мин</div>
          <div class="metric-label">Среднее время до ответа</div>
          <div class="metric-change positive">🔽 {{ analytics.avgResponseChange }}%</div>
        </div>
      </div>

      <div class="grid-2" style="margin-bottom:28px;">
        <div class="card">
          <h3 style="margin-bottom:16px;">📋 Активные опросы</h3>
          <div v-if="activeSurveys.length === 0" style="color:#9CA3AF;font-size:14px;">
            Нет активных опросов
          </div>
          <div v-for="s in activeSurveys" :key="s.id" class="channel-row" style="cursor:pointer;" @click="router.push('/hr/surveys/' + s.id + '/edit')">
            <div>
              <strong>{{ s.title }}</strong>
              <div style="font-size:12px;color:#6B7280;">
                {{ s.responseCount }}/{{ s.targetCount }} ответов • до {{ s.endDate }}
              </div>
            </div>
            <div class="badge badge-green">Активен</div>
          </div>
          <button class="btn btn-secondary" style="margin-top:16px;width:100%;" @click="router.push('/hr/surveys')">
            Все опросы →
          </button>
        </div>

        <div class="card">
          <h3 style="margin-bottom:16px;">📡 Эффективность каналов</h3>
          <div v-for="ch in analytics.channels" :key="ch.name" class="channel-row">
            <span>{{ ch.name }}</span>
            <span style="font-size:13px;">
              CTR {{ ch.ctr }}% • доставка {{ ch.delivery }}%
              <span v-if="ch.cost" style="color:#6B7280;">• {{ ch.cost }}₽</span>
            </span>
          </div>
          <div class="badge" style="margin-top:12px;">
            📉 Снижение расходов на SMS за счёт Web Push — экономия ~42%
          </div>
        </div>
      </div>

      <div class="card">
        <div class="flex-between">
          <h3>🏢 eNPS по подразделениям</h3>
          <button class="btn btn-secondary" @click="router.push('/hr/analytics')">Подробнее →</button>
        </div>
        <div v-for="dept in analytics.byDepartment" :key="dept.name" class="channel-row">
          <span>{{ dept.name }}</span>
          <div style="display:flex;align-items:center;gap:12px;flex:1;max-width:300px;">
            <div class="progress-bar" style="flex:1;">
              <div class="progress-fill" :style="{ width: dept.eNPS + '%', background: dept.color }"></div>
            </div>
            <span style="font-weight:700;min-width:30px;">{{ dept.eNPS }}</span>
            <span v-if="dept.change !== 0" :style="{ color: dept.change > 0 ? '#10B981' : '#EF4444', fontSize: 13 }">
              {{ dept.change > 0 ? '▲' : '▼' }}{{ Math.abs(dept.change) }}
            </span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
