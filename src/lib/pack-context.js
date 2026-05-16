'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { db } from './firebase';
import { useAuth } from './auth-context';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';

const PackContext = createContext({});

export function usePack() {
  return useContext(PackContext);
}

export function PackProvider({ children }) {
  const { user } = useAuth();

  const [myPack, setMyPack] = useState([]);
  const [pendingReceived, setPendingReceived] = useState([]);
  const [pendingSent, setPendingSent] = useState([]);
  const [frenemyDogIds, setFrenemyDogIds] = useState([]);

  const linksUnsubRef = useRef(null);
  const receivedUnsubRef = useRef(null);
  const sentUnsubRef = useRef(null);
  const humanDocUnsubRef = useRef(null);

  useEffect(() => {
    function cleanup() {
      if (linksUnsubRef.current) { linksUnsubRef.current(); linksUnsubRef.current = null; }
      if (receivedUnsubRef.current) { receivedUnsubRef.current(); receivedUnsubRef.current = null; }
      if (sentUnsubRef.current) { sentUnsubRef.current(); sentUnsubRef.current = null; }
      if (humanDocUnsubRef.current) { humanDocUnsubRef.current(); humanDocUnsubRef.current = null; }
    }

    if (!user || !db) {
      cleanup();
      setMyPack([]);
      setPendingReceived([]);
      setPendingSent([]);
      setFrenemyDogIds([]);
      return;
    }

    // Real-time listener: confirmed pack links where this human is a member
    linksUnsubRef.current = onSnapshot(
      query(collection(db, 'packLinks'), where('humanIds', 'array-contains', user.uid)),
      (snapshot) => {
        const all = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        const seen = new Set();
        const unique = all.filter((link) => {
          const key = link.dogIds?.slice().sort().join('_');
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setMyPack(unique);
      }
    );

    // Real-time listener: incoming pending requests addressed to this human
    // Requires a Firestore composite index on (toHumanId, status) — Firestore will
    // log a link to create it automatically on first run if it doesn't exist yet.
    receivedUnsubRef.current = onSnapshot(
      query(
        collection(db, 'packRequests'),
        where('toHumanId', '==', user.uid),
        where('status', '==', 'pending')
      ),
      (snapshot) => setPendingReceived(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    // Real-time listener: outgoing pending requests sent by this human
    // Requires a Firestore composite index on (fromHumanId, status).
    sentUnsubRef.current = onSnapshot(
      query(
        collection(db, 'packRequests'),
        where('fromHumanId', '==', user.uid),
        where('status', '==', 'pending')
      ),
      (snapshot) => setPendingSent(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    // Real-time listener: human doc for frenemyDogIds (private, stored on the human)
    humanDocUnsubRef.current = onSnapshot(
      doc(db, 'humans', user.uid),
      (snap) => {
        if (snap.exists()) setFrenemyDogIds(snap.data().frenemyDogIds || []);
      }
    );

    return cleanup;
  }, [user]);

  async function sendPackRequest(fromDogId, toDogId) {
    if (!user) return;
    const toDogSnap = await getDoc(doc(db, 'dogs', toDogId));
    if (!toDogSnap.exists()) throw new Error('Dog not found');
    const toHumanId = toDogSnap.data().humanIds?.[0];
    if (!toHumanId) throw new Error('Could not find the owner of that dog');

    await addDoc(collection(db, 'packRequests'), {
      fromDogId,
      toDogId,
      fromHumanId: user.uid,
      toHumanId,
      status: 'pending',
      createdAt: serverTimestamp(),
      respondedAt: null,
    });
  }

  async function acceptPackRequest(requestId) {
    const reqRef = doc(db, 'packRequests', requestId);
    const reqSnap = await getDoc(reqRef);
    if (!reqSnap.exists()) throw new Error('Request not found');
    const { fromDogId, toDogId, fromHumanId, toHumanId } = reqSnap.data();

    await updateDoc(reqRef, {
      status: 'accepted',
      respondedAt: serverTimestamp(),
    });

    // Sort both arrays so the document is queryable from either side.
    // Guard against duplicate packLinks for the same dog pair.
    const sortedDogIds = [fromDogId, toDogId].sort();
    const existing = await getDocs(
      query(collection(db, 'packLinks'), where('dogIds', '==', sortedDogIds))
    );
    if (existing.empty) {
      await addDoc(collection(db, 'packLinks'), {
        dogIds: sortedDogIds,
        humanIds: [fromHumanId, toHumanId].sort(),
        createdAt: serverTimestamp(),
      });
    }
  }

  async function declinePackRequest(requestId) {
    await updateDoc(doc(db, 'packRequests', requestId), {
      status: 'declined',
      respondedAt: serverTimestamp(),
    });
  }

  async function cancelPackRequest(requestId) {
    await deleteDoc(doc(db, 'packRequests', requestId));
  }

  async function removeFromPack(linkId) {
    await deleteDoc(doc(db, 'packLinks', linkId));
  }

  async function addFrenemy(dogId) {
    if (!user || !db) return;
    await updateDoc(doc(db, 'humans', user.uid), {
      frenemyDogIds: arrayUnion(dogId),
    });
  }

  async function removeFrenemy(dogId) {
    if (!user || !db) return;
    await updateDoc(doc(db, 'humans', user.uid), {
      frenemyDogIds: arrayRemove(dogId),
    });
  }

  function isInMyPack(dogId) {
    return myPack.some((link) => link.dogIds?.includes(dogId));
  }

  // Returns the relationship status between the current user's dog and any other dog.
  // "accepted" checked first so a stale pending entry never shadows a live friendship.
  function getPackRequestStatus(dogId) {
    if (isInMyPack(dogId)) return 'accepted';
    if (pendingSent.some((r) => r.toDogId === dogId)) return 'sent';
    if (pendingReceived.some((r) => r.fromDogId === dogId)) return 'received';
    return 'none';
  }

  const value = {
    myPack,
    pendingReceived,
    pendingSent,
    frenemyDogIds,
    sendPackRequest,
    acceptPackRequest,
    declinePackRequest,
    cancelPackRequest,
    removeFromPack,
    isInMyPack,
    getPackRequestStatus,
    addFrenemy,
    removeFrenemy,
  };

  return <PackContext.Provider value={value}>{children}</PackContext.Provider>;
}
