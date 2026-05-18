'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { auth, db } from './firebase';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  deleteUser,
  sendPasswordResetEmail,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  getDocs,
  deleteField,
} from 'firebase/firestore';

const AuthContext = createContext({});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [dogs, setDogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dogsLoaded, setDogsLoaded] = useState(false);
  const dogsUnsubRef = useRef(null);
  const signingUpRef = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (signingUpRef.current) return;

      if (dogsUnsubRef.current) {
        dogsUnsubRef.current();
        dogsUnsubRef.current = null;
      }

      setUser(firebaseUser);

      if (!firebaseUser) {
        setDogs([]);
        setDogsLoaded(false);
        setLoading(false);
        return;
      }

      setDogsLoaded(false);
      setupDogsListener(firebaseUser.uid);
    });

    return () => {
      unsubscribe();
      if (dogsUnsubRef.current) {
        dogsUnsubRef.current();
        dogsUnsubRef.current = null;
      }
    };
  }, []);

  function setupDogsListener(uid) {
    if (dogsUnsubRef.current) {
      dogsUnsubRef.current();
      dogsUnsubRef.current = null;
    }

    const dogsQuery = query(
      collection(db, 'dogs'),
      where('humanIds', 'array-contains', uid)
    );

    dogsUnsubRef.current = onSnapshot(dogsQuery, (snapshot) => {
      const dogList = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setDogs(dogList);
      setDogsLoaded(true);
      setLoading(false);
    });
  }

  async function signUp(email, password, dogData) {
    signingUpRef.current = true;

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);

      await setDoc(doc(db, 'humans', cred.user.uid), {
        email,
        createdAt: serverTimestamp(),
        mutedCheckInDogIds: [],
        mutedMessageDogIds: [],
      });

      await addDoc(collection(db, 'dogs'), {
        ...dogData,
        humanIds: [cred.user.uid],
        createdAt: serverTimestamp(),
        checkedIn: false,
        checkedInAt: null,
        checkedInLocation: null,
        checkedInTime: null,
        privacyZone: 'offline',
      });

      signingUpRef.current = false;
      setUser(cred.user);
      setDogsLoaded(false);
      setupDogsListener(cred.user.uid);
    } catch (err) {
      signingUpRef.current = false;
      throw err;
    }
  }

  async function signIn(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  async function signOut() {
    for (const dog of dogs) {
      if (dog.checkedIn) {
        await checkOut(dog.id);
      }
    }
    return firebaseSignOut(auth);
  }

  async function checkIn(dogId, locationName, lat, lng, visibility = 'everyone') {
    await updateDoc(doc(db, 'dogs', dogId), {
      checkedIn: true,
      checkedInAt: locationName,
      checkedInLocation: { lat, lng },
      checkedInTime: serverTimestamp(),
      privacyZone: 'checked-in',
      visibilityOnCheckIn: visibility,
    });
  }

  async function checkOut(dogId) {
    await updateDoc(doc(db, 'dogs', dogId), {
      checkedIn: false,
      checkedInAt: null,
      checkedInLocation: null,
      checkedInTime: null,
      privacyZone: 'offline',
    });
  }

  async function extendCheckIn(dogId) {
    await updateDoc(doc(db, 'dogs', dogId), {
      checkedInTime: serverTimestamp(),
    });
  }

  async function updateCheckIn(dogId, locationName, lat, lng) {
    await updateDoc(doc(db, 'dogs', dogId), {
      checkedInAt: locationName,
      checkedInLocation: { lat, lng },
      checkedInTime: serverTimestamp(),
    });
  }

  async function updateDog(dogId, data) {
    await updateDoc(doc(db, 'dogs', dogId), data);
  }

  async function deleteAccount(dogId) {
    try {
      // Clean up conversations involving this dog
      const convoSnap = await getDocs(
        query(collection(db, 'conversations'), where('dogIds', 'array-contains', dogId))
      );
      await Promise.all(convoSnap.docs.map(async (convoDoc) => {
        const { humanIds } = convoDoc.data();
        // Delete all messages in the subcollection
        const msgSnap = await getDocs(collection(db, 'conversations', convoDoc.id, 'messages'));
        await Promise.all(msgSnap.docs.map((m) => deleteDoc(m.ref)));
        // Remove unreadCounts key from the other human's doc
        const otherHumanId = humanIds?.find((id) => id !== user?.uid);
        if (otherHumanId) {
          await updateDoc(doc(db, 'humans', otherHumanId), {
            [`unreadCounts.${convoDoc.id}`]: deleteField(),
          });
        }
        await deleteDoc(convoDoc.ref);
      }));

      // Clean up packLinks referencing this dog
      const linksSnap = await getDocs(
        query(collection(db, 'packLinks'), where('dogIds', 'array-contains', dogId))
      );
      await Promise.all(linksSnap.docs.map((d) => deleteDoc(d.ref)));

      // Clean up packRequests referencing this dog (two queries — no OR in Firestore)
      const [fromSnap, toSnap] = await Promise.all([
        getDocs(query(collection(db, 'packRequests'), where('fromDogId', '==', dogId))),
        getDocs(query(collection(db, 'packRequests'), where('toDogId', '==', dogId))),
      ]);
      await Promise.all([
        ...fromSnap.docs.map((d) => deleteDoc(d.ref)),
        ...toSnap.docs.map((d) => deleteDoc(d.ref)),
      ]);
    } catch (err) {
      console.error('deleteAccount cleanup error:', err);
    }

    await deleteDoc(doc(db, 'dogs', dogId));
    if (user) {
      await deleteDoc(doc(db, 'humans', user.uid));
      await deleteUser(user);
    }
  }

  async function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  const value = {
    user, dogs, loading, dogsLoaded,
    signUp, signIn, signOut, resetPassword,
    checkIn, checkOut, extendCheckIn, updateCheckIn, updateDog, deleteAccount,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
