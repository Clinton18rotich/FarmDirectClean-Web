// FILE: src/components/MyOffersTab.jsx
// Session 5B-5a: Buyer's active + past offers on livestock listings.
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

const card = { background:'white', border:'1px solid #E0E0E0', borderRadius:12, padding:14, marginBottom:10 };
const btn = { padding:'8px 12px', borderRadius:8, border:'none', fontSize:11, fontWeight:'bold', cursor:'pointer' };

const STATUS_META = {
  pending:   { label: '⏳ Pending',    bg: '#FFF8E1', fg: '#E65100' },
  countered: { label: '🔄 Countered',  bg: '#E3F2FD', fg: '#0D47A1' },
  accepted:  { label: '✅ Accepted',   bg: '#E8F5E9', fg: '#2E7D32' },
  rejected:  { label: '❌ Rejected',   bg: '#FFEBEE', fg: '#C62828' },
  withdrawn: { label: '↩️ Withdrawn',  bg: '#F0F0F0', fg: '#666' },
};

export default function MyOffersTab({ currentFarmer, onOpenListing, onCheckout, onOpenTrade }) {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actingId, setActingId] = useState(null);

  const load = async () => {
    if (!currentFarmer?.id) {
      setOffers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.market.buyerOffers(currentFarmer.id);
      if (!res.success) throw new Error(res.message || 'Failed to load offers');
      setOffers(res.offers || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [currentFarmer?.id]);

  const handleWithdraw = async (offerId) => {
    if (!window.confirm('Withdraw this offer?')) return;
    setActingId(offerId);
    try {
      const res = await api.market.withdrawOffer(offerId, {
        by: currentFarmer.id,
        reason: 'Withdrawn by buyer',
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
    return <Empty icon="👤" title="Register first" body="You need to be registered as a farmer to make offers." />;
  }

  if (loading) {
    return <Loading label="Loading your offers..." />;
  }

  if (error) {
    return (
      <div style={{ background:'#FFEBEE', padding:14, borderRadius:10, marginTop:10 }}>
        <strong style={{ color:'#C62828', fontSize:12 }}>⚠️ {error}</strong>
        <button onClick={load} style={{ ...btn, background:'#C62828', color:'white', marginTop:10, display:'block' }}>Try again</button>
      </div>
    );
  }

  if (offers.length === 0) {
    return <Empty icon="📨" title="No offers yet" body="When you make an offer on a livestock listing, it'll appear here. Track seller responses, counter-offers, and acceptances." />;
  }

  return (
    <>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
        <p style={{ fontSize:11, color:'#666', margin:0 }}>{offers.length} offer{offers.length === 1 ? '' : 's'}</p>
        <button onClick={load} style={{ ...btn, background:'white', border:'1px solid #CCC', color:'#333' }}>🔄 Refresh</button>
      </div>

      {offers.map(o => <OfferCard
        key={o.id}
        offer={o}
        currentFarmer={currentFarmer}
        acting={actingId === o.id}
        onWithdraw={() => handleWithdraw(o.id)}
        onOpenListing={() => onOpenListing && onOpenListing(o.listingId)}
        onCheckout={() => onCheckout && onCheckout(o)}
        onOpenTrade={onOpenTrade}
      />)}
    </>
  );
}

function OfferCard({ offer, currentFarmer, acting, onWithdraw, onOpenListing, onCheckout }) {
  const meta = STATUS_META[offer.status] || STATUS_META.pending;
  const last = offer.history?.[offer.history.length - 1];
  const isBuyerTurn = offer.currentTurn === 'buyer' && (offer.status === 'pending' || offer.status === 'countered');
  const canWithdraw = (offer.status === 'pending' || offer.status === 'countered') && offer.buyerId === currentFarmer.id;

  return (
    <div style={card}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10, marginBottom:8 }}>
        <div style={{ minWidth:0 }}>
          <strong style={{ fontSize:14, color:'#333' }}>Offer #{offer.id?.slice(-6) || '—'}</strong>
          <p style={{ fontSize:11, color:'#888', margin:'2px 0 0', fontFamily:'monospace' }}>{offer.passportId || '—'}</p>
        </div>
        <span style={{ fontSize:10, background:meta.bg, color:meta.fg, padding:'4px 8px', borderRadius:6, fontWeight:'bold', flexShrink:0 }}>
          {meta.label}
        </span>
      </div>

      <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'6px 0', borderTop:'1px solid #F5F5F5', borderBottom:'1px solid #F5F5F5', margin:'6px 0' }}>
        <span style={{ color:'#666' }}>Your offer</span>
        <strong style={{ color:'#2E7D32' }}>KES {Number(offer.amount || 0).toLocaleString()}</strong>
      </div>

      {offer.status === 'countered' && last && (
        <div style={{ background:'#E3F2FD', borderRadius:8, padding:10, marginBottom:8, fontSize:11, color:'#0D47A1' }}>
          <strong>Counter from seller:</strong> KES {Number(last.amount || 0).toLocaleString()}
          {last.note && <p style={{ margin:'4px 0 0', fontStyle:'italic' }}>"{last.note}"</p>}
        </div>
      )}

      {isBuyerTurn && (
        <div style={{ background:'#FFF8E1', borderRadius:8, padding:8, marginBottom:8, fontSize:11, color:'#E65100', fontWeight:'bold', textAlign:'center' }}>
          🎯 Your turn to respond
        </div>
      )}

      {!isBuyerTurn && (offer.status === 'pending' || offer.status === 'countered') && (
        <p style={{ fontSize:11, color:'#666', margin:'4px 0 8px', fontStyle:'italic' }}>
          ⏳ Waiting on seller
        </p>
      )}

      {offer.status === 'accepted' && (
        <div style={{ background:'#E8F5E9', borderRadius:8, padding:10, marginBottom:8, fontSize:11, color:'#1B5E20', lineHeight:1.5 }}>
          ✅ Seller accepted! Proceed to escrow to secure the trade.
        </div>
      )}

      <p style={{ fontSize:10, color:'#999', margin:'6px 0 8px' }}>
        Updated {offer.updatedAt ? new Date(offer.updatedAt).toLocaleString() : '—'}
      </p>

      {offer.status === 'accepted' && onCheckout && (
        <button
          onClick={onCheckout}
          style={{ ...btn, background:'#2E7D32', color:'white', width:'100%', padding:'12px', fontSize:13, marginBottom:8 }}
        >
          💰 Proceed to Escrow — KES {Number(offer.amount || 0).toLocaleString()}
        </button>
      )}

      {offer.tradeId && onOpenTrade && (
        <button
          onClick={() => onOpenTrade(offer.tradeId)}
          style={{ ...btn, background:'#1976D2', color:'white', width:'100%', padding:'12px', fontSize:13, marginBottom:8 }}
        >
          📊 Track Trade
        </button>
      )}

      <div style={{ display:'flex', gap:6 }}>
        {onOpenListing && (
          <button onClick={onOpenListing} style={{ ...btn, background:'white', border:'1px solid #CCC', color:'#333', flex:1 }}>
            View listing
          </button>
        )}
        {canWithdraw && (
          <button onClick={onWithdraw} disabled={acting} style={{ ...btn, background:'#FFEBEE', color:'#C62828', border:'1px solid #EF9A9A', flex:1, opacity: acting ? 0.6 : 1 }}>
            {acting ? '⏳' : '↩️ Withdraw'}
          </button>
        )}
      </div>
    </div>
  );
}

function Empty({ icon, title, body }) {
  return (
    <div style={{ textAlign:'center', padding:'50px 20px', color:'#666' }}>
      <div style={{ fontSize:48, marginBottom:12 }}>{icon}</div>
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
