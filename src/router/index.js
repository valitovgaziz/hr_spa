import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'

const routes = [
  { path: '/login', name: 'Login', component: () => import('../views/LoginView.vue'), meta: { guest: true } },
  { path: '/consent', name: 'Consent', component: () => import('../views/ConsentView.vue'), meta: { requiresAuth: true, requiresConsent: false } },
  { path: '/', redirect: '/login' },
  { path: '/hr/dashboard', name: 'HrDashboard', component: () => import('../views/HrDashboardView.vue'), meta: { requiresAuth: true, hrOnly: true } },
  { path: '/hr/surveys', name: 'SurveyList', component: () => import('../views/SurveyListView.vue'), meta: { requiresAuth: true, hrOnly: true } },
  { path: '/hr/surveys/new', name: 'SurveyCreate', component: () => import('../views/SurveyConstructorView.vue'), meta: { requiresAuth: true, hrOnly: true } },
  { path: '/hr/surveys/:id/edit', name: 'SurveyEdit', component: () => import('../views/SurveyConstructorView.vue'), meta: { requiresAuth: true, hrOnly: true } },
  { path: '/hr/analytics', name: 'Analytics', component: () => import('../views/AnalyticsView.vue'), meta: { requiresAuth: true, hrOnly: true } },
  { path: '/surveys', name: 'EmployeeSurveys', component: () => import('../views/EmployeeSurveysView.vue'), meta: { requiresAuth: true } },
  { path: '/surveys/:id/take', name: 'SurveyTake', component: () => import('../views/SurveyTakeView.vue'), meta: { requiresAuth: true } },
  { path: '/settings/notifications', name: 'NotificationSettings', component: () => import('../views/NotificationSettingsView.vue'), meta: { requiresAuth: true } },
  { path: '/settings/profile', name: 'Profile', component: () => import('../views/ProfileView.vue'), meta: { requiresAuth: true } },
  { path: '/:pathMatch(.*)*', name: 'NotFound', redirect: '/login' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const auth = useAuthStore()

  // Требуется авторизация
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return next('/login')
  }

  // Уже авторизован — не на логин
  if (to.meta.guest && auth.isAuthenticated) {
    return next(auth.isHR ? '/hr/dashboard' : '/surveys')
  }

  // Требуется согласие 152-ФЗ (кроме самого /consent)
  if (to.name !== 'Consent' && !to.meta.guest && auth.needsConsent) {
    return next('/consent')
  }

  // Только HR
  if (to.meta.hrOnly && !auth.isHR) {
    return next('/surveys')
  }

  next()
})

export default router
