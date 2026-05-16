'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useAuth } from '@/lib/auth-context';
import { usePack } from '@/lib/pack-context';
import PawLogo from './PawLogo';

function friendsSince(ts) {
  if (!ts) return null;
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function PackMemberDetail({ dog, link, onClose, onOpenChat }) {
  const { user } = useAuth();
  const { removeFromPack } = usePack();

  const [muted, setMuted] = useState(false);
  const [muteLoading, setMuteLoading] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (!user || !dog?.id) return;
    getDoc(doc(db, 'humans', user.uid)).then((snap) => {
      if (snap.exists()) {
        setMuted((snap.data().mutedCheckInDogIds || []).includes(dog.id));
      }
    });
  }, [user, dog?.id]);

  async function toggleMute() {
    if (!user) return;
    setMuteLoading(true);
    const humanRef = doc(db, 'humans', user.uid);
    try {
      if (muted) {
        await updateDoc(humanRef, {
          mutedCheckInDogIds: arrayRemove(dog.id),
          mutedMessageDogIds: arrayRemove(dog.id),
        });
      } else {
        await updateDoc(humanRef, {
          mutedCheckInDogIds: arrayUnion(dog.id),
          mutedMessageDogIds: arrayUnion(dog.id),
        });
      }
      setMuted((m) => !m);
    } catch (err) {
      console.error('Failed to toggle mute:', err);
    }
    setMuteLoading(false);
  }

  function handleSayHi() {
    if (!dog || !onOpenChat) return;
    onOpenChat(dog);
  }

  async function handleRemove() {
    setRemoving(true);
    try {
      await removeFromPack(link.id);
      onClose();
    } catch (err) {
      console.error('Failed to remove from pack:', err);
      setRemoving(false);
    }
  }

  const breedStr = Array.isArray(dog.breed)
    ? dog.breed.filter((b) => b !== 'Other').join(' / ')
    : dog.breed !== 'Other' ? dog.breed : '';

  const energyArr = Array.isArray(dog.energy)
    ? dog.energy
    : [dog.energy].filter(Boolean);

  const since = friendsSince(link?.createdAt);

  const detailLine = [breedStr, dog.gender, dog.age].filter(Boolean).join(' · ');

  return (
    <div
      className="fixed inset-0 flex items-end justify-center"
      style={{ zIndex: 60 }}
      onClick={onClose}
    >
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.35)' }} />
      <div
        className="relative w-full sm:max-w-md slide-up"
        style={{
          background: 'var(--gs-white)',
          borderTopLeftRadius: '20px',
          borderTopRightRadius: '20px',
          padding: '20px',
          maxHeight: '85vh',
          overflow: 'auto',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.12)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '12px', right: '16px',
            width: '32px', height: '32px', borderRadius: '50%',
            background: 'var(--gs-gray-100)', border: 'none',
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '18px', color: 'var(--gs-gray-500)',
          }}
        >×</button>

        {/* Photo + name row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '14px', paddingRight: '40px' }}>
          <div style={{
            width: '90px', height: '90px', minWidth: '90px',
            borderRadius: '50%', overflow: 'hidden',
            border: '3px solid var(--gs-green)', flexShrink: 0,
          }}>
            {dog.photoURL ? (
              <img src={dog.photoURL} alt={dog.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gs-cream)' }}>
                <PawLogo size={36} />
              </div>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontFamily: "'Fredoka', sans-serif", color: 'var(--gs-forest)', fontSize: '1.4rem', fontWeight: 700, margin: 0, lineHeight: 1.2 }}>
              {dog.name}
            </h2>
            {detailLine && (
              <p style={{ color: 'var(--gs-text-light)', fontSize: '0.875rem', margin: '3px 0 0 0' }}>
                {detailLine}
              </p>
            )}
            {dog.checkedIn && dog.checkedInAt && (
              <p style={{ color: 'var(--gs-teal)', fontSize: '0.8rem', fontWeight: 600, margin: '5px 0 0 0', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--gs-teal)', display: 'inline-block', flexShrink: 0 }} />
                At {dog.checkedInAt}
              </p>
            )}
          </div>
        </div>

        {/* Personality chips */}
        {(dog.size || energyArr.length > 0) && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
            {dog.size && (
              <span className="gs-chip selected" style={{ cursor: 'default', fontSize: '0.8rem', padding: '5px 12px' }}>
                {dog.size}
              </span>
            )}
            {energyArr.map((e) => (
              <span key={e} className="gs-chip selected" style={{ cursor: 'default', fontSize: '0.8rem', padding: '5px 12px' }}>
                {e}
              </span>
            ))}
          </div>
        )}

        {/* Friends since */}
        {since && (
          <p style={{ fontSize: '0.8rem', color: 'var(--gs-text-light)', margin: '0 0 16px 0' }}>
            Friends since {since}
          </p>
        )}

        {/* Say Hi button */}
        <button
          className="btn-primary w-full"
          style={{ marginBottom: '12px', fontSize: '0.95rem' }}
          onClick={handleSayHi}
        >
          Message {dog.name}
        </button>

        {/* Mute toggle row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '12px 0',
          borderTop: '1px solid var(--gs-gray-200)',
          borderBottom: '1px solid var(--gs-gray-200)',
          marginBottom: '20px',
        }}>
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"
            style={{ flexShrink: 0, opacity: muted ? 0.35 : 0.75 }}>
            <path d="M10 2a6 6 0 0 0-6 6v3l-1.5 1.5V14h15v-1.5L16 11V8a6 6 0 0 0-6-6zM10 18a2 2 0 0 0 2-2H8a2 2 0 0 0 2 2z" fill="var(--gs-forest)" />
          </svg>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--gs-forest)' }}>Notifications</p>
            <p style={{ margin: '1px 0 0', fontSize: '0.73rem', color: 'var(--gs-text-light)' }}>
              {muted ? `${dog.name}'s activity is muted` : `Notify me when ${dog.name} is active`}
            </p>
          </div>
          {/* Toggle switch */}
          <button
            onClick={toggleMute}
            disabled={muteLoading}
            aria-label={muted ? 'Unmute notifications' : 'Mute notifications'}
            style={{
              width: '44px', height: '24px', borderRadius: '12px', border: 'none',
              background: muted ? 'var(--gs-gray-300)' : 'var(--gs-teal)',
              cursor: muteLoading ? 'wait' : 'pointer',
              position: 'relative', flexShrink: 0,
              transition: 'background 0.2s',
            }}
          >
            <span style={{
              position: 'absolute', top: '2px',
              left: muted ? '2px' : '22px',
              width: '20px', height: '20px',
              borderRadius: '50%', background: '#fff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
              transition: 'left 0.2s',
              display: 'block',
            }} />
          </button>
        </div>

        {/* Remove from pack */}
        {!confirmRemove ? (
          <button
            onClick={() => setConfirmRemove(true)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              width: '100%', textAlign: 'center',
              fontSize: '0.85rem', fontWeight: 600,
              color: 'var(--gs-text-light)', padding: '4px 0 8px',
            }}
          >
            Remove {dog.name} from your pack
          </button>
        ) : (
          <div className="fade-in" style={{ background: 'var(--gs-cream)', borderRadius: '12px', padding: '14px' }}>
            <p style={{ margin: '0 0 4px', fontSize: '0.875rem', fontWeight: 700, color: 'var(--gs-forest)', textAlign: 'center' }}>
              Remove {dog.name} from your pack?
            </p>
            <p style={{ margin: '0 0 12px', fontSize: '0.78rem', color: 'var(--gs-text-light)', textAlign: 'center' }}>
              This will also delete your conversation history.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn-secondary"
                style={{ flex: 1, padding: '9px 0', fontSize: '0.875rem' }}
                onClick={() => setConfirmRemove(false)}
              >
                Cancel
              </button>
              <button
                style={{
                  flex: 1, padding: '9px 0', fontSize: '0.875rem', fontWeight: 700,
                  background: 'var(--gs-coral)', color: '#fff',
                  border: 'none', borderRadius: '14px',
                  cursor: removing ? 'wait' : 'pointer',
                }}
                disabled={removing}
                onClick={handleRemove}
              >
                {removing ? '…' : 'Remove'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
