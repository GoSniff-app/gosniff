'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getFunctions, httpsCallable } from 'firebase/functions';
// Importing from firebase.js ensures the default Firebase app is initialized.
import { auth } from '@/lib/firebase';
import PawLogo from '@/components/PawLogo';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setError('');
    setLoading(true);
    try {
      if (!auth) throw new Error('not-configured');
      const sendReset = httpsCallable(getFunctions(), 'sendPasswordResetEmail');
      const res = await sendReset({ email: email.trim() });
      const out = res.data || {};
      if (out.error) {
        if (out.error === 'invalid-email') {
          setError('Please enter a valid email address.');
        } else {
          setError('Something went wrong. Please try again.');
        }
        setLoading(false);
        return;
      }
      // Generic success — we intentionally don't reveal whether an account exists.
      setSent(true);
    } catch (err) {
      if (err.code === 'functions/unavailable' || err.code === 'unavailable' || err.message === 'not-configured') {
        setError('Network error. Check your connection and try again.');
      } else {
        setError('Something went wrong. Please try again.');
      }
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 paw-pattern" style={{ background: 'var(--gs-bg)' }}>
      <div className="gs-card w-full max-w-sm slide-up">
        <div className="text-center mb-6">
          <PawLogo size={56} className="mx-auto mb-3" />
          <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: "'Fredoka', sans-serif", color: 'var(--gs-forest)' }}>Forgot Password</h2>
          <p style={{ color: 'var(--gs-text-light)' }}>We&apos;ll email you a reset link.</p>
        </div>

        {sent ? (
          <div className="text-center bounce-in">
            <p className="text-sm mb-2" style={{ color: 'var(--gs-forest)', fontWeight: 700 }}>
              Check your email for a password reset link
            </p>
            <p className="text-sm mb-4" style={{ color: 'var(--gs-text-light)', lineHeight: 1.6 }}>
              If an account exists for <strong style={{ color: 'var(--gs-forest)' }}>{email.trim()}</strong>, a reset link is on its way. Check your inbox (and spam folder, just in case). The link expires in 24 hours.
            </p>
            <Link href="/" className="btn-primary w-full" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
              Back
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="p-3 rounded-xl mb-4 text-sm" style={{ background: '#FEE2E2', color: '#991B1B' }}>{error}</div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-bold mb-1" style={{ color: 'var(--gs-green)' }}>Email</label>
                <input
                  type="email"
                  className="gs-input"
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                />
              </div>
              <button type="submit" className="btn-primary w-full" disabled={!email.trim() || loading}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
            <div className="mt-6 text-center">
              <Link href="/" className="font-bold underline" style={{ color: 'var(--gs-green)' }}>
                Back
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
