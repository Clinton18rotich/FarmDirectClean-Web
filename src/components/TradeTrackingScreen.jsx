// FILE: src/components/TradeTrackingScreen.jsx
// Session 5B-7: Trade lifecycle view — role-aware, timeline, release code, actions.
import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import ShipmentTracker from './ShipmentTracker';

const card = { background:'white', border:'1px solid #E0E0E0', borderRadius:12, padding:14, marginBottom:12 };
const row = { display:'flex', justifyContent:'space-between', fontSize:13, padding:'6px 0' };
const primaryBtn = { width:'100%', padding:14, color:'white', border:'none', borderRadius:25, fontSize:15, fontWeight:'bold', cursor:'pointer', marginTop:8, boxSizing:'border-box' };
const sectionTitle = { fontSize:12, fontWeight:'bold', color:'#555', margin:'0 0 10px', textTransform:'uppercase', letterSpacing:0.5 };

const POLL_INTERVAL_MS = 8000;

// Timeline stages in order. Terminal states beyond these.
const STAGES = [
  { key: 'funded',           label: 'Escrow funded',            statuses: ['matching_rider','rider_assigned','awaiting_release','releasing','completed'] },
  { key: 'rider_matched',    label: 'Rider assigned',           statuses: ['rider_assigned','awaiting_release','releasing','completed'] },
  { key: 'in_transit',       label: 'In transit',               statuses: ['awaiting_release','releasing','completed'] },
  { key: 'delivered',        label: 'Delivered',                statuses: ['releasing','completed'] },
  { key: 'completed',        label: 'Payment released',         statuses: ['completed'] },
];

const TERMINAL_FAIL = ['failed','cancelled','no_rider_available'];

