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

  self.registration.showNotification(title, {
    body,
    icon: '/icons/icon-192x192.png',
    data: { url: 'https://gosniff.vercel.app' },
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || 'https://gosniff.vercel.app';
  event.waitUntil(clients.openWindow(url));
});
