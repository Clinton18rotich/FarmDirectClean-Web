// FILE: src/components/ReleaseCodeModal.jsx
// Session 5B-8: Buyer enters 4-digit release code to release escrow to seller.
import React, { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';

const inputStyle = { width:'100%', padding:'12px 14px', borderRadius:10, border:'2px solid #E0E0E0', fontSize:15, marginBottom:8, boxSizing:'border-box', fontFamily:'inherit', color:'#333' };
const primaryBtn = { width:'100%', padding:14, color:'white', border:'none', borderRadius:25, fontSize:15, fontWeight:'bold', cursor:'pointer', marginTop:8, boxSizing:'border-box' };
const ghostBtn = { ...primaryBtn, background:'#F0F0F0', color:'#666' };

const MAX_ATTEMPTS = 5;

export default function ReleaseCodeModal({ trade, currentFarmer, onClose, onSuccess }) {
  const [digits, setDigits] = useState(['', '', '', '']);
  const [riderRef, setRiderRef] = useState('');
  const [showRiderField, setShowRiderField] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [locked, setLocked] = useState(false);
  const [done, setDone] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRefs = [useRef(), useRef(), useRef(), useRef()];

  useEffect(() => {
    // Auto-focus first digit
    setTimeout(() => inputRefs[0].current?.focus(), 200);
  }, []);

  const code = digits.join('');
  const codeComplete = code.length === 4 && /^\d{4}$/.test(code);

  const setDigit = (i, val) => {
    const clean = val.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = clean;
    setDigits(next);
    if (clean && i < 3) inputRefs[i + 1].current?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputRefs[i - 1].current?.focus();
    }
    if (e.key === 'Enter' && codeComplete && !loading && !locked) {
      handleSubmit();
    }
  };

  const handlePaste = (e) => {
    const pasted = (e.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, 4);
    if (pasted.length) {
      e.preventDefault();
      const next = pasted.split('').concat(['','','','']).slice(0, 4);
      setDigits(next);
      const focusIdx = Math.min(pasted.length, 3);
      inputRefs[focusIdx].current?.focus();
    }
  };

  const handleSubmit = async () => {
    if (!codeComplete || loading || locked) return;
    setError(null);
    setLoading(true);
    try {
      const res = await api.trades.release(trade.id, {
        code,
        buyerId: currentFarmer.id,
        riderPaymentRef: riderRef.trim() || undefined,
      });

      if (!res.success) {
        // Wrong code path — attempts field may be present
        const used = res.attempts || (attemptsUsed + 1);
        setAttemptsUsed(used);
        if (used >= MAX_ATTEMPTS) {
          setLocked(true);
          setError('Too many attempts — trade locked. Contact support.');
        } else {
          setError(`Invalid code. ${MAX_ATTEMPTS - used} attempt${MAX_ATTEMPTS - used === 1 ? '' : 's'} remaining.`);
          setShake(true);
          setTimeout(() => setShake(false), 500);
          setDigits(['', '', '', '']);
          inputRefs[0].current?.focus();
        }
        return;
      }

      // Success
      setDone(true);
      setTimeout(() => { onSuccess && onSuccess(res.trade); onClose(); }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.75)', zIndex:2700, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
        <div style={{ background:'white', borderRadius:16, padding:32, maxWidth:360, width:'100%', textAlign:'center' }}>
          <div style={{ fontSize:64, marginBottom:12 }}>🎉</div>
          <h3 style={{ margin:'0 0 8px', color:'#2E7D32', fontSize:20 }}>Escrow Released</h3>
          <p style={{ fontSize:13, color:'#666', margin:'0 0 8px', lineHeight:1.5 }}>
            Payment is now on its way to the seller.
          </p>
          <p style={{ fontSize:11, color:'#999', margin:0 }}>
            The animal's ownership has been transferred to you on the passport.
          </p>
        </div>
      </div>
    );
  }

  const remaining = MAX_ATTEMPTS - attemptsUsed;

  return (
    <div
      style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.7)', zIndex:2700, display:'flex', alignItems:'flex-end', justifyContent:'center' }}
      onClick={locked ? undefined : onClose}
    >
      <div
        style={{ background:'white', borderRadius:'20px 20px 0 0', padding:20, maxWidth:480, width:'100%', maxHeight:'92vh', overflowY:'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
          <div>
            <h3 style={{ margin:0, color:'#E65100', fontSize:18 }}>🔓 Release Escrow</h3>
            <p style={{ fontSize:11, color:'#666', margin:'2px 0 0' }}>
              Trade {trade?.id?.slice(-8) || '—'} · KES {Number(trade?.escrowAmount || 0).toLocaleString()}
            </p>
          </div>
          {!locked && (
            <button onClick={onClose} style={{ background:'none', border:'none', fontSize:24, cursor:'pointer', color:'#666' }}>✕</button>
          )}
        </div>

        {/* Big warning */}
        <div style={{ background:'#FFF8E1', border:'2px solid #FFD54F', borderRadius:12, padding:14, marginBottom:16 }}>
          <p style={{ margin:0, fontSize:13, color:'#E65100', fontWeight:'bold' }}>⚠️ Only enter AFTER receiving the animal</p>
          <p style={{ margin:'6px 0 0', fontSize:11, color:'#BF360C', lineHeight:1.5 }}>
            Once you enter the code, <strong>escrow pays the seller immediately</strong> and cannot be reversed. If the animal has not been delivered or doesn't match the listing, do <strong>not</strong> enter the code — report a dispute instead.
          </p>
        </div>

        {/* Attempts indicator */}
        {attemptsUsed > 0 && !locked && (
          <div style={{ background:'#FFEBEE', padding:8, borderRadius:8, marginBottom:12, textAlign:'center' }}>
            <p style={{ margin:0, fontSize:11, color:'#C62828', fontWeight:'bold' }}>
              ⚠️ {remaining} of {MAX_ATTEMPTS} attempts remaining
            </p>
          </div>
        )}

        {error && (
          <div style={{ background:'#FFEBEE', padding:12, borderRadius:10, marginBottom:12 }}>
            <strong style={{ color:'#C62828', fontSize:12 }}>⚠️ {error}</strong>
          </div>
        )}

        {locked ? (
          <>
            <div style={{ textAlign:'center', padding:'20px 0' }}>
              <div style={{ fontSize:56, marginBottom:12 }}>🔒</div>
              <strong style={{ fontSize:16, color:'#C62828', display:'block', marginBottom:8 }}>
                Trade Locked
              </strong>
              <p style={{ fontSize:12, color:'#666', margin:0, lineHeight:1.5 }}>
                Too many incorrect attempts. Contact FarmDirect support to unlock this trade.
              </p>
            </div>
            <button onClick={onClose} style={primaryBtn}>Close</button>
          </>
        ) : (
          <>
            {/* Code input */}
            <label style={{ fontSize:12, fontWeight:'bold', color:'#555', display:'block', marginBottom:8, textAlign:'center' }}>
              Enter 4-digit release code
            </label>
            <div
              style={{
                display:'flex', justifyContent:'center', gap:10, marginBottom:16,
                animation: shake ? 'shake 0.4s' : 'none',
              }}
              onPaste={handlePaste}
            >
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={inputRefs[i]}
                  value={d}
                  onChange={e => setDigit(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  inputMode="numeric"
                  type="tel"
                  maxLength={1}
                  disabled={loading}
                  style={{
                    width:56, height:64, textAlign:'center', fontSize:28, fontWeight:'bold',
                    fontFamily:'monospace', color:'#E65100',
                    border: d ? '2px solid #E65100' : '2px solid #E0E0E0',
                    borderRadius:12, background:'#FFF8E1',
                    outline:'none', boxSizing:'border-box',
                  }}
                />
              ))}
            </div>
            <style>{`@keyframes shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-8px); } 75% { transform: translateX(8px); } }`}</style>

            {/* Optional rider payment ref */}
            <div style={{ marginBottom:12 }}>
              {!showRiderField ? (
                <button
                  onClick={() => setShowRiderField(true)}
                  style={{ background:'none', border:'none', color:'#1976D2', fontSize:11, cursor:'pointer', textDecoration:'underline', padding:0 }}
                >
                  + Add rider M-Pesa reference (optional)
                </button>
              ) : (
                <>
                  <label style={{ fontSize:11, fontWeight:'bold', color:'#555', display:'block', marginBottom:4 }}>
                    Rider payment M-Pesa code (optional)
                  </label>
                  <input
                    value={riderRef}
                    onChange={e => setRiderRef(e.target.value)}
                    placeholder="e.g. QK12ABC345"
                    style={inputStyle}
                    disabled={loading}
                  />
                  <p style={{ fontSize:10, color:'#888', margin:'-4px 0 8px' }}>
                    Records that you paid the rider directly. For your records only.
                  </p>
                </>
              )}
            </div>

            <button
              onClick={handleSubmit}
              disabled={!codeComplete || loading}
              style={{ ...primaryBtn, background: (!codeComplete || loading) ? '#CCC' : '#E65100' }}
            >
              {loading ? '⏳ Releasing...' : '🔓 Release Escrow'}
            </button>
            <button onClick={onClose} disabled={loading} style={ghostBtn}>Cancel</button>
          </>
        )}
      </div>
    </div>
  );
}
