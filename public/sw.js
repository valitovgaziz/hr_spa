self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(clients.claim()))

self.addEventListener('push', event => {
  let data
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'PulseHR', body: event.data?.text() || '' }
  }

  const options = {
    body: data.body || '',
    icon: data.icon || '/favicon.ico',
    badge: data.badge || '/favicon.ico',
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
