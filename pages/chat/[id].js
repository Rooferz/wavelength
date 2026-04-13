import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabaseBrowser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function ChatPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { id: matchId } = router.query;
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState('');
  const [sending, setSending]     = useState(false);
  const [matchInfo, setMatchInfo] = useState(null);
  const [error, setError]         = useState('');
  const bottomRef = useRef(null);
  const channelRef = useRef(null);

  useEffect(() => {
    if (!matchId || !session) return;
    loadMessages();
    subscribeToMessages();
    return () => { if (channelRef.current) channelRef.current.unsubscribe(); };
  }, [matchId, session]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadMessages() {
    try {
      const r = await fetch(`/api/match/${matchId}/messages`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setMessages(d.messages || []);
      setMatchInfo(d.matchInfo || null);
    } catch (err) { setError(err.message); }
  }

  function subscribeToMessages() {
    const channel = supabaseBrowser
      .channel(`messages:${matchId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `match_id=eq.${matchId}`,
      }, (payload) => {
        setMessages(prev => {
          if (prev.find(m => m.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
      })
      .subscribe();
    channelRef.current = channel;
  }

  async function sendMessage(e) {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);
    const content = input.trim().slice(0, 1000); // enforce max length
    setInput('');
    const optimistic = { id: `temp-${Date.now()}`, content, sender_id: session.spotifyId, created_at: new Date().toISOString(), isOptimistic: true };
    setMessages(prev => [...prev, optimistic]);
    try {
      const r = await fetch(`/api/match/${matchId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!r.ok) { setMessages(prev => prev.filter(m => m.id !== optimistic.id)); setInput(content); }
    } catch { setMessages(prev => prev.filter(m => m.id !== optimistic.id)); setInput(content); }
    finally { setSending(false); }
  }

  function formatTime(ts) {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  const otherName = matchInfo?.display_name || 'Your match';

  return (
    <>
      <Head>
        <title>Wavelength — Chat</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&display=swap" rel="stylesheet" />
      </Head>

      <div className="page chat-page">
        <div className="mesh mesh-warm" style={{ opacity: 0.15 }} />
        <div className="noise-layer" />

        {/* Chat top bar */}
        <div className="chat-nav">
          <Link href="/discover" className="chat-back">← People</Link>
          <div className="chat-title">
            {otherName}
          </div>
          <div className="live-dot">LIVE</div>
        </div>

        {/* Messages */}
        <div className="chat-messages">
          {error && <div className="error-box">⚠ {error}</div>}

          {messages.length === 0 && !error && (
            <div className="chat-empty">
              <span className="chat-empty-icon">◎</span>
              <p>You matched on musical taste. Say hello — talk about what you're listening to, what Wavelength found for you, anything.</p>
            </div>
          )}

          {messages.map(msg => {
            const isMe = msg.sender_id === session?.spotifyId;
            return (
              <div key={msg.id} className={`msg-wrap${isMe ? ' mine' : ''}`}>
                <div className={`msg-bubble${isMe ? ' mine' : ' theirs'}`} style={{ opacity: msg.isOptimistic ? 0.65 : 1 }}>
                  <p className="msg-text">{msg.content}</p>
                  <p className="msg-time">{formatTime(msg.created_at)}</p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="chat-input-bar">
          <form onSubmit={sendMessage} className="chat-form">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Message…"
              className="chat-input"
              autoComplete="off"
              maxLength={1000}
            />
            <button type="submit" className="chat-send" disabled={!input.trim() || sending}>
              {sending ? '…' : 'Send'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
