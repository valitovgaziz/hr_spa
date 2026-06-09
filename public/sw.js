const CACHE = 'pulsehr-v1'
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg'
]

// Установка — кешируем статику
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
  self.skipWaiting()
})

// Активация — чистим старые кеши
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    })
  )
  return self.clients.claim()
})

// Fetch — Cache-first для статики, Network-first для API
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)

  // API запросы — только сеть (не кешируем)
  if (url.pathname.startsWith('/api/')) {
    return
  }

  // Навигационные запросы (SPA) — cache-first с fallback на сеть
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then(cached => {
        return cached || fetch(event.request).catch(() => cached)
      })
    )
    return
  }

  // Статика (JS, CSS, fonts, images) — cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        // Кешируем только успешные ответы со статикой
        if (response && response.ok && url.origin === self.location.origin) {
          const clone = response.clone()
          caches.open(CACHE).then(cache => cache.put(event.request, clone))
        }
        return response
      }).catch(() => {
        // Если сеть недоступна — пытаемся отдать из кеша
        return caches.match('/index.html')
      })
    })
  )
})

// Push-уведомления (существующая логика)
self.addEventListener('push', event => {
  let data
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'PulseHR', body: event.data?.text() || '' }
  }

  const options = {
    body: data.body || '',
    icon: '/icon-192.svg',
    badge: '/icon-192.svg',
    data: data.data || {},
    actions: data.actions || []
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'PulseHR', options)
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url ||
    event.notification.data?.surveyUrl ||
    '/surveys'
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      for (const c of clientList) {
        if (c.url === url && 'focus' in c) return c.focus()
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
