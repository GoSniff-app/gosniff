import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, getToken } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app = null;
let auth = null;
let db = null;
let messaging = null;

if (firebaseConfig.apiKey && firebaseConfig.apiKey !== 'your-api-key-here') {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
  db = getFirestore(app);
  if (typeof window !== 'undefined') {
    messaging = getMessaging(app);
  }
}

export async function getOrCreateFCMToken() {
  if (!messaging) {
    console.warn('[FCM] messaging is null — Firebase not initialized or not in browser');
    return null;
  }
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    console.error('[FCM] NEXT_PUBLIC_FIREBASE_VAPID_KEY is not set — token cannot be generated');
    return null;
  }
  if (!('serviceWorker' in navigator)) {
    console.warn('[FCM] Service workers not supported in this browser');
    return null;
  }
  try {
    console.log('[FCM] Registering service worker...');
    await new Promise(r => setTimeout(r, 2000));
    const swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    console.log('[FCM] Service worker registered, waiting for ready...');
    await navigator.serviceWorker.ready;
    console.log('[FCM] Service worker ready, requesting token...');
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: swRegistration });
    if (token) {
      console.log('[FCM] Token obtained successfully (first 20 chars):', token.slice(0, 20));
    } else {
      console.warn('[FCM] getToken returned empty — permission may not be granted or VAPID key is wrong');
    }
    return token || null;
  } catch (err) {
    console.error('[FCM] getToken failed:', err.code || err.message, err);
    return null;
  }
}
export { auth, db, messaging };
