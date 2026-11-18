// Firebase Cloud Messaging background service worker.
// Served from the site root (/firebase-messaging-sw.js) by Vite from /public.
// Configuration is passed dynamically via registration query parameters from the client app,
// avoiding hardcoded secrets or environment placeholders in static files.

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

try {
  const params = new URL(self.location.href).searchParams;
  const apiKey = params.get('apiKey');
  const projectId = params.get('projectId');
  const messagingSenderId = params.get('messagingSenderId');
  const appId = params.get('appId');
  const authDomain = params.get('authDomain');
  const storageBucket = params.get('storageBucket');

  if (apiKey && projectId && messagingSenderId && appId) {
    const config = {
      apiKey,
      projectId,
      messagingSenderId,
      appId,
    };
    if (authDomain) config.authDomain = authDomain;
    if (storageBucket) config.storageBucket = storageBucket;

    firebase.initializeApp(config);

    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      // NOTE: When payload contains a 'notification' object, the browser / FCM
      // automatically displays the notification. Calling showNotification() here
      // would create a duplicate notification. We only display manually for data-only pushes.
      if (!payload?.notification) {
        const title = payload?.data?.title || 'Allura Boutique';
        const options = {
          body: payload?.data?.body || '',
          icon: payload?.data?.icon || '/favicon.svg',
          image: payload?.data?.image || payload?.data?.imageUrl,
          data: payload?.data || {},
        };
        self.registration.showNotification(title, options);
      }
    });
  }
} catch (err) {
  // If query parameters are missing or invalid, stay silent without crashing.
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const rawUrl =
    event.notification?.data?.link ||
    event.notification?.data?.actionUrl ||
    event.notification?.data?.url ||
    '/';

  const targetUrl = new URL(rawUrl, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If an app tab is open, focus it and navigate
      for (const client of windowClients) {
        if ('focus' in client) {
          if ('navigate' in client && client.url !== targetUrl) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // If no window is currently open, open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
