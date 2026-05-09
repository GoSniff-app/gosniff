'use client';

import { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { PackProvider, usePack } from '@/lib/pack-context';
import { AlertsProvider } from '@/lib/alerts-context';
import { ChatProvider } from '@/lib/chat-context';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import JoinThePack from '@/components/JoinThePack';
import SignIn from '@/components/SignIn';
import MapView from '@/components/MapView';
import PawLogo from '@/components/PawLogo';

function AppContent() {
  const { user, dogs, loading, dogsLoaded } = useAuth();
  const { sendPackRequest } = usePack();
  const [authMode, setAuthMode] = useState('welcome');
  const [inviteToast, setInviteToast] = useState(null);
  const inviteHandledRef = useRef(false);

  const addPackDogId = useState(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('addpack');
  })[0];

  const myDog = dogs[0];

  useEffect(() => {
    if (!addPackDogId || inviteHandledRef.current || !user || !myDog) return;
    if (addPackDogId === myDog.id) {
      inviteHandledRef.current = true;
      return;
    }
    inviteHandledRef.current = true;

    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('addpack');
      window.history.replaceState({}, '', url.toString());
    } catch (e) {}

    sendPackRequest(myDog.id, addPackDogId)
      .then(async () => {
        try {
          const snap = await getDoc(doc(db, 'dogs', addPackDogId));
          const dogName = snap.exists() ? snap.data().name : 'that dog';
          setInviteToast(`Pack request sent to ${dogName}!`);
        } catch (e) {
          setInviteToast('Pack request sent!');
        }
        setTimeout(() => setInviteToast(null), 4000);
      })
      .catch((err) => {
        console.error('Auto pack request failed:', err);
      });
  }, [user, myDog?.id, addPackDogId]);

  if (loading || (user && !dogsLoaded)) {
    return (
      <div style={{ minHeight: '100vh', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gs-bg)' }} className="paw-pattern">
        <div style={{ textAlign: 'center' }} className="fade-in">
          <PawLogo size={72} className="mx-auto mb-4" animate />
          <h1 style={{ fontFamily: "'Fredoka', sans-serif", color: 'var(--gs-forest)', fontSize: '1.875rem', fontWeight: 700, marginBottom: '4px' }}>GoSniff</h1>
          <p style={{ color: 'var(--gs-text-light)', fontSize: '0.875rem' }}>Loading your pack...</p>
        </div>
      </div>
    );
  }

  if (user && dogs.length > 0) return (
    <>
      <MapView />
      {inviteToast && (
        <div className="fade-in" style={{
          position: 'fixed', top: '76px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 500, background: 'var(--gs-forest)', color: '#fff',
          borderRadius: '12px', padding: '10px 18px',
          fontSize: '0.875rem', fontWeight: 600, whiteSpace: 'nowrap',
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        }}>
          🐾 {inviteToast}
        </div>
      )}
    </>
  );
  if (user && dogs.length === 0) return <JoinThePack />;
  if (authMode === 'join') return <JoinThePack />;
  if (authMode === 'signin') return <SignIn onSwitchToJoin={() => setAuthMode('join')} />;

  return (
    <div style={{ minHeight: '100vh', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'var(--gs-bg)' }} className="paw-pattern">
      <div style={{ textAlign: 'center', maxWidth: '380px', width: '100%' }} className="slide-up">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <PawLogo size={120} />
        </div>
        <h1 style={{ fontFamily: "'Fredoka', sans-serif", color: 'var(--gs-forest)', fontSize: '2.5rem', fontWeight: 700, marginBottom: '8px' }}>GoSniff</h1>
        <p style={{ fontFamily: "'Fredoka', sans-serif", color: 'var(--gs-green)', fontSize: '1.125rem', fontWeight: 600, marginBottom: '4px' }}>It's a Dog Meet Dog World</p>
        <p style={{ color: 'var(--gs-text-light)', lineHeight: 1.6, marginBottom: '8px', fontSize: '1rem' }}>
          See which dogs are at the park <strong style={{ color: 'var(--gs-forest)' }}>right now</strong>.
          <br />
          Check in, meet up, and make new friends.
        </p>
        <p style={{ color: 'var(--gs-text-light)', fontStyle: 'italic', marginBottom: '32px', fontSize: '0.95rem' }}>
          (for your dog, obviously)
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
          <button
            className="btn-primary"
            style={{ width: '100%', fontSize: '1.125rem', border: '2px solid var(--gs-teal-dark, #007A87)' }}
            onClick={() => setAuthMode('join')}
          >
            Join the Pack
          </button>
          <button
            className="btn-secondary"
            style={{ width: '100%', border: '2px solid var(--gs-forest)' }}
            onClick={() => setAuthMode('signin')}
          >
            I Already Have an Account
          </button>
        </div>
        <p style={{ marginTop: '32px', fontSize: '0.75rem', color: 'var(--gs-text-light)' }}>Dogs are the identity. Humans are invisible.</p>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <PackProvider>
        <AlertsProvider>
          <ChatProvider>
            <AppContent />
          </ChatProvider>
        </AlertsProvider>
      </PackProvider>
    </AuthProvider>
  );
}
