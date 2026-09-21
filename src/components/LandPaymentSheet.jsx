import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { normalizeKenyaPhone, isValidKenyaPhone } from '../utils/phone';

const inputStyle = { width:'100%', padding:'14px 16px', borderRadius:10, border:'2px solid #E0E0E0', fontSize:16, marginBottom:8, boxSizing:'border-box', fontFamily:'inherit', color:'#333' };
const labelStyle = { fontSize:12, fontWeight:'bold', color:'#555', display:'block', marginBottom:4, marginTop:8 };
const primaryBtn = { width:'100%', padding:16, color:'white', border:'none', borderRadius:25, fontSize:16, fontWeight:'bold', cursor:'pointer', marginTop:8, boxSizing:'border-box' };

export default function LandPaymentSheet({ parcel, onClose, onPaid, onInviteWitnesses }) {
  const [step, setStep] = useState('confirm'); // confirm | waiting | done
  const [phone, setPhone] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Prefill phone from parcel owner
    if (parcel?.ownerPhone) {
      setPhone(normalizeKenyaPhone(parcel.ownerPhone));
    }
  }, [parcel]);

  const isPhoneValid = () => isValidKenyaPhone(phone);

  const pay = async () => {
    setError(null);
    setLoading(true);
    setStep('waiting');

    try {
      const result = await api.landProtection.payParcel(parcel.id, phone);
      if (!result.success) throw new Error(result.message);

      // Simulated mode: complete instantly
      if (result.mode === 'not_configured') {
        setStep('done');
        if (onPaid) onPaid(result.parcel);
        setLoading(false);
        return;
      }

      // Real STK: poll for callback
      if (!result.stk) throw new Error('No STK push sent');
      pollStatus(0);
    } catch (err) {
      setError(err.message);
      setStep('confirm');
      setLoading(false);
    }
  };

  const pollStatus = async (attempt) => {
    const MAX = 20;      // 20 × 3s = 60s
    const INTERVAL = 3000;

    if (attempt >= MAX) {
      setError('Payment not confirmed after 60s. If you paid, wait a moment and try again.');
      setStep('confirm');
      setLoading(false);
      return;
    }

    try {
      const s = await api.landProtection.parcelStatus(parcel.id);

      if (s.feePaid) {
        setStep('done');
        setLoading(false);
        if (onPaid) onPaid(s);
        return;
      }
      setTimeout(() => pollStatus(attempt + 1), INTERVAL);
    } catch (err) {
      setTimeout(() => pollStatus(attempt + 1), INTERVAL);
    }
  };

  return (
    <div
      style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.7)',zIndex:800,display:'flex',alignItems:'flex-end',justifyContent:'center'}}
      onClick={onClose}
    >
      <div
        style={{background:'white',borderRadius:'20px 20px 0 0',padding:20,maxWidth:480,width:'100%',maxHeight:'92vh',overflowY:'auto'}}
        onClick={e => e.stopPropagation()}
      >
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <div>
            <h3 style={{margin:0,color:'#2E7D32',fontSize:18}}>🏠 Activate Land Parcel</h3>
            <p style={{fontSize:11,color:'#666',margin:'2px 0 0'}}>One-time KES {parcel.fee || 500}</p>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:24,cursor:'pointer',color:'#666'}}>✕</button>
        </div>

        {error && (
          <div style={{background:'#FFEBEE',padding:12,borderRadius:10,marginBottom:12}}>
            <strong style={{color:'#C62828',fontSize:12}}>⚠️ {error}</strong>
          </div>
        )}

        {step === 'confirm' && (
          <>
            <div style={{background:'#E8F5E9',padding:14,borderRadius:12,marginBottom:12,border:'1px solid #A5D6A7'}}>
              <strong style={{fontSize:13,color:'#1B5E20'}}>📍 {parcel.id}</strong>
              <p style={{fontSize:12,margin:'6px 0 2px'}}>📍 {parcel.village || parcel.ward || parcel.county}, {parcel.county}</p>
              <p style={{fontSize:12,margin:'2px 0'}}>
                📏 {parcel.areaProvisional?.display || parcel.areaDisplay || 'computing...'}
                {parcel.areaProvisional?.perimeterMeters && ` • perimeter ${parcel.areaProvisional.perimeterMeters}m`}
              </p>
              {parcel.areaProvisional?.warning && (
                <div style={{background:'#FFF3E0', padding:8, borderRadius:6, marginTop:8, border:'1px solid #FFB74D'}}>
                  <strong style={{fontSize:11,color:'#E65100'}}>⚠️ {parcel.areaProvisional.warning}</strong>
                </div>
              )}
            </div>

            <div style={{background:'#E3F2FD',padding:12,borderRadius:10,marginBottom:16,border:'1px solid #90CAF9'}}>
              <strong style={{fontSize:12,color:'#0D47A1'}}>💳 What you get for KES {parcel.fee || 500}</strong>
              <ul style={{margin:'6px 0 0',paddingLeft:18,fontSize:11,color:'#1565C0',lineHeight:1.5}}>
                <li>Permanent GPS boundary record</li>
                <li>SHA-256 boundary hash (tamper-proof)</li>
                <li>Title deed vault access</li>
                <li>3-witness verification</li>
                <li>Eviction SOS protection</li>
              </ul>
            </div>

            <label style={labelStyle}>M-Pesa Phone Number</label>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              onBlur={e => e.target.value && setPhone(normalizeKenyaPhone(e.target.value))}
              placeholder="0712345678"
              type="tel"
              style={inputStyle}
            />

            <button
              onClick={pay}
              disabled={!isPhoneValid() || loading}
              style={{...primaryBtn, background: isPhoneValid() && !loading ? '#2E7D32' : '#ccc'}}
            >
              {loading ? '⏳ Processing...' : `💳 Pay KES ${parcel.fee || 500} to Activate`}
            </button>

            <button
              onClick={onClose}
              style={{...primaryBtn, background:'none', color:'#666', marginTop:4}}
            >
              Pay Later
            </button>

            <p style={{fontSize:10,color:'#999',textAlign:'center',marginTop:12}}>
              🔒 Your parcel stays pending until payment. No data lost.
            </p>
          </>
        )}

        {step === 'waiting' && (
          <div style={{textAlign:'center',padding:'40px 20px'}}>
            <span style={{fontSize:60}}>📱</span>
            <h3 style={{margin:'12px 0 4px',color:'#1565C0'}}>Waiting for M-Pesa...</h3>
            <p style={{fontSize:12,color:'#666'}}>Enter your M-Pesa PIN on your phone</p>
            <p style={{fontSize:11,color:'#999',marginTop:16}}>This usually takes 10–30 seconds</p>
          </div>
        )}

        {step === 'done' && (
          <div style={{textAlign:'center',padding:'20px 0'}}>
            <span style={{fontSize:80}}>✅</span>
            <h2 style={{color:'#2E7D32',margin:'12px 0 8px'}}>Parcel Active</h2>
            <div style={{background:'#E8F5E9',padding:14,borderRadius:12,margin:'12px 0',textAlign:'left'}}>
              <strong style={{color:'#2E7D32',fontSize:13}}>🔒 Boundary frozen & hashed</strong>
              <p style={{fontSize:12,margin:'6px 0 2px'}}>
                Area: <strong>{parcel.areaProvisional?.display || parcel.areaDisplay}</strong>
              </p>
              <p style={{fontSize:11,margin:'2px 0',color:'#666'}}>
                The boundary is now immutable. It cannot be edited without re-verification.
              </p>
            </div>

            <div style={{background:'#FFF3E0',padding:14,borderRadius:12,margin:'12px 0',textAlign:'left',border:'1px solid #FFB74D'}}>
              <strong style={{color:'#E65100',fontSize:13}}>👉 Next: Invite 3 witnesses</strong>
              <p style={{fontSize:11,margin:'4px 0 0',color:'#666'}}>
                Witnesses confirm your boundary via SMS. Their confirmation creates legal evidence for the land record.
              </p>
            </div>

            <button
              onClick={onInviteWitnesses}
              style={{...primaryBtn, background:'#FF9800'}}
            >
              👥 Invite Witnesses Now
            </button>

            <button
              onClick={onClose}
              style={{...primaryBtn, background:'none', color:'#666', marginTop:4}}
            >
              Do This Later
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
