import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './styles/main.css'

const app = createApp(App)

app.config.errorHandler = (err, instance, info) => {
  console.error('Vue Error:', err, info)
  document.getElementById('app')?.insertAdjacentHTML('afterbegin',
    `<div style="background:#FEF2F2;border:2px solid #EF4444;border-radius:12px;padding:16px;margin:16px;color:#DC2626;font-family:monospace;font-size:13px;">
      <strong>Vue Error:</strong> ${err.message}<br>
      <strong>Info:</strong> ${info || '—'}<br>
      <pre style="margin-top:8px;max-height:200px;overflow:auto;">${err.stack || ''}</pre>
    </div>`)
}

app.config.warnHandler = (msg, instance, trace) => {
  console.warn('Vue Warning:', msg, trace)
}

app.use(createPinia())
app.use(router)
app.mount('#app')
