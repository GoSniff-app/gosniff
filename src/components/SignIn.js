'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import PawLogo from './PawLogo';

export default function SignIn({ onSwitchToJoin }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (err) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found') {
        setError("Hmm, that doesn't match our records. Check your email and password.");
      } else {
        setError(err.message);
      }
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 paw-pattern" style={{ background: 'var(--gs-bg)' }}>
      <div className="gs-card w-full max-w-sm slide-up">
        <div className="text-center mb-6">
          <PawLogo size={56} className="mx-auto mb-3" />
          <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: "'Fredoka', sans-serif", color: 'var(--gs-forest)' }}>Welcome Back</h2>
          <p style={{ color: 'var(--gs-text-light)' }}>Your pack is waiting.</p>
        </div>
        {error && (
          <div className="p-3 rounded-xl mb-4 text-sm" style={{ background: '#FEE2E2', color: '#991B1B' }}>{error}</div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="block text-sm font-bold mb-1" style={{ color: 'var(--gs-green)' }}>Email</label>
            <input type="email" className="gs-input" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-bold mb-1" style={{ color: 'var(--gs-green)' }}>Password</label>
            <input type="password" className="gs-input" placeholder="Your password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={!email || !password || loading}>
            {loading ? 'Sniffing you out...' : 'Sign In'}
          </button>
        </form>
        <div className="mt-6 text-center">
          <p className="text-sm" style={{ color: 'var(--gs-text-light)' }}>
            New here?{' '}
            <button onClick={onSwitchToJoin} className="font-bold underline" style={{ color: 'var(--gs-green)' }}>Join the Pack</button>
          </p>
        </div>
      </div>
    </div>
  );
}