export default function TradeTrackingScreen({ tradeId, currentFarmer, onClose, onOpenReleaseModal, onOpenCheckout }) {
  const [trade, setTrade] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [acting, setActing] = useState(false);
  const pollRef = useRef(null);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.trades.get(tradeId);
      if (!res.success) throw new Error(res.message || 'Failed to load trade');
      setTrade(res.trade);
      setError(null);
    } catch (err) {
      if (!silent) setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    load();
    pollRef.current = setInterval(() => load(true), POLL_INTERVAL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [tradeId]);

  const handleDispute = async () => {
    const reason = window.prompt('Reason for dispute:');
    if (!reason) return;
    setActing(true);
    try {
      const res = await api.trades.dispute(trade.id, { by: currentFarmer.id, reason });
      if (!res.success) throw new Error(res.message);
      await load(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setActing(false);
    }
  };

  if (loading && !trade) {
    return <Shell onClose={onClose}><Center icon="⏳" label="Loading trade..." /></Shell>;
  }

  if (error && !trade) {
    return (
      <Shell onClose={onClose}>
        <div style={{ background:'#FFEBEE', padding:16, borderRadius:12, margin:16 }}>
          <strong style={{ color:'#C62828', fontSize:13 }}>⚠️ {error}</strong>
          <button onClick={() => load()} style={{ ...primaryBtn, background:'#C62828', marginTop:12 }}>Try again</button>
        </div>
      </Shell>
    );
  }

  if (!trade) return null;

  const isBuyer = trade.buyerId === currentFarmer?.id;
  const isSeller = trade.sellerId === currentFarmer?.id;
  const role = isBuyer ? 'Buyer' : isSeller ? 'Seller' : 'Observer';
  const roleColor = isBuyer ? '#1976D2' : isSeller ? '#2E7D32' : '#666';

  const isTerminal = trade.status === 'completed' || TERMINAL_FAIL.includes(trade.status);
  const isDisputed = trade.status === 'disputed';
  const canDispute = !isTerminal && !isDisputed && (isBuyer || isSeller);
  const canRelease = isBuyer && (trade.status === 'awaiting_release' || trade.status === 'releasing');
  const canFund = isBuyer && (trade.status === 'awaiting_funding' || trade.status === 'escrow_pending');
  const canSeeCode = isBuyer && (trade.status === 'awaiting_release' || trade.status === 'releasing' || trade.status === 'completed');

  return (
    <Shell onClose={onClose}>
      <div style={{ padding:14 }}>

        {/* Header card */}
        <div style={{ ...card, background: roleColor === '#2E7D32' ? '#F1F8E9' : roleColor === '#1976D2' ? '#E3F2FD' : '#F5F5F5' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
            <span style={{ fontSize:11, fontWeight:'bold', color:roleColor, textTransform:'uppercase', letterSpacing:0.5 }}>
              You are the {role}
            </span>
            <span style={{ fontSize:10, background:roleColor, color:'white', padding:'4px 8px', borderRadius:6, fontWeight:'bold' }}>
              {trade.status.replace(/_/g, ' ')}
            </span>
          </div>
          <p style={{ margin:'6px 0 0', fontSize:11, color:'#666', fontFamily:'monospace' }}>{trade.id}</p>
        </div>

        {/* Dispute banner */}
        {isDisputed && (
          <div style={{ background:'#C62828', color:'white', padding:14, borderRadius:12, marginBottom:12, textAlign:'center' }}>
            <strong>⚖️ Trade Disputed</strong>
            <p style={{ margin:'4px 0 0', fontSize:11 }}>{trade.dispute?.reason || 'Under review'}</p>
          </div>
        )}

        {/* Terminal fail banner */}
        {TERMINAL_FAIL.includes(trade.status) && (
          <div style={{ background:'#FFEBEE', border:'1px solid #EF9A9A', color:'#C62828', padding:14, borderRadius:12, marginBottom:12, textAlign:'center' }}>
            <strong>⚠️ Trade {trade.status.replace(/_/g, ' ')}</strong>
          </div>
        )}

        {/* The animal summary */}
        {trade.subject?.snapshot && (
          <div style={card}>
            <p style={sectionTitle}>🐄 Animal</p>
            <div style={row}><span style={{ color:'#666' }}>Passport</span><strong style={{ fontFamily:'monospace', fontSize:11 }}>{trade.subject.snapshot.passportId || trade.subject.referenceId}</strong></div>
            <div style={row}><span style={{ color:'#666' }}>Type</span><strong>{trade.subject.snapshot.type} {trade.subject.snapshot.breed || ''}</strong></div>
            <div style={row}><span style={{ color:'#666' }}>Price</span><strong style={{ color:'#2E7D32' }}>KES {Number(trade.escrowAmount || 0).toLocaleString()}</strong></div>
          </div>
        )}

        {/* Timeline — macro lifecycle */}
        <div style={card}>
          <p style={sectionTitle}>📊 Progress</p>
          <Timeline trade={trade} />
        </div>

        {/* Session 4B: multi-leg shipment tracker — micro journey */}
        <ShipmentTracker
          trade={trade}
          currentUser={currentFarmer}
          onLegsChanged={() => load(true)}
        />

        {/* Release code — buyer only */}
        {canSeeCode && trade.releaseCode && (
          <div style={{ ...card, background:'#FFF8E1', border:'2px solid #FFD54F' }}>
            <p style={{ ...sectionTitle, color:'#E65100' }}>🔐 Your Release Code</p>
            <div style={{ textAlign:'center', padding:'10px 0' }}>
              <p style={{ fontSize:40, fontFamily:'monospace', fontWeight:'bold', letterSpacing:8, color:'#E65100', margin:0 }}>
                {trade.releaseCode}
              </p>
            </div>
            <p style={{ fontSize:11, color:'#BF360C', margin:'10px 0 0', lineHeight:1.5, textAlign:'center' }}>
              Enter this code in the app after you physically receive the animal. <strong>Do NOT share it with the seller or rider</strong> — sharing the code releases the money immediately.
            </p>
          </div>
        )}

        {/* Rider panel */}
        {trade.delivery?.riderId && (
          <div style={card}>
            <p style={sectionTitle}>🏍️ Delivery Rider</p>
            <div style={row}><span style={{ color:'#666' }}>Name</span><strong>{trade.delivery.riderName || '—'}</strong></div>
            {trade.delivery.riderPhone && isBuyer && (
              <a href={`tel:${trade.delivery.riderPhone}`} style={{ display:'inline-block', marginTop:6, padding:'8px 14px', background:'#2E7D32', color:'white', borderRadius:8, fontSize:12, fontWeight:'bold', textDecoration:'none' }}>
                📞 Call {trade.delivery.riderPhone}
              </a>
            )}
            {trade.delivery.agreedFee != null && (
              <div style={row}><span style={{ color:'#666' }}>Agreed fee</span><strong>KES {Number(trade.delivery.agreedFee).toLocaleString()}</strong></div>
            )}
            <div style={row}>
              <span style={{ color:'#666' }}>Rider paid</span>
              <strong style={{ color: trade.delivery.riderPayment?.paidAt ? '#2E7D32' : '#E65100' }}>
                {trade.delivery.riderPayment?.paidAt ? 'Yes' : 'Pending'}
              </strong>
            </div>
          </div>
        )}

        {/* Actions */}
        {canFund && (
          <button onClick={() => onOpenCheckout && onOpenCheckout(trade)} style={{ ...primaryBtn, background:'#2E7D32' }}>
            💰 Fund Escrow — KES {Number(trade.escrowAmount || 0).toLocaleString()}
          </button>
        )}

        {canRelease && (
          <button onClick={() => onOpenReleaseModal && onOpenReleaseModal(trade)} style={{ ...primaryBtn, background:'#E65100' }}>
            🔓 Enter Release Code & Complete
          </button>
        )}

        {canDispute && (
          <button onClick={handleDispute} disabled={acting} style={{ ...primaryBtn, background:'#FFEBEE', color:'#C62828', border:'1px solid #EF9A9A' }}>
            {acting ? '⏳' : '⚖️ Report a Dispute'}
          </button>
        )}

        {/* History accordion */}
        <div style={{ ...card, padding:0 }}>
          <button
            onClick={() => setShowHistory(!showHistory)}
            style={{ width:'100%', padding:14, background:'none', border:'none', textAlign:'left', fontSize:12, fontWeight:'bold', color:'#555', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' }}
          >
            <span>📜 Trade History ({trade.history?.length || 0})</span>
            <span>{showHistory ? '▲' : '▼'}</span>
          </button>
          {showHistory && (
            <div style={{ padding:'0 14px 14px', borderTop:'1px solid #F0F0F0' }}>
              {(trade.history || []).slice().reverse().map((h, i) => (
                <div key={i} style={{ padding:'8px 0', borderBottom: i < (trade.history.length - 1) ? '1px solid #F5F5F5' : 'none', fontSize:11 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                    <strong style={{ color:'#333' }}>{h.event.replace(/_/g, ' ')}</strong>
                    <span style={{ color:'#999' }}>{h.at ? new Date(h.at).toLocaleString() : ''}</span>
                  </div>
                  {h.note && <p style={{ margin:0, color:'#666', lineHeight:1.5 }}>{h.note}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        <button onClick={onClose} style={{ ...primaryBtn, background:'#F0F0F0', color:'#666' }}>
          ← Back
        </button>
      </div>
    </Shell>
  );
}

function Timeline({ trade }) {
  const status = trade.status;
  // Take the LAST matching stage — terminal statuses like 'completed' appear
  // in every stage's status list, so we walk backwards to find the furthest one.
  let currentStageIdx = -1;
  for (let i = STAGES.length - 1; i >= 0; i--) {
    if (STAGES[i].statuses.includes(status)) { currentStageIdx = i; break; }
  }

  return (
    <div>
      {STAGES.map((stage, i) => {
        const isPast = currentStageIdx >= 0 && i < currentStageIdx;
        const isCurrent = i === currentStageIdx;
        const color = isPast ? '#2E7D32' : isCurrent ? '#1976D2' : '#CCC';
        const bg = isPast ? '#E8F5E9' : isCurrent ? '#E3F2FD' : '#FAFAFA';
        const borderColor = isPast ? '#A5D6A7' : isCurrent ? '#90CAF9' : '#EEE';

        return (
          <div key={stage.key} style={{ display:'flex', gap:12, marginBottom:8 }}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
              <div style={{ width:28, height:28, borderRadius:'50%', background:bg, border:`2px solid ${borderColor}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:'bold', color }}>
                {isPast ? '✓' : isCurrent ? '●' : (i + 1)}
              </div>
              {i < STAGES.length - 1 && (
                <div style={{ width:2, flex:1, background: isPast ? '#A5D6A7' : '#EEE', marginTop:2 }} />
              )}
            </div>
            <div style={{ paddingTop:4, flex:1 }}>
              <strong style={{ fontSize:13, color: isPast ? '#2E7D32' : isCurrent ? '#1976D2' : '#999' }}>
                {stage.label}
              </strong>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Shell({ children, onClose }) {
  return (
    <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'#F9FAFB', zIndex:2450, display:'flex', flexDirection:'column' }}>
      <div style={{ background:'#2E7D32', color:'white', padding:'12px 16px', display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
        <button onClick={onClose} style={{ background:'none', border:'none', color:'white', fontSize:22, cursor:'pointer', padding:0, lineHeight:1 }}>←</button>
        <strong style={{ fontSize:15 }}>Trade Tracking</strong>
      </div>
      <div style={{ flex:1, overflowY:'auto' }}>{children}</div>
    </div>
  );
}

function Center({ icon, label }) {
  return (
    <div style={{ textAlign:'center', padding:60 }}>
      <div style={{ fontSize:32 }}>{icon}</div>
      <p style={{ fontSize:12, color:'#666', marginTop:8 }}>{label}</p>
    </div>
  );
}
