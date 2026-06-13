'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { db } from './firebase';
import { useAuth } from './auth-context';
import {
  collection, query, where, onSnapshot,
  addDoc, updateDoc, doc, getDoc, setDoc,
  serverTimestamp, Timestamp, increment,
} from 'firebase/firestore';

const AlertsContext = createContext({});

export function useAlerts() {
  return useContext(AlertsContext);
}

export function AlertsProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.uid ?? null;
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [myVotes, setMyVotes] = useState({});

  // Reset per-user vote state the instant the signed-in user changes — sign-out,
  // or one account swapped for another on the same device without a reload. Done
  // during render (the standard "adjust state when input changes" pattern) so a
  // new user never sees the previous user's vote receipts, even for one frame.
  const [trackedUserId, setTrackedUserId] = useState(userId);
  if (userId !== trackedUserId) {
    setTrackedUserId(userId);
    setMyVotes({});
  }

  // Subscribe to active alerts (public data — independent of who is signed in).
  useEffect(() => {
    if (!user || !db) {
      setActiveAlerts([]);
      return;
    }
    const q = query(collection(db, 'alerts'), where('active', '==', true));
    const unsub = onSnapshot(q, (snapshot) => {
      const now = new Date();
      const alerts = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((a) => {
          const expires = a.expiresAt?.toDate?.();
          return expires && expires > now;
        });
      setActiveAlerts(alerts);
    });
    return () => unsub();
  }, [user]);

  // Keep myVotes in sync with the CURRENT user's private vote docs. Re-runs when
  // the user changes (refetch for the new user — not only when an alerts snapshot
  // fires) or when the active alert set changes. The `cancelled` flag is the
  // latest-wins guard, and because this effect is keyed on `user` it also covers
  // user identity: a user change re-runs the effect and cancels any fetch still
  // in flight for the previous user, so that fetch can never populate state under
  // the new user.
  useEffect(() => {
    if (!user || !db) {
      setMyVotes({});
      return;
    }
    let cancelled = false;
    const uid = user.uid;
    (async () => {
      const entries = await Promise.all(
        activeAlerts.map(async (a) => {
          try {
            // A non-existent vote doc at the user's own uid returns
            // exists() === false (not an error) under the security rules.
            const vSnap = await getDoc(doc(db, 'alerts', a.id, 'votes', uid));
            return vSnap.exists() ? [a.id, vSnap.data().vote] : null;
          } catch (err) {
            console.error('[AlertsContext] vote lookup failed for', a.id, err);
            return null;
          }
        })
      );
      if (cancelled) return; // superseded by a newer run (alerts change or user change)
      const votes = {};
      entries.forEach((e) => { if (e) votes[e[0]] = e[1]; });
      setMyVotes(votes);
    })();
    return () => { cancelled = true; };
  }, [user, activeAlerts]);

  async function reportAlert({ type, customText = null, location, locationName }) {
    if (!user || !db) return;
    await addDoc(collection(db, 'alerts'), {
      type,
      customText,
      location,
      locationName,
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + 30 * 60 * 1000),
      confirmCount: 0,
      denyCount: 0,
      active: true,
    });
  }

  async function voteOnAlert(alertId, vote) {
    if (!user || !db) return;
    const alert = activeAlerts.find((a) => a.id === alertId);
    if (!alert) return;

    const ref = doc(db, 'alerts', alertId);

    // Record this user's vote privately in a per-user subcollection doc keyed by
    // their uid, instead of exposing voter IDs in arrays on the alert document.
    await setDoc(doc(db, 'alerts', alertId, 'votes', user.uid), {
      vote,
      createdAt: serverTimestamp(),
    });

    if (vote === 'confirm') {
      await updateDoc(ref, {
        confirmCount: increment(1),
        // Reset 30-min window so the alert lives on
        expiresAt: Timestamp.fromMillis(Date.now() + 30 * 60 * 1000),
      });
    } else {
      // Use local counts to decide if the alert should be killed early.
      // Small race window is acceptable for the pilot scale.
      const newDeny = (alert.denyCount || 0) + 1;
      const confirms = alert.confirmCount || 0;
      const totalVotes = newDeny + confirms;
      const deactivate = newDeny >= 3 || (totalVotes >= 2 && newDeny > confirms);
      await updateDoc(ref, {
        denyCount: increment(1),
        ...(deactivate ? { active: false } : {}),
      });
    }

    // Optimistically reflect the vote so the UI updates without waiting for a refetch.
    setMyVotes((prev) => ({ ...prev, [alertId]: vote }));
  }

  return (
    <AlertsContext.Provider value={{ activeAlerts, myVotes, reportAlert, voteOnAlert }}>
      {children}
    </AlertsContext.Provider>
  );
}
