// FILE: src/components/TradeCheckout.jsx
// Session 5B-6: Buyer accepts escrow terms + funds trade via M-Pesa STK.
import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';

const inputStyle = { width:'100%', padding:'12px 14px', borderRadius:10, border:'2px solid #E0E0E0', fontSize:15, marginBottom:8, boxSizing:'border-box', fontFamily:'inherit', color:'#333' };
const labelStyle = { fontSize:12, fontWeight:'bold', color:'#555', display:'block', marginBottom:4, marginTop:10 };
const primaryBtn = { width:'100%', padding:14, color:'white', border:'none', borderRadius:25, fontSize:15, fontWeight:'bold', cursor:'pointer', marginTop:8, boxSizing:'border-box' };
const ghostBtn = { ...primaryBtn, background:'#F0F0F0', color:'#666' };

const card = { background:'white', border:'1px solid #E0E0E0', borderRadius:12, padding:14, marginBottom:12 };
const row = { display:'flex', justifyContent:'space-between', fontSize:13, padding:'6px 0' };

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 90000;

export default function TradeCheckout({ offer, currentFarmer, onClose, onTrack }) {
  const [step, setStep] = useState('review'); // review | fund | waiting | success | error
  const [phone, setPhone] = useState(currentFarmer?.phone || '');
  const [trade, setTrade] = useState(null);
  const [mode, setMode] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const pollRef = useRef(null);
  const timeoutRef = useRef(null);
  const startRef = useRef(null);

  const amount = Number(offer?.amount || 0);

  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
  };

  const startPolling = (tradeId) => {
    startRef.current = Date.now();
    pollRef.current = setInterval(async () => {
      try {
        const res = await api.trades.get(tradeId);
        if (res.success && res.trade && (res.trade.status === 'funded' || res.trade.status === 'in_transit' || res.trade.status === 'delivered' || res.trade.status === 'completed')) {
          stopPolling();
          setTrade(res.trade);
          setStep('success');
          return;
        }
        setElapsedMs(Date.now() - startRef.current);
      } catch (err) { /* keep polling */ }
    }, POLL_INTERVAL_MS);

    timeoutRef.current = setTimeout(() => {
      stopPolling();
      setError('Payment not confirmed yet. If you entered your PIN, wait a moment and refresh.');
      setStep('error');
    }, POLL_TIMEOUT_MS);
  };

  const handleCreate = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.trades.create({
        offerId: offer.id,
        creatorId: currentFarmer.id,
      });
      if (!res.success) throw new Error(res.message || 'Failed to create trade');
      setTrade(res.trade);
      setStep('fund');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFund = async () => {
    setError(null);
    const trimmed = (phone || '').trim();
    if (!trimmed) { setError('Phone number required'); return; }
    if (trimmed.replace(/\D/g, '').length < 9) { setError('Enter a valid Kenyan phone'); return; }

    setLoading(true);
    try {
      const res = await api.trades.fund(trade.id, trimmed);
      if (!res.success) throw new Error(res.message || 'Failed to start funding');
      setMode(res.mode);
      if (res.trade) setTrade(res.trade);

      // If already funded server-side (simulated path), skip polling
      if (res.trade && (res.trade.status === 'funded' || res.trade.status === 'in_transit')) {
        setStep('success');
        return;
      }
      setStep('waiting');
      startPolling(trade.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cancelAndClose = () => {
    stopPolling();
    onClose();
  };

  return (
    <div
      style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.7)', zIndex:2600, display:'flex', alignItems:'flex-end', justifyContent:'center' }}
      onClick={step === 'waiting' ? undefined : cancelAndClose}
    >
      <div
        style={{ background:'white', borderRadius:'20px 20px 0 0', padding:20, maxWidth:480, width:'100%', maxHeight:'92vh', overflowY:'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
          <div>
            <h3 style={{ margin:0, color:'#2E7D32', fontSize:18 }}>💳 Trade Checkout</h3>
            <p style={{ fontSize:11, color:'#666', margin:'2px 0 0' }}>
              {step === 'review' ? 'Step 1 of 3 · Review' :
               step === 'fund' ? 'Step 2 of 3 · Fund escrow' :
               step === 'waiting' ? 'Confirming payment' :
               step === 'success' ? 'Trade secured' : 'Payment issue'}
            </p>
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

        {/* STEP 1: REVIEW */}
        {step === 'review' && (
          <>
            <div style={card}>
              <p style={{ fontSize:11, fontWeight:'bold', color:'#555', margin:'0 0 8px', textTransform:'uppercase' }}>Trade Summary</p>
              <div style={row}><span style={{ color:'#666' }}>Animal</span><strong>{offer.passportId}</strong></div>
              <div style={row}><span style={{ color:'#666' }}>Seller</span><strong>{offer.sellerName || 'Verified Farmer'}</strong></div>
              <div style={{ ...row, borderTop:'2px solid #E8F5E9', paddingTop:10, marginTop:6 }}>
                <span style={{ color:'#2E7D32', fontWeight:'bold' }}>Escrow amount</span>
                <strong style={{ color:'#2E7D32', fontSize:17 }}>KES {amount.toLocaleString()}</strong>
              </div>
            </div>

            <div style={{ background:'#E3F2FD', border:'1px solid #90CAF9', borderRadius:12, padding:12, marginBottom:14 }}>
              <p style={{ margin:0, fontSize:12, color:'#0D47A1', fontWeight:'bold' }}>🛡️ How escrow protects you</p>
              <ul style={{ margin:'8px 0 0', paddingLeft:20, fontSize:11, color:'#1565C0', lineHeight:1.7 }}>
                <li>Your money goes to <strong>eConfirm escrow</strong>, not the seller</li>
                <li>The seller delivers the animal to you</li>
                <li>You enter a <strong>4-digit release code</strong> on delivery</li>
                <li>Only then does escrow release to the seller</li>
              </ul>
            </div>

            <button onClick={handleCreate} disabled={loading} style={{ ...primaryBtn, background: loading ? '#CCC' : '#2E7D32' }}>
              {loading ? '⏳ Creating trade...' : '✅ Accept Terms & Create Trade'}
            </button>
            <button onClick={cancelAndClose} disabled={loading} style={ghostBtn}>Cancel</button>
          </>
        )}

        {/* STEP 2: FUND */}
        {step === 'fund' && trade && (
          <>
            <div style={card}>
              <p style={{ fontSize:11, fontWeight:'bold', color:'#555', margin:'0 0 8px', textTransform:'uppercase' }}>Trade Created</p>
              <div style={row}><span style={{ color:'#666' }}>Trade ID</span><strong style={{ fontFamily:'monospace', fontSize:11 }}>{trade.id}</strong></div>
              <div style={row}><span style={{ color:'#666' }}>Status</span><strong style={{ color:'#E65100' }}>{trade.status?.replace('_', ' ')}</strong></div>
              <div style={{ ...row, borderTop:'1px solid #F0F0F0', paddingTop:10, marginTop:6 }}>
                <span style={{ color:'#2E7D32', fontWeight:'bold' }}>Amount to escrow</span>
                <strong style={{ color:'#2E7D32', fontSize:17 }}>KES {amount.toLocaleString()}</strong>
              </div>
            </div>

            <label style={labelStyle}>Your M-Pesa phone number</label>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="07XX XXX XXX"
              type="tel"
              style={inputStyle}
            />

            <div style={{ background:'#FFF8E1', border:'1px solid #FFD54F', borderRadius:10, padding:12, marginTop:12 }}>
              <p style={{ margin:0, fontSize:11, color:'#E65100', lineHeight:1.5 }}>
                You'll receive an STK prompt for <strong>KES {amount.toLocaleString()}</strong>. Enter your M-Pesa PIN to fund escrow.
              </p>
            </div>

            <button onClick={handleFund} disabled={loading} style={{ ...primaryBtn, background: loading ? '#CCC' : '#2E7D32' }}>
              {loading ? '⏳ Starting STK...' : `💰 Fund Escrow — KES ${amount.toLocaleString()}`}
            </button>
            <button onClick={cancelAndClose} disabled={loading} style={ghostBtn}>Cancel</button>
          </>
        )}

        {/* STEP 3: WAITING */}
        {step === 'waiting' && (
          <div style={{ textAlign:'center', padding:'20px 0' }}>
            <div style={{ fontSize:56, marginBottom:12 }}>📱</div>
            <strong style={{ fontSize:16, color:'#333', display:'block', marginBottom:8 }}>
              {mode === 'simulated' ? 'Processing (simulated)...' : 'Check your phone'}
            </strong>
            <p style={{ fontSize:13, color:'#666', margin:0, lineHeight:1.5 }}>
              {mode === 'simulated'
                ? 'Simulated funding in progress — this will complete shortly.'
                : `Enter your M-Pesa PIN for KES ${amount.toLocaleString()}.`}
            </p>
            <p style={{ fontSize:11, color:'#999', marginTop:12 }}>
              Waiting... {Math.floor(elapsedMs / 1000)}s
            </p>
            <div style={{ marginTop:20, display:'flex', justifyContent:'center' }}>
              <div style={{ width:36, height:36, border:'4px solid #E0E0E0', borderTopColor:'#2E7D32', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* SUCCESS */}
        {step === 'success' && (
          <div style={{ textAlign:'center', padding:'10px 0' }}>
            <div style={{ fontSize:56, marginBottom:12 }}>🎉</div>
            <strong style={{ fontSize:18, color:'#2E7D32', display:'block', marginBottom:8 }}>
              Escrow Funded
            </strong>
            <p style={{ fontSize:13, color:'#666', margin:0, lineHeight:1.5 }}>
              The seller has been notified. Delivery can now be arranged.
            </p>
            <div style={{ background:'#F9FAFB', borderRadius:10, padding:12, marginTop:16, textAlign:'left' }}>
              <p style={{ fontSize:11, color:'#666', margin:'0 0 4px' }}>Trade ID (keep this):</p>
              <p style={{ fontSize:12, fontFamily:'monospace', color:'#333', margin:0, fontWeight:'bold' }}>{trade?.id || '—'}</p>
            </div>
            {onTrack && (
              <button
                onClick={() => { onTrack(trade.id); onClose(); }}
                style={{ ...primaryBtn, background:'#2E7D32' }}
              >
                📊 Track This Trade
              </button>
            )}
            <button onClick={cancelAndClose} style={ghostBtn}>Close</button>
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
                If you entered your PIN, wait a moment and reopen the app. Check your trades list to see if the status updated.
              </p>
            </div>
            {trade && onTrack && (
              <button onClick={() => { onTrack(trade.id); onClose(); }} style={{ ...primaryBtn, background:'#1976D2' }}>
                📊 View Trade Status
              </button>
            )}
            <button onClick={cancelAndClose} style={ghostBtn}>Close</button>
          </>
        )}
      </div>
    </div>
  );
}
