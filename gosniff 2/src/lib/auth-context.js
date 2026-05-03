'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from './firebase';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
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

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setDogs([]);
        setLoading(false);
        return;
      }
      // Load this human's dogs
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

  // Sign up: create human account + first dog profile
  async function signUp(email, password, dogData) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    // Create the human doc (private, never shown to other users)
    await setDoc(doc(db, 'humans', cred.user.uid), {
      email,
      createdAt: serverTimestamp(),
    });
    // Create the dog profile (public-facing identity)
    const dogRef = await addDoc(collection(db, 'dogs'), {
      ...dogData,
      humanIds: [cred.user.uid],
      createdAt: serverTimestamp(),
      checkedIn: false,
      checkedInAt: null,
      checkedInLocation: null,
      checkedInTime: null,
      privacyZone: 'offline', // starts offline
    });
    return dogRef;
  }

  // Sign in
  async function signIn(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  // Sign out
  async function signOut() {
    // Check out all dogs first
    for (const dog of dogs) {
      if (dog.checkedIn) {
        await checkOut(dog.id);
      }
    }
    return firebaseSignOut(auth);
  }

  // Check in a dog at a location
  async function checkIn(dogId, locationName, lat, lng) {
    await updateDoc(doc(db, 'dogs', dogId), {
      checkedIn: true,
      checkedInAt: locationName,
      checkedInLocation: { lat, lng },
      checkedInTime: serverTimestamp(),
      privacyZone: 'checked-in',
    });
  }

  // Check out a dog
  async function checkOut(dogId) {
    await updateDoc(doc(db, 'dogs', dogId), {
      checkedIn: false,
      checkedInAt: null,
      checkedInLocation: null,
      checkedInTime: null,
      privacyZone: 'offline',
    });
  }

  // Update dog profile
  async function updateDog(dogId, data) {
    await updateDoc(doc(db, 'dogs', dogId), data);
  }

  const value = {
    user,
    dogs,
    loading,
    signUp,
    signIn,
    signOut,
    checkIn,
    checkOut,
    updateDog,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
