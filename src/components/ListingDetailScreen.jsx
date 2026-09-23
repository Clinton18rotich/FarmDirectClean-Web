// FILE: src/components/ListingDetailScreen.jsx
// Session 5B-2: Full-screen listing detail + animal passport view.
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import PhotoViewer from './PhotoViewer';

const card = { background:'white', border:'1px solid #E0E0E0', borderRadius:12, padding:14, marginBottom:12 };
const sectionTitle = { fontSize:12, fontWeight:'bold', color:'#555', margin:'0 0 8px', textTransform:'uppercase', letterSpacing:0.5 };
const row = { display:'flex', justifyContent:'space-between', fontSize:13, padding:'6px 0', borderBottom:'1px solid #F5F5F5' };
const primaryBtn = { width:'100%', padding:14, color:'white', border:'none', borderRadius:25, fontSize:15, fontWeight:'bold', cursor:'pointer', marginTop:8, boxSizing:'border-box' };

export default function ListingDetailScreen({ listingId, currentFarmer, onClose, onUnlock, onMakeOffer }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [photoViewer, setPhotoViewer] = useState(null);
  const [activePhoto, setActivePhoto] = useState(0);

  const buyerId = currentFarmer?.id || null;

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.market.getListing(listingId, buyerId);
      if (!res.success) throw new Error(res.message || 'Failed to load listing');
      setData(res);
      setActivePhoto(0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (listingId) load(); }, [listingId]);

  if (loading) {
    return (
      <Shell onClose={onClose}>
        <div style={{ textAlign:'center', padding:60 }}>
          <div style={{ fontSize:32 }}>⏳</div>
          <p style={{ fontSize:12, color:'#666', marginTop:8 }}>Loading listing...</p>
        </div>
      </Shell>
    );
  }

  if (error || !data) {
    return (
      <Shell onClose={onClose}>
        <div style={{ background:'#FFEBEE', padding:16, borderRadius:12, margin:16 }}>
          <strong style={{ color:'#C62828', fontSize:13 }}>⚠️ {error || 'Listing not found'}</strong>
          <button onClick={load} style={{ ...primaryBtn, background:'#C62828', marginTop:12 }}>Try again</button>
        </div>
      </Shell>
    );
  }

  const { listing, animal, seller, unlock } = data;
  const photos = animal.photos && animal.photos.length ? animal.photos : (animal.photoUrl ? [{ url: animal.photoUrl }] : []);
  const heroPhoto = photos[activePhoto];
  const isUnlocked = !!unlock;
  const isListable = listing.status === 'active';

  return (
    <Shell onClose={onClose}>
      {/* Theft banner */}
      {animal.isReportedStolen && (
        <div style={{ background:'#C62828', color:'white', padding:14, textAlign:'center', fontWeight:'bold', fontSize:13 }}>
          🚨 REPORTED STOLEN — do not transact
        </div>
      )}

      {/* Hero photo */}
      <div
        onClick={() => heroPhoto && setPhotoViewer({ src: typeof heroPhoto === 'string' ? heroPhoto : heroPhoto.url, caption: `${animal.type} ${animal.breed}` })}
        style={{ width:'100%', height:260, background:'#F0F0F0', overflow:'hidden', cursor:heroPhoto ? 'pointer' : 'default', position:'relative' }}
      >
        {heroPhoto ? (
          <img src={typeof heroPhoto === 'string' ? heroPhoto : heroPhoto.url} alt={animal.type} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
        ) : (
          <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:72, color:'#CCC' }}>🐄</div>
        )}
        {photos.length > 1 && (
          <div style={{ position:'absolute', bottom:12, right:12, background:'rgba(0,0,0,0.6)', color:'white', padding:'4px 10px', borderRadius:12, fontSize:11, fontWeight:'bold' }}>
            {activePhoto + 1} / {photos.length}
          </div>
        )}
      </div>

      {/* Thumbnail strip */}
      {photos.length > 1 && (
        <div style={{ display:'flex', gap:8, padding:'10px 14px', overflowX:'auto', background:'#FAFAFA', borderBottom:'1px solid #E0E0E0' }}>
          {photos.map((p, i) => {
            const url = typeof p === 'string' ? p : p.url;
            return (
              <img
                key={i}
                src={url}
                onClick={() => setActivePhoto(i)}
                alt={`Photo ${i + 1}`}
                style={{ width:52, height:52, objectFit:'cover', borderRadius:8, cursor:'pointer', border: i === activePhoto ? '3px solid #2E7D32' : '2px solid #E0E0E0', flexShrink:0 }}
              />
            );
          })}
        </div>
      )}

      <div style={{ padding:14 }}>
        {/* Title row */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10, marginBottom:10 }}>
          <div>
            <h2 style={{ margin:0, fontSize:20, color:'#333' }}>{animal.type}{animal.breed ? ` · ${animal.breed}` : ''}</h2>
            <p style={{ margin:'4px 0 0', fontSize:11, color:'#888', fontFamily:'monospace' }}>{animal.passportId}</p>
          </div>
          {listing.negotiable && (
            <span style={{ fontSize:10, background:'#E8F5E9', color:'#2E7D32', padding:'4px 8px', borderRadius:6, fontWeight:'bold' }}>NEGOTIABLE</span>
          )}
        </div>

        {/* Price card */}
        <div style={{ ...card, background:'#F1F8E9', border:'1px solid #A5D6A7', textAlign:'center' }}>
          <p style={{ margin:0, fontSize:11, color:'#2E7D32', fontWeight:'bold', textTransform:'uppercase', letterSpacing:0.5 }}>Asking Price</p>
          <p style={{ margin:'6px 0 0', fontSize:26, fontWeight:'bold', color:'#2E7D32' }}>
            KES {Number(listing.askingPrice || 0).toLocaleString()}
          </p>
          <p style={{ margin:'6px 0 0', fontSize:10, color:'#666' }}>
            {listing.views || 0} views · {listing.offerCount || 0} offers
          </p>
        </div>

        {/* Passport card */}
        <div style={card}>
          <p style={sectionTitle}>🐄 Animal Passport</p>
          <div style={row}><span style={{ color:'#666' }}>Type</span><strong>{animal.type || '—'}</strong></div>
          <div style={row}><span style={{ color:'#666' }}>Breed</span><strong>{animal.breed || '—'}</strong></div>
          <div style={row}><span style={{ color:'#666' }}>Age</span><strong>{animal.age || '—'}</strong></div>
          <div style={row}><span style={{ color:'#666' }}>Gender</span><strong>{animal.gender || '—'}</strong></div>
          <div style={row}><span style={{ color:'#666' }}>Color</span><strong>{animal.color || '—'}</strong></div>
          <div style={{ ...row, borderBottom:'none' }}>
            <span style={{ color:'#666' }}>Health</span>
            <strong style={{ color: animal.health === 'healthy' ? '#2E7D32' : '#E65100' }}>
              {animal.health || 'not recorded'}
            </strong>
          </div>
        </div>

        {/* Location */}
        <div style={card}>
          <p style={sectionTitle}>📍 Location</p>
          <p style={{ margin:0, fontSize:14, color:'#333' }}>
            {animal.location?.ward ? `${animal.location.ward}, ` : ''}{animal.location?.county || 'Kenya'}
          </p>
        </div>

        {/* History */}
        <div style={card}>
          <p style={sectionTitle}>📜 Ownership History</p>
          <p style={{ margin:'0 0 8px', fontSize:13, color:'#333' }}>
            {animal.ownershipHistory?.length || 0} recorded owner{(animal.ownershipHistory?.length || 0) === 1 ? '' : 's'}
          </p>
          {animal.ownershipHistory?.length > 0 && (
            <div style={{ maxHeight:140, overflowY:'auto' }}>
              {animal.ownershipHistory.map((h, i) => (
                <div key={i} style={{ padding:'6px 0', borderTop:'1px solid #F5F5F5', fontSize:11 }}>
                  <strong style={{ color:'#333' }}>{h.ownerName || 'Unknown'}</strong>
                  <span style={{ color:'#999', marginLeft:6 }}>since {h.from ? new Date(h.from).toLocaleDateString() : '—'}</span>
                  {h.via && <span style={{ marginLeft:6, color:'#2E7D32' }}>· via {h.via}{h.transferReason ? ` (${h.transferReason})` : ''}</span>}
                </div>
              ))}
            </div>
          )}
          {animal.vaccinations?.length > 0 && (
            <p style={{ margin:'10px 0 0', fontSize:11, color:'#2E7D32' }}>💉 {animal.vaccinations.length} vaccination{animal.vaccinations.length === 1 ? '' : 's'} on record</p>
          )}
        </div>

        {/* Seller card */}
        <div style={card}>
          <p style={sectionTitle}>👤 Seller</p>
          <p style={{ margin:'0 0 6px', fontSize:14, color:'#333' }}>
            <strong>{seller.name || 'Verified Farmer'}</strong>
            {seller.kycStatus === 'verified' && <span style={{ marginLeft:8, fontSize:10, background:'#E8F5E9', color:'#2E7D32', padding:'2px 6px', borderRadius:4, fontWeight:'bold' }}>✓ KYC</span>}
          </p>
          {isUnlocked && seller.phone ? (
            <a href={`tel:${seller.phone}`} style={{ display:'inline-block', marginTop:6, padding:'8px 14px', background:'#2E7D32', color:'white', borderRadius:8, fontSize:12, fontWeight:'bold', textDecoration:'none' }}>
              📞 Call {seller.phone}
            </a>
          ) : (
            <p style={{ margin:'6px 0 0', fontSize:11, color:'#999', fontStyle:'italic' }}>
              Contact hidden — unlock below to reveal
            </p>
          )}
        </div>

        {/* CTA */}
        {!isListable && (
          <div style={{ background:'#FFF3E0', border:'1px solid #FFB74D', borderRadius:12, padding:14, marginBottom:12, textAlign:'center' }}>
            <strong style={{ fontSize:13, color:'#E65100' }}>This listing is {listing.status}</strong>
            <p style={{ margin:'4px 0 0', fontSize:11, color:'#BF360C' }}>No offers can be made right now.</p>
          </div>
        )}

        {isListable && !isUnlocked && (
          <>
            <div style={{ background:'#E3F2FD', border:'1px solid #90CAF9', borderRadius:12, padding:12, marginBottom:10 }}>
              <p style={{ margin:0, fontSize:11, color:'#0D47A1', lineHeight:1.5 }}>
                💡 Unlock the seller's contact for <strong>KES 100</strong>. You'll see their phone number and be able to make an offer. Payment via M-Pesa.
              </p>
            </div>
            <button
              onClick={() => onUnlock && onUnlock(listing.id, () => load())}
              style={{ ...primaryBtn, background:'#1976D2' }}
            >
              🔓 Unlock Contact — KES 100
            </button>
          </>
        )}

        {isListable && isUnlocked && (
          <button
            onClick={() => onMakeOffer && onMakeOffer(listing, () => load())}
            style={{ ...primaryBtn, background:'#2E7D32' }}
          >
            📨 Make Offer
          </button>
        )}

        <button
          onClick={onClose}
          style={{ ...primaryBtn, background:'#F0F0F0', color:'#666' }}
        >
          ← Back to Marketplace
        </button>
      </div>

      {photoViewer && (
        <PhotoViewer
          src={photoViewer.src}
          caption={photoViewer.caption}
          onClose={() => setPhotoViewer(null)}
        />
      )}
    </Shell>
  );
}

function Shell({ children, onClose }) {
  return (
    <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'white', zIndex:2450, display:'flex', flexDirection:'column' }}>
      <div style={{ background:'#2E7D32', color:'white', padding:'12px 16px', display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
        <button onClick={onClose} style={{ background:'none', border:'none', color:'white', fontSize:22, cursor:'pointer', padding:0, lineHeight:1 }}>←</button>
        <strong style={{ fontSize:15 }}>Listing Details</strong>
      </div>
      <div style={{ flex:1, overflowY:'auto' }}>{children}</div>
    </div>
  );
}
