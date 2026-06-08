<script setup>
import { ref, onMounted } from 'vue'
import { useNotificationStore } from '../stores/notifications.js'

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
</script>

<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">🔔 Настройки уведомлений</h1>
    </div>

    <div class="grid-2">
      <div class="card">
        <h3 style="margin-bottom:20px;">📡 Каналы связи</h3>

        <div class="channel-row">
          <div>
            <strong>🔔 Web Push</strong>
            <div style="font-size:12px;color:#6B7280;">{{ store.devices.length }} устройств(а)</div>
          </div>
          <span v-if="store.channels === 'push' || store.channels === 'all'" style="color:#10B981;font-weight:600;">Включен</span>
          <span v-else style="color:#9CA3AF;">Выключен</span>
        </div>

        <div class="channel-row">
          <div>
            <strong>📱 Telegram-бот</strong>
            <div style="font-size:12px;color:#6B7280;">
              <span v-if="store.telegramLinked">✅ Привязан</span>
              <span v-else>Не привязан</span>
            </div>
          </div>
          <button v-if="!store.telegramLinked" class="btn btn-secondary" style="padding:6px 14px;font-size:13px;" @click="handleLinkTelegram">
            [Привязать QR]
          </button>
          <span v-else class="badge badge-green">Активен</span>
        </div>

        <div class="channel-row">
          <div>
            <strong>✉️ SMS</strong>
            <div style="font-size:12px;color:#6B7280;">Номер +7 (***) ***-**-**</div>
          </div>
          <span style="color:#10B981;font-weight:600;">Активен</span>
        </div>

        <div class="channel-row">
          <div>
            <strong>📧 E-mail</strong>
            <div style="font-size:12px;color:#6B7280;">Корпоративный адрес</div>
          </div>
          <span style="color:#10B981;font-weight:600;">Включен</span>
        </div>

        <div class="alert alert-info" style="margin-top:16px;">
          📊 <strong>Каскадная логика:</strong> Web Push → Telegram → SMS → E-mail
        </div>
      </div>

      <div class="card">
        <h3 style="margin-bottom:20px;">⚙️ Настройки доставки</h3>

        <div style="margin-bottom:16px;">
          <label class="label">⏰ Предпочтительное время</label>
          <select class="select" v-model="store.preferredTime">
            <option value="09:00-12:00">09:00 – 12:00</option>
            <option value="12:00-18:00">12:00 – 18:00</option>
            <option value="18:00-21:00">18:00 – 21:00</option>
          </select>
        </div>

        <div style="margin-bottom:16px;">
          <label class="checkbox-label">
            <input type="checkbox" v-model="store.quietMode" />
            🌙 Режим «Не беспокоить» (отпуск/больничный)
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
          <span v-else>💾 Сохранить настройки</span>
        </button>

        <div class="badge badge-yellow" style="margin-top:16px;display:block;text-align:center;">
          ⚠️ Критичные опросы (выходное интервью) — отключить нельзя
        </div>
      </div>
    </div>

    <div v-if="store.devices.length" class="card" style="margin-top:28px;">
      <h3 style="margin-bottom:16px;">📱 Мои устройства</h3>
      <div v-for="d in store.devices" :key="d.id" class="channel-row">
        <span>{{ d.name }}</span>
        <span style="font-size:13px;color:#6B7280;">
          Последняя активность: {{ new Date(d.lastActive).toLocaleString('ru') }}
        </span>
        <button class="btn btn-danger" style="padding:4px 12px;font-size:12px;">Отвязать</button>
      </div>
    </div>

    <!-- QR Modal -->
    <div v-if="qrModal" class="modal-overlay" @click.self="qrModal=false">
      <div class="modal" style="text-align:center;">
        <h3 style="margin-bottom:16px;">📱 Привязка Telegram</h3>
        <div style="background:#F1F5F9;border-radius:16px;padding:40px;margin-bottom:16px;">
          <div style="font-size:80px;">📱</div>
          <p style="color:#6B7280;">QR-код для привязки Telegram-бота</p>
        </div>
        <p v-if="botUrl" style="font-size:13px;margin-bottom:16px;">
          Или перейдите по ссылке: <a :href="botUrl" target="_blank" style="color:#2563EB;">{{ botUrl }}</a>
        </p>
        <button class="btn btn-primary" @click="qrModal=false">✓ Готово</button>
      </div>
    </div>
  </div>
</template>
