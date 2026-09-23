// FILE: src/components/RiderJobPipeline.jsx
// Session 5B-9: Rider-side view of assigned jobs + delivery actions.
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

const card = { background:'white', border:'1px solid #E0E0E0', borderRadius:12, padding:14, marginBottom:10 };
const btn = { padding:'10px 12px', borderRadius:8, border:'none', fontSize:12, fontWeight:'bold', cursor:'pointer' };
const row = { display:'flex', justifyContent:'space-between', fontSize:12, padding:'5px 0' };
const sectionTitle = { fontSize:11, fontWeight:'bold', color:'#555', margin:'0 0 6px', textTransform:'uppercase', letterSpacing:0.5 };

const STATUS_META = {
  matching_rider:    { label: '⏳ Matching', bg:'#FFF8E1', fg:'#E65100' },
  rider_assigned:    { label: '🏍️ Assigned', bg:'#E3F2FD', fg:'#0D47A1' },
  awaiting_release:  { label: '📦 Delivered', bg:'#F3E5F5', fg:'#6A1B9A' },
  releasing:         { label: '🔓 Releasing', bg:'#E8F5E9', fg:'#2E7D32' },
  completed:         { label: '✅ Completed', bg:'#E8F5E9', fg:'#2E7D32' },
  failed:            { label: '❌ Failed',    bg:'#FFEBEE', fg:'#C62828' },
  no_rider_available:{ label: '❌ No rider',  bg:'#FFEBEE', fg:'#C62828' },
  disputed:          { label: '⚖️ Disputed',  bg:'#FFEBEE', fg:'#C62828' },
};

const ACTIVE_STATUSES = ['matching_rider','rider_assigned','awaiting_release','releasing'];
const DONE_STATUSES = ['completed','failed','disputed','no_rider_available'];

