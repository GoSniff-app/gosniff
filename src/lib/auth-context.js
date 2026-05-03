'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { auth, db } from './firebase';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  deleteUser,
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

  async function checkIn(dogId, locationName, lat, lng) {
    await updateDoc(doc(db, 'dogs', dogId), {
      checkedIn: true,
      checkedInAt: locationName,
      checkedInLocation: { lat, lng },
      checkedInTime: serverTimestamp(),
      privacyZone: 'checked-in',
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

  async function updateDog(dogId, data) {
    await updateDoc(doc(db, 'dogs', dogId), data);
  }

  async function deleteAccount(dogId) {
    await deleteDoc(doc(db, 'dogs', dogId));
    if (user) {
      await deleteDoc(doc(db, 'humans', user.uid));
      await deleteUser(user);
    }
  }

  const value = {
    user, dogs, loading, dogsLoaded,
    signUp, signIn, signOut,
    checkIn, checkOut, updateDog, deleteAccount,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
