<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'

const auth = useAuthStore()
const router = useRouter()

const step = ref('phone')
const phone = ref('')
const code = ref('')
const phoneError = ref('')
const codeError = ref('')
const loading = ref(false)

function formatPhone(val) {
  const digits = val.replace(/\D/g, '').slice(0, 11)
  if (!digits) return ''
  if (digits.length === 1) return '+' + digits
  let result = '+' + digits[0]
  if (digits.length > 1) result += ' (' + digits.slice(1, 4)
  if (digits.length > 4) result += ') ' + digits.slice(4, 7)
  if (digits.length > 7) result += '-' + digits.slice(7, 9)
  if (digits.length > 9) result += '-' + digits.slice(9, 11)
  return result
}

function onPhoneInput(e) {
  phone.value = formatPhone(e.target.value)
  phoneError.value = ''
}

async function sendOtp() {
  if (phone.value.replace(/\D/g, '').length < 11) {
    phoneError.value = 'Введите полный номер телефона'
    return
  }
  loading.value = true
  try {
    await auth.requestOtp(phone.value)
    step.value = 'code'
  } catch (e) {
    phoneError.value = e.message
  } finally {
    loading.value = false
  }
}

async function verifyCode() {
  if (code.value.length < 4) {
    codeError.value = 'Введите код из SMS'
    return
  }
  loading.value = true
  try {
    await auth.verifyOtp(phone.value, code.value)
    const target = auth.isHR ? '/hr/dashboard' : '/surveys'
    router.push(target)
  } catch (e) {
    codeError.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-header">
        <div class="login-logo">⚡ PulseHR</div>
        <div class="login-subtitle">Корпоративный сервис опросов</div>
      </div>

      <div v-if="step === 'phone'" class="login-form">
        <label class="label">Номер телефона</label>
        <input
          class="input"
          :value="phone"
          @input="onPhoneInput"
          placeholder="+7 (___) ___-__-__"
          type="tel"
          autocomplete="tel"
        />
        <p v-if="phoneError" class="field-error">{{ phoneError }}</p>
        <button class="btn btn-primary login-btn" :disabled="loading" @click="sendOtp">
          <span v-if="loading" class="spinner"></span>
          <span v-else>📲 Получить SMS-код</span>
        </button>
        <div class="hint">На указанный номер будет отправлен 6-значный код</div>
        <div class="badge login-badge">✅ Один номер = один аккаунт. Разделение ролей: HR / Сотрудник</div>
      </div>

      <div v-if="step === 'code'" class="login-form">
        <label class="label">Введите код из SMS</label>
        <input
          class="input"
          v-model="code"
          placeholder="6-значный код"
          type="text"
          inputmode="numeric"
          maxlength="6"
          @keyup.enter="verifyCode"
          autocomplete="one-time-code"
        />
        <p v-if="codeError" class="field-error">{{ codeError }}</p>
        <p class="hint" style="margin-bottom:12px;">Код отправлен на {{ phone }}. Используйте <strong>111111</strong> для теста</p>
        <button class="btn btn-primary login-btn" :disabled="loading" @click="verifyCode">
          <span v-if="loading" class="spinner"></span>
          <span v-else>➡️ Подтвердить и войти</span>
        </button>
        <button class="btn btn-secondary login-btn" style="margin-top:8px;" @click="step='phone'; code=''; codeError=''">
          ◀ Назад
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: calc(100vh - 64px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.login-card {
  max-width: 440px;
  width: 100%;
  background: white;
  border-radius: 28px;
  padding: 40px 32px;
  box-shadow: 0 20px 35px -12px rgba(0,0,0,0.1);
  border: 1px solid #EFF3F8;
}

.login-header {
  text-align: center;
  margin-bottom: 28px;
}

.login-logo {
  font-size: 32px;
  font-weight: 800;
  color: #1E3A8A;
}

.login-subtitle {
  font-size: 14px;
  color: #5B6E8C;
  margin-top: 4px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.login-btn {
  width: 100%;
  justify-content: center;
  padding: 14px;
  font-size: 15px;
}

.field-error {
  color: #DC2626;
  font-size: 13px;
}

.hint {
  font-size: 13px;
  color: #6B7280;
  text-align: center;
}

.login-badge {
  text-align: center;
  display: block;
  background: #F1F5F9;
  margin-top: 8px;
}
</style>
