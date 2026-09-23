// FILE: src/components/SellingTab.jsx
// Session 5B-5b: Seller's listings + incoming offers with accept/counter/reject.
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

const card = { background:'white', border:'1px solid #E0E0E0', borderRadius:12, padding:14, marginBottom:10 };
const btn = { padding:'8px 12px', borderRadius:8, border:'none', fontSize:11, fontWeight:'bold', cursor:'pointer' };
const input = { width:'100%', padding:'10px 12px', borderRadius:8, border:'2px solid #E0E0E0', fontSize:14, boxSizing:'border-box', fontFamily:'inherit', color:'#333' };
const sectionTitle = { fontSize:12, fontWeight:'bold', color:'#555', margin:'14px 0 8px', textTransform:'uppercase', letterSpacing:0.5 };

const STATUS_META = {
  active:  { label: '● Active',  bg: '#E8F5E9', fg: '#2E7D32' },
  paused:  { label: '⏸ Paused',  bg: '#FFF3E0', fg: '#E65100' },
  sold:    { label: '✓ Sold',    bg: '#E3F2FD', fg: '#0D47A1' },
};

const OFFER_STATUS = {
  pending:   { label: '⏳ Pending',    bg: '#FFF8E1', fg: '#E65100' },
  countered: { label: '🔄 Countered',  bg: '#E3F2FD', fg: '#0D47A1' },
  accepted:  { label: '✅ Accepted',   bg: '#E8F5E9', fg: '#2E7D32' },
  rejected:  { label: '❌ Rejected',   bg: '#FFEBEE', fg: '#C62828' },
  withdrawn: { label: '↩️ Withdrawn',  bg: '#F0F0F0', fg: '#666' },
};