export default function RiderJobPipeline({ currentRider, onClose }) {
  const [tab, setTab] = useState('active');
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actingId, setActingId] = useState(null);

  const riderId = currentRider?.id || currentRider?.riderId;

  const load = async () => {
    if (!riderId) { setTrades([]); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await api.trades.riderTrades(riderId);
      if (!res.success) throw new Error(res.message || 'Failed to load jobs');
      setTrades(res.trades || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [riderId]);

  const handleAccept = async (trade) => {
    setActingId(trade.id);
    try {
      const res = await api.trades.riderAccepted(trade.id, {
        riderId,
        riderName: currentRider?.fullName || currentRider?.name,
        riderPhone: currentRider?.phone,
      });
      if (!res.success) throw new Error(res.message);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActingId(null);
    }
  };

  const handleDelivered = async (trade) => {
    if (!window.confirm('Confirm the animal has been delivered to the buyer?')) return;
    setActingId(trade.id);
    try {
      const res = await api.trades.deliveryComplete(trade.id);
      if (!res.success) throw new Error(res.message);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActingId(null);
    }
  };

  if (!riderId) {
    return <Shell onClose={onClose}><Empty icon="🏍️" title="Not registered as a rider" body="Register as a rider in the Delivery module to see job assignments here." /></Shell>;
  }

  const activeJobs = trades.filter(t => ACTIVE_STATUSES.includes(t.status));
  const doneJobs = trades.filter(t => DONE_STATUSES.includes(t.status));
  const displayJobs = tab === 'active' ? activeJobs : doneJobs;

  return (
    <Shell onClose={onClose}>
      {/* Tabs */}
      <div style={{ display:'flex', background:'#F5F5F5', borderBottom:'1px solid #E0E0E0' }}>
        <TabBtn active={tab === 'active'} onClick={() => setTab('active')} label={`Active${activeJobs.length ? ` (${activeJobs.length})` : ''}`} />
        <TabBtn active={tab === 'done'} onClick={() => setTab('done')} label={`Completed${doneJobs.length ? ` (${doneJobs.length})` : ''}`} />
      </div>

      <div style={{ padding:14 }}>
        {error && (
          <div style={{ background:'#FFEBEE', padding:12, borderRadius:10, marginBottom:12 }}>
            <strong style={{ color:'#C62828', fontSize:12 }}>⚠️ {error}</strong>
          </div>
        )}

        {loading && <Center icon="⏳" label="Loading jobs..." />}

        {!loading && displayJobs.length === 0 && (
          <Empty
            icon={tab === 'active' ? '🏍️' : '📋'}
            title={tab === 'active' ? 'No active jobs' : 'No completed jobs yet'}
            body={tab === 'active'
              ? 'When the system assigns you a livestock delivery, it will appear here. Keep your availability on and your vehicle class up to date.'
              : 'Completed, failed, and disputed jobs will be listed here.'}
          />
        )}

        {!loading && displayJobs.map(t => (
          <JobCard
            key={t.id}
            trade={t}
            riderId={riderId}
            acting={actingId === t.id}
            onAccept={() => handleAccept(t)}
            onDelivered={() => handleDelivered(t)}
          />
        ))}
      </div>
    </Shell>
  );
}

function JobCard({ trade, riderId, acting, onAccept, onDelivered }) {
  const meta = STATUS_META[trade.status] || { label: trade.status, bg:'#F0F0F0', fg:'#666' };
  const isAssignedToMe = trade.delivery?.riderId === riderId;
  const snapshot = trade.subject?.snapshot || {};
  const pickup = trade.delivery?.pickup || {};
  const dropoff = trade.delivery?.dropoff || {};
  const canAccept = trade.status === 'rider_assigned' && !isAssignedToMe;
  const canMarkDelivered = trade.status === 'rider_assigned' && isAssignedToMe;
  const awaitingRelease = trade.status === 'awaiting_release';

  return (
    <div style={card}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10, marginBottom:8 }}>
        <div style={{ minWidth:0 }}>
          <strong style={{ fontSize:13, color:'#333', fontFamily:'monospace' }}>{trade.id}</strong>
          <p style={{ fontSize:11, color:'#888', margin:'2px 0 0' }}>
            {snapshot.type || 'Livestock'}{snapshot.breed ? ` · ${snapshot.breed}` : ''}
          </p>
        </div>
        <span style={{ fontSize:10, background:meta.bg, color:meta.fg, padding:'4px 8px', borderRadius:6, fontWeight:'bold', flexShrink:0 }}>
          {meta.label}
        </span>
      </div>

      {/* Route */}
      <div style={{ background:'#F9FAFB', borderRadius:8, padding:10, marginBottom:8 }}>
        <p style={sectionTitle}>📍 Route</p>
        <div style={{ fontSize:11, color:'#333', lineHeight:1.6 }}>
          <div><strong>Pickup:</strong> {pickup.ward ? `${pickup.ward}, ` : ''}{pickup.county || '—'}</div>
          <div><strong>Dropoff:</strong> {dropoff.ward ? `${dropoff.ward}, ` : ''}{dropoff.county || '—'}</div>
        </div>
      </div>

      {/* Contacts */}
      <div style={{ marginBottom:8 }}>
        <p style={sectionTitle}>📞 Contacts</p>
        <div style={{ display:'flex', gap:6 }}>
          {trade.sellerPhone && (
            <a href={`tel:${trade.sellerPhone}`} style={{ flex:1, textAlign:'center', padding:'8px', background:'#E8F5E9', color:'#2E7D32', borderRadius:8, fontSize:11, fontWeight:'bold', textDecoration:'none' }}>
              🧑‍🌾 Seller
            </a>
          )}
          {trade.buyerPhone && (
            <a href={`tel:${trade.buyerPhone}`} style={{ flex:1, textAlign:'center', padding:'8px', background:'#E3F2FD', color:'#0D47A1', borderRadius:8, fontSize:11, fontWeight:'bold', textDecoration:'none' }}>
              👤 Buyer
            </a>
          )}
        </div>
      </div>

      {/* Money */}
      <div style={{ borderTop:'1px solid #F5F5F5', paddingTop:8, marginTop:8 }}>
        <div style={row}>
          <span style={{ color:'#666' }}>Agreed fee</span>
          <strong style={{ color:'#2E7D32' }}>
            {trade.delivery?.agreedFee != null ? `KES ${Number(trade.delivery.agreedFee).toLocaleString()}` : 'Negotiate directly'}
          </strong>
        </div>
        <div style={row}>
          <span style={{ color:'#666' }}>Payment status</span>
          <strong style={{ color: trade.delivery?.riderPayment?.paidAt ? '#2E7D32' : '#E65100' }}>
            {trade.delivery?.riderPayment?.paidAt ? `Paid (${trade.delivery.riderPayment.mpesaRef || 'confirmed'})` : 'Pending at handoff'}
          </strong>
        </div>
      </div>

      {/* Actions */}
      {canAccept && (
        <button onClick={onAccept} disabled={acting} style={{ ...btn, background:'#1976D2', color:'white', width:'100%', marginTop:10, opacity: acting ? 0.6 : 1 }}>
          {acting ? '⏳' : '✅ Accept this job'}
        </button>
      )}
      {canMarkDelivered && (
        <button onClick={onDelivered} disabled={acting} style={{ ...btn, background:'#2E7D32', color:'white', width:'100%', marginTop:10, opacity: acting ? 0.6 : 1 }}>
          {acting ? '⏳' : '📦 Mark as Delivered'}
        </button>
      )}
      {awaitingRelease && (
        <div style={{ background:'#F3E5F5', borderRadius:8, padding:10, marginTop:10, fontSize:11, color:'#6A1B9A', textAlign:'center', lineHeight:1.5 }}>
          ⏳ Waiting on the buyer to enter their release code. Payment will process automatically once confirmed.
        </div>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex:1, padding:'12px 8px', border:'none', cursor:'pointer', fontSize:12, fontWeight:'bold',
        background: active ? 'white' : 'transparent',
        color: active ? '#2E7D32' : '#666',
        borderBottom: active ? '3px solid #2E7D32' : '3px solid transparent',
      }}
    >{label}</button>
  );
}

function Shell({ children, onClose }) {
  return (
    <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'#F9FAFB', zIndex:2450, display:'flex', flexDirection:'column' }}>
      <div style={{ background:'#2E7D32', color:'white', padding:'12px 16px', display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
        <button onClick={onClose} style={{ background:'none', border:'none', color:'white', fontSize:22, cursor:'pointer', padding:0, lineHeight:1 }}>←</button>
        <strong style={{ fontSize:15 }}>🏍️ Delivery Jobs</strong>
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

function Empty({ icon, title, body }) {
  return (
    <div style={{ textAlign:'center', padding:'50px 20px', color:'#666' }}>
      <div style={{ fontSize:48, marginBottom:12 }}>{icon}</div>
      <strong style={{ fontSize:15, color:'#333', display:'block', marginBottom:8 }}>{title}</strong>
      <p style={{ fontSize:12, lineHeight:1.5, margin:0 }}>{body}</p>
    </div>
  );
}
