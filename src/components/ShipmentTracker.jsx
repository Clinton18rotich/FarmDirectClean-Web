// FILE: src/components/ShipmentTracker.jsx
// Session 4B-c — multi-leg shipment timeline for a trade.
// Renders the full delivery chain with per-leg status, carrier info,
// and inline actions for the active leg.
import React, { useState } from 'react';
import { api } from '../services/api';
import AddLegModal from './AddLegModal';

const card = { background:'white', border:'1px solid #E0E0E0', borderRadius:12, padding:14, marginBottom:12 };
const sectionTitle = { fontSize:12, fontWeight:'bold', color:'#555', margin:'0 0 10px', textTransform:'uppercase', letterSpacing:0.5 };
const btnSm = { padding:'8px 12px', borderRadius:8, border:'none', fontSize:11, fontWeight:'bold', cursor:'pointer' };

const STATUS_META = {
  pending:    { icon:'○', label:'Pending',    bg:'#F5F5F5', fg:'#666' },
  in_transit: { icon:'●', label:'In transit', bg:'#E3F2FD', fg:'#0D47A1' },
  arrived:    { icon:'✓', label:'Arrived',    bg:'#E8F5E9', fg:'#2E7D32' },
  failed:     { icon:'✗', label:'Failed',     bg:'#FFEBEE', fg:'#C62828' },
};

const METHOD_ICONS = {
  self_drop: '🚶', bus_parcel: '🚌', courier: '📦', boda: '🏍️',
  tuktuk: '🛺', pickup: '🛻', rider: '🏍️', walk: '🚶', other: '📦',
};

const OVERALL_META = {
  pending:      { label:'Not started', bg:'#F5F5F5', fg:'#666' },
  in_transit:   { label:'In transit',  bg:'#E3F2FD', fg:'#0D47A1' },
  partial:      { label:'Partly moved', bg:'#FFF8E1', fg:'#E65100' },
  delivered:    { label:'Delivered',   bg:'#E8F5E9', fg:'#2E7D32' },
  has_failure:  { label:'Issue',       bg:'#FFEBEE', fg:'#C62828' },
};

