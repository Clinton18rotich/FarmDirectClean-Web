// FILE: src/components/AuthSheet.jsx
// Session 6.20 — unified auth entry.
// Tabs: Sign In (existing account) | Create Account (new)
// Both start with phone. Google OAuth will be added in 6.20g.
import React, { useState } from 'react';
import { api } from '../services/api';

const inputStyle = {
  width:'100%', padding:'14px 16px', borderRadius:10, border:'2px solid #E0E0E0',
  fontSize:17, marginBottom:8, boxSizing:'border-box', fontFamily:'monospace',
  textAlign:'center', letterSpacing:1, color:'#333'
};
const primaryBtn = {
  width:'100%', padding:15, color:'white', border:'none', borderRadius:25,
  fontSize:15, fontWeight:'bold', cursor:'pointer', marginTop:8, boxSizing:'border-box'
};
const ghostBtn = { ...primaryBtn, background:'#F0F0F0', color:'#666' };

const BUYER_TYPES = [
  { id: 'individual',  label: 'Individual',   icon: '👤' },
  { id: 'hotel',       label: 'Hotel',        icon: '🏨' },
  { id: 'restaurant',  label: 'Restaurant',   icon: '🍽️' },
  { id: 'butchery',    label: 'Butchery',     icon: '🥩' },
  { id: 'trader',      label: 'Trader / Broker', icon: '🚚' },
  { id: 'other',       label: 'Other',        icon: '📋' },
];

