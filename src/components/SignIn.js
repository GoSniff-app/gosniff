'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import PawLogo from './PawLogo';

export default function SignIn({ onSwitchToJoin }) {
  const { signIn, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');

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

  async function handleResetPassword() {
    if (!resetEmail.trim()) return;
    setResetError('');
    setResetLoading(true);
    try {
      await resetPassword(resetEmail.trim());
      setResetSent(true);
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        setResetError("We don't have an account with that email.");
      } else if (err.code === 'auth/invalid-email') {
        setResetError("That doesn't look like a valid email address.");
      } else {
        setResetError('Something went wrong. Try again.');
      }
    }
    setResetLoading(false);
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
            <button
              type="button"
              onClick={() => { setShowForgotPassword(true); setResetEmail(email); setResetSent(false); setResetError(''); }}
              className="text-xs font-semibold"
              style={{ color: 'var(--gs-green)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              Forgot password?
            </button>
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

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowForgotPassword(false)}>
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.4)' }} />
          <div className="relative gs-card w-full max-w-sm fade-in" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowForgotPassword(false)}
              className="absolute top-3 right-4 text-2xl"
              style={{ color: 'var(--gs-text-light)', background: 'none', border: 'none', cursor: 'pointer' }}
            >×</button>

            {resetSent ? (
              <div className="text-center bounce-in">
                <PawLogo size={48} className="mx-auto mb-3" />
                <h3 className="text-lg font-bold mb-2" style={{ fontFamily: "'Fredoka', sans-serif", color: 'var(--gs-forest)' }}>Check your email!</h3>
                <p className="text-sm mb-4" style={{ color: 'var(--gs-text-light)', lineHeight: 1.6 }}>
                  We sent a password reset link to <strong style={{ color: 'var(--gs-forest)' }}>{resetEmail}</strong>. Check your inbox (and spam folder, just in case).
                </p>
                <button className="btn-primary w-full" onClick={() => setShowForgotPassword(false)}>
                  Back to Sign In
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-bold mb-1" style={{ fontFamily: "'Fredoka', sans-serif", color: 'var(--gs-forest)' }}>Reset Password</h3>
                <p className="text-sm mb-4" style={{ color: 'var(--gs-text-light)' }}>
                  Enter your email and we will send you a reset link.
                </p>
                {resetError && (
                  <div className="p-3 rounded-xl mb-3 text-sm" style={{ background: '#FEE2E2', color: '#991B1B' }}>{resetError}</div>
                )}
                <input
                  type="email"
                  className="gs-input mb-4"
                  placeholder="you@email.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleResetPassword()}
                />
                <div className="flex gap-2">
                  <button className="btn-secondary flex-1" onClick={() => setShowForgotPassword(false)}>Cancel</button>
                  <button
                    className="btn-primary flex-1"
                    disabled={!resetEmail.trim() || resetLoading}
                    onClick={handleResetPassword}
                  >
                    {resetLoading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
