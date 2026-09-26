// FILE: src/components/ThreadView.jsx
// Single chat thread view. Session 6.11.
// - Loads thread + messages via /api/chat/threads/:id
// - Polls every 3s while open
// - Sends messages via POST /api/chat/threads/:id/messages
// - Auto-marks read on open + on new incoming messages
import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';

const POLL_MS = 3000;

export default function ThreadView({ threadId, currentUser, onClose, onOpenListing }) {
  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);
  const lastMsgIdRef = useRef(null);

  const myId = currentUser?.id || currentUser?.phone;

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.chat.getThread(threadId, myId);
      if (!res.success) throw new Error(res.message);
      setThread(res.thread);
      setMessages(res.messages || []);
      setError(null);
    } catch (err) {
      if (!silent) setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const markRead = async () => {
    try { await api.chat.markRead(threadId, myId); } catch (e) { /* silent */ }
  };

  useEffect(() => {
    load();
    markRead();
    const t = setInterval(() => load(true), POLL_MS);
    return () => clearInterval(t);
  }, [threadId]);

  // Auto-scroll when messages change
  useEffect(() => {
    if (messages.length > 0) {
      const lastId = messages[messages.length - 1].id;
      if (lastId !== lastMsgIdRef.current) {
        lastMsgIdRef.current = lastId;
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      }
    }
  }, [messages]);

  // Mark read again when new incoming arrives
  useEffect(() => {
    if (!messages.length) return;
    const last = messages[messages.length - 1];
    if (last.from !== myId) markRead();
  }, [messages.length]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const res = await api.chat.sendMessage(threadId, myId, body);
      if (!res.success) throw new Error(res.message);
      setText('');
      // Optimistic append
      setMessages(prev => [...prev, res.message]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 30);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const fmtTime = (iso) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      const now = new Date();
      const sameDay = d.toDateString() === now.toDateString();
      if (sameDay) return d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
      return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }) + ' ' +
             d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  };

  const peerId = thread?.participants?.find(p => p !== myId);
  const peerName = thread?.peerDisplay?.name || peerId || 'User';

  if (loading) {
    return (
      <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'white',zIndex:2500,display:'flex',flexDirection:'column'}}>
        <Header onClose={onClose} title="Loading..." />
        <div style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column'}}>
          <div style={{fontSize:28}}>⏳</div>
          <p style={{fontSize:12, color:'#666', marginTop:8}}>Opening thread...</p>
        </div>
      </div>
    );
  }

  if (error && !thread) {
    return (
      <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'white',zIndex:2500,display:'flex',flexDirection:'column'}}>
        <Header onClose={onClose} title="Error" />
        <div style={{padding:20}}>
          <div style={{background:'#FFEBEE', padding:16, borderRadius:12}}>
            <strong style={{color:'#C62828', fontSize:13}}>⚠️ {error}</strong>
            <button onClick={() => load()} style={{display:'block', marginTop:12, padding:10, background:'#C62828', color:'white', border:'none', borderRadius:8, fontSize:12, fontWeight:'bold', cursor:'pointer'}}>Try again</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'#F9FAFB',zIndex:2500,display:'flex',flexDirection:'column'}}>
      <Header
        onClose={onClose}
        title={peerName}
        subtitle={thread?.listingTitle ? `${thread.listingTitle}` : (thread?.passportId || '')}
        listingId={thread?.listingId}
        onOpenListing={onOpenListing}
      />

      {/* Messages */}
      <div style={{flex:1, overflowY:'auto', padding:'12px 14px'}}>
        {messages.length === 0 && (
          <div style={{textAlign:'center', padding:'40px 20px', color:'#666'}}>
            <div style={{fontSize:44, marginBottom:10}}>💬</div>
            <strong style={{fontSize:14, color:'#333', display:'block', marginBottom:6}}>No messages yet</strong>
            <p style={{fontSize:12, lineHeight:1.5, margin:0}}>
              Say hello — ask about the animal, negotiate, or arrange a viewing.
            </p>
          </div>
        )}

        {messages.map(m => {
          const isMine = m.from === myId;
          return (
            <div key={m.id} style={{ display:'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', marginBottom:8 }}>
              <div style={{
                maxWidth:'75%',
                background: isMine ? '#2E7D32' : 'white',
                color: isMine ? 'white' : '#333',
                padding:'8px 12px',
                borderRadius: isMine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                fontSize:13,
                lineHeight:1.4,
                wordBreak:'break-word',
                whiteSpace:'pre-wrap',
              }}>
                {m.text}
                <div style={{ fontSize:9, marginTop:4, opacity:0.7, textAlign: isMine ? 'right' : 'left' }}>
                  {fmtTime(m.sentAt)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{background:'white', borderTop:'1px solid #E0E0E0', padding:'10px 12px', display:'flex', gap:8, alignItems:'flex-end'}}>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Type a message..."
          rows={1}
          style={{
            flex:1,
            padding:'10px 12px',
            borderRadius:20,
            border:'1px solid #E0E0E0',
            fontSize:14,
            resize:'none',
            fontFamily:'inherit',
            outline:'none',
            maxHeight:100,
            boxSizing:'border-box',
          }}
        />
        <button
          onClick={send}
          disabled={!text.trim() || sending}
          style={{
            background: (!text.trim() || sending) ? '#CCC' : '#2E7D32',
            color:'white',
            border:'none',
            width:44,
            height:44,
            borderRadius:'50%',
            fontSize:18,
            fontWeight:'bold',
            cursor: (!text.trim() || sending) ? 'not-allowed' : 'pointer',
            display:'flex',
            alignItems:'center',
            justifyContent:'center',
            flexShrink:0,
          }}
        >
          {sending ? '⏳' : '➤'}
        </button>
      </div>
    </div>
  );
}

function Header({ onClose, title, subtitle, listingId, onOpenListing }) {
  return (
    <div style={{ background:'#2E7D32', color:'white', padding:'12px 14px', display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
      <button onClick={onClose} style={{ background:'none', border:'none', color:'white', fontSize:22, cursor:'pointer', padding:0, lineHeight:1 }}>←</button>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:15, fontWeight:'bold', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{title}</div>
        {subtitle && (
          <div style={{ fontSize:11, opacity:0.9, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{subtitle}</div>
        )}
      </div>
      {listingId && onOpenListing && (
        <button
          onClick={() => onOpenListing(listingId)}
          style={{ background:'rgba(255,255,255,0.15)', color:'white', border:'none', padding:'6px 10px', borderRadius:6, fontSize:11, fontWeight:'bold', cursor:'pointer' }}
        >
          🏷️ Listing
        </button>
      )}
    </div>
  );
}
