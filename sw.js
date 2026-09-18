/* ==========================================================
   DECRYPT COMMAND CENTER — sw.js (service worker)
   Handles push events so notifications fire even when the
   tab is closed or in the background.
   ========================================================== */

self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

self.addEventListener('push', function (e) {
  var data = {};
  try { data = e.data ? e.data.json() : {}; } catch (err) {}

  var title = data.title || 'DECRYPT';
  var options = {
    body:  data.body  || '',
    icon:  data.icon  || 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#07220C"/><text x="50" y="68" font-size="50" font-weight="700" fill="#9CF0B0" text-anchor="middle" font-family="system-ui">D</text></svg>'),
    badge: data.badge || '',
    tag:   data.tag   || 'decrypt-notif',
    data:  { url: data.url || '/' }
  };

  e.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var targetUrl = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clients) {
      for (var i = 0; i < clients.length; i++) {
        if (clients[i].url.indexOf(targetUrl) > -1 && 'focus' in clients[i]) {
          return clients[i].focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
