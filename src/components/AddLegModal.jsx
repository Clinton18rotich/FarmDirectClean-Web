// FILE: src/components/AddLegModal.jsx
// Session 4B-c — form to add a shipment leg to a trade.
// Bottom-sheet modal. Pre-fills "from" with the previous leg's arrival
// so the seller/buyer can chain hops quickly.
import React, { useState } from 'react';
import { api } from '../services/api';

const inputStyle = { width:'100%', padding:'12px 14px', borderRadius:10, border:'2px solid #E0E0E0', fontSize:14, marginBottom:8, boxSizing:'border-box', fontFamily:'inherit', color:'#333' };
const labelStyle = { fontSize:12, fontWeight:'bold', color:'#555', display:'block', marginBottom:4, marginTop:10 };
const primaryBtn = { width:'100%', padding:14, color:'white', border:'none', borderRadius:25, fontSize:15, fontWeight:'bold', cursor:'pointer', marginTop:8, boxSizing:'border-box' };
const ghostBtn = { ...primaryBtn, background:'#F0F0F0', color:'#666' };

const METHOD_ICONS = {
  self_drop: '🚶', bus_parcel: '🚌', courier: '📦', boda: '🏍️',
  tuktuk: '🛺', pickup: '🛻', rider: '🏍️', walk: '🚶', other: '📦',
};

