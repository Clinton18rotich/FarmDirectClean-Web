// FILE: src/components/UnlockContactModal.jsx
// Session 5B-3: KES 100 contact unlock via M-Pesa STK + polling + dev bypass.
import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';

const inputStyle = { width:'100%', padding:'12px 14px', borderRadius:10, border:'2px solid #E0E0E0', fontSize:15, marginBottom:8, boxSizing:'border-box', fontFamily:'inherit', color:'#333' };
const labelStyle = { fontSize:12, fontWeight:'bold', color:'#555', display:'block', marginBottom:4, marginTop:10 };
const primaryBtn = { width:'100%', padding:14, color:'white', border:'none', borderRadius:25, fontSize:15, fontWeight:'bold', cursor:'pointer', marginTop:8, boxSizing:'border-box' };

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 90000;

export default function UnlockContactModal({ listingId, currentFarmer, onClose, onSuccess }) {
  const [step, setStep] = useState('form');   // form | waiting | success | error
  const [phone, setPhone] = useState(currentFarmer?.phone || '');
  const [error, setError] = useState(null);
  const [unlockResult, setUnlockResult] = useState(null);
  const [isSimulated, setIsSimulated] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const pollRef = useRef(null);
  const timeoutRef = useRef(null);
  const startRef = useRef(null);

  const cleanup = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    pollRef.current = null;
    timeoutRef.current = null;
  };

  useEffect(() => () => cleanup(), []);

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
  };

  const startPolling = () => {
    startRef.current = Date.now();
    pollRef.current = setInterval(async () => {
      try {
        const res = await api.market.unlockStatus(listingId, currentFarmer.id);
        if (res.unlocked && (res.status === 'active' || res.status === 'credited')) {
          stopPolling();
          setStep('success');
          setTimeout(() => { onSuccess && onSuccess(); onClose(); }, 1500);
        } else {
          setElapsedMs(Date.now() - startRef.current);
        }
      } catch (err) {
        // silently continue polling
      }
    }, POLL_INTERVAL_MS);

    timeoutRef.current = setTimeout(() => {
      stopPolling();
      setError('Payment not confirmed. If you paid, contact support with your M-Pesa code.');
      setStep('error');
    }, POLL_TIMEOUT_MS);
  };

  const handleUnlock = async () => {
    setError(null);
    const trimmed = (phone || '').trim();
    if (!trimmed) { setError('Phone number required'); return; }
    if (trimmed.replace(/\D/g, '').length < 9) { setError('Enter a valid Kenyan phone'); return; }

    try {
      const res = await api.market.unlockContact(listingId, {
        buyerId: currentFarmer.id,
        buyerName: currentFarmer.fullName || 'Buyer',
        buyerPhone: trimmed,
      });
      if (!res.success) throw new Error(res.message || 'Failed to start unlock');
      setUnlockResult(res);
      const simulated = res.mode === 'simulated' || !res.stk;
      setIsSimulated(simulated);
      setStep('waiting');
      startPolling();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDevForceConfirm = async () => {
    try {
      const res = await api.market.forceConfirmUnlock
        ? await api.market.forceConfirmUnlock({ listingId, buyerId: currentFarmer.id })
        : await fetch(`/api/market/dev/force-confirm-unlock`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ listingId, buyerId: currentFarmer.id }),
          }).then(r => r.json());
      if (!res.success) throw new Error(res.message);
      stopPolling();
      setStep('success');
      setTimeout(() => { onSuccess && onSuccess(); onClose(); }, 1500);
    } catch (err) {
      setError('Dev bypass failed: ' + err.message);
    }
  };

  const cancelAndClose = () => {
    stopPolling();
    onClose();
  };

  return (
    <div
      style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.7)', zIndex:2600, display:'flex', alignItems:'flex-end', justifyContent:'center' }}
      onClick={cancelAndClose}
    >
      <div
        style={{ background:'white', borderRadius:'20px 20px 0 0', padding:20, maxWidth:480, width:'100%', maxHeight:'92vh', overflowY:'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <div>
            <h3 style={{ margin:0, color:'#1976D2', fontSize:18 }}>🔓 Unlock Contact</h3>
            <p style={{ fontSize:11, color:'#666', margin:'2px 0 0' }}>Pay KES 100 via M-Pesa to reveal the seller's phone</p>
          </div>
          {step !== 'waiting' && (
            <button onClick={cancelAndClose} style={{ background:'none', border:'none', fontSize:24, cursor:'pointer', color:'#666' }}>✕</button>
          )}
        </div>

        {error && (
          <div style={{ background:'#FFEBEE', padding:12, borderRadius:10, marginBottom:12 }}>
            <strong style={{ color:'#C62828', fontSize:12 }}>⚠️ {error}</strong>
          </div>
        )}

        {/* STEP 1: FORM */}
        {step === 'form' && (
          <>
            <div style={{ background:'#E3F2FD', padding:12, borderRadius:10, marginBottom:14, border:'1px solid #90CAF9' }}>
              <p style={{ margin:0, fontSize:12, color:'#0D47A1', lineHeight:1.5 }}>
                💡 <strong>KES 100</strong> unlocks the seller's phone for this listing. You'll be able to call them and negotiate directly.
              </p>
            </div>

            <label style={labelStyle}>Your M-Pesa phone number</label>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="07XX XXX XXX"
              type="tel"
              style={inputStyle}
            />
            <p style={{ fontSize:11, color:'#888', margin:'0 0 4px' }}>
              You'll receive an STK prompt on this number. Enter your M-Pesa PIN to complete payment.
            </p>

            <button onClick={handleUnlock} style={{ ...primaryBtn, background:'#1976D2' }}>
              💰 Pay KES 100 via M-Pesa
            </button>
            <button onClick={cancelAndClose} style={{ ...primaryBtn, background:'#F0F0F0', color:'#666' }}>
              Cancel
            </button>
          </>
        )}

        {/* STEP 2: WAITING */}
        {step === 'waiting' && (
          <div style={{ textAlign:'center', padding:'20px 0' }}>
            <div style={{ fontSize:56, marginBottom:12 }}>📱</div>
            <strong style={{ fontSize:16, color:'#333', display:'block', marginBottom:8 }}>
              Check your phone
            </strong>
            <p style={{ fontSize:13, color:'#666', margin:0, lineHeight:1.5 }}>
              An M-Pesa prompt for <strong>KES 100</strong> should appear on <strong>{phone}</strong> within 10 seconds.
            </p>
            <p style={{ fontSize:11, color:'#999', marginTop:12 }}>
              Waiting for confirmation... {Math.floor(elapsedMs / 1000)}s
            </p>

            <div style={{ marginTop:20, display:'flex', justifyContent:'center' }}>
              <div style={{ width:36, height:36, border:'4px solid #E0E0E0', borderTopColor:'#1976D2', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

            {isSimulated && (
              <div style={{ marginTop:24, padding:12, background:'#FFF8E1', borderRadius:10, border:'1px dashed #FFD54F' }}>
                <p style={{ fontSize:11, color:'#E65100', margin:'0 0 10px', lineHeight:1.5 }}>
                  🧪 <strong>Dev mode:</strong> Backend did not send a real STK push.
                </p>
                <button onClick={handleDevForceConfirm} style={{ background:'#FF9800', color:'white', border:'none', padding:'10px 16px', borderRadius:10, fontSize:12, fontWeight:'bold', cursor:'pointer' }}>
                  🧪 Force-confirm unlock (dev)
                </button>
              </div>
            )}

            <button onClick={cancelAndClose} style={{ ...primaryBtn, background:'none', color:'#666', marginTop:20 }}>
              Cancel
            </button>
          </div>
        )}

        {/* STEP 3: SUCCESS */}
        {step === 'success' && (
          <div style={{ textAlign:'center', padding:'30px 0' }}>
            <div style={{ fontSize:56, marginBottom:12 }}>✅</div>
            <strong style={{ fontSize:18, color:'#2E7D32', display:'block', marginBottom:8 }}>
              Contact Unlocked
            </strong>
            <p style={{ fontSize:13, color:'#666', margin:0, lineHeight:1.5 }}>
              You can now call the seller and make an offer.
            </p>
          </div>
        )}

        {/* ERROR */}
        {step === 'error' && (
          <>
            <div style={{ textAlign:'center', padding:'20px 0' }}>
              <div style={{ fontSize:56, marginBottom:12 }}>⚠️</div>
              <strong style={{ fontSize:16, color:'#C62828', display:'block', marginBottom:8 }}>
                Payment Not Confirmed
              </strong>
              <p style={{ fontSize:13, color:'#666', margin:0, lineHeight:1.5 }}>
                If you entered your PIN, wait a moment and refresh — the unlock may still be processing.
              </p>
            </div>
            <button onClick={() => { setStep('form'); setError(null); setElapsedMs(0); }} style={{ ...primaryBtn, background:'#1976D2' }}>
              Try again
            </button>
            <button onClick={cancelAndClose} style={{ ...primaryBtn, background:'#F0F0F0', color:'#666' }}>
              Close
            </button>
          </>
        )}
      </div>
    </div>
  );
}
