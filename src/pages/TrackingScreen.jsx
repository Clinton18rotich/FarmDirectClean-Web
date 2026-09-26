// FILE: src/pages/TrackingScreen.jsx
// Session 4B-d — Track tab hub. Lists the current user's trades with a
// mini-leg-summary. Tap a card → opens TradeTrackingScreen (via prop).
import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../services/api';

const TERMINAL_STATUSES = ['completed', 'cancelled', 'failed'];

function isActive(trade) {
  return !TERMINAL_STATUSES.includes((trade.status || '').toLowerCase());
}
function shortId(id) {
  if (!id) return '—';
  const s = String(id);
  return s.length > 16 ? s.slice(0, 14) + '…' : s;
}
function legsOf(trade) { return (trade?.delivery?.legs) || []; }
function currentLegIndex(trade) {
  const idx = trade?.delivery?.currentLegIndex;
  if (typeof idx === 'number' && idx >= 0) return idx;
  const legs = legsOf(trade);
  if (!legs.length) return -1;
  const firstPending = legs.findIndex(l => l.status !== 'arrived');
  return firstPending === -1 ? legs.length - 1 : firstPending;
}
function legLabelFrom(leg) {
  return (leg?.from?.label || leg?.from?.area || leg?.from?.ward || leg?.from?.county || '?').toString();
}
function legLabelTo(leg) {
  return (leg?.to?.label || leg?.to?.area || leg?.to?.ward || leg?.to?.county || '?').toString();
}
function legShort(text) {
  if (!text) return '?';
  return String(text).slice(0, 3).toUpperCase();
}
function routeSummary(trade) {
  const legs = legsOf(trade);
  if (legs.length > 0) return `${legLabelFrom(legs[0])} → ${legLabelTo(legs[legs.length - 1])}`;
  const from = trade?.delivery?.pickup?.area || trade?.delivery?.pickup?.county || '?';
  const to = trade?.delivery?.dropoff?.area || trade?.delivery?.dropoff?.county || '?';
  return `${from} → ${to}`;
}
function counterparty(trade, currentUser) {
  if (!currentUser) return { name: 'Unknown', role: '' };
  const myId = currentUser.id;
  const isSeller = trade.sellerId === myId;
  const isBuyer = trade.buyerId === myId;
  if (isSeller && !isBuyer) return { name: trade.buyerName || trade.buyerPhone || 'Buyer', role: 'Buyer' };
  if (isBuyer && !isSeller) return { name: trade.sellerName || trade.sellerPhone || 'Seller', role: 'Seller' };
  return { name: trade.sellerName || 'Seller', role: 'Seller' };
}
function statusBadge(status) {
  const s = (status || 'pending').toLowerCase();
  const map = {
    escrow_pending:    { bg:'#FFF3E0', fg:'#E65100', label:'Escrow pending' },
    awaiting_funding:  { bg:'#FFF3E0', fg:'#E65100', label:'Awaiting funding' },
    matching_rider:    { bg:'#E3F2FD', fg:'#1565C0', label:'Matching rider' },
    rider_assigned:    { bg:'#E3F2FD', fg:'#1565C0', label:'Rider assigned' },
    awaiting_release:  { bg:'#F3E5F5', fg:'#6A1B9A', label:'Delivered' },
    releasing:         { bg:'#E8F5E9', fg:'#2E7D32', label:'Releasing' },
    completed:         { bg:'#E8F5E9', fg:'#2E7D32', label:'Completed' },
    disputed:          { bg:'#FFEBEE', fg:'#C62828', label:'Disputed' },
    failed:            { bg:'#FFEBEE', fg:'#C62828', label:'Failed' },
    no_rider_available:{ bg:'#FFEBEE', fg:'#C62828', label:'No rider' },
    cancelled:         { bg:'#F5F5F5', fg:'#616161', label:'Cancelled' },
  };
  return map[s] || { bg:'#F5F5F5', fg:'#616161', label: status || 'Unknown' };
}

