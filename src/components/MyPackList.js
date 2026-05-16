'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, getDocs, collection, query, where, limit } from 'firebase/firestore';
import { useAuth } from '@/lib/auth-context';
import { usePack } from '@/lib/pack-context';
import { useChat } from '@/lib/chat-context';
import PawLogo from './PawLogo';
import PackMemberDetail from './PackMemberDetail';

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
        {dog?.breed && (() => { const b = Array.isArray(dog.breed) ? dog.breed.filter(x => x !== 'Other') : (dog.breed !== 'Other' ? [dog.breed] : []); return b.length > 0 ? <p style={{ fontSize: '0.75rem', color: 'var(--gs-text-light)', margin: '1px 0 0 0' }}>{b.join(' / ')}</p> : null; })()}
      </div>
    </div>
  );
}

export default function MyPackList({ onClose, onOpenChat }) {
  const { dogs } = useAuth();
  const myDog = dogs[0];
  const {
    myPack, pendingReceived, pendingSent,
    acceptPackRequest, declinePackRequest, cancelPackRequest, sendPackRequest,
  } = usePack();
  const { unreadCounts } = useChat();

  const [dogProfiles, setDogProfiles] = useState({});
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedLink, setSelectedLink] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchActionLoading, setSearchActionLoading] = useState(null);
  const [copiedInvite, setCopiedInvite] = useState(false);

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

  // Debounced dog name search with fuzzy word-prefix matching.
  // Fetches all dogs client-side so "george" matches "Dr. George", etc.
  useEffect(() => {
    const term = searchTerm.trim();
    if (!term) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const snap = await getDocs(query(collection(db, 'dogs'), limit(500)));

        // Strip punctuation, collapse spaces, lowercase
        const normalize = (s) =>
          s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

        const queryWords = normalize(term).split(' ').filter(Boolean);

        const packDogIds = new Set(myPack.flatMap((l) => l.dogIds || []));
        const sentDogIds = new Set(pendingSent.map((r) => r.toDogId));

        const results = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((dog) => {
            if (dog.id === myDog?.id || packDogIds.has(dog.id) || sentDogIds.has(dog.id)) return false;
            if (!dog.name) return false;
            const nameWords = normalize(dog.name).split(' ').filter(Boolean);
            // Every query word must be a prefix of at least one word in the dog's name
            return queryWords.every((qw) => nameWords.some((nw) => nw.startsWith(qw)));
          });

        setSearchResults(results);
      } catch (err) {
        console.error('Dog search failed:', err);
        setSearchResults([]);
      }
      setSearchLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, myPack, pendingSent, myDog?.id]);

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

  async function handleSendFromSearch(dogId) {
    if (!myDog) return;
    setSearchActionLoading(dogId);
    try {
      await sendPackRequest(myDog.id, dogId);
      setSearchResults((prev) => prev.filter((d) => d.id !== dogId));
    } catch (err) {
      console.error('Failed to send pack request:', err);
    }
    setSearchActionLoading(null);
  }

  async function handleShareInvite() {
    if (!myDog) return;
    const url = `${window.location.origin}?addpack=${myDog.id}`;
    const shareData = {
      title: `GoSniff\nCome sniff around with ${myDog.name}!`,
      text: `Come sniff around with ${myDog.name}!`,
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
    }
    try { await navigator.clipboard.writeText(url); } catch (e) {}
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
  }

  const sectionLabel = {
    fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
    color: 'var(--gs-text-light)', margin: '0 0 10px 0',
  };

  const selectedFriend = selectedLink
    ? dogProfiles[selectedLink.dogIds?.find((id) => id !== myDog?.id)]
    : null;

  return (
    <>
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

        {/* ── Find a Dog ── */}
        <div style={{ marginBottom: '6px' }}>
          <p style={sectionLabel}>Find a Dog</p>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="gs-input"
              placeholder="Search by dog name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '36px' }}
            />
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4, pointerEvents: 'none' }}>
              <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.8" />
              <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>

          {searchTerm.trim() && (
            <div style={{ marginTop: '10px' }}>
              {searchLoading ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--gs-text-light)', textAlign: 'center', padding: '8px 0', margin: 0 }}>
                  Sniffing for "{searchTerm.trim()}"...
                </p>
              ) : searchResults.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--gs-text-light)', textAlign: 'center', padding: '8px 0', margin: 0 }}>
                  No dogs named "{searchTerm.trim()}" found.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {searchResults.map((dog) => (
                    <div key={dog.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <DogRow dog={dog} />
                      </div>
                      <button
                        className="btn-primary"
                        style={{ padding: '6px 14px', fontSize: '0.8rem', flexShrink: 0 }}
                        disabled={searchActionLoading === dog.id}
                        onClick={() => handleSendFromSearch(dog.id)}
                      >
                        {searchActionLoading === dog.id ? '…' : 'Add'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ borderBottom: '1px solid var(--gs-gray-200, #e5e5e5)', margin: '16px 0' }} />

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
              No pack members yet. Search above or tap a dog on the map!
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {myPack.map((link) => {
                const friendDogId = link.dogIds?.find((id) => id !== myDog?.id);
                const friend = dogProfiles[friendDogId];
                return (
                  <div
                    key={link.id}
                    onClick={() => friend && setSelectedLink(link)}
                    style={{
                      borderRadius: '12px', padding: '8px',
                      cursor: friend ? 'pointer' : 'default',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => { if (friend) e.currentTarget.style.background = 'var(--gs-gray-100)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <DogRow dog={friend} />
                      </div>
                      {onOpenChat && friend && (() => {
                        const convId = myDog ? [myDog.id, friend.id].sort().join('_') : null;
                        const unread = convId ? (unreadCounts[convId] || 0) : 0;
                        return (
                          <button
                            title={`Message ${friend.name}`}
                            onClick={(e) => { e.stopPropagation(); onOpenChat(friend); onClose(); }}
                            style={{
                              position: 'relative',
                              background: 'var(--gs-teal)', border: 'none', borderRadius: '8px',
                              cursor: 'pointer', padding: '5px 8px', flexShrink: 0, lineHeight: 0,
                            }}
                          >
                            <svg width="16" height="16" viewBox="0 0 20 20" fill="white" xmlns="http://www.w3.org/2000/svg">
                              <path d="M2 4.5A1.5 1.5 0 0 1 3.5 3h13A1.5 1.5 0 0 1 18 4.5v8A1.5 1.5 0 0 1 16.5 14H9l-4 3v-3H3.5A1.5 1.5 0 0 1 2 12.5v-8z" />
                            </svg>
                            {unread > 0 && (
                              <span style={{
                                position: 'absolute', top: '-6px', right: '-6px',
                                minWidth: '16px', height: '16px', borderRadius: '8px',
                                background: 'var(--gs-coral)', color: '#fff',
                                fontSize: '0.55rem', fontWeight: 700,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: '1.5px solid #fff', padding: '0 3px',
                                lineHeight: 1, boxSizing: 'border-box', pointerEvents: 'none',
                              }}>
                                {unread > 9 ? '9+' : unread}
                              </span>
                            )}
                          </button>
                        );
                      })()}
                    </div>
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

        {/* ── Invite ── */}
        <div style={{ marginTop: '20px', borderTop: '1px solid var(--gs-gray-200, #e5e5e5)', paddingTop: '16px' }}>
          <p style={{ fontFamily: "'Fredoka', sans-serif", fontSize: '1rem', fontWeight: 600, color: 'var(--gs-forest)', textAlign: 'center', margin: '0 0 10px' }}>
            Wanna sniff my butt?
          </p>
          <button
            onClick={handleShareInvite}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '11px', borderRadius: '12px', border: '1.5px solid var(--gs-green)',
              background: copiedInvite ? 'rgba(45,106,79,0.08)' : '#fff',
              cursor: 'pointer', fontSize: '0.875rem', fontWeight: 700, color: 'var(--gs-forest)',
              transition: 'background 0.15s',
            }}
          >
            <svg width="17" height="17" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="15" cy="4" r="2" stroke="var(--gs-green)" strokeWidth="1.6" />
              <circle cx="15" cy="16" r="2" stroke="var(--gs-green)" strokeWidth="1.6" />
              <circle cx="5" cy="10" r="2" stroke="var(--gs-green)" strokeWidth="1.6" />
              <path d="M7 9l6-4M7 11l6 4" stroke="var(--gs-green)" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            {copiedInvite ? '✓ Link Copied!' : 'Invite a dog friend'}
          </button>
          <p style={{ fontSize: '0.72rem', color: 'var(--gs-text-light)', textAlign: 'center', marginTop: '6px', lineHeight: 1.4 }}>
            Share a link so they can join GoSniff and connect with {myDog?.name}.
          </p>
        </div>
      </div>
    </div>
    {selectedLink && selectedFriend && (
      <PackMemberDetail
        dog={selectedFriend}
        link={selectedLink}
        onClose={() => setSelectedLink(null)}
        onOpenChat={onOpenChat}
      />
    )}
    </>
  );
}