export default function AuthSheet({ initialTab = 'signin', onClose, onRestore, onCreateFarmer, onCreateBuyer }) {
  const [tab, setTab] = useState(initialTab);  // 'signin' | 'create'
  const [step, setStep] = useState('phone');    // phone | role | buyer-form
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);

  // Buyer form fields
  const [buyerForm, setBuyerForm] = useState({
    fullName: '',
    buyerType: 'individual',
    businessName: '',
    deliveryCounty: '',
    deliveryArea: '',
    deliveryNotes: '',
  });

  const validatePhone = () => {
    const digits = phone.replace(/\D/g, '');
    if (!digits) return 'Enter your phone number';
    if (digits.length < 9) return 'Enter a valid Kenyan phone number';
    return null;
  };

  const doSignIn = async () => {
    const err = validatePhone();
    if (err) { setError(err); return; }
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const res = await api.auth.restore(phone.trim());
      if (!res.success) throw new Error(res.message || 'Lookup failed');
      if (!res.found) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      onRestore && onRestore(res);
      onClose && onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const goToRolePicker = () => {
    const err = validatePhone();
    if (err) { setError(err); return; }
    setError(null);
    setStep('role');
  };

  const pickRole = (role) => {
    if (role === 'farmer') {
      onCreateFarmer && onCreateFarmer(phone.trim());
      onClose && onClose();
    } else if (role === 'buyer') {
      setStep('buyer-form');
    }
  };

  const submitBuyer = async () => {
    setError(null);
    if (!buyerForm.fullName.trim()) { setError('Your name is required'); return; }
    if (!buyerForm.deliveryCounty.trim()) { setError('Delivery county is required'); return; }
    setLoading(true);
    try {
      const res = await api.auth.registerBuyer({
        phone: phone.trim(),
        ...buyerForm,
      });
      if (!res.success) throw new Error(res.message || 'Registration failed');
      // Auto sign-in after registration
      const restore = await api.auth.restore(phone.trim());
      if (restore.success && restore.found) {
        onRestore && onRestore(restore);
      }
      onClose && onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.7)', zIndex:2700, display:'flex', alignItems:'flex-end', justifyContent:'center' }}
      onClick={onClose}
    >
      <div
        style={{ background:'white', borderRadius:'20px 20px 0 0', padding:20, maxWidth:480, width:'100%', maxHeight:'92vh', overflowY:'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
          <div>
            <h3 style={{ margin:0, color:'#2E7D32', fontSize:19 }}>
              {step === 'buyer-form' ? '🛒 Buyer Registration' :
               step === 'role' ? '✨ What brings you here?' :
               tab === 'signin' ? '🔑 Welcome back' : '✨ Create account'}
            </h3>
            <p style={{ fontSize:11, color:'#666', margin:'2px 0 0' }}>
              {step === 'buyer-form' ? `Free · ${phone}` :
               step === 'role' ? 'Pick one to get started' :
               tab === 'signin' ? 'Sign in with your phone number' :
               'New to FarmDirect? Enter your phone to begin'}
            </p>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:24, cursor:'pointer', color:'#666' }}>✕</button>
        </div>

        {/* Tabs (only in phone step) */}
        {step === 'phone' && (
          <div style={{ display:'flex', gap:0, background:'#F5F5F5', borderRadius:12, padding:4, marginBottom:14 }}>
            <button
              onClick={() => { setTab('signin'); setError(null); setNotFound(false); }}
              style={{
                flex:1, padding:'10px', border:'none', borderRadius:9,
                background: tab === 'signin' ? 'white' : 'transparent',
                color: tab === 'signin' ? '#2E7D32' : '#666',
                fontSize:13, fontWeight:'bold', cursor:'pointer',
                boxShadow: tab === 'signin' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}
            >🔑 Sign In</button>
            <button
              onClick={() => { setTab('create'); setError(null); setNotFound(false); }}
              style={{
                flex:1, padding:'10px', border:'none', borderRadius:9,
                background: tab === 'create' ? 'white' : 'transparent',
                color: tab === 'create' ? '#2E7D32' : '#666',
                fontSize:13, fontWeight:'bold', cursor:'pointer',
                boxShadow: tab === 'create' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}
            >✨ Create</button>
          </div>
        )}

        {error && (
          <div style={{ background:'#FFEBEE', padding:12, borderRadius:10, marginBottom:12 }}>
            <strong style={{ color:'#C62828', fontSize:12 }}>⚠️ {error}</strong>
          </div>
        )}

        {/* Step: PHONE */}
        {step === 'phone' && (
          <>
            {tab === 'signin' && (
              <div style={{ background:'#E8F5E9', border:'1px solid #A5D6A7', borderRadius:10, padding:12, marginBottom:14 }}>
                <p style={{ margin:0, fontSize:12, color:'#1B5E20', lineHeight:1.5 }}>
                  🛡️ Your animals, listings, and messages are safe on the server. Enter the phone you registered with.
                </p>
              </div>
            )}

            {notFound && (
              <div style={{ background:'#FFF8E1', border:'1px solid #FFD54F', borderRadius:10, padding:12, marginBottom:12 }}>
                <p style={{ margin:0, fontSize:12, color:'#E65100', lineHeight:1.5 }}>
                  No account found for <strong>{phone}</strong>. Create one instead?
                </p>
                <button
                  onClick={() => { setTab('create'); setNotFound(false); }}
                  style={{ marginTop:8, padding:'8px 14px', background:'#E65100', color:'white', border:'none', borderRadius:20, fontSize:12, fontWeight:'bold', cursor:'pointer' }}
                >
                  ✨ Create account
                </button>
              </div>
            )}

            <label style={{ fontSize:12, fontWeight:'bold', color:'#555', display:'block', marginBottom:6 }}>
              Phone number
            </label>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !loading) tab === 'signin' ? doSignIn() : goToRolePicker(); }}
              placeholder="0704519744"
              type="tel"
              inputMode="tel"
              style={inputStyle}
              autoFocus
            />
            <p style={{ fontSize:10, color:'#888', margin:'-4px 0 12px', textAlign:'center' }}>
              0704519744 · +254704519744 · 254704519744 all work
            </p>

            {tab === 'signin' ? (
              <button onClick={doSignIn} disabled={loading} style={{ ...primaryBtn, background: loading ? '#CCC' : '#2E7D32' }}>
                {loading ? '⏳ Looking up...' : '🔑 Sign In'}
              </button>
            ) : (
              <button onClick={goToRolePicker} disabled={loading} style={{ ...primaryBtn, background: '#2E7D32' }}>
                Continue →
              </button>
            )}
          </>
        )}

        {/* Step: ROLE PICKER */}
        {step === 'role' && (
          <>
            <button onClick={() => setStep('phone')} style={{ background:'none', border:'none', color:'#666', fontSize:13, cursor:'pointer', marginBottom:12, padding:0 }}>
              ← Change phone
            </button>

            <p style={{ fontSize:12, color:'#666', marginBottom:12, textAlign:'center' }}>
              Registering with <strong>{phone}</strong>
            </p>

            <button
              onClick={() => pickRole('buyer')}
              style={{
                display:'flex', alignItems:'center', gap:12, width:'100%',
                background:'white', border:'2px solid #1976D2', padding:16,
                borderRadius:14, marginBottom:10, cursor:'pointer', fontFamily:'inherit', textAlign:'left',
              }}
            >
              <div style={{ fontSize:32 }}>🛒</div>
              <div style={{ flex:1 }}>
                <strong style={{ display:'block', fontSize:15, color:'#1976D2', marginBottom:3 }}>I want to buy</strong>
                <p style={{ margin:0, fontSize:11, color:'#666', lineHeight:1.4 }}>
                  Hotel, restaurant, individual, trader. Free to register. Pay KES 100 only when you unlock a seller's contact.
                </p>
              </div>
            </button>

            <button
              onClick={() => pickRole('farmer')}
              style={{
                display:'flex', alignItems:'center', gap:12, width:'100%',
                background:'white', border:'2px solid #2E7D32', padding:16,
                borderRadius:14, marginBottom:10, cursor:'pointer', fontFamily:'inherit', textAlign:'left',
              }}
            >
              <div style={{ fontSize:32 }}>🌾</div>
              <div style={{ flex:1 }}>
                <strong style={{ display:'block', fontSize:15, color:'#2E7D32', marginBottom:3 }}>I want to sell</strong>
                <p style={{ margin:0, fontSize:11, color:'#666', lineHeight:1.4 }}>
                  Farmer with livestock, produce, or a farm to list. Free to register and list.
                </p>
              </div>
            </button>

            <p style={{ fontSize:10, color:'#999', textAlign:'center', marginTop:14, lineHeight:1.4 }}>
              You can register as both — buyers can sell later, farmers can buy.
            </p>
          </>
        )}

        {/* Step: BUYER FORM */}
        {step === 'buyer-form' && (
          <>
            <button onClick={() => setStep('role')} style={{ background:'none', border:'none', color:'#666', fontSize:13, cursor:'pointer', marginBottom:12, padding:0 }}>
              ← Back
            </button>

            <label style={{ fontSize:12, fontWeight:'bold', color:'#555', display:'block', marginBottom:4 }}>
              Your name *
            </label>
            <input
              value={buyerForm.fullName}
              onChange={e => setBuyerForm({ ...buyerForm, fullName: e.target.value })}
              placeholder="e.g. Mary Wanjiku"
              style={{ ...inputStyle, fontFamily:'inherit', letterSpacing:0, textAlign:'left', fontSize:15 }}
            />

            <label style={{ fontSize:12, fontWeight:'bold', color:'#555', display:'block', marginBottom:6, marginTop:10 }}>
              I am a...
            </label>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:6, marginBottom:12 }}>
              {BUYER_TYPES.map(t => {
                const selected = buyerForm.buyerType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setBuyerForm({ ...buyerForm, buyerType: t.id })}
                    style={{
                      padding:'10px 4px', borderRadius:10,
                      border: selected ? '2px solid #1976D2' : '2px solid #E0E0E0',
                      background: selected ? '#E3F2FD' : 'white',
                      color: selected ? '#0D47A1' : '#666',
                      fontSize:10, fontWeight:'bold', cursor:'pointer',
                      display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                    }}
                  >
                    <span style={{ fontSize:20 }}>{t.icon}</span>
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {(buyerForm.buyerType === 'hotel' || buyerForm.buyerType === 'restaurant' ||
              buyerForm.buyerType === 'butchery' || buyerForm.buyerType === 'trader') && (
              <>
                <label style={{ fontSize:12, fontWeight:'bold', color:'#555', display:'block', marginBottom:4 }}>
                  Business name
                </label>
                <input
                  value={buyerForm.businessName}
                  onChange={e => setBuyerForm({ ...buyerForm, businessName: e.target.value })}
                  placeholder="e.g. Serena Hotel Nairobi"
                  style={{ ...inputStyle, fontFamily:'inherit', letterSpacing:0, textAlign:'left', fontSize:15 }}
                />
              </>
            )}

            <label style={{ fontSize:12, fontWeight:'bold', color:'#555', display:'block', marginBottom:4, marginTop:10 }}>
              Delivery county *
            </label>
            <input
              value={buyerForm.deliveryCounty}
              onChange={e => setBuyerForm({ ...buyerForm, deliveryCounty: e.target.value })}
              placeholder="e.g. Nairobi, Bomet, Nakuru"
              style={{ ...inputStyle, fontFamily:'inherit', letterSpacing:0, textAlign:'left', fontSize:15 }}
            />

            <label style={{ fontSize:12, fontWeight:'bold', color:'#555', display:'block', marginBottom:4 }}>
              Delivery area / landmark
            </label>
            <input
              value={buyerForm.deliveryArea}
              onChange={e => setBuyerForm({ ...buyerForm, deliveryArea: e.target.value })}
              placeholder="e.g. Karen, near Galleria Mall"
              style={{ ...inputStyle, fontFamily:'inherit', letterSpacing:0, textAlign:'left', fontSize:15 }}
            />

            <label style={{ fontSize:12, fontWeight:'bold', color:'#555', display:'block', marginBottom:4 }}>
              Delivery notes (optional)
            </label>
            <textarea
              value={buyerForm.deliveryNotes}
              onChange={e => setBuyerForm({ ...buyerForm, deliveryNotes: e.target.value })}
              placeholder='e.g. "Deliver to back gate, call on arrival"'
              rows={2}
              style={{ ...inputStyle, fontFamily:'inherit', letterSpacing:0, textAlign:'left', fontSize:13, resize:'vertical' }}
            />

            <div style={{ background:'#E8F5E9', border:'1px solid #A5D6A7', borderRadius:10, padding:12, marginTop:14 }}>
              <p style={{ margin:0, fontSize:11, color:'#1B5E20', lineHeight:1.5 }}>
                💡 <strong>Free to register.</strong> You'll only pay KES 100 when you unlock a seller's contact on a specific listing.
              </p>
            </div>

            <button onClick={submitBuyer} disabled={loading} style={{ ...primaryBtn, background: loading ? '#CCC' : '#1976D2', marginTop:14 }}>
              {loading ? '⏳ Creating account...' : '✅ Create Buyer Account'}
            </button>
          </>
        )}

        <button onClick={onClose} style={{ ...ghostBtn, marginTop:8 }}>
          Cancel
        </button>

        {step === 'phone' && (
          <p style={{ fontSize:10, color:'#999', marginTop:16, textAlign:'center', lineHeight:1.4 }}>
            No password. No SMS. Your phone is your identity.
            <br />
            Google sign-in coming soon.
          </p>
        )}
      </div>
    </div>
  );
}
