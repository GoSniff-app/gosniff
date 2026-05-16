'use client';

import { useState, useEffect } from 'react';
import { onMessage } from 'firebase/messaging';
import { doc, getDoc, setDoc, arrayUnion } from 'firebase/firestore';
import { useAuth } from '@/lib/auth-context';
import { messaging, db, getOrCreateFCMToken } from '@/lib/firebase';

const DISMISS_KEY = 'gosniff_notif_dismiss_count';
const MAX_DISMISSALS = 3;

async function saveTokenToFirestore(uid, token) {
  if (!uid || !token || !db) return;
  const humanRef = doc(db, 'humans', uid);
  const snap = await getDoc(humanRef);
  const existing = snap.data()?.fcmTokens || [];
  if (existing.some((t) => t.token === token)) return;
  // serverTimestamp() is not allowed inside arrayUnion — use Date.now() instead.
  // setDoc with merge:true handles the rare case where the human doc is missing.
  await setDoc(humanRef, {
    fcmTokens: arrayUnion({ token, createdAt: Date.now() }),
  }, { merge: true });
}

export default function NotificationPermission() {
  const { user, dogs } = useAuth();
  const [visible, setVisible] = useState(false);
  const [requesting, setRequesting] = useState(false);

  // Silently refresh token on load when permission already granted
  useEffect(() => {
    if (!user || dogs.length === 0) return;
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;

    getOrCreateFCMToken().then((token) => {
      if (token) saveTokenToFirestore(user.uid, token).catch(console.error);
    });
  }, [user, dogs]);

  // Foreground message listener
  useEffect(() => {
    if (!messaging) return;
    const unsub = onMessage(messaging, (payload) => {
      console.log('FCM foreground message:', payload);
    });
    return unsub;
  }, []);

  // Show prompt if conditions met
  useEffect(() => {
    if (!user || dogs.length === 0) return;
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'default') return;

    const dismissCount = parseInt(localStorage.getItem(DISMISS_KEY) || '0', 10);
    if (dismissCount >= MAX_DISMISSALS) return;

    setVisible(true);
  }, [user, dogs]);

  if (!visible) return null;

  async function handleAllow() {
    setRequesting(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const token = await getOrCreateFCMToken();
        if (token) await saveTokenToFirestore(user.uid, token);
      }
    } catch (err) {
      console.error('Notification permission error:', err);
    }
    setVisible(false);
    setRequesting(false);
  }

  function handleDismiss() {
    const current = parseInt(localStorage.getItem(DISMISS_KEY) || '0', 10);
    localStorage.setItem(DISMISS_KEY, String(current + 1));
    setVisible(false);
  }

  return (
    <div
      className="slide-up"
      style={{
        position: 'fixed',
        bottom: '96px',
        left: '16px',
        right: '16px',
        zIndex: 50,
        pointerEvents: 'auto',
      }}
    >
      <div className="gs-card" style={{ padding: '18px 20px' }}>
        <p style={{ fontSize: '1.4rem', textAlign: 'center', marginBottom: '6px' }}>🐾</p>
        <p style={{ fontWeight: 700, color: 'var(--gs-forest)', fontSize: '0.95rem', margin: '0 0 6px 0', textAlign: 'center' }}>
          Get notified when your pack checks in?
        </p>
        <p style={{ fontSize: '0.8rem', color: 'var(--gs-text-light)', margin: '0 0 14px 0', textAlign: 'center', lineHeight: 1.5 }}>
          We'll let you know when your dog friends are at the park so you can go join them. No spam, no ads — just pack alerts and messages.
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn-secondary flex-1"
            style={{ padding: '10px', fontSize: '0.85rem' }}
            onClick={handleDismiss}
          >
            Not now
          </button>
          <button
            className="btn-primary flex-1"
            style={{ padding: '10px', fontSize: '0.85rem' }}
            onClick={handleAllow}
            disabled={requesting}
          >
            {requesting ? 'One sec...' : 'Yes please!'}
          </button>
        </div>
      </div>
    </div>
  );
}