export default function ShipmentTracker({ trade, currentUser, onLegsChanged }) {
  const [legs, setLegs] = useState(null);   // null = not yet loaded
  const [currentLegIndex, setCurrentLegIndex] = useState(-1);
  const [overallStatus, setOverallStatus] = useState('pending');
  const [config, setConfig] = useState({ methods: [], couriers: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddLeg, setShowAddLeg] = useState(false);
  const [actingId, setActingId] = useState(null);

  // Determine the caller's role in the trade
  const myRole = (() => {
    if (!currentUser?.id) return null;
    if (currentUser.id === trade.buyerId) return 'buyer';
    if (currentUser.id === trade.sellerId) return 'seller';
    if (trade.delivery?.riderId && currentUser.id === trade.delivery.riderId) return 'rider';
    return null;
  })();
  const canEdit = !!myRole;
  const isFunded = !['awaiting_funding', 'escrow_pending', 'failed', 'cancelled'].includes(trade.status);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.trades.getLegs(trade.id);
      if (!res.success) throw new Error(res.message || 'Failed to load legs');
      setLegs(res.legs || []);
      setCurrentLegIndex(res.currentLegIndex != null ? res.currentLegIndex : -1);
      setOverallStatus(res.overallStatus || 'pending');
      setConfig(res.config || { methods: [], couriers: [] });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { load(); }, [trade.id]);

  const updateLeg = async (legId, status, notes) => {
    setActingId(legId);
    try {
      const res = await api.trades.updateLeg(trade.id, legId, { status, notes, byRole: myRole });
      if (!res.success) throw new Error(res.message);
      await load();
      if (onLegsChanged) onLegsChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setActingId(null);
    }
  };

  const removeLeg = async (legId) => {
    if (!window.confirm('Remove this leg?')) return;
    setActingId(legId);
    try {
      const res = await api.trades.removeLeg(trade.id, legId, myRole);
      if (!res.success) throw new Error(res.message);
      await load();
      if (onLegsChanged) onLegsChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setActingId(null);
    }
  };

  if (loading) {
    return (
      <div style={card}>
        <p style={sectionTitle}>🚚 Shipment</p>
        <p style={{ fontSize:12, color:'#666', textAlign:'center', padding:20 }}>Loading shipment...</p>
      </div>
    );
  }

  if (error && !legs) {
    return (
      <div style={card}>
        <p style={sectionTitle}>🚚 Shipment</p>
        <div style={{ background:'#FFEBEE', padding:12, borderRadius:8 }}>
          <strong style={{ color:'#C62828', fontSize:12 }}>⚠️ {error}</strong>
          <button onClick={load} style={{ ...btnSm, background:'#C62828', color:'white', marginTop:8, display:'block' }}>Try again</button>
        </div>
      </div>
    );
  }

  const overall = OVERALL_META[overallStatus] || OVERALL_META.pending;

  return (
    <>
      <div style={card}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
          <p style={{ ...sectionTitle, margin:0 }}>🚚 Shipment ({legs?.length || 0} leg{legs?.length === 1 ? '' : 's'})</p>
          <span style={{ fontSize:10, background:overall.bg, color:overall.fg, padding:'3px 8px', borderRadius:6, fontWeight:'bold' }}>
            {overall.label}
          </span>
        </div>

        {error && (
          <div style={{ background:'#FFEBEE', padding:10, borderRadius:8, marginBottom:10 }}>
            <strong style={{ color:'#C62828', fontSize:11 }}>⚠️ {error}</strong>
          </div>
        )}

        {(!legs || legs.length === 0) && (
          <div style={{ textAlign:'center', padding:'30px 20px', color:'#666' }}>
            <div style={{ fontSize:36, marginBottom:8 }}>📦</div>
            <p style={{ fontSize:12, margin:0, lineHeight:1.5 }}>
              No legs yet. Add the first hop — where does the animal leave from, and where is it going next?
            </p>
          </div>
        )}

        {legs && legs.length > 0 && (
          <div>
            {legs.map((leg, i) => (
              <LegRow
                key={leg.id}
                leg={leg}
                index={i}
                isLast={i === legs.length - 1}
                isActive={i === currentLegIndex}
                canEdit={canEdit}
                myRole={myRole}
                acting={actingId === leg.id}
                onUpdate={(status, notes) => updateLeg(leg.id, status, notes)}
                onRemove={() => removeLeg(leg.id)}
              />
            ))}
          </div>
        )}

        {canEdit && isFunded && (
          <button
            onClick={() => setShowAddLeg(true)}
            style={{ ...btnSm, background:'#E3F2FD', color:'#0D47A1', border:'1px solid #90CAF9', width:'100%', padding:12, marginTop:8 }}
          >
            ➕ Add a leg
          </button>
        )}
        {canEdit && !isFunded && (
          <p style={{ fontSize:10, color:'#999', textAlign:'center', marginTop:8, fontStyle:'italic' }}>
            Shipment tracking unlocks once escrow is funded.
          </p>
        )}
      </div>

      {showAddLeg && (
        <AddLegModal
          trade={trade}
          config={config}
          lastLeg={legs && legs.length > 0 ? legs[legs.length - 1] : null}
          byRole={myRole}
          onClose={() => setShowAddLeg(false)}
          onAdded={async () => { setShowAddLeg(false); await load(); if (onLegsChanged) onLegsChanged(); }}
        />
      )}
    </>
  );
}

