// Rush-Q Service Worker — Push Notification Handler
// Place this file in /public/sw.js

const CACHE_NAME = 'rushq-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Handle push notifications from server (future use)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || '⚡ Rush-Q Alert';
  const options = {
    body: data.body || 'You have a deadline approaching.',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: data.tag || 'rushq-notification',
    renotify: true,
    data: { url: data.url || '/' },
    actions: [
      { action: 'open', title: 'Open Rush-Q' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data?.url || '/');
      }
    })
  );
});