export default function AddLegModal({ trade, config, lastLeg, byRole, onClose, onAdded }) {
  const methods = config?.methods || [];
  const couriers = config?.couriers || [];

  // Prefill "from" with previous leg's arrival
  const initialFrom = lastLeg?.to
    ? { county: lastLeg.to.county || '', ward: lastLeg.to.ward || '', area: lastLeg.to.area || '', label: lastLeg.to.label || '' }
    : { county: trade?.delivery?.pickup?.county || '', ward: trade?.delivery?.pickup?.ward || '', area: trade?.delivery?.pickup?.area || '', label: '' };

  // Prefill "to" with trade dropoff
  const initialTo = {
    county: trade?.delivery?.dropoff?.county || '',
    ward: trade?.delivery?.dropoff?.ward || '',
    area: trade?.delivery?.dropoff?.area || '',
    label: '',
  };

  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [method, setMethod] = useState(methods[0]?.id || 'bus_parcel');
  const [carrier, setCarrier] = useState('');
  const [trackingCode, setTrackingCode] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const needsCarrier = method === 'bus_parcel' || method === 'courier';
  const selectedCarrier = couriers.find(c => c.id === carrier || c.name === carrier);

  const handleSubmit = async () => {
    setError(null);
    // Light validation
    if (!from.county && !from.area && !from.label) {
      setError('Enter where this leg starts from');
      return;
    }
    if (!to.county && !to.area && !to.label) {
      setError('Enter where this leg is going');
      return;
    }
    if (!method) {
      setError('Pick a transport method');
      return;
    }
    if (needsCarrier && !carrier) {
      setError('Choose a carrier');
      return;
    }

    setLoading(true);
    try {
      const res = await api.trades.addLeg(trade.id, {
        from: {
          county: from.county.trim() || null,
          ward: from.ward.trim() || null,
          area: from.area.trim() || null,
          label: from.label.trim() || from.area.trim() || from.ward.trim() || from.county.trim() || null,
        },
        to: {
          county: to.county.trim() || null,
          ward: to.ward.trim() || null,
          area: to.area.trim() || null,
          label: to.label.trim() || to.area.trim() || to.ward.trim() || to.county.trim() || null,
        },
        method,
        carrier: needsCarrier ? carrier : null,
        trackingCode: trackingCode.trim() || null,
        notes: notes.trim() || null,
        byRole: byRole || 'seller',
      });
      if (!res.success) throw new Error(res.message || 'Failed to add leg');
      onAdded && onAdded(res.leg);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.7)', zIndex:2650, display:'flex', alignItems:'flex-end', justifyContent:'center' }}
      onClick={onClose}
    >
      <div
        style={{ background:'white', borderRadius:'20px 20px 0 0', padding:20, maxWidth:480, width:'100%', maxHeight:'92vh', overflowY:'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
          <div>
            <h3 style={{ margin:0, color:'#2E7D32', fontSize:18 }}>➕ Add shipment leg</h3>
            <p style={{ fontSize:11, color:'#666', margin:'2px 0 0' }}>Trade {trade?.id?.slice(-8)}</p>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:24, cursor:'pointer', color:'#666' }}>✕</button>
        </div>

        {error && (
          <div style={{ background:'#FFEBEE', padding:12, borderRadius:10, marginBottom:12 }}>
            <strong style={{ color:'#C62828', fontSize:12 }}>⚠️ {error}</strong>
          </div>
        )}

        <div style={{ background:'#E3F2FD', border:'1px solid #90CAF9', borderRadius:10, padding:10, marginBottom:8 }}>
          <p style={{ margin:0, fontSize:11, color:'#0D47A1', lineHeight:1.5 }}>
            💡 Add each hop of the journey — for example: farm → Nairobi booking office → Bomet stage → your address. The last leg tracks to the buyer.
          </p>
        </div>

        {/* FROM */}
        <p style={{ ...labelStyle, marginTop:14 }}>📍 From</p>
        <input value={from.county} onChange={e => setFrom({ ...from, county: e.target.value })} placeholder="County (e.g. Nakuru)" style={inputStyle} />
        <input value={from.ward} onChange={e => setFrom({ ...from, ward: e.target.value })} placeholder="Ward / sub-county (optional)" style={inputStyle} />
        <input value={from.area} onChange={e => setFrom({ ...from, area: e.target.value })} placeholder="Specific place (e.g. Nairobi Easy Coach office)" style={inputStyle} />

        {/* TO */}
        <p style={labelStyle}>📦 To</p>
        <input value={to.county} onChange={e => setTo({ ...to, county: e.target.value })} placeholder="County (e.g. Bomet)" style={inputStyle} />
        <input value={to.ward} onChange={e => setTo({ ...to, ward: e.target.value })} placeholder="Ward / sub-county (optional)" style={inputStyle} />
        <input value={to.area} onChange={e => setTo({ ...to, area: e.target.value })} placeholder="Specific place (e.g. Bomet stage)" style={inputStyle} />

        {/* METHOD */}
        <p style={labelStyle}>🚚 How is it moving?</p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:6, marginBottom:8 }}>
          {methods.map(m => {
            const active = method === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMethod(m.id)}
                style={{
                  padding:'10px 4px', borderRadius:10,
                  border: active ? '2px solid #2E7D32' : '2px solid #E0E0E0',
                  background: active ? '#E8F5E9' : 'white',
                  color: active ? '#2E7D32' : '#666',
                  fontSize:10, fontWeight:'bold', cursor:'pointer',
                  display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                }}
              >
                <span style={{ fontSize:18 }}>{METHOD_ICONS[m.id] || '📦'}</span>
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* CARRIER (conditional) */}
        {needsCarrier && (
          <>
            <p style={labelStyle}>🏢 Carrier</p>
            <select
              value={carrier}
              onChange={e => setCarrier(e.target.value)}
              style={{ ...inputStyle, background:'white' }}
            >
              <option value="">— Select —</option>
              {couriers.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            {carrier && carrier !== 'Other' && (
              <>
                <p style={labelStyle}>🎫 Tracking / parcel code (optional)</p>
                <input
                  value={trackingCode}
                  onChange={e => setTrackingCode(e.target.value)}
                  placeholder='e.g. "EC-ABC123"'
                  style={{ ...inputStyle, fontFamily:'monospace' }}
                />
              </>
            )}
          </>
        )}

        {/* NOTES */}
        <p style={labelStyle}>📝 Notes (optional)</p>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder='e.g. "Fragile — do not stack" or "Picked up at 6am"'
          rows={2}
          style={{ ...inputStyle, resize:'vertical', minHeight:60 }}
        />

        <button onClick={handleSubmit} disabled={loading} style={{ ...primaryBtn, background: loading ? '#CCC' : '#2E7D32' }}>
          {loading ? '⏳ Adding...' : '✅ Add leg'}
        </button>
        <button onClick={onClose} disabled={loading} style={ghostBtn}>Cancel</button>
      </div>
    </div>
  );
}
