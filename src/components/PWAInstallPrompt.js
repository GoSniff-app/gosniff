'use client';

import { useState, useEffect } from 'react';
import PawLogo from './PawLogo';

/**
 * Detects the user's platform and browser environment.
 * Returns: { isIOS, isAndroid, isDesktop, isSafari, isPWA, browserName }
 */
function detectPlatform() {
  if (typeof window === 'undefined') {
    return { isIOS: false, isAndroid: false, isDesktop: true, isSafari: false, isPWA: false, browserName: 'unknown' };
  }

  const ua = navigator.userAgent || '';
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua);
  const isDesktop = !isIOS && !isAndroid;

  // PWA detection: standalone mode means they're running from home screen
  const isPWA = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

  // Safari detection (on iOS, check for non-Safari browsers by their identifiers)
  const isCriOS = /CriOS/.test(ua);     // Chrome on iOS
  const isFxiOS = /FxiOS/.test(ua);     // Firefox on iOS
  const isDuckDuckGo = /DuckDuckGo/.test(ua);
  const isEdgiOS = /EdgiOS/.test(ua);   // Edge on iOS
  const isOtherIOSBrowser = isCriOS || isFxiOS || isDuckDuckGo || isEdgiOS;
  const isSafari = isIOS && !isOtherIOSBrowser;

  let browserName = 'Safari';
  if (isCriOS) browserName = 'Chrome';
  else if (isFxiOS) browserName = 'Firefox';
  else if (isDuckDuckGo) browserName = 'DuckDuckGo';
  else if (isEdgiOS) browserName = 'Edge';

  return { isIOS, isAndroid, isDesktop, isSafari, isPWA, browserName };
}

/**
 * PWAInstallPrompt — Non-skippable onboarding screen for iOS users.
 * 
 * Shows after signup, before the map. Walks the user through adding
 * GoSniff to their Home Screen so push notifications work.
 * 
 * Props:
 *   dogName — the dog's name, for personalized copy
 *   onComplete — called when setup is done (user is in PWA mode, or non-iOS)
 */
