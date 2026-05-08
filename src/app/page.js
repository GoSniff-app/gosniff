'use client';

import { useState } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { PackProvider } from '@/lib/pack-context';
import JoinThePack from '@/components/JoinThePack';
import SignIn from '@/components/SignIn';
import MapView from '@/components/MapView';
import PawLogo from '@/components/PawLogo';

function AppContent() {
  const { user, dogs, loading, dogsLoaded } = useAuth();
  const [authMode, setAuthMode] = useState('welcome');

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

  if (user && dogs.length > 0) return <MapView />;
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
        <AppContent />
      </PackProvider>
    </AuthProvider>
  );
}
