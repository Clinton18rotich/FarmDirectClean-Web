// FILE: src/components/RequireIdentityModal.jsx
// Session 6.20e — prompt shown when an anonymous user taps an action
// that requires identity (unlock, offer, message, list animal).
import React from 'react';

const primaryBtn = { width:'100%', padding:15, color:'white', border:'none', borderRadius:25, fontSize:15, fontWeight:'bold', cursor:'pointer', marginTop:8, boxSizing:'border-box' };

export default function RequireIdentityModal({
  action,             // 'unlock this listing', 'make an offer', 'message this seller', 'list an animal'
  roleHint,           // 'buyer' | 'farmer' | null — how to frame the CTA
  onSignIn,
  onCreate,
  onClose,
}) {
  const actionText = action || 'continue';
  const isFarmer = roleHint === 'farmer';

  return (
    <div
      style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.7)', zIndex:2650, display:'flex', alignItems:'flex-end', justifyContent:'center' }}
      onClick={onClose}
    >
      <div
        style={{ background:'white', borderRadius:'20px 20px 0 0', padding:22, maxWidth:480, width:'100%', maxHeight:'92vh', overflowY:'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:40, marginBottom:6 }}>{isFarmer ? '🌾' : '🔑'}</div>
            <h3 style={{ margin:0, color:'#2E7D32', fontSize:18 }}>Sign in to {actionText}</h3>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:24, cursor:'pointer', color:'#666', padding:0, lineHeight:1 }}>✕</button>
        </div>

        <div style={{ background:'#E8F5E9', border:'1px solid #A5D6A7', borderRadius:12, padding:12, marginBottom:14 }}>
          <p style={{ margin:0, fontSize:12, color:'#1B5E20', lineHeight:1.5 }}>
            {isFarmer ? (
              <>Register as a farmer to list animals. <strong>Free</strong> — no fee to list.</>
            ) : (
              <>
                <strong>Buyers register free.</strong> You only pay KES 100 when you unlock a seller's contact on a specific listing.
              </>
            )}
          </p>
        </div>

        <button onClick={onSignIn} style={{ ...primaryBtn, background:'#2E7D32' }}>
          🔑 Sign In
        </button>
        <button onClick={onCreate} style={{ ...primaryBtn, background:'#1976D2' }}>
          ✨ Create Account
        </button>
        <button onClick={onClose} style={{ ...primaryBtn, background:'#F0F0F0', color:'#666' }}>
          Cancel
        </button>

        <p style={{ fontSize:10, color:'#999', marginTop:14, textAlign:'center', lineHeight:1.4 }}>
          No password. No SMS. Your phone number is your identity.
        </p>
      </div>
    </div>
  );
}