export default function TrackingScreen({ currentUser, onSelectTrade }) {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('active');

  const load = useCallback(async () => {
    if (!currentUser?.id) {
      setTrades([]); setError(null); setLoading(false); return;
    }
    setLoading(true); setError(null);
    try {
      const role = currentUser.role === 'farmer' || currentUser.role === 'seller'
        ? 'seller'
        : currentUser.role === 'buyer' ? 'buyer' : undefined;
      const res = await api.trades.myTrades(currentUser.id, role);
      const list = Array.isArray(res) ? res : (res?.trades || []);
      setTrades(list);
    } catch (e) {
      setError(e?.message || 'Failed to load trades');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, currentUser?.role]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!currentUser?.id) return;
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load, currentUser?.id]);

  const filtered = trades.filter(t => {
    const active = isActive(t);
    if (filter === 'active') return active;
    if (filter === 'completed') return !active;
    return true;
  });

  const activeCount = trades.filter(t => isActive(t)).length;
  const completedCount = trades.filter(t => !isActive(t)).length;
  const totalCount = trades.length;

  const handleSelect = (tradeId) => {
    if (onSelectTrade) onSelectTrade(tradeId);
    else window.dispatchEvent(new CustomEvent('fd:openTradeTracking', { detail: { tradeId } }));
  };

  if (!currentUser?.id) {
    return (
      <div style={{ padding:'60px 20px', textAlign:'center', color:'#666' }}>
        <div style={{ fontSize:48, marginBottom:12 }}>📍</div>
        <strong style={{ fontSize:15, color:'#333', display:'block', marginBottom:8 }}>
          Sign in to see your shipments
        </strong>
        <p style={{ fontSize:12, lineHeight:1.5, margin:0 }}>
          Track livestock deliveries from your marketplace trades here.
        </p>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 80 }}>
      <div style={{ background:'#2E7D32', padding:16, color:'white' }}>
        <h3 style={{ margin:0, fontSize:18 }}>📍 Shipments</h3>
        <p style={{ fontSize:11, opacity:0.9, margin:'4px 0 0' }}>Track your delivery legs in real-time</p>
      </div>

      <div style={{ display:'flex', gap:8, padding:'12px 12px 4px' }}>
        {[
          { key:'active',    label: `Active (${activeCount})` },
          { key:'completed', label: `Completed (${completedCount})` },
          { key:'all',       label: `All (${totalCount})` },
        ].map(f => {
          const on = filter === f.key;
          return (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              padding:'6px 14px', borderRadius:20,
              border: on ? '1px solid #2E7D32' : '1px solid #ddd',
              background: on ? '#E8F5E9' : 'white',
              color: on ? '#2E7D32' : '#555',
              fontSize:13, fontWeight: on ? 'bold' : 'normal', cursor:'pointer',
            }}>{f.label}</button>
          );
        })}
      </div>

      <div style={{ padding:12 }}>
        {loading && (
          <div style={{ textAlign:'center', padding:40, color:'#666' }}>
            <span style={{ fontSize:40 }}>⏳</span>
            <p>Loading shipments…</p>
          </div>
        )}

        {!loading && error && (
          <div style={{ textAlign:'center', padding:40 }}>
            <span style={{ fontSize:40 }}>⚠️</span>
            <p style={{ color:'#C62828' }}>{error}</p>
            <button onClick={load} style={{ marginTop:8, padding:'8px 20px', borderRadius:20, background:'#2E7D32', color:'white', border:'none', fontWeight:'bold', cursor:'pointer' }}>Retry</button>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div style={{ textAlign:'center', padding:40 }}>
            <span style={{ fontSize:60 }}>📦</span>
            <p style={{ color:'#666' }}>
              {filter === 'active' ? 'No active shipments' : filter === 'completed' ? 'No completed shipments' : 'No shipments yet'}
            </p>
            <p style={{ fontSize:12, color:'#999' }}>Trades from the marketplace will appear here</p>
          
              {filter === 'active' && completedCount > 0 && (
                <button
                  onClick={() => setFilter('completed')}
                  style={{
                    padding:'10px 20px', borderRadius:20,
                    border:'1px solid #2E7D32', background:'white', color:'#2E7D32',
                    fontSize:13, fontWeight:'bold', cursor:'pointer',
                  }}
                >
                  📜 View completed shipments →
                </button>
              )}
</div>
        )}

        {!loading && !error && filtered.map(t => {
          const cp = counterparty(t, currentUser);
          const badge = statusBadge(t.status);
          const legs = legsOf(t);
          const activeIdx = currentLegIndex(t);
          const active = activeIdx >= 0 ? legs[activeIdx] : null;
          const allArrived = legs.length > 0 && legs.every(l => l.status === 'arrived');

          return (
            <div key={t.id} onClick={() => handleSelect(t.id)} style={{
              background:'white', borderRadius:12, padding:14, marginBottom:10, cursor:'pointer',
              boxShadow:'0 1px 3px rgba(0,0,0,0.06)',
              border: isActive(t) ? '1px solid #C8E6C9' : '1px solid #E0E0E0',
            }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <strong style={{ fontSize:13, fontFamily:'monospace' }}>📦 {shortId(t.id)}</strong>
                <span style={{ background:badge.bg, color:badge.fg, padding:'3px 10px', borderRadius:10, fontSize:10, fontWeight:'bold' }}>
                  {badge.label}
                </span>
              </div>
              <div style={{ fontSize:12, color:'#555', marginTop:6 }}>
                {cp.role}: <strong>{cp.name}</strong>
              </div>
              <div style={{ fontSize:12, color:'#333', marginTop:4 }}>📍 {routeSummary(t)}</div>

              {legs.length > 0 && (
                <div style={{ display:'flex', alignItems:'center', marginTop:10, gap:2, overflowX:'auto' }}>
                  {legs.map((leg, i) => {
                    const done = leg.status === 'arrived';
                    const isActiveLeg = i === activeIdx && !done;
                    const col = done ? '#2E7D32' : isActiveLeg ? '#FF6F00' : '#BDBDBD';
                    return (
                      <React.Fragment key={leg.id || i}>
                        {i > 0 && (
                          <div style={{ width:14, height:2, background: legs[i-1].status === 'arrived' ? '#2E7D32' : '#ddd', flexShrink:0 }} />
                        )}
                        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
                          <div style={{ width: isActiveLeg ? 12 : 10, height: isActiveLeg ? 12 : 10, borderRadius:'50%', background: col }} />
                          <span style={{ fontSize:8, color:'#666', marginTop:2 }}>{legShort(legLabelFrom(leg))}</span>
                        </div>
                      </React.Fragment>
                    );
                  })}
                  <div style={{ width:14, height:2, background: allArrived ? '#2E7D32' : '#ddd', flexShrink:0 }} />
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
                    <div style={{ width:10, height:10, borderRadius:'50%', background: allArrived ? '#2E7D32' : '#BDBDBD' }} />
                    <span style={{ fontSize:8, color:'#666', marginTop:2 }}>{legShort(legLabelTo(legs[legs.length - 1]))}</span>
                  </div>
                </div>
              )}

              {legs.length > 0 && (
                <div style={{ fontSize:10, color:'#999', marginTop:6 }}>
                  {legs.length} leg{legs.length !== 1 ? 's' : ''}
                  {active && active.status !== 'arrived'
                    ? ` · currently: ${legLabelFrom(active)} → ${legLabelTo(active)}`
                    : allArrived ? ' · all legs arrived' : ''}
                </div>
              )}

              {t.delivery?.riderName && (
                <div style={{ fontSize:10, color:'#666', marginTop:4 }}>🏍️ {t.delivery.riderName}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
