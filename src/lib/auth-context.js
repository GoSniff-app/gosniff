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
  // NEW: Track whether dogs have been loaded at least once for this user session.
  // This prevents the race condition where user is set but dogs haven't arrived yet.
  const [dogsLoaded, setDogsLoaded] = useState(false);
  // Keep a ref to the dogs listener so we can clean it up properly
  const dogsUnsubRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      // Clean up any previous dogs listener before setting up a new one
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

      // User exists: subscribe to their dogs.
      // Keep loading true until dogs snapshot arrives.
      setDogsLoaded(false);

      const dogsQuery = query(
        collection(db, 'dogs'),
        where('humanIds', 'array-contains', firebaseUser.uid)
      );

      dogsUnsubRef.current = onSnapshot(dogsQuery, (snapshot) => {
        const dogList = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setDogs(dogList);
        setDogsLoaded(true);
        setLoading(false);
      });
    });

    return () => {
      unsubscribe();
      // Also clean up dogs listener on unmount
      if (dogsUnsubRef.current) {
        dogsUnsubRef.current();
        dogsUnsubRef.current = null;
      }
    };
  }, []);

  async function signUp(email, password, dogData) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, 'humans', cred.user.uid), {
      email,
      createdAt: serverTimestamp(),
    });
    const dogRef = await addDoc(collection(db, 'dogs'), {
      ...dogData,
      humanIds: [cred.user.uid],
      createdAt: serverTimestamp(),
      checkedIn: false,
      checkedInAt: null,
      checkedInLocation: null,
      checkedInTime: null,
      privacyZone: 'offline',
    });
    return dogRef;
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
    // Delete the dog document from Firestore
    await deleteDoc(doc(db, 'dogs', dogId));
    // Delete the human document from Firestore
    if (user) {
      await deleteDoc(doc(db, 'humans', user.uid));
      // Delete the Firebase Auth user
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
