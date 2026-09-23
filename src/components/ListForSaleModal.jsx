import React, { useState } from 'react';
import { api } from '../services/api';

const inputStyle = { width:'100%', padding:'12px 14px', borderRadius:10, border:'2px solid #E0E0E0', fontSize:15, marginBottom:8, boxSizing:'border-box', fontFamily:'inherit', color:'#333' };
const labelStyle = { fontSize:12, fontWeight:'bold', color:'#555', display:'block', marginBottom:4, marginTop:10 };
const primaryBtn = { width:'100%', padding:14, color:'white', border:'none', borderRadius:25, fontSize:15, fontWeight:'bold', cursor:'pointer', marginTop:8, boxSizing:'border-box' };

export default function ListForSaleModal({ animal, onClose, onListed }) {
  const [askingPrice, setAskingPrice] = useState('');
  const [negotiable, setNegotiable] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submit = async () => {
    setError(null);
    const price = parseInt(askingPrice);
    if (!price || price < 100) {
      setError('Enter a valid price (minimum KES 100)');
      return;
    }

    setLoading(true);
    try {
      // 1. Mark for sale in shamba
      const fsResult = await api.shamba.listForSale(animal.passportId, {
        ownerId: animal.ownerId,
        askingPrice: price,
        negotiable,
      });
      if (!fsResult.success) throw new Error(fsResult.message);

      // 2. Create market listing
      const mlResult = await api.market.createListing({
        passportId: animal.passportId,
        sellerId: animal.ownerId,
      });
      if (!mlResult.success) throw new Error(mlResult.message);

      // Success
      if (onListed) onListed(mlResult.listing);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to list animal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.7)',zIndex:900,display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={onClose}>
      <div style={{background:'white',borderRadius:'20px 20px 0 0',padding:20,maxWidth:480,width:'100%',maxHeight:'92vh',overflowY:'auto'}} onClick={e => e.stopPropagation()}>

        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <div>
            <h3 style={{margin:0,color:'#2E7D32',fontSize:18}}>💰 List for Sale</h3>
            <p style={{fontSize:11,color:'#666',margin:'2px 0 0'}}>{animal.type} · {animal.breed}</p>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:24,cursor:'pointer',color:'#666'}}>✕</button>
        </div>

        {error && (
          <div style={{background:'#FFEBEE',padding:12,borderRadius:10,marginBottom:12}}>
            <strong style={{color:'#C62828',fontSize:12}}>⚠️ {error}</strong>
          </div>
        )}

        <div style={{background:'#F9FAFB',padding:14,borderRadius:12,marginBottom:16,border:'1px solid #E0E0E0'}}>
          <p style={{fontSize:11,margin:'2px 0',color:'#666'}}>Passport</p>
          <p style={{fontSize:13,margin:'2px 0',fontFamily:'monospace',fontWeight:'bold'}}>{animal.passportId}</p>
          <p style={{fontSize:11,margin:'6px 0 2px',color:'#666'}}>Location</p>
          <p style={{fontSize:13,margin:'2px 0'}}>📍 {animal.location?.ward || animal.location?.county || 'Unknown'}</p>
        </div>

        <label style={labelStyle}>Asking Price (KES) *</label>
        <input
          type="number"
          value={askingPrice}
          onChange={e => setAskingPrice(e.target.value)}
          placeholder="e.g. 85000"
          style={inputStyle}
          autoFocus
        />

        <div style={{display:'flex',alignItems:'center',gap:10,marginTop:12,padding:12,background:'#F0F4F8',borderRadius:10}}>
          <input
            type="checkbox"
            checked={negotiable}
            onChange={e => setNegotiable(e.target.checked)}
            style={{width:20,height:20,cursor:'pointer'}}
          />
          <label style={{fontSize:13,cursor:'pointer'}}>Open to offers (negotiable)</label>
        </div>

        <div style={{background:'#E8F5E9',padding:12,borderRadius:10,marginTop:12,border:'1px solid #A5D6A7'}}>
          <strong style={{fontSize:12,color:'#1B5E20'}}>🔒 What happens next</strong>
          <ul style={{margin:'6px 0 0',paddingLeft:18,fontSize:11,color:'#2E7D32',lineHeight:1.6}}>
            <li>Your animal appears in the public marketplace</li>
            <li>Buyers can pay KES 100 to unlock your contact</li>
            <li>You'll receive offers — accept, counter, or reject</li>
            <li>You can withdraw the listing any time before a sale</li>
          </ul>
        </div>

        <button
          onClick={submit}
          disabled={loading || !askingPrice}
          style={{...primaryBtn, background: !loading && askingPrice ? '#2E7D32' : '#ccc'}}
        >
          {loading ? '⏳ Listing...' : '💰 List for Sale'}
        </button>

        <button onClick={onClose} style={{...primaryBtn, background:'none', color:'#666', marginTop:4}}>
          Cancel
        </button>
      </div>
    </div>
  );
}
