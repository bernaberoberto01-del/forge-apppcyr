/* Service Worker — Forge Studio PWA
   Gestiona notificaciones push y caché offline básica.
   IMPORTANTE: No cachear el portal en modo offline completo todavía (Fase 2).
   Por ahora: push notifications + cache de assets estáticos. */

const CACHE_NAME = 'forge-v1'
const STATIC_ASSETS = ['/favicon.svg', '/icons.svg']

// ── Instalación ──
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

// ── Activación: limpiar caches viejas ──
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// ── Push Notification recibida ──
self.addEventListener('push', (e) => {
  if (!e.data) return

  let payload = {}
  try { payload = e.data.json() } catch (_) { payload = { title: 'Forge Studio', body: e.data.text() } }

  const { title = 'Forge Studio', body = '', icon = '/favicon.svg', url = '/portal', badge = '/favicon.svg', tag = 'forge-notif' } = payload

  e.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      tag,
      renotify: true,
      data: { url },
      vibrate: [200, 100, 200],
    })
  )
})

// ── Click en notificación → abrir app ──
self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const url = e.notification.data?.url || '/portal'
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // Si ya hay una ventana abierta, enfocarla
      for (const client of windowClients) {
        if (client.url.includes('/portal') && 'focus' in client) {
          return client.focus()
        }
      }
      // Si no, abrir nueva
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
