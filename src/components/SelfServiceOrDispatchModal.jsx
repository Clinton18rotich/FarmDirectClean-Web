// FILE: src/components/SelfServiceOrDispatchModal.jsx
// Session 6.21 — choice screen for farmer-vets.
// Shown when a user who is BOTH owner AND a KVB-verified vet reports a
// sick animal. They can self-treat (documented as vet-verified) or
// request another vet.
import React from 'react';

export default function SelfServiceOrDispatchModal({
  animal,
  reporterVetName,
  onSelfService,
  onRequestAnother,
  onClose,
}) {
  return (
    <div
      style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.7)',zIndex:2600,display:'flex',alignItems:'flex-end',justifyContent:'center'}}
      onClick={onClose}
    >
      <div
        style={{background:'white',borderRadius:'20px 20px 0 0',padding:20,maxWidth:480,width:'100%',maxHeight:'92vh',overflowY:'auto'}}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
          <div>
            <h3 style={{ margin:0, color:'#2E7D32', fontSize:18 }}>🩺 You're a KVB-verified vet</h3>
            <p style={{ fontSize:11, color:'#666', margin:'2px 0 0' }}>
              {animal?.type} {animal?.breed} · {animal?.passportId}
            </p>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:24, cursor:'pointer', color:'#666' }}>✕</button>
        </div>

        <div style={{ background:'#E8F5E9', border:'1px solid #A5D6A7', borderRadius:12, padding:12, marginBottom:14 }}>
          <p style={{ margin:0, fontSize:12, color:'#1B5E20', lineHeight:1.5 }}>
            You're the owner of this animal AND a verified veterinarian
            {reporterVetName ? ` (${reporterVetName})` : ''}.
            How would you like to handle this case?
          </p>
        </div>

        <button
          onClick={onSelfService}
          style={{ display:'block', width:'100%', textAlign:'left', background:'white', border:'2px solid #2E7D32', padding:16, borderRadius:14, marginBottom:10, cursor:'pointer', fontFamily:'inherit' }}
        >
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ fontSize:28 }}>🩺</div>
            <div style={{ flex:1 }}>
              <strong style={{ display:'block', fontSize:14, color:'#2E7D32', marginBottom:4 }}>Record your own treatment</strong>
              <p style={{ margin:0, fontSize:11, color:'#666', lineHeight:1.4 }}>
                Log the diagnosis and treatment as a vet-verified event. Perfect for routine care.
              </p>
            </div>
          </div>
        </button>

        <button
          onClick={onRequestAnother}
          style={{ display:'block', width:'100%', textAlign:'left', background:'white', border:'2px solid #1565C0', padding:16, borderRadius:14, marginBottom:14, cursor:'pointer', fontFamily:'inherit' }}
        >
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ fontSize:28 }}>👥</div>
            <div style={{ flex:1 }}>
              <strong style={{ display:'block', fontSize:14, color:'#1565C0', marginBottom:4 }}>Request another vet</strong>
              <p style={{ margin:0, fontSize:11, color:'#666', lineHeight:1.4 }}>
                Dispatch the case to the nearest external vet. Good for second opinions.
              </p>
            </div>
          </div>
        </button>

        <div style={{ background:'#FFF8E1', border:'1px solid #FFD54F', borderRadius:10, padding:12, marginBottom:10 }}>
          <p style={{ margin:0, fontSize:11, color:'#E65100', lineHeight:1.5 }}>
            ⚖️ <strong>Legal note:</strong> Some actions require an external vet for legal
            verification — death certificates, slaughter approvals, and
            disease outbreak reports. For those, the platform always
            dispatches to another vet.
          </p>
        </div>

        <button
          onClick={onClose}
          style={{ width:'100%', padding:14, background:'#F0F0F0', color:'#666', border:'none', borderRadius:25, fontSize:14, fontWeight:'bold', cursor:'pointer' }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
