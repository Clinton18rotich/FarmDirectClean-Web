// FILE: src/components/PhotoGalleryModal.jsx
// Auto-saves on every change — no Save button, no unsaved-changes warning.
import React, { useState } from 'react';
import { api } from '../services/api';
import { resizeImageFile } from '../utils/imageUtils';

const inputStyle = { width:'100%', padding:'12px 14px', borderRadius:10, border:'2px solid #E0E0E0', fontSize:15, marginBottom:8, boxSizing:'border-box', fontFamily:'inherit', color:'#333' };
const labelStyle = { fontSize:12, fontWeight:'bold', color:'#555', display:'block', marginBottom:4, marginTop:10 };
const primaryBtn = { width:'100%', padding:14, color:'white', border:'none', borderRadius:25, fontSize:15, fontWeight:'bold', cursor:'pointer', marginTop:8, boxSizing:'border-box' };

const MAX_PHOTOS = 8;

export default function PhotoGalleryModal({ animal, onClose, onUpdated }) {
  const initialPhotos = animal.photos && animal.photos.length
    ? animal.photos
    : (animal.photoUrl ? [{ url: animal.photoUrl, age: null, addedAt: animal.registeredAt }] : []);

  const [photos, setPhotos] = useState(initialPhotos);
  const [ageLabel, setAgeLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState(null);

  const canAdd = photos.length < MAX_PHOTOS;

  // Persist full array to server. On failure, caller reverts.
  const persist = async (nextPhotos) => {
    setSaving(true);
    setError(null);
    try {
      const payload = nextPhotos.map(p => ({
        url: typeof p === 'string' ? p : p.url,
        age: typeof p === 'object' ? (p.age || null) : null,
        addedAt: typeof p === 'object' ? (p.addedAt || new Date().toISOString()) : new Date().toISOString(),
      }));
      const result = await api.shamba.updatePhotos(animal.passportId, {
        ownerId: animal.ownerId,
        photos: payload,
      });
      if (!result.success) throw new Error(result.message);
      if (onUpdated) onUpdated(result.animal);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1200);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const addPhoto = async (file) => {
    if (!file || saving) return;
    try {
      const resized = await resizeImageFile(file, { maxDim: 800, quality: 0.6 });
      const newEntry = { url: resized, age: ageLabel || null, addedAt: new Date().toISOString() };
      const next = [...photos, newEntry];
      const prev = photos;
      setPhotos(next);
      setAgeLabel('');
      const ok = await persist(next);
      if (!ok) setPhotos(prev);
    } catch (err) {
      setError('Photo processing failed: ' + err.message);
    }
  };

  const removePhoto = async (idx) => {
    if (saving) return;
    const prev = photos;
    const next = photos.filter((_, i) => i !== idx);
    setPhotos(next);
    const ok = await persist(next);
    if (!ok) setPhotos(prev);
  };

  return (
    <div
      style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.7)',zIndex:2500,display:'flex',alignItems:'flex-end',justifyContent:'center'}}
      onClick={onClose}
    >
      <div
        style={{background:'white',borderRadius:'20px 20px 0 0',padding:20,maxWidth:480,width:'100%',maxHeight:'92vh',overflowY:'auto'}}
        onClick={e => e.stopPropagation()}
      >
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <div>
            <h3 style={{margin:0,color:'#2E7D32',fontSize:18}}>📸 Photos</h3>
            <p style={{fontSize:11,color:'#666',margin:'2px 0 0'}}>{animal.passportId} · {animal.type} {animal.breed}</p>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:24,cursor:'pointer',color:'#666'}}>✕</button>
        </div>

        {error && (
          <div style={{background:'#FFEBEE',padding:12,borderRadius:10,marginBottom:12}}>
            <strong style={{color:'#C62828',fontSize:12}}>⚠️ {error}</strong>
          </div>
        )}

        {justSaved && (
          <div style={{background:'#E8F5E9',padding:8,borderRadius:8,marginBottom:10,textAlign:'center',border:'1px solid #A5D6A7'}}>
            <span style={{fontSize:12,color:'#2E7D32',fontWeight:'bold'}}>✓ Saved</span>
          </div>
        )}

        <div style={{background:'#E3F2FD',padding:12,borderRadius:10,marginBottom:14,border:'1px solid #90CAF9'}}>
          <strong style={{fontSize:12,color:'#0D47A1'}}>💡 Build a life history</strong>
          <p style={{fontSize:11,color:'#1565C0',margin:'4px 0 0',lineHeight:1.5}}>
            Add photos as the animal grows. Tag each with the age (e.g. "1 year", "3 years"). Changes save automatically.
          </p>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(3, 1fr)',gap:8,marginBottom:16}}>
          {photos.map((p, i) => {
            const url = typeof p === 'string' ? p : p.url;
            const age = typeof p === 'object' ? p.age : null;
            return (
              <div key={i} style={{position:'relative', paddingTop:'100%', background:'#F5F5F5', borderRadius:8, overflow:'hidden'}}>
                <img
                  src={url}
                  alt={`Photo ${i + 1}`}
                  style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',objectFit:'cover'}}
                />
                {i === 0 && (
                  <span style={{position:'absolute',top:4,left:4,background:'#2E7D32',color:'white',fontSize:9,padding:'2px 6px',borderRadius:4,fontWeight:'bold'}}>PRIMARY</span>
                )}
                {age && (
                  <span style={{position:'absolute',bottom:4,left:4,background:'rgba(0,0,0,0.7)',color:'white',fontSize:9,padding:'2px 6px',borderRadius:4}}>
                    {age}
                  </span>
                )}
                <button
                  onClick={() => removePhoto(i)}
                  disabled={saving}
                  style={{position:'absolute',top:4,right:4,background:'rgba(198,40,40,0.9)',color:'white',border:'none',borderRadius:'50%',width:22,height:22,fontSize:14,cursor:saving?'wait':'pointer',lineHeight:1,opacity:saving?0.5:1}}
                >×</button>
              </div>
            );
          })}
        </div>

        {canAdd ? (
          <div style={{background:'#F9FAFB',borderRadius:10,padding:14,marginBottom:14,border:'2px dashed #4CAF50',opacity:saving?0.6:1}}>
            <label style={labelStyle}>Age at this photo (optional)</label>
            <input
              value={ageLabel}
              onChange={e => setAgeLabel(e.target.value)}
              placeholder='e.g. "1 year", "3 years"'
              style={inputStyle}
              disabled={saving}
            />

            <div style={{display:'flex',gap:8,marginTop:8}}>
              <button
                type="button"
                disabled={saving}
                onClick={() => document.getElementById('gallery-camera-input').click()}
                style={{flex:1,background:'#2E7D32',color:'white',border:'none',padding:12,borderRadius:10,fontSize:12,fontWeight:'bold',cursor:saving?'wait':'pointer',opacity:saving?0.5:1}}
              >
                {saving ? '⏳' : '📷 Take Photo'}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => document.getElementById('gallery-file-input').click()}
                style={{flex:1,background:'white',color:'#2E7D32',border:'2px solid #2E7D32',padding:10,borderRadius:10,fontSize:12,fontWeight:'bold',cursor:saving?'wait':'pointer',opacity:saving?0.5:1}}
              >
                🖼️ From Gallery
              </button>
            </div>

            <input
              type="file"
              accept="image/*"
              capture="environment"
              id="gallery-camera-input"
              onChange={(e) => { addPhoto(e.target.files?.[0]); e.target.value = ''; }}
              style={{display:'none'}}
            />
            <input
              type="file"
              accept="image/*"
              id="gallery-file-input"
              onChange={(e) => { addPhoto(e.target.files?.[0]); e.target.value = ''; }}
              style={{display:'none'}}
            />
          </div>
        ) : (
          <div style={{background:'#FFF3E0',padding:12,borderRadius:10,marginBottom:14,textAlign:'center'}}>
            <strong style={{fontSize:12,color:'#E65100'}}>Maximum {MAX_PHOTOS} photos reached</strong>
          </div>
        )}

        <button onClick={onClose} disabled={saving} style={{...primaryBtn, background: saving ? '#ccc' : '#666'}}>
          {saving ? '⏳ Saving...' : 'Close'}
        </button>
      </div>
    </div>
  );
}
