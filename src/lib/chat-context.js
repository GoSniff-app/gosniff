'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { db } from './firebase';
import { useAuth } from './auth-context';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  serverTimestamp,
  increment,
} from 'firebase/firestore';

const ChatContext = createContext({});

export function useChat() {
  return useContext(ChatContext);
}

const MAX_MESSAGE_LENGTH = 1000;

export function ChatProvider({ children }) {
  const { user } = useAuth();

  const [conversations, setConversations] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});

  const convoUnsubRef = useRef(null);
  const humanDocUnsubRef = useRef(null);

  useEffect(() => {
    function cleanup() {
      if (convoUnsubRef.current) { convoUnsubRef.current(); convoUnsubRef.current = null; }
      if (humanDocUnsubRef.current) { humanDocUnsubRef.current(); humanDocUnsubRef.current = null; }
    }

    if (!user || !db) {
      cleanup();
      setConversations([]);
      setUnreadCounts({});
      return;
    }

    convoUnsubRef.current = onSnapshot(
      query(
        collection(db, 'conversations'),
        where('humanIds', 'array-contains', user.uid)
      ),
      (snapshot) => {
        const convos = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        convos.sort((a, b) => {
          const aMs = a.lastMessageTime?.toMillis?.() ?? 0;
          const bMs = b.lastMessageTime?.toMillis?.() ?? 0;
          return bMs - aMs;
        });
        setConversations(convos);
      },
      (err) => console.error('[ChatContext] conversations listener error:', err)
    );

    humanDocUnsubRef.current = onSnapshot(
      doc(db, 'humans', user.uid),
      (snap) => {
        if (snap.exists()) setUnreadCounts(snap.data().unreadCounts || {});
      }
    );

    return cleanup;
  }, [user]);

  const totalUnreadCount = Object.values(unreadCounts).reduce((sum, n) => sum + (n || 0), 0);

  function getConversationId(dogId1, dogId2) {
    return [dogId1, dogId2].sort().join('_');
  }

  async function getOrCreateConversation(myDogId, theirDogId) {
    if (!user || !db) return null;

    const conversationId = getConversationId(myDogId, theirDogId);
    const convoRef = doc(db, 'conversations', conversationId);
    const convoSnap = await getDoc(convoRef);

    if (convoSnap.exists()) {
      const data = convoSnap.data();
      if (!data.lastMessageTime) {
        updateDoc(convoRef, { lastMessageTime: serverTimestamp() }).catch(() => {});
      }
      return { id: conversationId, ...data };
    }

    const [myDogSnap, theirDogSnap] = await Promise.all([
      getDoc(doc(db, 'dogs', myDogId)),
      getDoc(doc(db, 'dogs', theirDogId)),
    ]);

    if (!myDogSnap.exists() || !theirDogSnap.exists()) {
      throw new Error('One or both dogs not found');
    }

    const myHumanId = myDogSnap.data().humanIds?.[0];
    const theirHumanId = theirDogSnap.data().humanIds?.[0];

    if (!myHumanId || !theirHumanId) {
      throw new Error('Could not resolve owners for both dogs');
    }

    const convoData = {
      dogIds: [myDogId, theirDogId].sort(),
      humanIds: [myHumanId, theirHumanId].sort(),
      lastMessage: null,
      lastMessageTime: serverTimestamp(),
      lastMessageFrom: null,
    };

    await setDoc(convoRef, convoData);
    return { id: conversationId, ...convoData };
  }

  async function sendMessage(conversationId, fromDogId, text) {
    if (!user || !db) return;

    const trimmed = text.trim();
    if (!trimmed) throw new Error('Message cannot be empty');
    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      throw new Error(`Message cannot exceed ${MAX_MESSAGE_LENGTH} characters`);
    }

    const convoSnap = await getDoc(doc(db, 'conversations', conversationId));
    if (!convoSnap.exists()) throw new Error('Conversation not found');

    const { humanIds } = convoSnap.data();
    const recipientHumanId = humanIds.find((id) => id !== user.uid);
    if (!recipientHumanId) throw new Error('Could not find recipient');

    await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
      fromDogId,
      text: trimmed,
      createdAt: serverTimestamp(),
      readAt: null,
    });

    await updateDoc(doc(db, 'conversations', conversationId), {
      lastMessage: trimmed,
      lastMessageTime: serverTimestamp(),
      lastMessageFrom: fromDogId,
    });

    await updateDoc(doc(db, 'humans', recipientHumanId), {
      [`unreadCounts.${conversationId}`]: increment(1),
    });
  }

  // Returns an unsubscribe function — call it when ChatView unmounts.
  function subscribeToMessages(conversationId, callback) {
    if (!db) return () => {};

    return onSnapshot(
      query(
        collection(db, 'conversations', conversationId, 'messages'),
        orderBy('createdAt', 'asc')
      ),
      (snapshot) => callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.error('[ChatContext] messages listener error:', err)
    );
  }

  async function markConversationRead(conversationId, myDogId) {
    if (!user || !db) return;

    await updateDoc(doc(db, 'humans', user.uid), {
      [`unreadCounts.${conversationId}`]: 0,
    });

    // Mark received messages (not sent by myDogId) as read
    const unreadSnap = await getDocs(
      query(
        collection(db, 'conversations', conversationId, 'messages'),
        where('readAt', '==', null)
      )
    );

    const writes = unreadSnap.docs
      .filter((d) => d.data().fromDogId !== myDogId)
      .map((d) => updateDoc(d.ref, { readAt: serverTimestamp() }));

    await Promise.all(writes);
  }

  // Called when a pack link is removed — wipes conversation and all messages from both sides.
  async function deleteConversation(dogId1, dogId2) {
    if (!db) return;

    const conversationId = getConversationId(dogId1, dogId2);
    const messagesSnap = await getDocs(
      collection(db, 'conversations', conversationId, 'messages')
    );

    await Promise.all(messagesSnap.docs.map((d) => deleteDoc(d.ref)));
    await deleteDoc(doc(db, 'conversations', conversationId));
  }

  const value = {
    conversations,
    unreadCounts,
    totalUnreadCount,
    getOrCreateConversation,
    sendMessage,
    subscribeToMessages,
    markConversationRead,
    deleteConversation,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
