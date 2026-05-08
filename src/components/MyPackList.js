'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/lib/auth-context';
import { usePack } from '@/lib/pack-context';
import PawLogo from './PawLogo';

function DogRow({ dog }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{
        width: '44px', height: '44px', minWidth: '44px', flexShrink: 0,
        borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--gs-green)',
      }}>
        {dog?.photoURL ? (
          <img src={dog.photoURL} alt={dog.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gs-cream)' }}>
            <PawLogo size={20} />
          </div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--gs-forest)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {dog?.name || '—'}
        </p>
        {dog?.breed && (
          <p style={{ fontSize: '0.75rem', color: 'var(--gs-text-light)', margin: '1px 0 0 0' }}>{dog.breed}</p>
        )}
      </div>
    </div>
  );
}

export default function MyPackList({ onClose }) {
  const { dogs } = useAuth();
  const myDog = dogs[0];
  const {
    myPack, pendingReceived, pendingSent,
    acceptPackRequest, declinePackRequest, cancelPackRequest, removeFromPack,
  } = usePack();

  const [dogProfiles, setDogProfiles] = useState({});
  const [actionLoading, setActionLoading] = useState(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState(null);

  // Fetch dog profiles for everyone in all three lists whenever the lists change.
  useEffect(() => {
    const idsToFetch = new Set();
    myPack.forEach((link) => {
      link.dogIds?.forEach((id) => { if (id !== myDog?.id) idsToFetch.add(id); });
    });
    pendingReceived.forEach((req) => { if (req.fromDogId) idsToFetch.add(req.fromDogId); });
    pendingSent.forEach((req) => { if (req.toDogId) idsToFetch.add(req.toDogId); });

    if (idsToFetch.size === 0) { setDogProfiles({}); return; }

    Promise.all([...idsToFetch].map((id) => getDoc(doc(db, 'dogs', id)))).then((snaps) => {
      const profiles = {};
      snaps.forEach((snap) => { if (snap.exists()) profiles[snap.id] = { id: snap.id, ...snap.data() }; });
      setDogProfiles(profiles);
    });
  }, [myPack, pendingReceived, pendingSent, myDog?.id]);

  async function handleAccept(requestId) {
    setActionLoading(requestId);
    try { await acceptPackRequest(requestId); }
    catch (err) { console.error('Failed to accept pack request:', err); }
    setActionLoading(null);
  }

  async function handleDecline(requestId) {
    setActionLoading(requestId);
    try { await declinePackRequest(requestId); }
    catch (err) { console.error('Failed to decline pack request:', err); }
    setActionLoading(null);
  }

  async function handleCancel(requestId) {
    setActionLoading(requestId);
    try { await cancelPackRequest(requestId); }
    catch (err) { console.error('Failed to cancel pack request:', err); }
    setActionLoading(null);
  }

  async function handleRemove(linkId) {
    setActionLoading(linkId);
    try { await removeFromPack(linkId); }
    catch (err) { console.error('Failed to remove from pack:', err); }
    setConfirmRemoveId(null);
    setActionLoading(null);
  }

  const sectionLabel = {
    fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
    color: 'var(--gs-text-light)', margin: '0 0 10px 0',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
      <div
        className="relative w-full sm:max-w-md gs-card slide-up"
        style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, maxHeight: '85vh', overflow: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ fontFamily: "'Fredoka', sans-serif", color: 'var(--gs-forest)', fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
            My Pack
            {myPack.length > 0 && (
              <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--gs-text-light)', marginLeft: '6px' }}>
                ({myPack.length})
              </span>
            )}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: 'var(--gs-text-light)', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* ── Pending received requests ── */}
        {pendingReceived.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <p style={{ ...sectionLabel, color: 'var(--gs-teal)' }}>
              Pack Requests ({pendingReceived.length})
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {pendingReceived.map((req) => (
                <div key={req.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <DogRow dog={dogProfiles[req.fromDogId]} />
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <button
                      className="btn-primary"
                      style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                      disabled={actionLoading === req.id}
                      onClick={() => handleAccept(req.id)}
                    >
                      {actionLoading === req.id ? '…' : 'Accept'}
                    </button>
                    <button
                      className="btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      disabled={actionLoading === req.id}
                      onClick={() => handleDecline(req.id)}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ borderBottom: '1px solid var(--gs-gray-200, #e5e5e5)', marginTop: '18px' }} />
          </div>
        )}

        {/* ── Current pack members ── */}
        <div style={{ marginBottom: myPack.length > 0 || pendingSent.length > 0 ? '20px' : 0 }}>
          <p style={sectionLabel}>Pack Members</p>
          {myPack.length === 0 ? (
            <p style={{ color: 'var(--gs-text-light)', fontSize: '0.875rem', textAlign: 'center', padding: '16px 0 4px' }}>
              No pack members yet. Tap a dog on the map to send a pack request!
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {myPack.map((link) => {
                const friendDogId = link.dogIds?.find((id) => id !== myDog?.id);
                const friend = dogProfiles[friendDogId];
                const isConfirming = confirmRemoveId === link.id;
                return (
                  <div key={link.id} style={{
                    borderRadius: '12px', padding: '8px',
                    background: isConfirming ? 'var(--gs-cream, #fef9ef)' : 'transparent',
                    transition: 'background 0.15s',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <DogRow dog={friend} />
                      </div>
                      {/* Mute bell — placeholder for notification toggle (Step 6+) */}
                      <button
                        title="Notifications (coming soon)"
                        style={{ background: 'none', border: 'none', cursor: 'default', padding: '4px', opacity: 0.3, flexShrink: 0 }}
                      >
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M10 2a6 6 0 0 0-6 6v3l-1.5 1.5V14h15v-1.5L16 11V8a6 6 0 0 0-6-6zM10 18a2 2 0 0 0 2-2H8a2 2 0 0 0 2 2z" fill="var(--gs-text-light)" />
                        </svg>
                      </button>
                      {!isConfirming && (
                        <button
                          onClick={() => setConfirmRemoveId(link.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, color: 'var(--gs-text-light)', flexShrink: 0, padding: '4px 2px' }}
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    {/* Inline remove confirmation */}
                    {isConfirming && (
                      <div className="fade-in" style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <p style={{ flex: 1, fontSize: '0.78rem', color: 'var(--gs-text-light)', margin: 0, lineHeight: 1.4 }}>
                          Remove {friend?.name || 'this dog'} from your pack?
                        </p>
                        <button
                          className="btn-secondary"
                          style={{ padding: '5px 12px', fontSize: '0.78rem', flexShrink: 0 }}
                          onClick={() => setConfirmRemoveId(null)}
                        >
                          Keep
                        </button>
                        <button
                          style={{
                            padding: '5px 12px', fontSize: '0.78rem', fontWeight: 700,
                            background: 'var(--gs-coral, #FF6B6B)', color: '#fff',
                            border: 'none', borderRadius: '10px', cursor: 'pointer', flexShrink: 0,
                          }}
                          disabled={actionLoading === link.id}
                          onClick={() => handleRemove(link.id)}
                        >
                          {actionLoading === link.id ? '…' : 'Remove'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Pending sent requests ── */}
        {pendingSent.length > 0 && (
          <div>
            <div style={{ borderTop: '1px solid var(--gs-gray-200, #e5e5e5)', marginBottom: '16px' }} />
            <p style={sectionLabel}>Requests Sent</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {pendingSent.map((req) => (
                <div key={req.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <DogRow dog={dogProfiles[req.toDogId]} />
                  </div>
                  <button
                    className="btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.8rem', flexShrink: 0 }}
                    disabled={actionLoading === req.id}
                    onClick={() => handleCancel(req.id)}
                  >
                    {actionLoading === req.id ? '…' : 'Cancel'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
