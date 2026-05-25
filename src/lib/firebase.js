import { initializeApp, getApps } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, getToken, deleteToken } from 'firebase/messaging';
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

// retryCount is internal — callers always call getOrCreateFCMToken() with no args.
export async function getOrCreateFCMToken(retryCount = 0) {
  if (!messaging) {
    console.warn('[FCM] messaging is null — Firebase not initialized or not in browser');
    return null;
  }
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    console.error('[FCM] NEXT_PUBLIC_FIREBASE_VAPID_KEY is not set — token cannot be generated');
    return null;
  }
  console.log('[FCM] Config check — vapidKey prefix:', vapidKey.slice(0, 12), '| attempt:', retryCount + 1);

  // Firebase Auth fires onAuthStateChanged while still writing its user record back to
  // IndexedDB (the notifyAuthListeners → _updateCurrentUser cycle). If FIS opens its own
  // IDB connection at that exact moment it gets "IDBDatabase is closing". We therefore
  // wait for the auth notification AND then add a 500 ms settle buffer so Auth's storage
  // writes are fully committed before we touch IDB.
  await new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, () => {
      unsub();
      setTimeout(resolve, 500);
    });
  });

  if (!('serviceWorker' in navigator)) {
    console.warn('[FCM] Service workers not supported in this browser');
    return null;
  }
  try {
    await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    // Use `ready` (active SW) not the registration from `register()` (may still be installing).
    const swRegistration = await navigator.serviceWorker.ready;
    console.log('[FCM] Service worker active.');

    // Probe FIS first so any IDB race surfaces here (with retry) rather than inside getToken.
    try {
      const installations = getInstallations(app);
      const fid = await getId(installations);
      console.log('[FIS] Installation ID OK:', fid.slice(0, 8) + '…');
      const fisToken = await getFISToken(installations, true);
      console.log('[FIS] Auth token OK:', fisToken.slice(0, 15) + '…');
    } catch (fisErr) {
      if (fisErr instanceof DOMException && fisErr.name === 'InvalidStateError' && retryCount < 3) {
        const delay = 500 * Math.pow(2, retryCount);
        console.warn(`[FIS] IndexedDB race (attempt ${retryCount + 1}), retrying in ${delay} ms…`);
        await new Promise(r => setTimeout(r, delay));
        return getOrCreateFCMToken(retryCount + 1);
      }
      console.error('[FIS] FAILED:', fisErr.code || fisErr.message, fisErr);
      return null;
    }

    // Clear any existing push subscription to ensure a clean state
    const existingSub = await swRegistration.pushManager.getSubscription();
    if (existingSub) {
      console.warn('[FCM] Clearing existing push subscription for clean state…');
      await existingSub.unsubscribe();
      try { await deleteToken(messaging); } catch (_) { /* ignore */ }
    }

    // Also nuke the Firebase messaging IDB to force a completely fresh registration
    try { indexedDB.deleteDatabase('firebase-messaging-database'); } catch (_) {}

    console.log('[FCM] Requesting FCM token (using default VAPID key as test)…');
    const token = await getToken(messaging, { serviceWorkerRegistration: swRegistration });
    if (token) {
      console.log('[FCM] Token obtained (first 20 chars):', token.slice(0, 20));
    } else {
      console.warn('[FCM] getToken returned empty — permission may not be granted or VAPID key is wrong');
    }
    return token || null;
  } catch (err) {
    if (retryCount === 0) {
      console.warn('[FCM] First attempt failed, clearing stale state and retrying:', err.message);
      try {
        const swReg = await navigator.serviceWorker.ready;
        const sub = await swReg.pushManager.getSubscription();
        if (sub) await sub.unsubscribe();
        await deleteToken(messaging);
      } catch (_) { /* ignore cleanup errors */ }
      return getOrCreateFCMToken(retryCount + 1);
    }
    console.error('[FCM] getToken failed:', err.code || err.message, err);
    return null;
  }
}
export { auth, db, messaging };
