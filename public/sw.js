// Service Worker — Wish Maker PWA Push Notifications

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
      // Si l'app est déjà ouverte, focus dessus et navigue
      for (const client of clientList) {
        if (client.url.includes(self.location.origin)) {
          client.focus()
          client.navigate(url)
          return
        }
      }
      // Sinon ouvre un nouvel onglet
      return clients.openWindow(url)
    })
  )
})

// Cache basique pour le mode offline
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()))
