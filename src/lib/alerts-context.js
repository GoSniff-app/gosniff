'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { db } from './firebase';
import { useAuth } from './auth-context';
import {
  collection, query, where, onSnapshot,
  addDoc, updateDoc, doc, arrayUnion,
  serverTimestamp, Timestamp, increment,
} from 'firebase/firestore';

const AlertsContext = createContext({});

export function useAlerts() {
  return useContext(AlertsContext);
}

export function AlertsProvider({ children }) {
  const { user } = useAuth();
  const [activeAlerts, setActiveAlerts] = useState([]);

  useEffect(() => {
    if (!db) return;
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
  }, []);

  async function reportAlert({ type, customText = null, location, locationName, dogId }) {
    if (!user || !db) return;
    await addDoc(collection(db, 'alerts'), {
      type,
      customText,
      location,
      locationName,
      reportedByDogId: dogId,
      reportedByHumanId: user.uid,
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + 30 * 60 * 1000),
      confirmCount: 0,
      denyCount: 0,
      confirmedByHumanIds: [],
      deniedByHumanIds: [],
      active: true,
    });
  }

  async function voteOnAlert(alertId, vote) {
    if (!user || !db) return;
    const alert = activeAlerts.find((a) => a.id === alertId);
    if (!alert) return;

    const ref = doc(db, 'alerts', alertId);

    if (vote === 'confirm') {
      await updateDoc(ref, {
        confirmCount: increment(1),
        confirmedByHumanIds: arrayUnion(user.uid),
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
        deniedByHumanIds: arrayUnion(user.uid),
        ...(deactivate ? { active: false } : {}),
      });
    }
  }

  return (
    <AlertsContext.Provider value={{ activeAlerts, reportAlert, voteOnAlert }}>
      {children}
    </AlertsContext.Provider>
  );
}
