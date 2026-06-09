<script setup>
import { ref, onMounted, computed } from 'vue'
import { api } from '../services/api.js'

const props = defineProps({
  showToast: Function
})

const analytics = ref(null)
const surveyList = ref([])
const activeTab = ref('overview')
const loading = ref(true)

// Для questions tab
const selectedSurveyId = ref(null)
const questionData = ref(null)
const questionsLoading = ref(false)

const sentimentColors = {
  positive: { label: 'Позитивный', color: '#10B981' },
  neutral: { label: 'Нейтральный', color: '#F59E0B' },
  negative: { label: 'Негативный', color: '#EF4444' }
}

const chartColors = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#F97316', '#14B8A6']

onMounted(async () => {
  try {
    const [a, s] = await Promise.all([
      api.fetchAnalytics(),
      api.fetchSurveys()
    ])
    analytics.value = a
    surveyList.value = s.filter(x => x.status === 'active' || x.status === 'completed')
  } catch {
    props.showToast?.('Ошибка загрузки аналитики', 'error')
  } finally {
    loading.value = false
  }
})

async function selectSurvey(id) {
  selectedSurveyId.value = id
  questionsLoading.value = true
  questionData.value = null
  try {
    questionData.value = await api.fetchQuestionAnalytics(id)
  } catch {
    props.showToast?.('Ошибка загрузки распределения ответов', 'error')
  } finally {
    questionsLoading.value = false
  }
}

function maxCount(dist) {
  if (!dist || dist.length === 0) return 1
  return Math.max(...dist.map(d => d.count || 0), 1)
}

function distPercent(d, dist) {
  const max = maxCount(dist)
  return (d.count / max) * 100
}
</script>

