'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import PawLogo from './PawLogo';

export default function SignIn({ onSwitchToJoin }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
          <div className="mb-2">
            <label className="block text-sm font-bold mb-1" style={{ color: 'var(--gs-green)' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="gs-input"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--gs-text-light)', display: 'flex', alignItems: 'center' }}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
          <div className="mb-4 text-right">
            <Link
              href={`/forgot-password${email.trim() ? `?email=${encodeURIComponent(email.trim())}` : ''}`}
              className="text-xs font-semibold"
              style={{ color: 'var(--gs-green)', textDecoration: 'none' }}
            >
              Forgot password?
            </Link>
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
