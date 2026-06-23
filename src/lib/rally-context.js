'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { db } from './firebase';
import { useAuth } from './auth-context';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

const RallyContext = createContext({});

export function useRally() {
  return useContext(RallyContext);
}

export function RallyProvider({ children }) {
  const { user } = useAuth();

  const [myActiveRally, setMyActiveRally] = useState(null);
  const [myRallyRsvps, setMyRallyRsvps] = useState([]);

  const activeRallyUnsubRef = useRef(null);
  const rsvpsUnsubRef = useRef(null);

  // Real-time listener: THIS user's own active rally (sender-only scope). There is at
  // most one active rally per user; if more somehow exist we take the first. Backed by
  // the (senderHumanId, status) composite index.
  useEffect(() => {
    function cleanup() {
      if (activeRallyUnsubRef.current) { activeRallyUnsubRef.current(); activeRallyUnsubRef.current = null; }
    }

    if (!user || !db) {
      cleanup();
      setMyActiveRally(null);
      return;
    }

    activeRallyUnsubRef.current = onSnapshot(
      query(
        collection(db, 'rallies'),
        where('senderHumanId', '==', user.uid),
        where('status', '==', 'active')
      ),
      (snapshot) => {
        setMyActiveRally(
          snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() }
        );
      },
      (err) => console.error('[RallyContext] active-rally listener error:', err)
    );

    return cleanup;
  }, [user]);

  // Nested real-time listener: the active rally's RSVPs, so the sender sees them roll
  // in live. Re-subscribes whenever the active rally changes, and clears when there is
  // no active rally.
  const activeRallyId = myActiveRally?.id || null;
  useEffect(() => {
    function cleanup() {
      if (rsvpsUnsubRef.current) { rsvpsUnsubRef.current(); rsvpsUnsubRef.current = null; }
    }

    if (!activeRallyId || !db) {
      cleanup();
      setMyRallyRsvps([]);
      return;
    }

    rsvpsUnsubRef.current = onSnapshot(
      query(
        collection(db, 'rallies', activeRallyId, 'rsvps'),
        where('senderHumanId', '==', user.uid)
      ),
      (snapshot) => setMyRallyRsvps(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.error('[RallyContext] rsvps listener error:', err)
    );

    return cleanup;
  }, [activeRallyId]);

  // Create a rally. Args match the deployed sendRally callable exactly:
  // { senderDogId, placeText, timingChoice, note }. Errors throw to the caller.
  async function sendRally({ senderDogId, placeText, timingChoice, note }) {
    const result = await httpsCallable(getFunctions(), 'sendRally')({
      senderDogId,
      placeText,
      timingChoice,
      note: note || '',
    });
    return result.data; // { rallyId }
  }

  // Cancel a rally. Matches the deployed cancelRally callable: { rallyId }.
  async function cancelRally(rallyId) {
    const result = await httpsCallable(getFunctions(), 'cancelRally')({ rallyId });
    return result.data; // { success: true }
  }

  // RSVP to a rally. Matches the deployed rsvpRally callable: { rallyId, responderDogId }.
  // Returns { success: true } or { ended: true, message } if the rally is no longer active.
  async function rsvpRally({ rallyId, responderDogId }) {
    const result = await httpsCallable(getFunctions(), 'rsvpRally')({ rallyId, responderDogId });
    return result.data;
  }

  const value = {
    myActiveRally,
    myRallyRsvps,
    sendRally,
    rsvpRally,
    cancelRally,
  };

  return <RallyContext.Provider value={value}>{children}</RallyContext.Provider>;
}
