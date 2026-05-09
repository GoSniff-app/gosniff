'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useChat } from '@/lib/chat-context';
import PawLogo from './PawLogo';

function formatPreviewTime(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffSec = (now - date) / 1000;

  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  if (date >= todayStart) return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (date >= yesterdayStart) return 'Yesterday';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function ChatList({ myDog, onOpenChat, onOpenPack, onClose }) {
  const { conversations, unreadCounts } = useChat();
  const [dogProfiles, setDogProfiles] = useState({});

  useEffect(() => {
    if (!myDog || conversations.length === 0) return;

    const otherDogIds = [
      ...new Set(
        conversations.flatMap((c) => c.dogIds?.filter((id) => id !== myDog.id) ?? [])
      ),
    ];

    if (otherDogIds.length === 0) return;

    Promise.all(otherDogIds.map((id) => getDoc(doc(db, 'dogs', id)))).then((snaps) => {
      const profiles = {};
      snaps.forEach((snap) => { if (snap.exists()) profiles[snap.id] = { id: snap.id, ...snap.data() }; });
      setDogProfiles(profiles);
    });
  }, [conversations, myDog?.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
      <div
        className="relative w-full sm:max-w-md gs-card slide-up"
        style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, maxHeight: '85vh', overflow: 'auto', padding: '20px 0 0' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px 14px', borderBottom: '1px solid var(--gs-gray-200)' }}>
          <h2 style={{ fontFamily: "'Fredoka', sans-serif", color: 'var(--gs-forest)', fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
            Messages
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: 'var(--gs-text-light)', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {conversations.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <PawLogo size={48} className="mx-auto mb-3" />
            <p style={{ fontWeight: 700, color: 'var(--gs-forest)', fontSize: '1rem', margin: '0 0 6px' }}>
              {myDog?.name ? `${myDog.name}'s inbox is empty.` : 'Inbox is empty.'}
            </p>
            <p style={{ color: 'var(--gs-text-light)', fontSize: '0.875rem', margin: '0 0 20px' }}>
              Say hi to someone in your pack!
            </p>
            {onOpenPack && (
              <button
                onClick={() => { onClose(); onOpenPack(); }}
                className="btn-primary"
                style={{ padding: '10px 24px', fontSize: '0.9rem' }}
              >
                Go to My Pack
              </button>
            )}
          </div>
        ) : (
          <div>
            {conversations.map((convo) => {
              const otherDogId = convo.dogIds?.find((id) => id !== myDog?.id);
              const otherDog = dogProfiles[otherDogId];
              const unread = unreadCounts[convo.id] || 0;

              return (
                <button
                  key={convo.id}
                  onClick={() => otherDog && onOpenChat(otherDog)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px 20px', border: 'none', background: 'transparent',
                    cursor: 'pointer', textAlign: 'left', transition: 'background 0.12s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--gs-gray-50)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '50%',
                    overflow: 'hidden', border: '2px solid var(--gs-teal)', flexShrink: 0,
                  }}>
                    {otherDog?.photoURL ? (
                      <img src={otherDog.photoURL} alt={otherDog.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gs-cream)' }}>
                        <PawLogo size={22} />
                      </div>
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px', marginBottom: '2px' }}>
                      <p style={{
                        margin: 0, fontWeight: unread > 0 ? 700 : 600,
                        fontSize: '0.9375rem', color: 'var(--gs-forest)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {otherDog?.name || '…'}
                      </p>
                      <span style={{ fontSize: '0.72rem', color: 'var(--gs-text-light)', flexShrink: 0 }}>
                        {formatPreviewTime(convo.lastMessageTime)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <p style={{
                        margin: 0, fontSize: '0.825rem',
                        color: unread > 0 ? 'var(--gs-forest)' : 'var(--gs-text-light)',
                        fontWeight: unread > 0 ? 600 : 400,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                      }}>
                        {convo.lastMessage || 'No messages yet'}
                      </p>
                      {unread > 0 && (
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--gs-teal)', flexShrink: 0 }} />
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div style={{ height: '8px' }} />
      </div>
    </div>
  );
}
