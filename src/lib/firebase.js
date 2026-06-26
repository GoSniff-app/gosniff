import { initializeApp, getApps } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, getToken, deleteToken } from 'firebase/messaging';

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
  if (!messaging) return null;

  // Wait for Auth to finish its IndexedDB writes before touching FIS/FCM storage.
  await new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, () => {
      unsub();
      setTimeout(resolve, 500);
    });
  });

  if (!('serviceWorker' in navigator)) return null;

  try {
    await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const swRegistration = await navigator.serviceWorker.ready;
    const vk = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    const token = await getToken(messaging, {
      vapidKey: vk,
      serviceWorkerRegistration: swRegistration,
    });
    return token || null;
  } catch (err) {
    console.warn('[FCM] getToken failed, retrying after cleanup:', err.message);
    try {
      const swReg = await navigator.serviceWorker.ready;
      const sub = await swReg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      await deleteToken(messaging);
    } catch (_) { /* ignore cleanup errors */ }
    try {
      const swRegistration = await navigator.serviceWorker.ready;
      const token = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: swRegistration,
      });
      return token || null;
    } catch (retryErr) {
      console.error('[FCM] getToken failed after retry:', retryErr.message);
      return null;
    }
  }
}
export { auth, db, messaging };
