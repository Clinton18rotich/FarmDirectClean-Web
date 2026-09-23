// FILE: src/components/TransferOwnershipModal.jsx
import React, { useState } from 'react';
import { api } from '../services/api';
import { resizeImageFile } from '../utils/imageUtils';

const inputStyle = { width:'100%', padding:'12px 14px', borderRadius:10, border:'2px solid #E0E0E0', fontSize:15, marginBottom:8, boxSizing:'border-box', fontFamily:'inherit', color:'#333' };
const labelStyle = { fontSize:12, fontWeight:'bold', color:'#555', display:'block', marginBottom:4, marginTop:10 };
const primaryBtn = { width:'100%', padding:14, color:'white', border:'none', borderRadius:25, fontSize:15, fontWeight:'bold', cursor:'pointer', marginTop:8, boxSizing:'border-box' };
const ghostBtn = { width:'100%', padding:12, background:'none', color:'#666', border:'none', fontSize:14, cursor:'pointer', marginTop:4, boxSizing:'border-box' };

const REASONS = [
  { value:'sale',        label:'💰 Sold (direct, cash)', hint:'Cash sale outside the marketplace' },
  { value:'gift',        label:'🎁 Gift',                hint:'Needs 2 witnesses' },
  { value:'inheritance', label:'📜 Inheritance',         hint:'Passed down through family' },
  { value:'dowry',       label:'💍 Dowry',               hint:'Bride price / traditional transfer' },
  { value:'other',       label:'✏️ Other',               hint:'Explain below' },
];

