// Forge Studio — Service Worker (PWA + Web Push)
// Versión: 1.0.0

const CACHE_NAME = 'forge-v1'

// Instalación — no pre-cacheamos nada, solo activamos
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))

// Recepción de push notifications
self.addEventListener('push', e => {
  if (!e.data) return

  let payload
  try {
    payload = e.data.json()
  } catch {
    payload = { title: 'Forge Studio', body: e.data.text() }
  }

  const {
    title = 'Forge Studio',
    body = '',
    icon = '/icon-192.png',
    badge = '/icon-192.png',
    tag = 'forge-notif',
    url = '/portal',
    data = {}
  } = payload

  e.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      tag,
      renotify: true,
      data: { url, ...data },
      vibrate: [200, 100, 200],
      actions: [
        { action: 'open', title: 'Ver en Forge' },
        { action: 'close', title: 'Cerrar' }
      ]
    })
  )
})

// Clic en la notificación — abre el portal
self.addEventListener('notificationclick', e => {
  e.notification.close()

  if (e.action === 'close') return

  const url = e.notification.data?.url || '/portal'

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      // Si ya hay una ventana abierta de Forge, la enfoca
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          client.focus()
          client.navigate(url)
          return
        }
      }
      // Si no, abre una nueva pestaña
      return self.clients.openWindow(url)
    })
  )
})
