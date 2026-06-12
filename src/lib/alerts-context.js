'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
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
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [myVotes, setMyVotes] = useState({});
  // Latest-wins guard: each snapshot bumps this; an async vote-fetch only writes
  // if it's still the newest one (also invalidated on cleanup/unmount).
  const voteFetchIdRef = useRef(0);

  useEffect(() => {
    if (!user || !db) {
      setActiveAlerts([]);
      setMyVotes({});
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

      // Load this user's per-alert vote state from the private votes subcollection.
      // Reading a non-existent vote doc at the user's own uid returns
      // exists() === false (not an error) under the security rules.
      const fetchId = ++voteFetchIdRef.current;
      (async () => {
        const entries = await Promise.all(
          alerts.map(async (a) => {
            try {
              const vSnap = await getDoc(doc(db, 'alerts', a.id, 'votes', user.uid));
              return vSnap.exists() ? [a.id, vSnap.data().vote] : null;
            } catch (err) {
              console.error('[AlertsContext] vote lookup failed for', a.id, err);
              return null;
            }
          })
        );
        // Superseded by a newer snapshot (or cleanup) — don't overwrite with stale data.
        if (fetchId !== voteFetchIdRef.current) return;
        const votes = {};
        entries.forEach((e) => { if (e) votes[e[0]] = e[1]; });
        setMyVotes(votes);
      })();
    });
    return () => { unsub(); voteFetchIdRef.current++; };
  }, [user]);

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