export default function PWAInstallPrompt({ dogName, onComplete }) {
  const [platform, setPlatform] = useState(null);
  const [step, setStep] = useState('detect'); // detect | switch-to-safari | step1 | step2 | step3 | done
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    const p = detectPlatform();
    setPlatform(p);

    // Skip entirely for non-iOS or already running as PWA
    if (!p.isIOS || p.isPWA) {
      onComplete();
      return;
    }

    // iOS but not Safari: need to switch browsers first
    if (!p.isSafari) {
      setStep('switch-to-safari');
    } else {
      // iOS + Safari + not PWA: show the Add to Home Screen instructions
      setStep('step1');
    }
  }, []);

  // Listen for display-mode changes (user added to home screen and reopened)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(display-mode: standalone)');
    function handleChange(e) {
      if (e.matches) {
        onComplete();
      }
    }
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, [onComplete]);

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 3000);
    } catch (err) {
      // Fallback for older browsers
      const input = document.createElement('input');
      input.value = window.location.href;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 3000);
    }
  }

  // Still detecting platform
  if (!platform || step === 'detect') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gs-bg)' }} className="paw-pattern">
        <div style={{ textAlign: 'center' }} className="fade-in">
          <PawLogo size={72} className="mx-auto mb-4" animate />
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'var(--gs-bg)' }} className="paw-pattern">
      <div className="gs-card" style={{ maxWidth: '400px', width: '100%' }}>

        {/* SCREEN: Not in Safari — need to switch browsers */}
        {step === 'switch-to-safari' && (
          <div className="fade-in" style={{ textAlign: 'center' }}>
            <PawLogo size={56} className="mx-auto" style={{ marginBottom: '16px' }} />
            <h2 style={{ fontFamily: "'Fredoka', sans-serif", color: 'var(--gs-forest)', fontSize: '1.5rem', fontWeight: 700, marginBottom: '12px' }}>
              One more thing before you start sniffing around
            </h2>
            <p style={{ color: 'var(--gs-forest)', lineHeight: 1.6, marginBottom: '20px', fontSize: '0.95rem' }}>
              To make GoSniff work, you need to add it to your Home Screen. This is what lets you know when your dog friends are at the park (and lets them know when you're there too).
            </p>
            <p style={{ color: 'var(--gs-forest)', lineHeight: 1.6, marginBottom: '8px', fontSize: '0.95rem' }}>
              You're in {platform.browserName} right now, so let's switch to Safari first.
            </p>
            <p style={{ color: 'var(--gs-forest)', lineHeight: 1.6, marginBottom: '20px', fontSize: '0.95rem' }}>
              Open <strong>Safari</strong> on your phone:
            </p>

            {/* Safari icon */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '14px',
                background: 'linear-gradient(180deg, #56C1F0 0%, #2196F3 50%, #1565C0 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}>
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Compass circle */}
                  <circle cx="20" cy="20" r="17" stroke="white" strokeWidth="1.5" fill="none" />
                  {/* Compass needle */}
                  <polygon points="20,6 22,18 20,22 18,18" fill="white" opacity="0.9" />
                  <polygon points="20,34 18,22 20,18 22,22" fill="#E53935" opacity="0.9" />
                  {/* Tick marks */}
                  <line x1="20" y1="3.5" x2="20" y2="5.5" stroke="white" strokeWidth="1.5" />
                  <line x1="20" y1="34.5" x2="20" y2="36.5" stroke="white" strokeWidth="1.5" />
                  <line x1="3.5" y1="20" x2="5.5" y2="20" stroke="white" strokeWidth="1.5" />
                  <line x1="34.5" y1="20" x2="36.5" y2="20" stroke="white" strokeWidth="1.5" />
                </svg>
              </div>
            </div>

            <p style={{ color: 'var(--gs-forest)', lineHeight: 1.6, marginBottom: '16px', fontSize: '0.95rem' }}>
              Then go to <strong>gosniff.vercel.app</strong> and sign in. Don't worry, your account and {dogName}'s profile are already saved. Just sign in with the same email you used here.
            </p>

            <button
              className="btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '1rem', marginBottom: '8px' }}
              onClick={handleCopyLink}
            >
              {linkCopied ? '✓ Link Copied!' : 'Copy Link'}
            </button>
            <p style={{ color: 'var(--gs-text-light)', fontSize: '0.8rem' }}>
              Paste this in Safari's address bar
            </p>
          </div>
        )}

        {/* SCREEN: Step 1 — Tap the Share button */}
        {step === 'step1' && (
          <div className="fade-in" style={{ textAlign: 'center' }}>
            <PawLogo size={56} className="mx-auto" style={{ marginBottom: '16px' }} />
            <h2 style={{ fontFamily: "'Fredoka', sans-serif", color: 'var(--gs-forest)', fontSize: '1.5rem', fontWeight: 700, marginBottom: '12px' }}>
              One more thing before you start sniffing around
            </h2>
            <p style={{ color: 'var(--gs-forest)', lineHeight: 1.6, marginBottom: '24px', fontSize: '0.95rem' }}>
              To make GoSniff work, you need to add it to your Home Screen. This is what lets you know when your dog friends are at the park (and lets them know when you're there too).
            </p>
            <p style={{ color: 'var(--gs-forest)', lineHeight: 1.6, marginBottom: '8px', fontSize: '0.95rem', fontWeight: 600 }}>
              Step 1 of 3
            </p>
            <p style={{ color: 'var(--gs-forest)', lineHeight: 1.6, marginBottom: '16px', fontSize: '0.95rem' }}>
              Tap the <strong>Share</strong> button at the bottom of your screen.
            </p>

            {/* Share icon illustration */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '16px',
                background: 'var(--gs-cream)',
                border: '2px solid var(--gs-mint)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--gs-forest)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="8" width="16" height="14" rx="2" />
                  <path d="M12 2v12" />
                  <path d="M8 6l4-4 4 4" />
                </svg>
              </div>
            </div>

            <p style={{ color: 'var(--gs-text-light)', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '24px' }}>
              It looks like a square with an arrow pointing up. You'll find it at the bottom center of Safari.
            </p>

            <button
              className="btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '1rem' }}
              onClick={() => setStep('step2')}
            >
              I found it, next
            </button>
          </div>
        )}

        {/* SCREEN: Step 2 — Add to Home Screen */}
        {step === 'step2' && (
          <div className="fade-in" style={{ textAlign: 'center' }}>
            <p style={{ color: 'var(--gs-forest)', lineHeight: 1.6, marginBottom: '8px', fontSize: '0.95rem', fontWeight: 600 }}>
              Step 2 of 3
            </p>
            <p style={{ color: 'var(--gs-forest)', lineHeight: 1.6, marginBottom: '16px', fontSize: '0.95rem' }}>
              Scroll down in the menu and tap <strong>"Add to Home Screen."</strong>
            </p>

            {/* Add to Home Screen icon illustration */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              background: 'var(--gs-cream)', borderRadius: '12px', padding: '14px 18px',
              marginBottom: '16px', textAlign: 'left',
              border: '2px solid var(--gs-mint)',
            }}>
              <div style={{
                width: '32px', height: '32px', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--gs-forest)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
              </div>
              <span style={{ color: 'var(--gs-forest)', fontWeight: 600, fontSize: '0.95rem' }}>
                Add to Home Screen
              </span>
            </div>

            <p style={{ color: 'var(--gs-text-light)', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '24px' }}>
              You might need to scroll down a bit to see it in the share menu.
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="btn-secondary"
                style={{ flex: 1, padding: '14px', fontSize: '0.95rem' }}
                onClick={() => setStep('step1')}
              >
                Back
              </button>
              <button
                className="btn-primary"
                style={{ flex: 1, padding: '14px', fontSize: '0.95rem' }}
                onClick={() => setStep('step3')}
              >
                Done, next
              </button>
            </div>
          </div>
        )}

        {/* SCREEN: Step 3 — Tap Add */}
        {step === 'step3' && (
          <div className="fade-in" style={{ textAlign: 'center' }}>
            <p style={{ color: 'var(--gs-forest)', lineHeight: 1.6, marginBottom: '8px', fontSize: '0.95rem', fontWeight: 600 }}>
              Step 3 of 3
            </p>
            <p style={{ color: 'var(--gs-forest)', lineHeight: 1.6, marginBottom: '16px', fontSize: '0.95rem' }}>
              Tap <strong>"Add"</strong> in the top right corner.
            </p>

            {/* Mock top bar showing "Add" button */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'var(--gs-cream)', borderRadius: '12px', padding: '12px 18px',
              marginBottom: '16px',
              border: '2px solid var(--gs-mint)',
            }}>
              <span style={{ color: 'var(--gs-text-light)', fontSize: '0.95rem' }}>Cancel</span>
              <span style={{ color: 'var(--gs-forest)', fontWeight: 700, fontSize: '0.95rem' }}>Add to Home Screen</span>
              <span style={{ color: '#007AFF', fontWeight: 700, fontSize: '0.95rem' }}>Add</span>
            </div>

            <p style={{ color: 'var(--gs-forest)', lineHeight: 1.6, marginBottom: '8px', fontSize: '0.95rem' }}>
              That's it! Now open GoSniff from your Home Screen and you're all set. {dogName} is ready to sniff. 🐾
            </p>

            <p style={{ color: 'var(--gs-text-light)', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '24px' }}>
              You can mute notifications from any specific dog anytime in your Pack settings. No spam, ever.
            </p>

            <button
              className="btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '1rem' }}
              onClick={() => setStep('done')}
            >
              Open GoSniff from Home Screen
            </button>
          </div>
        )}

        {/* SCREEN: Done — waiting for them to reopen from home screen */}
        {step === 'done' && (
          <div className="fade-in" style={{ textAlign: 'center' }}>
            <PawLogo size={56} className="mx-auto" style={{ marginBottom: '16px' }} animate />
            <h2 style={{ fontFamily: "'Fredoka', sans-serif", color: 'var(--gs-forest)', fontSize: '1.3rem', fontWeight: 700, marginBottom: '12px' }}>
              Almost there!
            </h2>
            <p style={{ color: 'var(--gs-forest)', lineHeight: 1.6, marginBottom: '16px', fontSize: '0.95rem' }}>
              Close this tab and tap the <strong>GoSniff icon</strong> on your Home Screen to get started.
            </p>
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
              background: 'var(--gs-cream)', borderRadius: '12px', padding: '20px',
              marginBottom: '20px', border: '2px solid var(--gs-mint)',
            }}>
              <PawLogo size={48} />
              <span style={{ fontSize: '0.8rem', color: 'var(--gs-forest)', fontWeight: 600 }}>GoSniff</span>
            </div>
            <p style={{ color: 'var(--gs-text-light)', fontSize: '0.85rem', lineHeight: 1.5 }}>
              If you haven't added it yet, tap the back button above to see the instructions again.
            </p>
            <button
              className="btn-secondary"
              style={{ marginTop: '16px', padding: '10px 20px', fontSize: '0.85rem' }}
              onClick={() => setStep('step1')}
            >
              Show me the steps again
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