export default function SellingTab({ currentFarmer, onOpenListing }) {
  const [listings, setListings] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actingId, setActingId] = useState(null);

  const load = async () => {
    if (!currentFarmer?.id) {
      setListings([]); setOffers([]); setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [lRes, oRes] = await Promise.all([
        api.market.sellerListings(currentFarmer.id),
        api.market.sellerOffers(currentFarmer.id),
      ]);
      if (!lRes.success) throw new Error(lRes.message || 'Failed to load listings');
      if (!oRes.success) throw new Error(oRes.message || 'Failed to load offers');
      setListings(lRes.items || []);
      setOffers(oRes.offers || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [currentFarmer?.id]);

  const togglePause = async (listing) => {
    setActingId(listing.id);
    try {
      const isPaused = listing.status === 'paused';
      const res = isPaused
        ? await api.market.resumeListing(listing.id, { by: currentFarmer.id })
        : await api.market.pauseListing(listing.id, { by: currentFarmer.id, reason: 'Paused by seller' });
      if (!res.success) throw new Error(res.message);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActingId(null);
    }
  };

  const acceptOffer = async (offer) => {
    if (!window.confirm(`Accept offer of KES ${Number(offer.amount).toLocaleString()}?\n\nThis locks the listing. The buyer will proceed to escrow.`)) return;
    setActingId(offer.id);
    try {
      const res = await api.market.acceptOffer(offer.id, { by: currentFarmer.id });
      if (!res.success) throw new Error(res.message);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActingId(null);
    }
  };

  const rejectOffer = async (offer) => {
    const reason = window.prompt('Reason for rejection (optional):') || '';
    setActingId(offer.id);
    try {
      const res = await api.market.rejectOffer(offer.id, { by: currentFarmer.id, reason });
      if (!res.success) throw new Error(res.message);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActingId(null);
    }
  };

  const counterOffer = async (offer, amount, note) => {
    setActingId(offer.id);
    try {
      const res = await api.market.counterOffer(offer.id, {
        by: currentFarmer.id, amount, note,
      });
      if (!res.success) throw new Error(res.message);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActingId(null);
    }
  };

  if (!currentFarmer?.id) {
    return <Empty icon="👤" title="Register first" body="You need to be registered as a farmer to sell livestock." />;
  }

  if (loading) {
    return <Loading label="Loading your listings and offers..." />;
  }

  if (error) {
    return (
      <div style={{ background:'#FFEBEE', padding:14, borderRadius:10, marginTop:10 }}>
        <strong style={{ color:'#C62828', fontSize:12 }}>⚠️ {error}</strong>
        <button onClick={load} style={{ ...btn, background:'#C62828', color:'white', marginTop:10, display:'block' }}>Try again</button>
      </div>
    );
  }

  const activeListings = listings.filter(l => l.status === 'active' || l.status === 'paused');
  const activeOffers = offers.filter(o => o.status === 'pending' || o.status === 'countered');

  return (
    <>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
        <p style={{ fontSize:11, color:'#666', margin:0 }}>
          {activeListings.length} listing{activeListings.length === 1 ? '' : 's'} · {activeOffers.length} open offer{activeOffers.length === 1 ? '' : 's'}
        </p>
        <button onClick={load} style={{ ...btn, background:'white', border:'1px solid #CCC', color:'#333' }}>🔄 Refresh</button>
      </div>

      {/* Incoming offers first — action required */}
      <h4 style={sectionTitle}>📨 Incoming Offers</h4>
      {activeOffers.length === 0 ? (
        <p style={{ fontSize:12, color:'#999', fontStyle:'italic', margin:'0 0 10px' }}>No open offers right now.</p>
      ) : (
        activeOffers.map(o => (
          <IncomingOfferCard
            key={o.id}
            offer={o}
            currentFarmer={currentFarmer}
            acting={actingId === o.id}
            onAccept={() => acceptOffer(o)}
            onReject={() => rejectOffer(o)}
            onCounter={(amount, note) => counterOffer(o, amount, note)}
          />
        ))
      )}

      {/* Listings below */}
      <h4 style={sectionTitle}>🏷️ Your Listings</h4>
      {activeListings.length === 0 ? (
        <Empty icon="🐄" title="No listings yet" body="List an animal for sale from the Livestock module. It'll appear here and in the public marketplace." />
      ) : (
        activeListings.map(l => (
          <SellerListingCard
            key={l.id}
            listing={l}
            acting={actingId === l.id}
            onTogglePause={() => togglePause(l)}
            onOpen={() => onOpenListing && onOpenListing(l.id)}
          />
        ))
      )}
    </>
  );
}

function IncomingOfferCard({ offer, currentFarmer, acting, onAccept, onReject, onCounter }) {
  const meta = OFFER_STATUS[offer.status] || OFFER_STATUS.pending;
  const [showCounter, setShowCounter] = useState(false);
  const [counterAmount, setCounterAmount] = useState(String(offer.amount || ''));
  const [counterNote, setCounterNote] = useState('');
  const isSellerTurn = offer.currentTurn === 'seller';

  return (
    <div style={card}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10, marginBottom:8 }}>
        <div style={{ minWidth:0 }}>
          <strong style={{ fontSize:14, color:'#333' }}>
            {offer.buyerName || 'Buyer'} · Offer #{offer.id?.slice(-6) || '—'}
          </strong>
          <p style={{ fontSize:11, color:'#888', margin:'2px 0 0', fontFamily:'monospace' }}>{offer.passportId || '—'}</p>
        </div>
        <span style={{ fontSize:10, background:meta.bg, color:meta.fg, padding:'4px 8px', borderRadius:6, fontWeight:'bold', flexShrink:0 }}>
          {meta.label}
        </span>
      </div>

      <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'6px 0', borderTop:'1px solid #F5F5F5', borderBottom:'1px solid #F5F5F5', margin:'6px 0' }}>
        <span style={{ color:'#666' }}>Buyer offered</span>
        <strong style={{ color:'#2E7D32' }}>KES {Number(offer.amount || 0).toLocaleString()}</strong>
      </div>

      {isSellerTurn && (
        <div style={{ background:'#FFF8E1', borderRadius:8, padding:8, marginBottom:8, fontSize:11, color:'#E65100', fontWeight:'bold', textAlign:'center' }}>
          🎯 Your turn to respond
        </div>
      )}

      {!showCounter ? (
        <div style={{ display:'flex', gap:6, marginTop:6 }}>
          <button onClick={onAccept} disabled={acting} style={{ ...btn, background:'#2E7D32', color:'white', flex:1, opacity: acting ? 0.6 : 1 }}>
            {acting ? '⏳' : '✅ Accept'}
          </button>
          <button onClick={() => setShowCounter(true)} disabled={acting} style={{ ...btn, background:'#1976D2', color:'white', flex:1, opacity: acting ? 0.6 : 1 }}>
            🔄 Counter
          </button>
          <button onClick={onReject} disabled={acting} style={{ ...btn, background:'#FFEBEE', color:'#C62828', border:'1px solid #EF9A9A', flex:1, opacity: acting ? 0.6 : 1 }}>
            ❌ Reject
          </button>
        </div>
      ) : (
        <div style={{ background:'#F9FAFB', borderRadius:8, padding:10, marginTop:8, border:'1px solid #E0E0E0' }}>
          <label style={{ fontSize:11, fontWeight:'bold', color:'#555', display:'block', marginBottom:4 }}>Counter amount (KES)</label>
          <input
            value={counterAmount}
            onChange={e => setCounterAmount(e.target.value.replace(/[^\d]/g, ''))}
            inputMode="numeric"
            style={{ ...input, marginBottom:8 }}
          />
          <label style={{ fontSize:11, fontWeight:'bold', color:'#555', display:'block', marginBottom:4 }}>Note (optional)</label>
          <input
            value={counterNote}
            onChange={e => setCounterNote(e.target.value)}
            placeholder='e.g. "Lowest I can go"'
            style={{ ...input, marginBottom:10 }}
          />
          <div style={{ display:'flex', gap:6 }}>
            <button
              onClick={() => { onCounter(Number(counterAmount), counterNote); setShowCounter(false); }}
              disabled={acting || !counterAmount}
              style={{ ...btn, background:'#1976D2', color:'white', flex:1, opacity: (acting || !counterAmount) ? 0.6 : 1 }}
            >
              Send counter
            </button>
            <button onClick={() => setShowCounter(false)} style={{ ...btn, background:'white', border:'1px solid #CCC', color:'#666' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <p style={{ fontSize:10, color:'#999', margin:'8px 0 0' }}>
        Updated {offer.updatedAt ? new Date(offer.updatedAt).toLocaleString() : '—'}
      </p>
    </div>
  );
}

function SellerListingCard({ listing, acting, onTogglePause, onOpen }) {
  const meta = STATUS_META[listing.status] || STATUS_META.active;
  const isPaused = listing.status === 'paused';

  return (
    <div style={card}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10, marginBottom:8 }}>
        <div style={{ minWidth:0 }}>
          <strong style={{ fontSize:14, color:'#333' }}>{listing.type}{listing.breed ? ` · ${listing.breed}` : ''}</strong>
          <p style={{ fontSize:11, color:'#888', margin:'2px 0 0', fontFamily:'monospace' }}>{listing.passportId || '—'}</p>
        </div>
        <span style={{ fontSize:10, background:meta.bg, color:meta.fg, padding:'4px 8px', borderRadius:6, fontWeight:'bold', flexShrink:0 }}>
          {meta.label}
        </span>
      </div>

      <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'6px 0', borderTop:'1px solid #F5F5F5', borderBottom:'1px solid #F5F5F5', margin:'6px 0' }}>
        <span style={{ color:'#666' }}>Asking</span>
        <strong style={{ color:'#2E7D32' }}>KES {Number(listing.askingPrice || 0).toLocaleString()}</strong>
      </div>

      <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#666' }}>
        <span>{listing.views || 0} views · {listing.offerCount || 0} offers</span>
        <span>{listing.location?.county || 'Kenya'}</span>
      </div>

      <div style={{ display:'flex', gap:6, marginTop:10 }}>
        {onOpen && (
          <button onClick={onOpen} style={{ ...btn, background:'white', border:'1px solid #CCC', color:'#333', flex:1 }}>
            View
          </button>
        )}
        <button onClick={onTogglePause} disabled={acting} style={{ ...btn, background: isPaused ? '#E8F5E9' : '#FFF3E0', color: isPaused ? '#2E7D32' : '#E65100', border: `1px solid ${isPaused ? '#A5D6A7' : '#FFB74D'}`, flex:1, opacity: acting ? 0.6 : 1 }}>
          {acting ? '⏳' : isPaused ? '▶️ Resume' : '⏸ Pause'}
        </button>
      </div>
    </div>
  );
}

function Empty({ icon, title, body }) {
  return (
    <div style={{ textAlign:'center', padding:'40px 20px', color:'#666' }}>
      <div style={{ fontSize:44, marginBottom:12 }}>{icon}</div>
      <strong style={{ fontSize:15, color:'#333', display:'block', marginBottom:8 }}>{title}</strong>
      <p style={{ fontSize:12, lineHeight:1.5, margin:0 }}>{body}</p>
    </div>
  );
}

function Loading({ label }) {
  return (
    <div style={{ textAlign:'center', padding:40 }}>
      <div style={{ fontSize:28 }}>⏳</div>
      <p style={{ fontSize:12, color:'#666', marginTop:8 }}>{label}</p>
    </div>
  );
}
