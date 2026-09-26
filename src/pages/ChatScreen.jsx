// FILE: src/pages/ChatScreen.jsx
// Chat inbox — real threads from /api/chat/threads. Session 6.11.
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import ThreadView from '../components/ThreadView';

export default function ChatScreen({ currentFarmer, onOpenListing }) {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeThreadId, setActiveThreadId] = useState(null);

  const myId = currentFarmer?.id || currentFarmer?.phone;

  const load = async () => {
    if (!myId) {
      setThreads([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.chat.listThreads(myId);
      if (!res.success) throw new Error(res.message);
      setThreads(res.threads || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [myId]);

  // Poll for updates every 5s while inbox is open and no thread is active
  useEffect(() => {
    if (activeThreadId || !myId) return;
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [activeThreadId, myId]);

  if (!myId) {
    return (
      <div style={{ padding:'60px 20px', textAlign:'center', color:'#666' }}>
        <div style={{ fontSize:48, marginBottom:12 }}>💬</div>
        <strong style={{ fontSize:15, color:'#333', display:'block', marginBottom:8 }}>Register as a farmer first</strong>
        <p style={{ fontSize:12, lineHeight:1.5, margin:0 }}>
          Chats are scoped to livestock listings. Register to message sellers and buyers.
        </p>
      </div>
    );
  }

  return (
    <>
      <div style={{ padding:'14px 14px 6px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <div>
            <h3 style={{ margin:0, fontSize:18, color:'#2E7D32' }}>💬 Messages</h3>
            <p style={{ margin:'2px 0 0', fontSize:11, color:'#666' }}>
              {threads.length} thread{threads.length === 1 ? '' : 's'}
            </p>
          </div>
          <button
            onClick={load}
            style={{ padding:'8px 12px', background:'white', border:'1px solid #CCC', borderRadius:8, fontSize:11, fontWeight:'bold', color:'#333', cursor:'pointer' }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      <div style={{ padding:'0 14px 20px' }}>
        {error && (
          <div style={{ background:'#FFEBEE', padding:12, borderRadius:10, marginBottom:12 }}>
            <strong style={{ color:'#C62828', fontSize:12 }}>⚠️ {error}</strong>
          </div>
        )}

        {loading && (
          <div style={{ textAlign:'center', padding:40 }}>
            <div style={{ fontSize:28 }}>⏳</div>
            <p style={{ fontSize:12, color:'#666', marginTop:8 }}>Loading threads...</p>
          </div>
        )}

        {!loading && threads.length === 0 && (
          <div style={{ textAlign:'center', padding:'50px 20px', color:'#666' }}>
            <div style={{ fontSize:44, marginBottom:12 }}>💬</div>
            <strong style={{ fontSize:14, color:'#333', display:'block', marginBottom:8 }}>No messages yet</strong>
            <p style={{ fontSize:12, lineHeight:1.5, margin:0 }}>
              When you unlock a seller's contact and message them about a livestock listing, the conversation will appear here.
            </p>
          </div>
        )}

        {!loading && threads.map(t => (
          <ThreadRow
            key={t.id}
            thread={t}
            onClick={() => setActiveThreadId(t.id)}
          />
        ))}
      </div>

      {activeThreadId && (
        <ThreadView
          threadId={activeThreadId}
          currentUser={{ id: myId, phone: myId, fullName: currentFarmer?.fullName }}
          onClose={() => { setActiveThreadId(null); load(); }}
          onOpenListing={onOpenListing}
        />
      )}
    </>
  );
}

function ThreadRow({ thread, onClick }) {
  const peer = thread.peerDisplay || {};
  const hasUnread = thread.unread > 0;
  const initial = (peer.name || thread.peers?.[0] || '?').toString().charAt(0).toUpperCase();

  return (
    <div
      onClick={onClick}
      style={{
        display:'flex',
        gap:12,
        background: hasUnread ? '#F1F8E9' : 'white',
        border: hasUnread ? '2px solid #A5D6A7' : '1px solid #E0E0E0',
        borderRadius:12,
        padding:12,
        marginBottom:8,
        cursor:'pointer',
        boxShadow:'0 1px 2px rgba(0,0,0,0.04)',
      }}
    >
      <div style={{
        width:44, height:44, borderRadius:22,
        background:'#E8F5E9', color:'#2E7D32',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:18, fontWeight:'bold', flexShrink:0,
      }}>
        {initial}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
          <strong style={{ fontSize:13, color:'#333', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {peer.name || thread.peers?.[0] || 'User'}
          </strong>
          <span style={{ fontSize:10, color:'#999', flexShrink:0 }}>
            {formatRelative(thread.lastMessageAt)}
          </span>
        </div>
        {thread.listingTitle && (
          <p style={{ fontSize:10, color:'#2E7D32', margin:'1px 0 0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            🏷️ {thread.listingTitle}
            {thread.passportId ? ` · ${thread.passportId}` : ''}
          </p>
        )}
        <p style={{ fontSize:12, color: hasUnread ? '#1B5E20' : '#666', margin:'3px 0 0', fontWeight: hasUnread ? 'bold' : 'normal', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {thread.lastMessagePreview || 'No messages'}
        </p>
      </div>
      {hasUnread && (
        <div style={{
          background:'#2E7D32', color:'white',
          borderRadius:12, minWidth:22, height:22,
          padding:'0 6px', display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:11, fontWeight:'bold', flexShrink:0, alignSelf:'center',
        }}>
          {thread.unread}
        </div>
      )}
    </div>
  );
}

function formatRelative(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now - d;
    const min = Math.floor(diffMs / 60000);
    if (min < 1) return 'now';
    if (min < 60) return `${min}m`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h`;
    const day = Math.floor(hr / 24);
    if (day < 7) return `${day}d`;
    return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
  } catch { return ''; }
}
