'use client';

import { useState } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import JoinThePack from '@/components/JoinThePack';
import SignIn from '@/components/SignIn';
import MapView from '@/components/MapView';
import PawLogo from '@/components/PawLogo';

function AppContent() {
  const { user, dogs, loading } = useAuth();
  const [authMode, setAuthMode] = useState('welcome'); // 'welcome' | 'join' | 'signin'

  // Loading state
  if (loading) {
    return (
      <div
        className="h-screen w-screen flex items-center justify-center paw-pattern"
        style={{ background: 'var(--gs-bg)' }}
      >
        <div className="text-center fade-in">
          <PawLogo size={72} className="mx-auto mb-4" />
          <h1
            className="text-3xl font-bold mb-1"
            style={{ fontFamily: "'Fredoka', sans-serif", color: 'var(--gs-forest)' }}
          >
            GoSniff
          </h1>
          <p className="text-sm" style={{ color: 'var(--gs-green-mid)' }}>
            Loading your pack...
          </p>
        </div>
      </div>
    );
  }

  // Authenticated with at least one dog: show the map
  if (user && dogs.length > 0) {
    return <MapView />;
  }

  // Authenticated but no dogs yet: go to onboarding
  if (user && dogs.length === 0) {
    return <JoinThePack onComplete={() => window.location.reload()} />;
  }

  // Join the Pack flow
  if (authMode === 'join') {
    return <JoinThePack onComplete={() => {}} />;
  }

  // Sign in
  if (authMode === 'signin') {
    return <SignIn onSwitchToJoin={() => setAuthMode('join')} />;
  }

  // Welcome screen (default)
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 paw-pattern"
      style={{ background: 'var(--gs-bg)' }}
    >
      <div className="text-center slide-up max-w-sm">
        <PawLogo size={80} className="mx-auto mb-4" />
        <h1
          className="text-4xl font-bold mb-2"
          style={{ fontFamily: "'Fredoka', sans-serif", color: 'var(--gs-forest)' }}
        >
          GoSniff
        </h1>
        <p
          className="text-lg mb-1 font-semibold"
          style={{ fontFamily: "'Fredoka', sans-serif", color: 'var(--gs-green-mid)' }}
        >
          It's a Dog Meet Dog World
        </p>
        <p className="mb-8" style={{ color: 'var(--gs-text-light)', lineHeight: 1.6 }}>
          See which dogs are at the park right now. Check in, meet up, and make new friends
          (for your dog, obviously).
        </p>

        <div className="flex flex-col gap-3 w-full">
          <button className="btn-primary w-full text-lg" onClick={() => setAuthMode('join')}>
            🐾 Join the Pack
          </button>
          <button className="btn-secondary w-full" onClick={() => setAuthMode('signin')}>
            I Already Have an Account
          </button>
        </div>

        <p className="mt-8 text-xs" style={{ color: 'var(--gs-text-light)' }}>
          Dogs are the identity. Humans are invisible.
        </p>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
