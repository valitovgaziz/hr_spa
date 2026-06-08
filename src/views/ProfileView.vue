<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth.js'
import { api } from '../services/api.js'

const auth = useAuthStore()
const profile = ref(null)

const props = defineProps({
  showToast: Function
})

onMounted(async () => {
  try {
    profile.value = await api.fetchMe()
  } catch {
    profile.value = auth.user
  }
})
</script>

<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">👤 Профиль</h1>
    </div>

    <div class="grid-2">
      <div class="card">
        <h3 style="margin-bottom:20px;">Личные данные</h3>

        <div class="profile-row">
          <span class="profile-label">Имя</span>
          <span class="profile-value">{{ profile?.name || auth.user?.name || '—' }}</span>
        </div>
        <div class="profile-row">
          <span class="profile-label">Телефон</span>
          <span class="profile-value">{{ profile?.phone || auth.user?.phone || '—' }}</span>
        </div>
        <div class="profile-row">
          <span class="profile-label">Подразделение</span>
          <span class="profile-value">{{ profile?.department || auth.user?.department || '—' }}</span>
        </div>
        <div class="profile-row">
          <span class="profile-label">Должность</span>
          <span class="profile-value">{{ profile?.position || auth.user?.position || '—' }}</span>
        </div>
      </div>

      <div class="card">
        <h3 style="margin-bottom:20px;">Роль и доступ</h3>
        <div class="profile-row">
          <span class="profile-label">Роль</span>
          <span class="badge">{{ auth.roleLabel }}</span>
        </div>
        <div class="profile-row">
          <span class="profile-label">Статус</span>
          <span class="badge badge-green">✅ Активен</span>
        </div>
        <div class="profile-row">
          <span class="profile-label">Push-уведомления</span>
          <span :class="profile?.pushEnabled ? 'badge badge-green' : 'badge'" style="background:#F1F5F9;">
            {{ profile?.pushEnabled ? '✅ Включены' : '❌ Отключены' }}
          </span>
        </div>
        <div class="profile-row">
          <span class="profile-label">Telegram</span>
          <span :class="profile?.telegramLinked ? 'badge badge-green' : 'badge'" style="background:#F1F5F9;">
            {{ profile?.telegramLinked ? '✅ Привязан' : '❌ Не привязан' }}
          </span>
        </div>
        <div class="profile-row">
          <span class="profile-label">Режим «Не беспокоить»</span>
          <span :class="profile?.quietMode ? 'badge badge-yellow' : 'badge'" style="background:#F1F5F9;">
            {{ profile?.quietMode ? '🌙 Включён' : 'Выключен' }}
          </span>
        </div>
        <div class="profile-row" v-if="profile?.quietStart">
          <span class="profile-label">Период</span>
          <span class="profile-value">{{ profile?.quietStart }} — {{ profile?.quietEnd || '…' }}</span>
        </div>
        <div class="profile-row">
          <span class="profile-label">Предпочтительное время</span>
          <span class="profile-value">{{ profile?.preferredTime || auth.user?.preferredTime || '12:00-18:00' }}</span>
        </div>

        <div class="alert alert-info" style="margin-top:16px;">
          🔐 Разделение ролей: HR может создавать и анализировать опросы. Сотрудник может только проходить назначенные опросы.
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:28px;" v-if="profile?.devices?.length">
      <h3 style="margin-bottom:16px;">📱 Устройства</h3>
      <div v-for="d in profile.devices" :key="d.id" class="channel-row">
        <span>{{ d.name }}</span>
        <span style="font-size:13px;color:#6B7280;">
          Последняя активность: {{ new Date(d.lastActive).toLocaleString('ru') }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #ECF3F9;
  padding: 14px 0;
  gap: 16px;
}

.profile-label {
  font-weight: 500;
  font-size: 14px;
  color: #6B7280;
  min-width: 160px;
}

.profile-value {
  font-size: 14px;
  color: #1A2C3E;
  text-align: right;
  word-break: break-word;
}
</style>
