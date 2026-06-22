importScripts('https://www.gstatic.com/firebasejs/12.12.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.12.1/firebase-installations-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.12.1/firebase-messaging-compat.js');

// Take control immediately when a new version is deployed, rather than waiting
// for all tabs to close. This ensures getToken() always talks to the current SW.
self.addEventListener('install', (event) => { self.skipWaiting(); });
self.addEventListener('activate', (event) => { event.waitUntil(clients.claim()); });

firebase.initializeApp({
  apiKey: 'AIzaSyBqbIi_zSIzi9x4z34i5IgBtfOvgn63za4',
  authDomain: 'gosniff415.firebaseapp.com',
  projectId: 'gosniff415',
  storageBucket: 'gosniff415.firebasestorage.app',
  messagingSenderId: '702596257273',
  appId: '1:702596257273:web:bdde4bdf9e641754771928',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'GoSniff';
  const body = payload.notification?.body || '';

  // Route a tap to the deep-link the sender attached. Rally pushes set
  // webpush.fcmOptions.link (e.g. https://gosniff.app/?rally=<id>); fall back to
  // building it from data.rallyId, then to the canonical app URL.
  const data = payload.data || {};
  let url =
    payload.fcmOptions?.link ||
    (data.rallyId ? `https://gosniff.app/?rally=${data.rallyId}` : 'https://gosniff.app');
  // Force the canonical host even for legacy pushes (check-in/message/pack-request
  // still set the old vercel.app link). Swaps only the host, keeping ?rally= intact.
  url = url.replace('gosniff.vercel.app', 'gosniff.app');

  self.registration.showNotification(title, {
    body,
    icon: '/icons/icon-192x192.png',
    data: { url },
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || 'https://gosniff.app';
  // Focus an already-open app window if there is one; otherwise open a new one
  // (a new tab gets the full deep-link). We do NOT navigate() an existing tab —
  // the app doesn't read ?rally= on load yet, so navigating would just reload it.
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow(url);
    })
  );
});