<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">📈 Аналитика и дашборд</h1>
    </div>

    <div v-if="loading" style="text-align:center;padding:60px;">
      <div class="spinner" style="width:40px;height:40px;"></div>
    </div>

    <template v-else-if="analytics">
      <div class="tabs">
        <button class="tab" :class="{ active: activeTab === 'overview' }" @click="activeTab='overview'">Обзор</button>
        <button class="tab" :class="{ active: activeTab === 'questions' }" @click="activeTab='questions'">Вопросы</button>
        <button class="tab" :class="{ active: activeTab === 'channels' }" @click="activeTab='channels'">Каналы</button>
        <button class="tab" :class="{ active: activeTab === 'departments' }" @click="activeTab='departments'">Подразделения</button>
        <button class="tab" :class="{ active: activeTab === 'comments' }" @click="activeTab='comments'">Комментарии</button>
      </div>

      <!-- Overview Tab -->
      <div v-if="activeTab === 'overview'">
        <div style="display:flex;gap:20px;flex-wrap:wrap;margin-bottom:28px;">
          <div class="metric-card">
            <div class="metric-number">{{ analytics.eNPS }}</div>
            <div class="metric-label">Общий eNPS</div>
            <div :class="['metric-change', analytics.eNPSChange >= 0 ? 'positive' : 'negative']">
              {{ analytics.eNPSChange >= 0 ? '▲' : '▼' }} {{ Math.abs(analytics.eNPSChange) }} пунктов
            </div>
            <div style="margin-top:12px;">
              <div style="display:flex;gap:12px;font-size:13px;">
                <span style="color:#10B981;">● Промоутеры {{ analytics.promoters }}%</span>
                <span style="color:#F59E0B;">● Нейтралы {{ analytics.passives }}%</span>
                <span style="color:#EF4444;">● Детракторы {{ analytics.detractors }}%</span>
              </div>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-number">{{ analytics.completionRate }}%</div>
            <div class="metric-label">Прохождение опросов</div>
            <div class="progress-bar" style="margin-top:12px;">
              <div class="progress-fill" :style="{ width: analytics.completionRate + '%', background: analytics.completionRate >= 80 ? '#10B981' : '#F59E0B' }"></div>
            </div>
            <div style="font-size:13px;color:#6B7280;margin-top:4px;">Цель 80%</div>
          </div>

          <div class="metric-card">
            <div class="metric-number">{{ analytics.responseRate24h }}%</div>
            <div class="metric-label">Ответы за 24ч</div>
            <div style="font-size:13px;color:#10B981;margin-top:4px;">от всех ответов</div>
          </div>

          <div class="metric-card">
            <div class="metric-number">{{ analytics.avgResponseTime }}</div>
            <div class="metric-label">Ср. время до ответа (мин)</div>
            <div :class="['metric-change', analytics.avgResponseChange <= 0 ? 'positive' : 'negative']">
              {{ analytics.avgResponseChange <= 0 ? '🔽' : '🔼' }} {{ Math.abs(analytics.avgResponseChange) }}%
            </div>
          </div>
        </div>

        <div class="card" style="margin-bottom:28px;" v-if="analytics.dailyActivity && analytics.dailyActivity[0]?.day !== 'Нет'">
          <h3 style="margin-bottom:16px;">📅 Активность прохождения по дням недели</h3>
          <div style="display:flex;gap:8px;align-items:flex-end;height:160px;padding-top:20px;">
            <div v-for="d in analytics.dailyActivity" :key="d.day" style="flex:1;display:flex;flex-direction:column;align-items:center;">
              <div style="font-size:12px;color:#6B7280;margin-bottom:4px;">{{ d.count }}</div>
              <div
                :style="{
                  height: Math.max(8, (d.count / Math.max(...analytics.dailyActivity.map(x=>x.count), 1)) * 120) + 'px',
                  width: '100%',
                  maxWidth: '40px',
                  background: '#2563EB',
                  borderRadius: '8px 8px 0 0',
                  transition: 'height 0.3s'
                }"
              ></div>
              <div style="font-size:12px;margin-top:4px;color:#6B7280;">{{ d.day }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Questions Tab -->
      <div v-if="activeTab === 'questions'">
        <div class="card" style="margin-bottom:20px;">
          <h3 style="margin-bottom:12px;">Выберите опрос</h3>
          <select class="input" style="max-width:400px;" @change="selectSurvey($event.target.value)">
            <option value="">— выберите —</option>
            <option v-for="s in surveyList" :key="s.id" :value="s.id">{{ s.title }}</option>
          </select>
        </div>

        <div v-if="questionsLoading" style="text-align:center;padding:40px;">
          <div class="spinner" style="width:32px;height:32px;"></div>
        </div>

        <template v-else-if="questionData">
          <div style="margin-bottom:16px;font-size:14px;color:#6B7280;">
            Всего ответов: <strong>{{ questionData.totalResponses }}</strong>
            <span v-if="questionData.targetCount"> • Цель: {{ questionData.targetCount }}</span>
          </div>

          <div v-for="q in questionData.questions" :key="q.id" class="card" style="margin-bottom:20px;">
            <h3 style="margin-bottom:12px;">{{ q.title }}</h3>
            <div style="font-size:13px;color:#6B7280;margin-bottom:16px;">
              Тип:
              <span class="badge">{{ { single: 'Один вариант', multiple: 'Несколько вариантов', scale: 'Шкала', text: 'Текст', matrix: 'Матрица' }[q.type] || q.type }}</span>
            </div>

            <!-- Single choice chart -->
            <div v-if="q.type === 'single' && q.distribution?.length" style="display:flex;flex-direction:column;gap:10px;">
              <div v-for="(d, i) in q.distribution" :key="d.label" style="display:flex;align-items:center;gap:12px;">
                <span style="min-width:120px;font-size:14px;">{{ d.label }}</span>
                <div class="progress-bar" style="flex:1;">
                  <div class="progress-fill" :style="{
                    width: distPercent(d, q.distribution) + '%',
                    background: chartColors[i % chartColors.length]
                  }"></div>
                </div>
                <span style="min-width:40px;font-weight:600;font-size:14px;">{{ d.count }}</span>
                <span style="min-width:36px;font-size:12px;color:#6B7280;">{{ d.percent }}%</span>
              </div>
            </div>

            <!-- Multiple choice chart -->
            <div v-else-if="q.type === 'multiple' && q.distribution?.length" style="display:flex;flex-direction:column;gap:10px;">
              <div v-for="(d, i) in q.distribution" :key="d.label" style="display:flex;align-items:center;gap:12px;">
                <span style="min-width:120px;font-size:14px;">{{ d.label }}</span>
                <div class="progress-bar" style="flex:1;">
                  <div class="progress-fill" :style="{
                    width: distPercent(d, q.distribution) + '%',
                    background: chartColors[i % chartColors.length]
                  }"></div>
                </div>
                <span style="min-width:40px;font-weight:600;font-size:14px;">{{ d.count }}</span>
                <span style="min-width:36px;font-size:12px;color:#6B7280;">{{ d.percent }}%</span>
              </div>
              <div style="font-size:12px;color:#6B7280;margin-top:4px;">* % от числа ответивших на вопрос (можно выбрать несколько)</div>
            </div>

            <!-- Scale chart (гистограмма) -->
            <div v-else-if="q.type === 'scale' && q.distribution?.length">
              <div style="display:flex;align-items:flex-end;gap:6px;height:140px;padding-bottom:24px;">
                <div v-for="d in q.distribution" :key="d.value" style="flex:1;display:flex;flex-direction:column;align-items:center;">
                  <div style="font-size:11px;color:#6B7280;margin-bottom:2px;">{{ d.count }}</div>
                  <div :style="{
                    height: (d.count / maxCount(q.distribution)) * 100 + '%',
                    minHeight: d.count > 0 ? '8px' : '0px',
                    width: '100%',
                    background: d.value >= 9 ? '#10B981' : d.value <= 6 ? '#EF4444' : '#F59E0B',
                    borderRadius: '6px 6px 0 0',
                    transition: 'height 0.3s'
                  }"></div>
                  <div style="font-size:12px;margin-top:4px;color:#6B7280;">{{ d.value }}</div>
                </div>
              </div>
              <div v-if="q.avg !== undefined" style="font-size:14px;color:#334155;">
                Среднее: <strong>{{ q.avg }}</strong> из {{ q.scaleMax }}
                <span v-if="q.avgPercent" style="color:#6B7280;margin-left:8px;">({{ q.avgPercent }}%)</span>
              </div>
            </div>

            <!-- Text answers -->
            <div v-else-if="q.type === 'text' && q.texts?.length">
              <div v-for="t in q.texts" :key="t.submittedAt" style="padding:8px 0;border-bottom:1px solid #ECF3F9;">
                <div style="font-style:italic;color:#334155;font-size:14px;">«{{ t.text }}»</div>
              </div>
            </div>

            <div v-else style="color:#9CA3AF;font-size:14px;">Нет ответов</div>
          </div>
        </template>
      </div>

      <!-- Channels Tab -->
      <div v-if="activeTab === 'channels'">
        <div class="card">
          <h3 style="margin-bottom:16px;">📡 Эффективность каналов уведомлений</h3>
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <thead>
              <tr style="border-bottom:2px solid #E2E8F0;">
                <th style="text-align:left;padding:12px 0;">Канал</th>
                <th style="text-align:center;padding:12px 0;">Доставка</th>
                <th style="text-align:center;padding:12px 0;">Всего</th>
                <th style="text-align:center;padding:12px 0;">Ошибок</th>
                <th v-if="analytics.channels.some(c => c.cost)" style="text-align:right;padding:12px 0;">Стоимость</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="ch in analytics.channels" :key="ch.name" style="border-bottom:1px solid #ECF3F9;">
                <td style="padding:14px 0;font-weight:600;">{{ ch.name }}</td>
                <td style="text-align:center;padding:14px 0;">{{ ch.delivery }}%</td>
                <td style="text-align:center;padding:14px 0;">{{ ch.total }}</td>
                <td style="text-align:center;padding:14px 0;">
                  <span v-if="ch.failed > 0" style="color:#EF4444;">{{ ch.failed }}</span>
                  <span v-else style="color:#9CA3AF;">0</span>
                </td>
                <td v-if="ch.cost" style="text-align:right;padding:14px 0;">{{ ch.cost }}₽</td>
                <td v-else-if="analytics.channels.some(c => c.cost)" style="text-align:right;padding:14px 0;color:#9CA3AF;">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Departments Tab -->
      <div v-if="activeTab === 'departments'">
        <div class="card">
          <h3 style="margin-bottom:20px;">🏢 eNPS по подразделениям</h3>
          <div v-for="dept in analytics.byDepartment" :key="dept.name" class="channel-row">
            <div style="display:flex;align-items:center;gap:12px;flex:1;">
              <span style="font-weight:600;min-width:120px;">{{ dept.name }}</span>
              <div class="progress-bar" style="flex:1;">
                <div class="progress-fill" :style="{ width: dept.eNPS + '%', background: dept.color }"></div>
              </div>
              <span style="font-weight:700;min-width:30px;">{{ dept.eNPS }}</span>
              <span style="font-size:12px;color:#6B7280;min-width:60px;">{{ dept.responses }} отв.</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Comments Tab -->
      <div v-if="activeTab === 'comments'">
        <div class="card">
          <div class="flex-between">
            <h3>💬 Текстовые ответы сотрудников</h3>
            <span class="badge">AI-анализ тональности</span>
          </div>
          <div v-if="analytics.comments.length === 0" style="color:#9CA3AF;font-size:14px;padding:16px 0;">
            Нет текстовых ответов
          </div>
          <div v-for="(c, i) in analytics.comments" :key="i" style="padding:16px 0;border-bottom:1px solid #ECF3F9;">
            <div style="font-style:italic;color:#334155;">«{{ c.text }}»</div>
            <div style="margin-top:6px;">
              <span class="badge" :style="{ background: sentimentColors[c.sentiment]?.color + '20', color: sentimentColors[c.sentiment]?.color }">
                {{ sentimentColors[c.sentiment]?.label }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
