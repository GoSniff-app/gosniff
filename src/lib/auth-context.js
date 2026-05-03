'use client';

import { createContext, useContext, useEffect, useState } from 'react';
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setDogs([]);
        setLoading(false);
        return;
      }
      const dogsQuery = query(
        collection(db, 'dogs'),
        where('humanIds', 'array-contains', firebaseUser.uid)
      );
      const unsubDogs = onSnapshot(dogsQuery, (snapshot) => {
        const dogList = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setDogs(dogList);
        setLoading(false);
      });
      return () => unsubDogs();
    });
    return () => unsubscribe();
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
    user, dogs, loading,
    signUp, signIn, signOut,
    checkIn, checkOut, updateDog, deleteAccount,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
