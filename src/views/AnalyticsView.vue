<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../services/api.js'

const props = defineProps({
  showToast: Function
})

const analytics = ref(null)
const activeTab = ref('overview')
const loading = ref(true)

onMounted(async () => {
  try {
    analytics.value = await api.fetchAnalytics()
  } catch {
    props.showToast?.('Ошибка загрузки аналитики', 'error')
  } finally {
    loading.value = false
  }
})

const sentimentColors = {
  positive: { label: 'Позитивный', color: '#10B981' },
  neutral: { label: 'Нейтральный', color: '#F59E0B' },
  negative: { label: 'Негативный', color: '#EF4444' }
}
</script>

<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">📈 Аналитика и дашборд</h1>
      <button class="btn btn-secondary">📎 Экспорт в Excel / CSV</button>
    </div>

    <div v-if="loading" style="text-align:center;padding:60px;">
      <div class="spinner" style="width:40px;height:40px;"></div>
    </div>

    <template v-else-if="analytics">
      <div class="tabs">
        <button class="tab" :class="{ active: activeTab === 'overview' }" @click="activeTab='overview'">Обзор</button>
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
            <div class="metric-change positive">▲ {{ analytics.eNPSChange }} пунктов</div>
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
              <div class="progress-fill" :style="{ width: analytics.completionRate + '%', background: analytics.completionRate >= analytics.completionTarget ? '#10B981' : '#F59E0B' }"></div>
            </div>
            <div style="font-size:13px;color:#6B7280;margin-top:4px;">Цель {{ analytics.completionTarget }}%</div>
          </div>

          <div class="metric-card">
            <div class="metric-number">{{ analytics.responseRate24h }}%</div>
            <div class="metric-label">Response Rate за 24ч</div>
            <div style="font-size:13px;color:#10B981;margin-top:4px;">▲ Цель ≥50%</div>
          </div>

          <div class="metric-card">
            <div class="metric-number">{{ analytics.avgResponseTime }}</div>
            <div class="metric-label">Ср. время до ответа (мин)</div>
            <div class="metric-change positive">🔽 {{ analytics.avgResponseChange }}%</div>
          </div>
        </div>

        <div class="card" style="margin-bottom:28px;">
          <h3 style="margin-bottom:16px;">📅 Активность прохождения по дням недели</h3>
          <div style="display:flex;gap:8px;align-items:flex-end;height:160px;padding-top:20px;">
            <div v-for="d in analytics.dailyActivity" :key="d.day" style="flex:1;display:flex;flex-direction:column;align-items:center;">
              <div style="font-size:12px;color:#6B7280;margin-bottom:4px;">{{ d.count }}</div>
              <div
                :style="{
                  height: Math.max(8, (d.count / 78) * 120) + 'px',
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
          <div class="badge" style="margin-top:12px;">📊 Пик активности: вторник 11:00</div>
        </div>
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
                <th style="text-align:center;padding:12px 0;">CTR</th>
                <th style="text-align:center;padding:12px 0;">Ответ за 24ч</th>
                <th v-if="analytics.channels.some(c => c.cost)" style="text-align:right;padding:12px 0;">Стоимость</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="ch in analytics.channels" :key="ch.name" style="border-bottom:1px solid #ECF3F9;">
                <td style="padding:14px 0;font-weight:600;">{{ ch.name }}</td>
                <td style="text-align:center;padding:14px 0;">{{ ch.delivery }}%</td>
                <td style="text-align:center;padding:14px 0;">{{ ch.ctr }}%</td>
                <td style="text-align:center;padding:14px 0;">{{ ch.response24h }}%</td>
                <td v-if="ch.cost" style="text-align:right;padding:14px 0;">{{ ch.cost }}₽</td>
                <td v-else-if="analytics.channels.some(c => c.cost)" style="text-align:right;padding:14px 0;color:#9CA3AF;">—</td>
              </tr>
            </tbody>
          </table>
          <div class="badge" style="margin-top:16px;">
            📉 Снижение расходов на SMS за счёт Web Push приоритета — экономия ~42%
          </div>
        </div>

        <div class="card" style="margin-top:20px;">
          <h3 style="margin-bottom:16px;">📊 Сводка по каскадной доставке</h3>
          <div class="channel-row"><span>✅ Web Push активная подписка</span><span class="badge badge-green">Приоритет 1</span></div>
          <div class="channel-row"><span>⚠️ Push не доставлен за 4ч → Telegram</span><span class="badge badge-yellow">2 (резерв)</span></div>
          <div class="channel-row"><span>📱 Telegram не привязан / не доставлен → SMS</span><span class="badge badge-yellow">3 (запасной)</span></div>
          <div class="channel-row"><span>✉️ Напоминание за 24ч до дедлайна по E-mail</span><span>4 (финал)</span></div>
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
              <span v-if="dept.change !== 0" :style="{ color: dept.change > 0 ? '#10B981' : '#EF4444', fontSize: 14, fontWeight: 600, minWidth: 40 }">
                {{ dept.change > 0 ? '▲' : '▼' }}{{ Math.abs(dept.change) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Comments Tab -->
      <div v-if="activeTab === 'comments'">
        <div class="card">
          <div class="flex-between">
            <h3>💬 Текстовые комментарии сотрудников</h3>
            <span class="badge">AI-анализ тональности</span>
          </div>
          <div v-for="(c, i) in analytics.comments" :key="i" style="padding:16px 0;border-bottom:1px solid #ECF3F9;">
            <div style="font-style:italic;color:#334155;">«{{ c.text }}»</div>
            <div style="margin-top:6px;">
              <span class="badge" :style="{ background: sentimentColors[c.sentiment]?.color + '20', color: sentimentColors[c.sentiment]?.color }">
                {{ sentimentColors[c.sentiment]?.label }}
              </span>
            </div>
          </div>
          <div class="badge" style="margin-top:16px;">
            🤖 Рекомендация HR: улучшить коммуникацию в отделе продаж (низкий eNPS).
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
