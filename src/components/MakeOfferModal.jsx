// FILE: src/components/MakeOfferModal.jsx
// Session 5B-4: Buyer makes an offer on an unlocked listing.
import React, { useState } from 'react';
import { api } from '../services/api';

const inputStyle = { width:'100%', padding:'12px 14px', borderRadius:10, border:'2px solid #E0E0E0', fontSize:15, marginBottom:8, boxSizing:'border-box', fontFamily:'inherit', color:'#333' };
const labelStyle = { fontSize:12, fontWeight:'bold', color:'#555', display:'block', marginBottom:4, marginTop:10 };
const primaryBtn = { width:'100%', padding:14, color:'white', border:'none', borderRadius:25, fontSize:15, fontWeight:'bold', cursor:'pointer', marginTop:8, boxSizing:'border-box' };

export default function MakeOfferModal({ listing, currentFarmer, onClose, onSuccess }) {
  const asking = Number(listing?.askingPrice || 0);
  const [amount, setAmount] = useState(asking ? String(asking) : '');
  const [note, setNote] = useState('');
  const [phone, setPhone] = useState(currentFarmer?.phone || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const [createdOffer, setCreatedOffer] = useState(null);

  const numericAmount = Number(String(amount).replace(/\D/g, '')) || 0;
  const percentOff = asking > 0 && numericAmount > 0
    ? Math.round(((asking - numericAmount) / asking) * 100)
    : 0;

  const applyDiscount = (pct) => {
    if (!asking) return;
    const next = Math.round(asking * (1 - pct / 100));
    setAmount(String(next));
  };

  const handleSubmit = async () => {
    setError(null);
    if (!numericAmount || numericAmount <= 0) { setError('Enter a valid amount'); return; }
    if (!currentFarmer?.id) { setError('You must be registered as a farmer first'); return; }

    setLoading(true);
    try {
      const res = await api.market.createOffer({
        listingId: listing.id,
        buyerId: currentFarmer.id,
        buyerName: currentFarmer.fullName || 'Buyer',
        buyerPhone: (phone || '').trim() || undefined,
        amount: numericAmount,
      });
      if (!res.success) throw new Error(res.message || 'Failed to submit offer');
      setCreatedOffer(res.offer);
      setDone(true);
      setTimeout(() => { onSuccess && onSuccess(res.offer); onClose(); }, 1800);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.7)', zIndex:2600, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
        <div style={{ background:'white', borderRadius:16, padding:30, maxWidth:360, width:'100%', textAlign:'center' }}>
          <div style={{ fontSize:56, marginBottom:10 }}>📨</div>
          <h3 style={{ margin:'0 0 8px', color:'#2E7D32' }}>Offer Sent</h3>
          <p style={{ fontSize:13, color:'#666', margin:0, lineHeight:1.5 }}>
            Your offer of <strong>KES {numericAmount.toLocaleString()}</strong> has been sent to the seller.
          </p>
          <p style={{ fontSize:11, color:'#999', margin:'12px 0 0' }}>
            Track it in <strong>My Offers</strong>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.7)', zIndex:2600, display:'flex', alignItems:'flex-end', justifyContent:'center' }}
      onClick={onClose}
    >
      <div
        style={{ background:'white', borderRadius:'20px 20px 0 0', padding:20, maxWidth:480, width:'100%', maxHeight:'92vh', overflowY:'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <div>
            <h3 style={{ margin:0, color:'#2E7D32', fontSize:18 }}>📨 Make an Offer</h3>
            <p style={{ fontSize:11, color:'#666', margin:'2px 0 0' }}>
              {listing?.type}{listing?.breed ? ` · ${listing.breed}` : ''} · {listing?.passportId}
            </p>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:24, cursor:'pointer', color:'#666' }}>✕</button>
        </div>

        {error && (
          <div style={{ background:'#FFEBEE', padding:12, borderRadius:10, marginBottom:12 }}>
            <strong style={{ color:'#C62828', fontSize:12 }}>⚠️ {error}</strong>
          </div>
        )}

        {/* Asking price reminder */}
        <div style={{ background:'#F1F8E9', border:'1px solid #A5D6A7', borderRadius:10, padding:12, marginBottom:14, textAlign:'center' }}>
          <p style={{ margin:0, fontSize:11, color:'#2E7D32', fontWeight:'bold', textTransform:'uppercase', letterSpacing:0.5 }}>Seller's asking price</p>
          <p style={{ margin:'4px 0 0', fontSize:20, fontWeight:'bold', color:'#2E7D32' }}>
            KES {asking.toLocaleString()}
          </p>
          {listing?.negotiable && (
            <p style={{ margin:'4px 0 0', fontSize:10, color:'#666' }}>Seller is open to offers</p>
          )}
        </div>

        <label style={labelStyle}>Your offer (KES) *</label>
        <input
          value={amount}
          onChange={e => setAmount(e.target.value.replace(/[^\d]/g, ''))}
          placeholder="45000"
          inputMode="numeric"
          style={{ ...inputStyle, fontSize:20, fontWeight:'bold', textAlign:'center' }}
        />
        {numericAmount > 0 && asking > 0 && (
          <p style={{ fontSize:11, color: percentOff > 0 ? '#E65100' : '#2E7D32', margin:'-2px 0 4px', textAlign:'center', fontWeight:'bold' }}>
            {percentOff > 0 ? `${percentOff}% below asking` : percentOff < 0 ? `${Math.abs(percentOff)}% above asking` : 'Matches asking price'}
          </p>
        )}

        {asking > 0 && (
          <div style={{ display:'flex', gap:6, marginTop:6 }}>
            <button type="button" onClick={() => applyDiscount(5)} style={{ flex:1, padding:'8px', background:'white', border:'1px solid #CCC', borderRadius:8, fontSize:11, fontWeight:'bold', color:'#333', cursor:'pointer' }}>−5%</button>
            <button type="button" onClick={() => applyDiscount(10)} style={{ flex:1, padding:'8px', background:'white', border:'1px solid #CCC', borderRadius:8, fontSize:11, fontWeight:'bold', color:'#333', cursor:'pointer' }}>−10%</button>
            <button type="button" onClick={() => setAmount(String(asking))} style={{ flex:1, padding:'8px', background:'#E8F5E9', border:'1px solid #A5D6A7', borderRadius:8, fontSize:11, fontWeight:'bold', color:'#2E7D32', cursor:'pointer' }}>Asking</button>
          </div>
        )}

        <label style={labelStyle}>Your contact phone (optional)</label>
        <input
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="07XX XXX XXX"
          type="tel"
          style={inputStyle}
        />

        <label style={labelStyle}>Note to seller (optional)</label>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder='e.g. "Cash ready, can collect this weekend"'
          rows={2}
          style={{ ...inputStyle, resize:'vertical', minHeight:60 }}
        />

        <div style={{ background:'#E3F2FD', border:'1px solid #90CAF9', borderRadius:10, padding:12, marginTop:12 }}>
          <p style={{ margin:0, fontSize:11, color:'#0D47A1', lineHeight:1.5 }}>
            ℹ️ The seller can <strong>accept</strong>, <strong>counter</strong>, or <strong>reject</strong> your offer. You'll be notified in <strong>My Offers</strong>.
          </p>
        </div>

        <button onClick={handleSubmit} disabled={loading || !numericAmount} style={{ ...primaryBtn, background: (loading || !numericAmount) ? '#CCC' : '#2E7D32' }}>
          {loading ? '⏳ Sending...' : `📨 Send Offer — KES ${numericAmount.toLocaleString()}`}
        </button>
        <button onClick={onClose} disabled={loading} style={{ ...primaryBtn, background:'#F0F0F0', color:'#666' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}