export default function TransferOwnershipModal({ animal, onClose, onUpdated }) {
  const [reason, setReason] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [note, setNote] = useState('');
  const [witnesses, setWitnesses] = useState([
    { name:'', phone:'' },
    { name:'', phone:'' },
  ]);
  const [newPhoto, setNewPhoto] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const reasonMeta = REASONS.find(r => r.value === reason);
  const needsWitnesses = reason === 'gift';

  const setWitness = (idx, field, value) => {
    const next = [...witnesses];
    next[idx] = { ...next[idx], [field]: value };
    setWitnesses(next);
  };

  const handlePhoto = async (file) => {
    if (!file) return;
    try {
      const resized = await resizeImageFile(file, { maxDim: 800, quality: 0.6 });
      setNewPhoto(resized);
    } catch (err) {
      setError('Photo processing failed: ' + err.message);
    }
  };

  const validate = () => {
    if (!reason) return 'Choose a reason';
    if (!recipientName.trim()) return 'Recipient name required';
    if (needsWitnesses) {
      for (let i = 0; i < 2; i++) {
        if (!witnesses[i].name.trim() || !witnesses[i].phone.trim()) {
          return `Witness ${i + 1}: name and phone required`;
        }
      }
    }
    if (reason === 'other' && !note.trim()) return 'Please describe the transfer';
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError(null);
    setLoading(true);
    try {
      const payload = {
        fromOwnerId: animal.ownerId,
        toOwnerId: recipientId.trim() || undefined,
        toOwnerName: recipientName.trim(),
        toOwnerPhone: recipientPhone.trim() || undefined,
        transferReason: reason,
        transferNote: note.trim() || undefined,
        witnesses: needsWitnesses ? witnesses : undefined,
        newPhoto: newPhoto || undefined,
      };
      const result = await api.shamba.transferOwnership(animal.passportId, payload);
      if (!result.success) throw new Error(result.message);
      setDone(true);
      if (onUpdated) onUpdated(result.animal);
      setTimeout(() => onClose(), 1500);
    } catch (e) {
      setError(e.message);
      setConfirming(false);
    } finally {
      setLoading(false);
    }
  };

  // ─── SUCCESS ───
  if (done) {
    return (
      <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.7)',zIndex:2500,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
        <div style={{background:'white',borderRadius:16,padding:30,maxWidth:360,width:'100%',textAlign:'center'}}>
          <div style={{fontSize:48,marginBottom:10}}>✅</div>
          <h3 style={{margin:'0 0 8px',color:'#2E7D32'}}>Transfer recorded</h3>
          <p style={{fontSize:13,color:'#666',margin:0,lineHeight:1.5}}>
            {animal.passportId} is now owned by {recipientName}.
          </p>
          <p style={{fontSize:11,color:'#999',margin:'12px 0 0'}}>30-day lock is now active.</p>
        </div>
      </div>
    );
  }

  // ─── CONFIRM STEP ───
  if (confirming) {
    return (
      <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.7)',zIndex:2500,display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={onClose}>
        <div style={{background:'white',borderRadius:'20px 20px 0 0',padding:20,maxWidth:480,width:'100%',maxHeight:'92vh',overflowY:'auto'}} onClick={e => e.stopPropagation()}>
          <h3 style={{margin:'0 0 12px',color:'#2E7D32',fontSize:18}}>Confirm Transfer</h3>
          <div style={{background:'#FFF3E0',border:'1px solid #FFB74D',borderRadius:10,padding:12,marginBottom:14}}>
            <strong style={{fontSize:12,color:'#E65100'}}>⚠️ This cannot be undone</strong>
            <p style={{fontSize:11,color:'#BF360C',margin:'4px 0 0',lineHeight:1.5}}>
              After this transfer, the animal is locked for 30 days. No further transfer or sale is possible during that window.
            </p>
          </div>

          <div style={{background:'#F9FAFB',borderRadius:10,padding:14,marginBottom:14,fontSize:13,lineHeight:1.8}}>
            <div><strong>Animal:</strong> {animal.type} {animal.breed} ({animal.passportId})</div>
            <div><strong>Reason:</strong> {reasonMeta?.label}</div>
            <div><strong>New owner:</strong> {recipientName}{recipientPhone ? ` · ${recipientPhone}` : ''}</div>
            {needsWitnesses && (
              <div style={{marginTop:6}}>
                <strong>Witnesses:</strong>
                <div style={{paddingLeft:10}}>• {witnesses[0].name} ({witnesses[0].phone})</div>
                <div style={{paddingLeft:10}}>• {witnesses[1].name} ({witnesses[1].phone})</div>
              </div>
            )}
            {note && <div><strong>Note:</strong> {note}</div>}
            {newPhoto && <div style={{marginTop:6}}><strong>New photo:</strong> attached ✓</div>}
          </div>

          {error && (
            <div style={{background:'#FFEBEE',padding:12,borderRadius:10,marginBottom:12}}>
              <strong style={{color:'#C62828',fontSize:12}}>⚠️ {error}</strong>
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading} style={{...primaryBtn, background: loading ? '#ccc' : '#2E7D32'}}>
            {loading ? '⏳ Transferring...' : '✅ Confirm Transfer'}
          </button>
          <button onClick={() => setConfirming(false)} disabled={loading} style={ghostBtn}>← Back to edit</button>
        </div>
      </div>
    );
  }

  // ─── EDIT STEP ───
  return (
    <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.7)',zIndex:2500,display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={onClose}>
      <div style={{background:'white',borderRadius:'20px 20px 0 0',padding:20,maxWidth:480,width:'100%',maxHeight:'92vh',overflowY:'auto'}} onClick={e => e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <div>
            <h3 style={{margin:0,color:'#2E7D32',fontSize:18}}>🤝 Transfer Ownership</h3>
            <p style={{fontSize:11,color:'#666',margin:'2px 0 0'}}>{animal.passportId} · {animal.type} {animal.breed}</p>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:24,cursor:'pointer',color:'#666'}}>✕</button>
        </div>

        {error && (
          <div style={{background:'#FFEBEE',padding:12,borderRadius:10,marginBottom:12}}>
            <strong style={{color:'#C62828',fontSize:12}}>⚠️ {error}</strong>
          </div>
        )}

        <div style={{background:'#E8F5E9',padding:10,borderRadius:10,marginBottom:8,border:'1px solid #A5D6A7'}}>
          <p style={{fontSize:11,color:'#1B5E20',margin:0,lineHeight:1.5}}>
            Use this for gifts, inheritance, dowry, and direct cash sales. For marketplace sales, use <strong>💰 List for Sale</strong> instead.
          </p>
        </div>

        <label style={labelStyle}>Reason for transfer</label>
        <select
          value={reason}
          onChange={e => { setReason(e.target.value); setError(null); }}
          style={inputStyle}
        >
          <option value="">— Choose —</option>
          {REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        {reasonMeta?.hint && (
          <p style={{fontSize:11,color:'#666',margin:'-4px 0 8px',fontStyle:'italic'}}>{reasonMeta.hint}</p>
        )}

        <label style={labelStyle}>Recipient name *</label>
        <input value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder="Full name" style={inputStyle} />

        <label style={labelStyle}>Recipient phone (optional)</label>
        <input value={recipientPhone} onChange={e => setRecipientPhone(e.target.value)} placeholder="07XX XXX XXX" type="tel" style={inputStyle} />

        <label style={labelStyle}>Recipient FarmDirect ID (optional)</label>
        <input value={recipientId} onChange={e => setRecipientId(e.target.value)} placeholder="Leave blank if they're not on FarmDirect yet" style={inputStyle} />

        {needsWitnesses && (
          <div style={{background:'#FFF8E1',border:'1px solid #FFD54F',borderRadius:10,padding:14,marginTop:10,marginBottom:6}}>
            <strong style={{fontSize:12,color:'#E65100'}}>👥 2 Witnesses required for gifts</strong>
            <p style={{fontSize:11,color:'#BF360C',margin:'4px 0 10px',lineHeight:1.4}}>
              Both witnesses must be reachable by phone. They may be contacted to confirm this gift.
            </p>
            {[0, 1].map(i => (
              <div key={i} style={{marginBottom:8}}>
                <label style={labelStyle}>Witness {i + 1} name *</label>
                <input value={witnesses[i].name} onChange={e => setWitness(i, 'name', e.target.value)} placeholder="Full name" style={inputStyle} />
                <input value={witnesses[i].phone} onChange={e => setWitness(i, 'phone', e.target.value)} placeholder="Phone" type="tel" style={inputStyle} />
              </div>
            ))}
          </div>
        )}

        <label style={labelStyle}>Note / explanation (optional)</label>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder={reason === 'other' ? 'Required — describe the transfer' : 'Any extra context (e.g. "given to my daughter on her wedding")'}
          rows={3}
          style={{...inputStyle, resize:'vertical', minHeight:70}}
        />

        <label style={labelStyle}>Add a current photo (optional)</label>
        <p style={{fontSize:11,color:'#666',margin:'0 0 6px'}}>Becomes the new primary photo — good for documenting condition at transfer time.</p>
        <div style={{display:'flex',gap:8,marginBottom:8}}>
          <button type="button" onClick={() => document.getElementById('transfer-camera').click()} style={{flex:1,background:'#2E7D32',color:'white',border:'none',padding:12,borderRadius:10,fontSize:12,fontWeight:'bold',cursor:'pointer'}}>
            📷 Take Photo
          </button>
          <button type="button" onClick={() => document.getElementById('transfer-gallery').click()} style={{flex:1,background:'white',color:'#2E7D32',border:'2px solid #2E7D32',padding:10,borderRadius:10,fontSize:12,fontWeight:'bold',cursor:'pointer'}}>
            🖼️ From Gallery
          </button>
        </div>
        {newPhoto && (
          <div style={{marginBottom:8}}>
            <img src={newPhoto} alt="Transfer photo" style={{width:'100%',maxHeight:180,objectFit:'cover',borderRadius:10}} />
            <button onClick={() => setNewPhoto(null)} style={{background:'none',border:'none',color:'#C62828',fontSize:12,cursor:'pointer',marginTop:4,textDecoration:'underline'}}>
              Remove photo
            </button>
          </div>
        )}
        <input type="file" accept="image/*" capture="environment" id="transfer-camera" onChange={e => { handlePhoto(e.target.files?.[0]); e.target.value = ''; }} style={{display:'none'}} />
        <input type="file" accept="image/*" id="transfer-gallery" onChange={e => { handlePhoto(e.target.files?.[0]); e.target.value = ''; }} style={{display:'none'}} />

        <button onClick={() => { const err = validate(); if (err) { setError(err); return; } setError(null); setConfirming(true); }} style={primaryBtn}>
          Continue →
        </button>
        <button onClick={onClose} style={ghostBtn}>Cancel</button>
      </div>
    </div>
  );
}
