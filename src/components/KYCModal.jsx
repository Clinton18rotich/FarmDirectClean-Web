// FILE: src/components/KYCModal.jsx
// Role-aware KYC modal. Pass role="vet"|"rider"|"farmer"|...
// Fetches the role's document requirements from the backend and renders
// the appropriate form. Backward compatible: no role = farmer.
import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { resizeImageFile } from '../utils/imageUtils';

const inputStyle = { width:'100%', padding:'14px 16px', borderRadius:10, border:'2px solid #E0E0E0', fontSize:15, marginBottom:8, boxSizing:'border-box', fontFamily:'inherit', color:'#333' };
const labelStyle = { fontSize:12, fontWeight:'bold', color:'#555', display:'block', marginBottom:4, marginTop:10 };
const primaryBtn = { width:'100%', padding:16, color:'white', border:'none', borderRadius:25, fontSize:16, fontWeight:'bold', cursor:'pointer', marginTop:8, boxSizing:'border-box' };
const ghostBtn = { ...primaryBtn, background:'#F0F0F0', color:'#666' };

export default function KYCModal({
  userId, userType, userName, userPhone,
  role = 'farmer',
  onClose, onVerified,
}) {
  const [step, setStep] = useState('form'); // form | payment | verifying | done
  const [roleConfig, setRoleConfig] = useState(null);
  const [form, setForm] = useState({
    idNumber: '',
    fullName: userName || '',
    dateOfBirth: '',
    phone: userPhone || '',
  });
  const [documents, setDocuments] = useState({});  // { key: { url, number?, expiry? } }
  const [kycId, setKycId] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submittingDoc, setSubmittingDoc] = useState(null); // which doc is uploading
  const pollRef = useRef(null);

  // Fetch role requirements
  useEffect(() => {
    api.kyc.roles(role)
      .then(r => { if (r.success) setRoleConfig(r.role); })
      .catch(() => {
        // Fallback: farmer defaults if endpoint missing
        setRoleConfig({
          id: 'farmer', label: 'Farmer', fee: 500,
          identity: ['national_id', 'selfie'], documents: [],
        });
      });
  }, [role]);

  const isFormValid = () => {
    const idClean = form.idNumber.replace(/\D/g, '');
    if (idClean.length < 7 || idClean.length > 9) return false;
    if (!form.fullName || form.fullName.length < 3) return false;
    if (!form.dateOfBirth) return false;
    // Required docs
    if (roleConfig?.documents) {
      for (const doc of roleConfig.documents) {
        if (doc.required && !documents[doc.key]?.url) return false;
        if (doc.hasNumber && documents[doc.key]?.url && !documents[doc.key]?.number) return false;
      }
    }
    return true;
  };

  // Handle document file upload
  const handleDocFile = async (docKey, file) => {
    if (!file) return;
    setSubmittingDoc(docKey);
    setError(null);
    try {
      const resized = await resizeImageFile(file, { maxDim: 1000, quality: 0.7 });
      setDocuments(prev => ({
        ...prev,
        [docKey]: { ...(prev[docKey] || {}), url: resized },
      }));
    } catch (err) {
      setError('Document upload failed: ' + err.message);
    } finally {
      setSubmittingDoc(null);
    }
  };

  const handleDocField = (docKey, field, value) => {
    setDocuments(prev => ({
      ...prev,
      [docKey]: { ...(prev[docKey] || {}), [field]: value },
    }));
  };

  const submitKYC = async () => {
    setError(null);
    setLoading(true);
    try {
      const reqResult = await api.kyc.createRequest({
        userId,
        userType: userType || role,
        role,
        idNumber: form.idNumber.replace(/\D/g, ''),
        fullName: form.fullName,
        dateOfBirth: form.dateOfBirth,
        documents,
        metadata: {},
      });
      if (!reqResult.success) throw new Error(reqResult.message);
      if (reqResult.existing && reqResult.existing.verified) {
        setStep('done');
        setLoading(false);
        if (onVerified) onVerified(reqResult.existing);
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
    try {
      const phone = form.phone || userPhone;
      if (!phone) throw new Error('Phone number required');
      const payResult = await api.kyc.pay(kycId, phone);
      if (!payResult.success) throw new Error(payResult.message || 'Payment initiation failed');
      setStep('verifying');
      pollStatus(kycId, 0);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const pollStatus = async (id, attempt) => {
    const MAX_ATTEMPTS = 40;
    const INTERVAL = 3000;
    if (attempt >= MAX_ATTEMPTS) {
      setError('Verification is taking longer than expected. Check your status later.');
      setStep('form');
      setLoading(false);
      return;
    }
    try {
      const s = await api.kyc.statusById(id);
      if (s.status === 'verified') {
        setStep('done');
        setLoading(false);
        if (onVerified) onVerified(s);
        return;
      }
      if (s.status === 'payment_failed' || s.status === 'failed') {
        setError(s.reason || 'Verification failed');
        setStep('form');
        setLoading(false);
        return;
      }
      pollRef.current = setTimeout(() => pollStatus(id, attempt + 1), INTERVAL);
    } catch (err) {
      pollRef.current = setTimeout(() => pollStatus(id, attempt + 1), INTERVAL);
    }
  };

  useEffect(() => () => { if (pollRef.current) clearTimeout(pollRef.current); }, []);

  const fee = roleConfig?.fee || 500;
  const roleLabel = roleConfig?.label || 'Farmer / Seller';

  return (
    <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.7)',zIndex:800,display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={onClose}>
      <div style={{background:'white',borderRadius:'20px 20px 0 0',padding:20,maxWidth:480,width:'100%',maxHeight:'92vh',overflowY:'auto'}} onClick={e => e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <div>
            <h3 style={{margin:0,color:'#1565C0',fontSize:18}}>🪪 Verify as {roleLabel}</h3>
            <p style={{fontSize:11,color:'#666',margin:'2px 0 0'}}>One-time KES {fee}</p>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:24,cursor:'pointer',color:'#666'}}>✕</button>
        </div>

        {error && (
          <div style={{background:'#FFEBEE',padding:12,borderRadius:10,marginBottom:12}}>
            <strong style={{color:'#C62828',fontSize:12}}>⚠️ {error}</strong>
          </div>
        )}

        {/* FORM STEP */}
        {step === 'form' && roleConfig && (
          <>
            <div style={{background:'#E3F2FD',padding:12,borderRadius:10,marginBottom:12,border:'1px solid #90CAF9'}}>
              <strong style={{fontSize:12,color:'#0D47A1'}}>🛡️ What this unlocks</strong>
              <p style={{margin:'6px 0 0',fontSize:11,color:'#1565C0',lineHeight:1.5}}>
                {roleConfig.description || 'Get verified to unlock full platform access.'}
              </p>
            </div>

            <label style={labelStyle}>National ID Number *</label>
            <input
              value={form.idNumber}
              onChange={e => setForm({...form, idNumber: e.target.value.replace(/\D/g,'').slice(0,9)})}
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

            <label style={labelStyle}>M-Pesa Phone Number</label>
            <input
              value={form.phone}
              onChange={e => setForm({...form, phone: e.target.value})}
              placeholder="07XX XXX XXX"
              type="tel"
              style={inputStyle}
            />

            {/* Role-specific document uploads */}
            {roleConfig.documents && roleConfig.documents.length > 0 && (
              <div style={{marginTop:16,paddingTop:16,borderTop:'2px solid #F0F0F0'}}>
                <h4 style={{fontSize:13,color:'#333',margin:'0 0 8px'}}>
                  📄 Required Documents
                </h4>
                <p style={{fontSize:11,color:'#666',margin:'0 0 12px',lineHeight:1.5}}>
                  These will be reviewed manually. Clear photos help speed up approval.
                </p>

                {roleConfig.documents.map(doc => {
                  const docData = documents[doc.key] || {};
                  const isUploading = submittingDoc === doc.key;
                  return (
                    <div key={doc.key} style={{background:'#F9FAFB',border:'1px solid #E0E0E0',borderRadius:10,padding:12,marginBottom:10}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
                        <strong style={{fontSize:12,color:'#333',flex:1}}>
                          {doc.label} {doc.required && <span style={{color:'#C62828'}}>*</span>}
                        </strong>
                        {docData.url && <span style={{fontSize:10,color:'#2E7D32',fontWeight:'bold'}}>✓ Uploaded</span>}
                      </div>

                      {doc.hasNumber && (
                        <>
                          <label style={{fontSize:10,fontWeight:'bold',color:'#555',display:'block',marginBottom:4}}>Document Number</label>
                          <input
                            value={docData.number || ''}
                            onChange={e => handleDocField(doc.key, 'number', e.target.value)}
                            placeholder="e.g. KVB-1234"
                            style={{...inputStyle, fontSize:13, padding:'10px 12px'}}
                          />
                        </>
                      )}

                      {doc.hasExpiry && (
                        <>
                          <label style={{fontSize:10,fontWeight:'bold',color:'#555',display:'block',marginBottom:4}}>Expiry Date</label>
                          <input
                            type="date"
                            value={docData.expiry || ''}
                            onChange={e => handleDocField(doc.key, 'expiry', e.target.value)}
                            style={{...inputStyle, fontSize:13, padding:'10px 12px'}}
                          />
                        </>
                      )}

                      <input
                        type="file"
                        accept="image/*"
                        id={`kyc-doc-${doc.key}`}
                        onChange={(e) => { handleDocFile(doc.key, e.target.files?.[0]); e.target.value = ''; }}
                        style={{display:'none'}}
                      />
                      <button
                        type="button"
                        disabled={isUploading}
                        onClick={() => document.getElementById(`kyc-doc-${doc.key}`).click()}
                        style={{
                          width:'100%',
                          padding:'10px',
                          marginTop:6,
                          borderRadius:8,
                          border: docData.url ? '2px solid #2E7D32' : '2px dashed #90CAF9',
                          background: docData.url ? '#E8F5E9' : 'white',
                          color: docData.url ? '#2E7D32' : '#1565C0',
                          fontSize:11,
                          fontWeight:'bold',
                          cursor: isUploading ? 'wait' : 'pointer',
                          opacity: isUploading ? 0.6 : 1,
                        }}
                      >
                        {isUploading ? '⏳ Processing...' : docData.url ? '🔄 Replace photo' : '📷 Upload photo'}
                      </button>

                      {docData.url && (
                        <img
                          src={docData.url}
                          alt={doc.label}
                          style={{width:'100%',maxHeight:100,objectFit:'cover',borderRadius:8,marginTop:6}}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <button
              onClick={submitKYC}
              disabled={!isFormValid() || loading || submittingDoc}
              style={{...primaryBtn, background: (!isFormValid() || loading || submittingDoc) ? '#CCC' : '#1565C0'}}
            >
              {loading ? '⏳ Submitting...' : `Continue to Payment — KES ${fee}`}
            </button>
          </>
        )}

        {/* PAYMENT STEP */}
        {step === 'payment' && (
          <>
            <div style={{background:'#F9FAFB',borderRadius:12,padding:16,marginBottom:16,textAlign:'center'}}>
              <p style={{margin:0,fontSize:11,color:'#666',textTransform:'uppercase',letterSpacing:0.5}}>Amount to pay</p>
              <p style={{margin:'6px 0 0',fontSize:32,fontWeight:'bold',color:'#1565C0'}}>KES {fee}</p>
              <p style={{margin:'6px 0 0',fontSize:11,color:'#999'}}>{roleLabel} verification</p>
            </div>

            <div style={{background:'#FFF8E1',border:'1px solid #FFD54F',borderRadius:10,padding:12,marginBottom:12}}>
              <p style={{margin:0,fontSize:11,color:'#E65100',lineHeight:1.5}}>
                You'll receive an STK prompt on <strong>{form.phone || userPhone}</strong> for KES {fee}. Enter your M-Pesa PIN to proceed.
              </p>
            </div>

            <button onClick={payAndVerify} disabled={loading} style={{...primaryBtn, background: loading ? '#CCC' : '#1565C0'}}>
              {loading ? '⏳ Initiating...' : `💰 Pay KES ${fee} via M-Pesa`}
            </button>
            <button onClick={() => setStep('form')} disabled={loading} style={ghostBtn}>← Back</button>
          </>
        )}

        {/* VERIFYING STEP */}
        {step === 'verifying' && (
          <div style={{textAlign:'center',padding:'30px 0'}}>
            <div style={{fontSize:56,marginBottom:12}}>📱</div>
            <strong style={{fontSize:16,color:'#333',display:'block',marginBottom:8}}>Verifying...</strong>
            <p style={{fontSize:13,color:'#666',margin:0,lineHeight:1.5}}>
              Checking your identity and documents. This usually takes under a minute.
            </p>
            <div style={{marginTop:20,display:'flex',justifyContent:'center'}}>
              <div style={{width:36,height:36,border:'4px solid #E0E0E0',borderTopColor:'#1565C0',borderRadius:'50%',animation:'spin 1s linear infinite'}} />
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* DONE STEP */}
        {step === 'done' && (
          <div style={{textAlign:'center',padding:'30px 0'}}>
            <div style={{fontSize:56,marginBottom:12}}>✅</div>
            <strong style={{fontSize:18,color:'#2E7D32',display:'block',marginBottom:8}}>Verified!</strong>
            <p style={{fontSize:13,color:'#666',margin:0,lineHeight:1.5}}>
              You're now a verified {roleLabel}.
            </p>
            <button onClick={onClose} style={{...primaryBtn, background:'#2E7D32', marginTop:20}}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}
