<script setup>
import { onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from './stores/auth.js'
import { api } from './services/api.js'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const toast = ref(null)
const appError = ref(null)
const showPushPrompt = ref(false)
let toastTimer = null

const originalOnError = window.onerror
window.onerror = (msg, url, line, col, err) => {
  appError.value = { msg: String(msg), line }
  return false
}

function showToast(message, type = 'info') {
  clearTimeout(toastTimer)
  toast.value = { message, type }
  toastTimer = setTimeout(() => toast.value = null, 3500)
}

function handleLogout() {
  auth.logout()
  router.push('/login')
}

async function subscribeToPush() {
  try {
    const publicKey = await api.fetchVapidKey()
    const registration = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready
    const sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: publicKey
    })
    await api.subscribePush(sub)
  } catch (err) {
    console.warn('[PUSH] Subscription failed:', err)
  }
}

onMounted(() => {
  try {
    auth.restoreSession()
    if (auth.isAuthenticated) {
      const target = auth.isHR ? '/hr/dashboard' : '/surveys'
      if (route.path === '/login' || route.path === '/') router.push(target)
      // Предложение подписаться на push (если ещё нет)
      if ('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window) {
        if (Notification.permission === 'default') {
          showPushPrompt.value = true
        } else if (Notification.permission === 'granted') {
          subscribeToPush()
        }
      }
    }
  } catch (e) {
    console.error('App onMounted error:', e)
  }
})

function enablePush() {
  showPushPrompt.value = false
  Notification.requestPermission().then(perm => {
    if (perm === 'granted') subscribeToPush()
  })
}

const navLinks = [
  { path: '/hr/dashboard', label: 'Дашборд', hrOnly: true },
  { path: '/hr/surveys', label: 'Опросы', hrOnly: true },
  { path: '/hr/analytics', label: 'Аналитика', hrOnly: true },
  { path: '/surveys', label: 'Мои опросы', hrOnly: false },
  { path: '/settings/notifications', label: 'Уведомления', hrOnly: false },
  { path: '/settings/profile', label: 'Профиль', hrOnly: false }
]
</script>

<template>
  <!-- Push permission prompt -->
  <div v-if="showPushPrompt" class="push-prompt-overlay" @click.self="showPushPrompt=false">
    <div class="push-prompt-card">
      <div class="push-prompt-icon">🔔</div>
      <h3>Получайте уведомления о новых опросах</h3>
      <p>Не пропустите ни один опрос — мы пришлём push-уведомление прямо в браузер.</p>
      <div class="push-prompt-actions">
        <button class="btn btn-primary" @click="enablePush">Включить</button>
        <button class="btn btn-secondary" @click="showPushPrompt=false">Не сейчас</button>
      </div>
    </div>
  </div>

  <div v-if="appError" style="background:#FEF2F2;border:2px solid #EF4444;border-radius:12px;padding:16px;margin:16px;color:#DC2626;font-size:14px;">
    <strong>⚠️ Ошибка рендеринга:</strong> {{ appError.msg }} (строка {{ appError.line }})
    <button class="btn btn-secondary" style="margin-left:12px;padding:4px 12px;font-size:12px;" @click="appError=null">✕</button>
  </div>
  <div v-if="auth.isAuthenticated" class="header">
    <div class="header-inner">
      <router-link :to="auth.isHR ? '/hr/dashboard' : '/surveys'" class="logo">⚡ PulseHR</router-link>
      <nav class="nav">
        <router-link
          v-for="link in navLinks"
          :key="link.path"
          :to="link.path"
          v-show="!link.hrOnly || auth.isHR"
          class="nav-link"
          :class="{ active: route.path.startsWith(link.path) }"
        >{{ link.label }}</router-link>
      </nav>
      <div class="header-right">
        <span class="header-user">{{ auth.user?.name }}</span>
        <span class="badge">{{ auth.roleLabel }}</span>
        <button class="btn btn-secondary" style="padding:6px 14px;" @click="handleLogout">Выйти</button>
      </div>
    </div>
  </div>

  <div class="container">
    <router-view v-slot="{ Component }">
      <component :is="Component" :show-toast="showToast" />
    </router-view>
  </div>

  <Transition name="toast">
    <div v-if="toast" :class="['toast', 'toast-' + toast.type]">
      {{ toast.message }}
    </div>
  </Transition>
</template>

<style scoped>
.header {
  background: white;
  border-bottom: 1px solid #EFF3F8;
  padding: 0 40px;
  position: sticky;
  top: 0;
  z-index: 50;
  box-shadow: 0 1px 4px rgba(0,0,0,0.03);
}

.header-inner {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 32px;
  height: 60px;
}

.logo {
  font-size: 20px;
  font-weight: 800;
  color: #1E3A8A;
  white-space: nowrap;
}

.nav {
  display: flex;
  gap: 4px;
  flex: 1;
  overflow-x: auto;
}

.nav-link {
  padding: 8px 14px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  color: #64748B;
  transition: 0.2s;
  white-space: nowrap;
}

.nav-link:hover, .nav-link.active {
  background: #F1F5F9;
  color: #1E3A8A;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  white-space: nowrap;
}

.header-user {
  font-weight: 600;
  font-size: 14px;
}

.toast-enter-active, .toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from, .toast-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

.push-prompt-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,.4);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
}
.push-prompt-card {
  background: white; border-radius: 16px; padding: 32px;
  max-width: 420px; text-align: center; box-shadow: 0 8px 32px rgba(0,0,0,.15);
}
.push-prompt-icon { font-size: 48px; margin-bottom: 12px; }
.push-prompt-card h3 { margin-bottom: 8px; font-size: 18px; }
.push-prompt-card p { color: #6B7280; font-size: 14px; margin-bottom: 20px; }
.push-prompt-actions { display: flex; gap: 12px; justify-content: center; }

@media (max-width: 800px) {
  .header { padding: 0 20px; }
  .header-inner { gap: 12px; }
  .header-right .header-user { display: none; }
}
</style>
