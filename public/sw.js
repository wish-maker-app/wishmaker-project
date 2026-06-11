// Service Worker — Wish Maker PWA Push Notifications
// Version bump pour forcer update lors d'un deploy : incrémente quand on change ce fichier.
const SW_VERSION = 'v45-2026-06-11-fix-deadlock-onauthstatechange'

self.addEventListener('push', (event) => {
  let data = { title: 'Wish Maker', body: 'Nouvelle notification', url: '/' }
  try {
    data = event.data?.json() || data
  } catch {
    data.body = event.data?.text() || data.body
  }

  const options = {
    body: data.body,
    icon: '/logo.png',
    badge: '/logo.png',
    data: { url: data.url || '/' },
    vibrate: [100, 50, 100],
    tag: data.tag || 'default',
    renotify: true,
  }

  event.waitUntil(self.registration.showNotification(data.title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin)) {
          client.focus()
          client.navigate(url)
          return
        }
      }
      return clients.openWindow(url)
    })
  )
})

// Install : active tout de suite la nouvelle version
self.addEventListener('install', () => self.skipWaiting())

// Activate : clear les vieux caches éventuels + prend le contrôle
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Purge tous les anciens caches du SW (si on en ajoute plus tard)
      const cacheNames = await caches.keys()
      await Promise.all(
        cacheNames.filter((n) => !n.includes(SW_VERSION)).map((n) => caches.delete(n))
      )
      await self.clients.claim()
    })()
  )
})
