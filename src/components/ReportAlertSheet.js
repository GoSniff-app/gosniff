'use client';

import { useState } from 'react';
import { useAlerts } from '@/lib/alerts-context';

export const ALERT_TYPES = [
  { id: 'coyote',         label: 'Coyote spotted',              emoji: '🐺' },
  { id: 'aggressive_dog', label: 'Aggressive dog off leash',    emoji: '🐕' },
  { id: 'ranger',         label: 'Park ranger giving tickets',  emoji: '👮' },
  { id: 'stinky',         label: 'Something stinky to roll in', emoji: '💩' },
  { id: 'custom',         label: 'Other (describe below)',       emoji: '📢' },
];

export default function ReportAlertSheet({ myDog, gpsCoords, locationName, onClose }) {
  const { reportAlert } = useAlerts();
  const [selectedType, setSelectedType] = useState(null);
  const [customText, setCustomText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const canSubmit = selectedType && (selectedType !== 'custom' || customText.trim());

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await reportAlert({
        type: selectedType,
        customText: selectedType === 'custom' ? customText.trim() : null,
        location: gpsCoords,
        locationName: locationName || 'Unknown location',
        dogId: myDog.id,
      });
      setDone(true);
      setTimeout(onClose, 1400);
    } catch (err) {
      console.error('Failed to report alert:', err);
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
        <div className="gs-card text-center bounce-in" style={{ maxWidth: '300px' }}>
          <p style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📣</p>
          <h3 style={{ fontFamily: "'Fredoka', sans-serif", color: 'var(--gs-forest)', fontWeight: 700, marginBottom: '6px' }}>Alert posted!</h3>
          <p style={{ color: 'var(--gs-text-light)', fontSize: '0.875rem' }}>Nearby dogs have been warned.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
      <div
        className="relative w-full sm:max-w-md gs-card slide-up"
        style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, maxHeight: '85vh', overflow: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <h2 style={{ fontFamily: "'Fredoka', sans-serif", color: 'var(--gs-forest)', fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
            Report an Alert
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: 'var(--gs-text-light)', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--gs-text-light)', marginBottom: '16px' }}>
          at {locationName || 'your location'}
        </p>

        {/* Type picker */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          {ALERT_TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedType(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 14px', borderRadius: '12px', cursor: 'pointer', textAlign: 'left',
                border: selectedType === t.id ? '2px solid var(--gs-teal)' : '2px solid var(--gs-gray-200, #e5e5e5)',
                background: selectedType === t.id ? 'rgba(0,148,163,0.06)' : '#fff',
                fontWeight: 600, fontSize: '0.9rem', color: 'var(--gs-forest)',
                transition: 'border 0.15s, background 0.15s',
              }}
            >
              <span style={{ fontSize: '1.4rem', lineHeight: 1, flexShrink: 0 }}>{t.emoji}</span>
              <span style={{ flex: 1 }}>{t.label}</span>
              {selectedType === t.id && (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" fill="var(--gs-teal)" />
                  <path d="M4.5 8l2.5 2.5 4.5-4.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          ))}
        </div>

        {/* Custom text input */}
        {selectedType === 'custom' && (
          <div className="mb-4 fade-in">
            <input
              type="text"
              className="gs-input"
              placeholder="Describe the alert..."
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              autoFocus
              maxLength={120}
            />
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary flex-1"
            disabled={!canSubmit || submitting}
            onClick={handleSubmit}
          >
            {submitting ? 'Posting…' : 'Post Alert'}
          </button>
        </div>
      </div>
    </div>
  );
}
