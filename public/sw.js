const CACHE = 'pulsehr-v2'

// Установка — пропускаем ожидание, не кешируем index.html (всегда свежий с сервера)
self.addEventListener('install', event => {
  self.skipWaiting()
})

// Слушаем команду от страницы на принудительную активацию
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
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

// Fetch — Network-first для навигации, Cache-first для статики
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)

  // API запросы — только сеть (не кешируем)
  if (url.pathname.startsWith('/api/')) {
    return
  }

  // Навигационные запросы (SPA) — network-first, fallback на кеш
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then(response => {
        return caches.open(CACHE).then(cache => {
          cache.put('/index.html', response.clone())
          return response
        })
      }).catch(() => caches.match('/index.html'))
    )
    return
  }

  // Статика (JS, CSS, fonts, images) — network-first, fallback на кеш
  event.respondWith(
    fetch(event.request).then(response => {
      if (response && response.ok && url.origin === self.location.origin) {
        const clone = response.clone()
        caches.open(CACHE).then(cache => cache.put(event.request, clone))
      }
      return response
    }).catch(() => caches.match(event.request).then(cached => {
      return cached || caches.match('/index.html')
    }))
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
