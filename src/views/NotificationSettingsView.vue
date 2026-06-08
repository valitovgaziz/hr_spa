<script setup>
import { ref, onMounted } from 'vue'
import { useNotificationStore } from '../stores/notifications.js'
import { api } from '../services/api.js'

const store = useNotificationStore()

const props = defineProps({
  showToast: Function
})

const qrModal = ref(false)
const qrCode = ref('')
const botUrl = ref('')

onMounted(async () => {
  try {
    await store.loadSettings()
  } catch {
    props.showToast?.('Ошибка загрузки настроек', 'error')
  }
})

async function save() {
  try {
    await store.saveSettings()
    props.showToast?.('Настройки сохранены', 'success')
  } catch {
    props.showToast?.('Ошибка сохранения', 'error')
  }
}

async function handleLinkTelegram() {
  try {
    const result = await store.linkTelegram()
    qrCode.value = result.qrCode
    botUrl.value = result.botUrl
    store.telegramLinked = true
    qrModal.value = true
  } catch {
    props.showToast?.('Ошибка привязки Telegram', 'error')
  }
}

async function removeDevice(id) {
  try {
    await api.deleteDevice(id)
    store.devices = store.devices.filter(d => d.id !== id)
    props.showToast?.('Устройство отвязано', 'success')
  } catch {
    props.showToast?.('Ошибка отвязки устройства', 'error')
  }
}
</script>

<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">Настройки уведомлений</h1>
    </div>

    <div class="grid-2">
      <div class="card">
        <h3 class="card-title">Каналы связи</h3>
        <p class="card-desc">Независимо включите или отключите каждый канал</p>

        <div class="channel-row">
          <div>
            <strong>Web Push</strong>
            <div style="font-size:12px;color:#6B7280;">Браузерные push-уведомления</div>
          </div>
          <label class="toggle">
            <input type="checkbox" v-model="store.pushEnabled" />
            <span class="toggle-slider"></span>
            <span class="toggle-text">{{ store.pushEnabled ? 'Включён' : 'Отключён' }}</span>
          </label>
        </div>

        <div class="channel-row">
          <div>
            <strong>Telegram</strong>
            <div style="font-size:12px;color:#6B7280;">
              <span v-if="store.telegramLinked">Привязан</span>
              <span v-else>Не привязан</span>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <label class="toggle">
              <input type="checkbox" v-model="store.telegramLinked" />
              <span class="toggle-slider"></span>
              <span class="toggle-text">{{ store.telegramLinked ? 'Включён' : 'Отключён' }}</span>
            </label>
            <button v-if="!store.telegramLinked" class="btn btn-secondary" style="padding:4px 10px;font-size:12px;" @click="handleLinkTelegram">
              QR
            </button>
          </div>
        </div>

        <div class="channel-row">
          <div>
            <strong>SMS</strong>
            <div style="font-size:12px;color:#6B7280;">Резервный канал</div>
          </div>
          <label class="toggle">
            <input type="checkbox" v-model="store.smsEnabled" />
            <span class="toggle-slider"></span>
            <span class="toggle-text">{{ store.smsEnabled ? 'Включён' : 'Отключён' }}</span>
          </label>
        </div>

        <div class="channel-row">
          <div>
            <strong>E-mail</strong>
            <div style="font-size:12px;color:#6B7280;">Корпоративная рассылка</div>
          </div>
          <label class="toggle">
            <input type="checkbox" v-model="store.emailEnabled" />
            <span class="toggle-slider"></span>
            <span class="toggle-text">{{ store.emailEnabled ? 'Включён' : 'Отключён' }}</span>
          </label>
        </div>

        <div style="margin-top:16px;font-size:12px;color:#6B7280;background:#F1F5F9;padding:12px;border-radius:8px;">
          Каскадная логика: Web Push → Telegram → SMS → E-mail.
          Критичные опросы (выходное интервью) отключить нельзя.
        </div>
      </div>

      <div class="card">
        <h3 class="card-title">Расписание</h3>

        <div style="margin-bottom:16px;">
          <label class="label">Предпочтительное время</label>
          <select class="select" v-model="store.preferredTime">
            <option value="09:00-12:00">09:00 – 12:00 (утро)</option>
            <option value="12:00-18:00">12:00 – 18:00 (день)</option>
            <option value="18:00-21:00">18:00 – 21:00 (вечер)</option>
          </select>
        </div>

        <div style="margin-bottom:16px;">
          <label class="checkbox-label">
            <input type="checkbox" v-model="store.quietMode" />
            Режим «Не беспокоить» (отпуск/больничный)
          </label>
        </div>

        <div v-if="store.quietMode" style="display:flex;gap:12px;margin:12px 0;">
          <div>
            <label class="label">С</label>
            <input class="input" type="date" v-model="store.quietStart" style="width:auto;" />
          </div>
          <div>
            <label class="label">По</label>
            <input class="input" type="date" v-model="store.quietEnd" style="width:auto;" />
          </div>
        </div>

        <button class="btn btn-primary" :disabled="store.loading" @click="save" style="width:100%;justify-content:center;">
          <span v-if="store.loading" class="spinner"></span>
          <span v-else>Сохранить настройки</span>
        </button>
      </div>
    </div>

    <div v-if="store.devices.length" class="card" style="margin-top:28px;">
      <h3 style="margin-bottom:16px;">Устройства с push-подписками</h3>
      <div v-for="d in store.devices" :key="d.id" class="channel-row">
        <span>{{ d.name }}</span>
        <span style="font-size:13px;color:#6B7280;">
          Последняя активность: {{ new Date(d.lastActive).toLocaleString('ru') }}
        </span>
        <button class="btn btn-danger" style="padding:4px 12px;font-size:12px;" @click="removeDevice(d.id)">Отвязать</button>
      </div>
    </div>

    <div v-if="qrModal" class="modal-overlay" @click.self="qrModal=false">
      <div class="modal" style="text-align:center;">
        <h3 style="margin-bottom:16px;">Привязка Telegram</h3>
        <div style="background:#F1F5F9;border-radius:16px;padding:40px;margin-bottom:16px;">
          <div style="font-size:80px;">📱</div>
          <p style="color:#6B7280;">QR-код для привязки Telegram-бота</p>
        </div>
        <p v-if="botUrl" style="font-size:13px;margin-bottom:16px;">
          Или перейдите по ссылке: <a :href="botUrl" target="_blank" style="color:#2563EB;">{{ botUrl }}</a>
        </p>
        <button class="btn btn-primary" @click="qrModal=false">Готово</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card-title {
  margin-bottom: 4px;
  font-size: 16px;
}
.card-desc {
  font-size: 13px;
  color: #6B7280;
  margin-bottom: 16px;
}
.channel-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #ECF3F9;
  padding: 14px 0;
  gap: 12px;
}
.toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
}
.toggle input[type="checkbox"] { display: none; }
.toggle-slider {
  width: 40px; height: 22px;
  background: #CBD5E1;
  border-radius: 11px;
  position: relative;
  transition: background .2s;
  flex-shrink: 0;
}
.toggle-slider::after {
  content: '';
  width: 18px; height: 18px;
  background: #fff;
  border-radius: 50%;
  position: absolute;
  top: 2px; left: 2px;
  transition: transform .2s;
}
.toggle input:checked + .toggle-slider { background: #2563EB; }
.toggle input:checked + .toggle-slider::after { transform: translateX(18px); }
.toggle-text { font-size: 13px; color: #374151; }
</style>
