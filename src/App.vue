<script setup>
import { onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from './stores/auth.js'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const toast = ref(null)
const appError = ref(null)
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

onMounted(() => {
  try {
    auth.restoreSession()
    if (auth.isAuthenticated) {
      const target = auth.isHR ? '/hr/dashboard' : '/surveys'
      if (route.path === '/login' || route.path === '/') router.push(target)
    }
  } catch (e) {
    console.error('App onMounted error:', e)
  }
})

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

@media (max-width: 800px) {
  .header { padding: 0 20px; }
  .header-inner { gap: 12px; }
  .header-right .header-user { display: none; }
}
</style>