function LegRow({ leg, index, isLast, isActive, canEdit, myRole, acting, onUpdate, onRemove }) {
  const meta = STATUS_META[leg.status] || STATUS_META.pending;
  const methodIcon = METHOD_ICONS[leg.method] || '📦';
  const canAdvance = canEdit && (leg.status === 'pending' || leg.status === 'in_transit');
  const canRemove = canEdit && leg.status === 'pending' && leg.addedBy === myRole;

  return (
    <div style={{ display:'flex', gap:10, marginBottom:6 }}>
      {/* Timeline rail */}
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0, paddingTop:2 }}>
        <div style={{
          width:26, height:26, borderRadius:'50%',
          background:meta.bg, color:meta.fg,
          border: `2px solid ${leg.status === 'in_transit' ? '#1976D2' : (leg.status === 'arrived' ? '#2E7D32' : (leg.status === 'failed' ? '#C62828' : '#CCC'))}`,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:13, fontWeight:'bold',
        }}>
          {meta.icon}
        </div>
        {!isLast && <div style={{ width:2, flex:1, background:'#E0E0E0', marginTop:2, minHeight:20 }} />}
      </div>

      {/* Content */}
      <div style={{
        flex:1, minWidth:0, paddingBottom:10,
        background: isActive ? '#F0F7FF' : 'transparent',
        borderRadius: isActive ? 8 : 0,
        padding: isActive ? '8px 10px' : '2px 0 12px 0',
      }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8, marginBottom:3 }}>
          <div style={{ minWidth:0, flex:1 }}>
            <strong style={{ fontSize:12, color:'#333' }}>
              {leg.from?.label || '—'} → {leg.to?.label || '—'}
            </strong>
          </div>
          {isActive && leg.status !== 'arrived' && leg.status !== 'failed' && (
            <span style={{ fontSize:9, background:'#1976D2', color:'white', padding:'2px 6px', borderRadius:4, fontWeight:'bold', flexShrink:0 }}>
              CURRENT
            </span>
          )}
        </div>
        <p style={{ fontSize:10, color:'#666', margin:'2px 0', display:'flex', gap:6, flexWrap:'wrap' }}>
          <span>{methodIcon} {leg.method?.replace('_', ' ')}</span>
          {leg.carrier && <span>· {leg.carrier}</span>}
          {leg.trackingCode && <span>· <code style={{fontFamily:'monospace', fontSize:9}}>{leg.trackingCode}</code></span>}
        </p>

        {/* Timestamps */}
        <p style={{ fontSize:10, color:'#888', margin:'2px 0' }}>
          {leg.departedAt && <span>Departed {new Date(leg.departedAt).toLocaleString('en-KE', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'})}</span>}
          {leg.departedAt && leg.arrivedAt && ' · '}
          {leg.arrivedAt && <span>Arrived {new Date(leg.arrivedAt).toLocaleString('en-KE', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'})}</span>}
        </p>

        {leg.notes && (
          <p style={{ fontSize:10, color:'#666', margin:'4px 0 0', fontStyle:'italic' }}>
            "{leg.notes}"
          </p>
        )}

        {/* Actions */}
        {canAdvance && (
          <div style={{ display:'flex', gap:6, marginTop:6, flexWrap:'wrap' }}>
            {leg.status === 'pending' && (
              <button
                onClick={() => onUpdate('in_transit')}
                disabled={acting}
                style={{ ...btnSm, background:'#1976D2', color:'white', opacity: acting ? 0.6 : 1 }}
              >
                {acting ? '⏳' : '▶️ Mark departed'}
              </button>
            )}
            {leg.status === 'in_transit' && (
              <>
                <button
                  onClick={() => onUpdate('arrived')}
                  disabled={acting}
                  style={{ ...btnSm, background:'#2E7D32', color:'white', opacity: acting ? 0.6 : 1 }}
                >
                  {acting ? '⏳' : '✓ Mark arrived'}
                </button>
                <button
                  onClick={() => {
                    const reason = window.prompt('What went wrong?');
                    if (reason) onUpdate('failed', reason);
                  }}
                  disabled={acting}
                  style={{ ...btnSm, background:'#FFEBEE', color:'#C62828', border:'1px solid #EF9A9A', opacity: acting ? 0.6 : 1 }}
                >
                  ⚠️ Report issue
                </button>
              </>
            )}
            {canRemove && (
              <button
                onClick={onRemove}
                disabled={acting}
                style={{ ...btnSm, background:'transparent', color:'#666', opacity: acting ? 0.6 : 1 }}
              >
                Remove
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
