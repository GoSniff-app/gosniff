'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth } from '@/lib/firebase';
import PawLogo from '@/components/PawLogo';

// Wraps the form in a card that matches SignIn.js / EditProfile.js styling.
function Shell({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 paw-pattern" style={{ background: 'var(--gs-bg)' }}>
      <div className="gs-card w-full max-w-sm slide-up">
        <div className="text-center mb-6">
          <PawLogo size={56} className="mx-auto mb-3" />
          <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: "'Fredoka', sans-serif", color: 'var(--gs-forest)' }}>Reset Password</h2>
          <p style={{ color: 'var(--gs-text-light)' }}>Let&apos;s get you back to the pack.</p>
        </div>
        {children}
      </div>
    </div>
  );
}

function ErrorBox({ children }) {
  return (
    <div className="p-3 rounded-xl mb-4 text-sm" style={{ background: '#FEE2E2', color: '#991B1B' }}>{children}</div>
  );
}

function BackToSignIn() {
  return (
    <div className="mt-6 text-center">
      <Link href="/" className="font-bold underline" style={{ color: 'var(--gs-green)' }}>
        Back to Sign In
      </Link>
    </div>
  );
}

function ResetPasswordInner() {
  const searchParams = useSearchParams();
  const oobCode = searchParams.get('oobCode');
  const code = searchParams.get('code'); // custom (non-Firebase) reset code

  // 'firebase' (oobCode) | 'custom' (Firestore code)
  const [mode, setMode] = useState(null);
  // 'verifying' | 'ready' | 'invalid' | 'success'
  const [status, setStatus] = useState('verifying');
  const [verifyError, setVerifyError] = useState('');
  const [email, setEmail] = useState('');

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Verify the reset code once on load — but only if there is one.
  useEffect(() => {
    let cancelled = false;

    // ── Firebase oobCode flow (unchanged) ──
    if (oobCode) {
      setMode('firebase');

      if (!auth) {
        setStatus('invalid');
        setVerifyError('Something went wrong on our end. Please try again later.');
        return;
      }

      verifyPasswordResetCode(auth, oobCode)
        .then((verifiedEmail) => {
          if (cancelled) return;
          setEmail(verifiedEmail || '');
          setStatus('ready');
        })
        .catch((err) => {
          if (cancelled) return;
          setStatus('invalid');
          if (err.code === 'auth/expired-action-code') {
            setVerifyError('This password reset link has expired. Please request a new one from the Sign In page.');
          } else if (err.code === 'auth/invalid-action-code') {
            setVerifyError('This password reset link is invalid or has already been used. Please request a new one.');
          } else if (err.code === 'auth/user-disabled') {
            setVerifyError('This account has been disabled. Contact ren@godogpro.com for help.');
          } else if (err.code === 'auth/user-not-found') {
            setVerifyError('We could not find an account for this reset link.');
          } else if (err.code === 'auth/network-request-failed') {
            setVerifyError('Network error. Check your connection and try again.');
          } else {
            setVerifyError('We could not verify this reset link. Please request a new one.');
          }
        });

      return () => { cancelled = true; };
    }

    // ── Custom Firestore code flow (validated server-side) ──
    if (code) {
      setMode('custom');

      httpsCallable(getFunctions(), 'verifyResetCode')({ code })
        .then((res) => {
          if (cancelled) return;
          const out = res.data || {};
          if (out.error === 'expired') {
            setStatus('invalid');
            setVerifyError('Reset link has expired');
          } else if (out.valid) {
            setEmail(out.email || '');
            setStatus('ready');
          } else {
            setStatus('invalid');
            setVerifyError('Invalid or expired reset link');
          }
        })
        .catch((err) => {
          if (cancelled) return;
          setStatus('invalid');
          if (err.code === 'functions/unavailable' || err.code === 'unavailable') {
            setVerifyError('Network error. Check your connection and try again.');
          } else {
            setVerifyError('Invalid or expired reset link');
          }
        });

      return () => { cancelled = true; };
    }

    // ── Guard: user navigated here manually with no code at all ──
    setStatus('invalid');
    setVerifyError('This password reset link is missing its code. Please use the link from your reset email, or request a new one.');
    return () => { cancelled = true; };
  }, [oobCode, code]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!password) return;
    setFormError('');
    setSubmitting(true);
    try {
      // ── Custom Firestore code flow: apply via the Admin SDK Cloud Function. ──
      if (mode === 'custom') {
        const res = await httpsCallable(getFunctions(), 'confirmPasswordResetWithCode')({ code, newPassword: password });
        const out = res.data || {};
        if (out.error) {
          if (out.error === 'weak-password') {
            setFormError('That password is too weak. Use at least 6 characters.');
          } else if (out.error === 'expired') {
            setFormError('This reset link has expired. Please request a new one from the Sign In page.');
          } else if (out.error === 'invalid') {
            setFormError('This reset link is invalid or has already been used. Please request a new one.');
          } else {
            setFormError('Something went wrong. Please try again.');
          }
          setSubmitting(false);
          return;
        }
        setStatus('success');
        return;
      }

      // ── Firebase oobCode flow (unchanged) ──
      await confirmPasswordReset(auth, oobCode, password);
      setStatus('success');
    } catch (err) {
      if (err.code === 'auth/weak-password') {
        setFormError('That password is too weak. Use at least 6 characters.');
      } else if (err.code === 'auth/expired-action-code') {
        setFormError('This reset link has expired. Please request a new one from the Sign In page.');
      } else if (err.code === 'auth/invalid-action-code') {
        setFormError('This reset link is invalid or has already been used. Please request a new one.');
      } else if (err.code === 'auth/network-request-failed' || err.code === 'functions/unavailable' || err.code === 'unavailable') {
        setFormError('Network error. Check your connection and try again.');
      } else {
        setFormError('Something went wrong. Please try again.');
      }
      setSubmitting(false);
    }
  }

  // ── Loading state while verifying the code ──
  if (status === 'verifying') {
    return (
      <Shell>
        <p className="text-center text-sm" style={{ color: 'var(--gs-text-light)' }}>
          Verifying your reset link...
        </p>
      </Shell>
    );
  }

  // ── Invalid / missing / expired code ──
  if (status === 'invalid') {
    return (
      <Shell>
        <ErrorBox>{verifyError}</ErrorBox>
        <BackToSignIn />
      </Shell>
    );
  }

  // ── Success ──
  if (status === 'success') {
    return (
      <Shell>
        <div className="text-center bounce-in">
          <p className="text-sm mb-2" style={{ color: 'var(--gs-forest)', fontWeight: 700 }}>
            Your password has been reset successfully
          </p>
          <p className="text-sm" style={{ color: 'var(--gs-text-light)', lineHeight: 1.6 }}>
            You can now sign in with your new password.
          </p>
        </div>
        <div className="mt-6">
          <Link href="/" className="btn-primary w-full" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
            Back to Sign In
          </Link>
        </div>
      </Shell>
    );
  }

  // ── Ready: show the new-password form ──
  return (
    <Shell>
      {email && (
        <p className="text-sm mb-4 text-center" style={{ color: 'var(--gs-text-light)' }}>
          Choose a new password for <strong style={{ color: 'var(--gs-forest)' }}>{email}</strong>.
        </p>
      )}
      {formError && <ErrorBox>{formError}</ErrorBox>}
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-bold mb-1" style={{ color: 'var(--gs-green)' }}>New Password</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              className="gs-input"
              placeholder="Your new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ paddingRight: '40px' }}
              autoFocus
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
        <button type="submit" className="btn-primary w-full" disabled={!password || submitting}>
          {submitting ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>
      <BackToSignIn />
    </Shell>
  );
}

export default function ResetPasswordPage() {
  // useSearchParams requires a Suspense boundary in the App Router.
  return (
    <Suspense fallback={
      <Shell>
        <p className="text-center text-sm" style={{ color: 'var(--gs-text-light)' }}>Loading...</p>
      </Shell>
    }>
      <ResetPasswordInner />
    </Suspense>
  );
}
