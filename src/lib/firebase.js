import { initializeApp, getApps } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, getToken } from 'firebase/messaging';
import { getInstallations, getId, getToken as getFISToken } from 'firebase/installations';

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
  console.log('[FCM] Config check — projectId:', firebaseConfig.projectId, '| appId:', firebaseConfig.appId, '| vapidKey length:', vapidKey.length, '| vapidKey prefix:', vapidKey.slice(0, 12));

  // Wait for Firebase Auth to finish its IndexedDB initialization before FIS/FCM
  // touches the same database. onAuthStateChanged fires after Auth has read its
  // persisted state, so by the time we resolve here Auth's IDBDatabase is stable.
  await new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, () => {
      unsub();
      resolve();
    });
  });

  if (!('serviceWorker' in navigator)) {
    console.warn('[FCM] Service workers not supported in this browser');
    return null;
  }
  try {
    console.log('[FCM] Registering service worker...');
    await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    console.log('[FCM] Waiting for active service worker...');
    // Must use the registration from `ready` (active SW), not from `register()` (may
    // still be installing). Passing an installing SW to getToken() causes the FIS auth
    // token fetch to fail, which results in a 401 on the FCM registration POST.
    const swRegistration = await navigator.serviceWorker.ready;
    console.log('[FCM] Service worker active, testing Firebase Installations...');

    // Explicitly probe FIS so we can see whether the auth token fetch is the failure point.
    // If this throws, the API key's restrictions are missing "Firebase Installations API"
    // (firebaseinstallations.googleapis.com) — add it in GCP Console → Credentials.
    try {
      const installations = getInstallations(app);
      const fid = await getId(installations);
      console.log('[FIS] Installation ID OK:', fid.slice(0, 8) + '…');
      const fisToken = await getFISToken(installations, false);
      console.log('[FIS] Auth token OK:', fisToken.slice(0, 15) + '…');
    } catch (fisErr) {
      console.error('[FIS] FAILED — this is the root cause of the FCM 401:', fisErr.code || fisErr.message, fisErr);
      return null;
    }

    console.log('[FCM] Requesting FCM token...');
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: swRegistration });
    if (token) {
      console.log('[FCM] Token obtained (first 20 chars):', token.slice(0, 20));
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
