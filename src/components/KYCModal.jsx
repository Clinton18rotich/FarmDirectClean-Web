import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { normalizeKenyaPhone, isValidKenyaPhone } from '../utils/phone';

const inputStyle = { width:'100%', padding:'14px 16px', borderRadius:10, border:'2px solid #E0E0E0', fontSize:15, marginBottom:8, boxSizing:'border-box', fontFamily:'inherit', color:'#333' };
const labelStyle = { fontSize:12, fontWeight:'bold', color:'#555', display:'block', marginBottom:4, marginTop:10 };
const primaryBtn = { width:'100%', padding:16, color:'white', border:'none', borderRadius:25, fontSize:16, fontWeight:'bold', cursor:'pointer', marginTop:8, boxSizing:'border-box' };

export default function KYCModal({ userId, userType, userName, userPhone, onClose, onVerified }) {
  const [step, setStep] = useState('form'); // form | payment | verifying | done
  const [form, setForm] = useState({
    idNumber: '',
    fullName: userName || '',
    dateOfBirth: '',
    phone: userPhone || '',
  });
  const [tiers, setTiers] = useState(null);
  const [kycId, setKycId] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.kyc.tiers().then(r => setTiers(r)).catch(() => {});
  }, []);

  const isFormValid = () => {
    const idClean = form.idNumber.replace(/\D/g, '');
    return idClean.length >= 7 && idClean.length <= 9 && form.fullName.length > 2 && form.dateOfBirth;
  };

  const submitKYC = async () => {
    setError(null);
    setLoading(true);
    try {
      // 1. Create verification request
      const reqResult = await api.kyc.createRequest({
        userId,
        userType,
        idNumber: form.idNumber.replace(/\D/g, ''),
        fullName: form.fullName,
        dateOfBirth: form.dateOfBirth,
      });

      if (!reqResult.success) throw new Error(reqResult.message);
      if (reqResult.existing && reqResult.existing.verified) {
        setStep('done');
        setLoading(false);
        return;
      }

      setKycId(reqResult.verification.id);
      setStep('payment');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const payAndVerify = async () => {
    setError(null);
    setLoading(true);
    setStep('verifying');
    try {
      // In production: this would trigger M-Pesa STK push
      // For now (mock mode): simulate payment confirmation
      const result = await api.kyc.confirmPayment(kycId, 'MPESA-SIMULATED-' + Date.now());

      if (!result.success) throw new Error(result.message);

      if (result.verification.verified) {
        setStep('done');
        if (onVerified) onVerified(result.verification);
      } else {
        setError(result.verification.reason || 'Verification failed');
        setStep('form');
      }
    } catch (err) {
      setError(err.message);
      setStep('payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.7)',zIndex:800,display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={onClose}>
      <div style={{background:'white',borderRadius:'20px 20px 0 0',padding:20,maxWidth:480,width:'100%',maxHeight:'92vh',overflowY:'auto'}} onClick={e => e.stopPropagation()}>

        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <div>
            <h3 style={{margin:0,color:'#1565C0',fontSize:18}}>🪪 Verify Your Identity</h3>
            <p style={{fontSize:11,color:'#666',margin:'2px 0 0'}}>One-time KES {tiers?.kycFee || 500}</p>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:24,cursor:'pointer',color:'#666'}}>✕</button>
        </div>

        {error && (
          <div style={{background:'#FFEBEE',padding:12,borderRadius:10,marginBottom:12}}>
            <strong style={{color:'#C62828',fontSize:12}}>⚠️ {error}</strong>
          </div>
        )}

        {step === 'form' && (
          <>
            <div style={{background:'#E3F2FD',padding:12,borderRadius:10,marginBottom:12,border:'1px solid #90CAF9'}}>
              <strong style={{fontSize:12,color:'#0D47A1'}}>🛡️ Why verify?</strong>
              <ul style={{margin:'6px 0 0',paddingLeft:18,fontSize:11,color:'#1565C0',lineHeight:1.5}}>
                <li>Sell up to KES 500,000/month (vs KES 5,000)</li>
                <li>Unlimited product listings</li>
                <li>Get verified ✅ badge</li>
                <li>Escrow protection for buyers</li>
                <li>Prevent fake accounts</li>
              </ul>
            </div>

            <label style={labelStyle}>National ID Number *</label>
            <input
              value={form.idNumber}
              onChange={e => setForm({...form, idNumber: e.target.value.replace(/\D/g, '').slice(0, 9)})}
              placeholder="12345678"
              inputMode="numeric"
              style={{...inputStyle, fontFamily:'monospace', letterSpacing:2, textAlign:'center', fontSize:18}}
            />
            <p style={{fontSize:10,color:'#666',margin:'0 0 8px'}}>7-9 digits. Found on your national ID card.</p>

            <label style={labelStyle}>Full Name (as on ID) *</label>
            <input
              value={form.fullName}
              onChange={e => setForm({...form, fullName: e.target.value})}
              placeholder="e.g. Mary Wanjiku"
              style={inputStyle}
            />

            <label style={labelStyle}>Date of Birth *</label>
            <input
              type="date"
              value={form.dateOfBirth}
              onChange={e => setForm({...form, dateOfBirth: e.target.value})}
              style={inputStyle}
            />

            <label style={labelStyle}>Phone (for M-Pesa payment)</label>
            <input
              value={form.phone}
              onChange={e => setForm({...form, phone: e.target.value})}
              onBlur={e => e.target.value && setForm({...form, phone: normalizeKenyaPhone(e.target.value)})}
              placeholder="0712345678"
              type="tel"
              style={inputStyle}
            />

            <button onClick={submitKYC} disabled={!isFormValid() || loading} style={{...primaryBtn, background: isFormValid() && !loading ? '#1565C0' : '#ccc'}}>
              {loading ? '⏳ Processing...' : 'Continue to Payment →'}
            </button>

            <p style={{fontSize:10,color:'#999',textAlign:'center',marginTop:12}}>
              🔒 Your ID is never shared. Only used to verify identity.
            </p>
          </>
        )}

        {step === 'payment' && (
          <>
            <div style={{textAlign:'center',padding:'20px 0'}}>
              <span style={{fontSize:60}}>📱</span>
              <h3 style={{margin:'12px 0 4px',color:'#1565C0'}}>Pay KES {tiers?.kycFee || 500}</h3>
              <p style={{fontSize:12,color:'#666',margin:'0 0 20px'}}>
                Via M-Pesa to complete verification
              </p>
            </div>

            <div style={{background:'#F9FAFB',padding:14,borderRadius:10,marginBottom:16,border:'1px solid #E0E0E0'}}>
              <p style={{fontSize:12,margin:'4px 0'}}><strong>ID:</strong> <span style={{fontFamily:'monospace'}}>****{form.idNumber.slice(-4)}</span></p>
              <p style={{fontSize:12,margin:'4px 0'}}><strong>Name:</strong> {form.fullName}</p>
              <p style={{fontSize:12,margin:'4px 0'}}><strong>Amount:</strong> KES {tiers?.kycFee || 500}</p>
              <p style={{fontSize:12,margin:'4px 0'}}><strong>Phone:</strong> {form.phone}</p>
            </div>

            <button onClick={payAndVerify} disabled={loading} style={{...primaryBtn, background: !loading ? '#4CAF50' : '#ccc'}}>
              {loading ? '⏳ Processing...' : `✅ Pay KES ${tiers?.kycFee || 500} Now`}
            </button>

            <button onClick={() => setStep('form')} disabled={loading} style={{...primaryBtn, background:'none', color:'#666', marginTop:4}}>
              ← Back to Edit
            </button>

            <p style={{fontSize:10,color:'#999',textAlign:'center',marginTop:12}}>
              In production, this triggers an M-Pesa STK push to your phone.
            </p>
          </>
        )}

        {step === 'verifying' && (
          <div style={{textAlign:'center',padding:'40px 20px'}}>
            <span style={{fontSize:60}}>🔍</span>
            <h3 style={{margin:'12px 0 4px',color:'#1565C0'}}>Verifying...</h3>
            <p style={{fontSize:12,color:'#666'}}>Checking against Kenya IPRS database</p>
          </div>
        )}

        {step === 'done' && (
          <div style={{textAlign:'center',padding:'20px 0'}}>
            <span style={{fontSize:80}}>✅</span>
            <h2 style={{color:'#2E7D32',margin:'12px 0 8px'}}>Verified!</h2>
            <div style={{background:'#E8F5E9',padding:14,borderRadius:12,margin:'12px 0',textAlign:'left'}}>
              <strong style={{color:'#2E7D32',fontSize:13}}>🎉 You are now a Verified Seller</strong>
              <ul style={{margin:'8px 0 0',paddingLeft:18,fontSize:12,color:'#2E7D32',lineHeight:1.6}}>
                <li>Sell up to KES 500,000/month</li>
                <li>Unlimited product listings</li>
                <li>Verified ✅ badge on profile</li>
                <li>Escrow protection active</li>
              </ul>
            </div>
            <button onClick={onClose} style={{...primaryBtn, background:'#4CAF50'}}>
              ✅ Start Selling
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
