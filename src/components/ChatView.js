'use client';

import { useState, useEffect, useRef } from 'react';
import { useChat } from '@/lib/chat-context';
import PawLogo from './PawLogo';

const MAX_LEN = 1000;
const CHAR_WARNING = 800;

function formatTime(timestamp) {
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

  const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (date >= todayStart) return timeStr;
  if (date >= yesterdayStart) return `Yesterday ${timeStr}`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' · ' + timeStr;
}

export default function ChatView({ conversationId, myDog, otherDog, onBack }) {
  const { subscribeToMessages, markConversationRead, sendMessage } = useChat();

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const prevMsgCountRef = useRef(0);

  // Subscribe to messages and mark conversation read when opened
  useEffect(() => {
    if (!conversationId || !myDog?.id) return;

    markConversationRead(conversationId, myDog.id);
    const unsub = subscribeToMessages(conversationId, setMessages);

    return () => {
      unsub();
      setMessages([]);
    };
  }, [conversationId, myDog?.id]);

  // Auto-scroll: instant on initial load, smooth for new incoming messages
  useEffect(() => {
    if (!messagesEndRef.current) return;
    const behavior = prevMsgCountRef.current === 0 ? 'instant' : 'smooth';
    prevMsgCountRef.current = messages.length;
    messagesEndRef.current.scrollIntoView({ behavior });
  }, [messages]);

  // Auto-resize textarea as text grows
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, [text]);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length > MAX_LEN || sending) return;
    setSending(true);
    try {
      await sendMessage(conversationId, myDog.id, trimmed);
      setText('');
    } catch (err) {
      console.error('Failed to send message:', err);
    }
    setSending(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const charCount = text.length;
  const overLimit = charCount > MAX_LEN;
  const canSend = text.trim().length > 0 && !overLimit && !sending;

  return (
    <div className="fixed inset-0 z-50" style={{ background: '#fff', display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '14px 16px', borderBottom: '1px solid var(--gs-gray-200)',
        background: '#fff', flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          aria-label="Back"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--gs-forest)', lineHeight: 0 }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div style={{
          width: '38px', height: '38px', borderRadius: '50%',
          overflow: 'hidden', border: '2px solid var(--gs-teal)', flexShrink: 0,
        }}>
          {otherDog?.photoURL ? (
            <img src={otherDog.photoURL} alt={otherDog.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gs-cream)' }}>
              <PawLogo size={18} />
            </div>
          )}
        </div>

        <span style={{
          flex: 1, fontWeight: 700, fontSize: '1rem', color: 'var(--gs-forest)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {otherDog?.name || '…'}
        </span>

        {/* Mute bell — wired in Step 7 */}
        <button
          title="Mute notifications (coming soon)"
          style={{ background: 'none', border: 'none', cursor: 'default', padding: '4px', opacity: 0.3, lineHeight: 0 }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 2a6 6 0 0 0-6 6v3l-1.5 1.5V14h15v-1.5L16 11V8a6 6 0 0 0-6-6zM10 18a2 2 0 0 0 2-2H8a2 2 0 0 0 2 2z" fill="var(--gs-text-light)" />
          </svg>
        </button>
      </div>

      {/* ── Message list ── */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '16px 14px',
        display: 'flex', flexDirection: 'column', gap: '6px',
      }}>
        {messages.length === 0 && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            color: 'var(--gs-text-light)', fontSize: '0.875rem',
            textAlign: 'center', gap: '10px', padding: '60px 0',
          }}>
            <PawLogo size={32} />
            <p style={{ margin: 0 }}>Say hi to {otherDog?.name || 'your pack friend'}!</p>
          </div>
        )}

        {messages.map((msg) => {
          const isMine = msg.fromDogId === myDog?.id;
          return (
            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '78%',
                padding: '9px 14px',
                borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                background: isMine ? 'var(--gs-teal)' : 'var(--gs-gray-100)',
                color: isMine ? '#fff' : 'var(--gs-forest)',
                fontSize: '0.9375rem',
                lineHeight: 1.45,
                wordBreak: 'break-word',
              }}>
                {msg.text}
              </div>
              <span style={{
                fontSize: '0.68rem', color: 'var(--gs-text-light)', marginTop: '3px',
                paddingLeft: isMine ? 0 : '2px', paddingRight: isMine ? '2px' : 0,
              }}>
                {formatTime(msg.createdAt)}
              </span>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input area ── */}
      <div style={{
        padding: '8px 12px',
        paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
        borderTop: '1px solid var(--gs-gray-200)',
        background: '#fff', flexShrink: 0,
      }}>
        {charCount > CHAR_WARNING && (
          <p style={{
            margin: '0 0 4px 0', fontSize: '0.72rem', textAlign: 'right',
            color: overLimit ? 'var(--gs-coral)' : 'var(--gs-text-light)',
            fontWeight: overLimit ? 700 : 400,
          }}>
            {charCount}/{MAX_LEN}
          </p>
        )}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <textarea
            ref={textareaRef}
            className="gs-input"
            rows={1}
            placeholder={`Message ${otherDog?.name || '…'}`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1, resize: 'none', padding: '10px 14px', lineHeight: 1.45,
              minHeight: '42px', maxHeight: '120px', overflowY: 'auto',
              borderColor: overLimit ? 'var(--gs-coral)' : undefined,
            }}
          />
          <button
            onClick={handleSend}
            disabled={!canSend}
            className="btn-primary"
            style={{ padding: '10px 18px', fontSize: '0.9rem', flexShrink: 0 }}
          >
            {sending ? '…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
