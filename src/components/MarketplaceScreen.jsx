// FILE: src/components/MarketplaceScreen.jsx
// Session 5B-1: Marketplace shell + Browse tab. My Offers / Selling placeholders.
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

const inputStyle = { width:'100%', padding:'10px 12px', borderRadius:10, border:'2px solid #E0E0E0', fontSize:14, marginBottom:6, boxSizing:'border-box', fontFamily:'inherit', color:'#333' };
const labelStyle = { fontSize:11, fontWeight:'bold', color:'#555', display:'block', marginBottom:4 };
const primaryBtn = { width:'100%', padding:14, color:'white', border:'none', borderRadius:25, fontSize:15, fontWeight:'bold', cursor:'pointer', marginTop:8, boxSizing:'border-box' };

const ANIMAL_TYPES = ['', 'Cow', 'Goat', 'Sheep', 'Pig', 'Chicken', 'Camel', 'Donkey', 'Rabbit'];
const KENYA_COUNTIES = ['', 'Bomet', 'Nakuru', 'Nairobi', 'Kiambu', 'Narok', 'Kericho', 'Kisumu', 'Mombasa', 'Uasin Gishu', 'Kajiado', 'Machakos'];
const SORTS = [
  { value: '', label: 'Newest first' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
];

const TABS = [
  { id: 'browse', label: '🔎 Browse' },
  { id: 'offers', label: '📨 My Offers' },
  { id: 'selling', label: '🏷️ Selling' },
];

export default function MarketplaceScreen({ currentFarmer, onClose, onOpenListing }) {
  const [tab, setTab] = useState('browse');
  const [filters, setFilters] = useState({ type: '', county: '', minPrice: '', maxPrice: '', sort: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const activeFilterCount = Object.entries(filters).filter(([k, v]) => k !== 'sort' && v).length;

  const loadListings = async () => {
    setLoading(true);
    setError(null);
    try {
      const clean = {};
      for (const [k, v] of Object.entries(filters)) if (v) clean[k] = v;
      const res = await api.market.searchListings(clean);
      if (!res.success) throw new Error(res.message || 'Failed to load listings');
      setListings(res.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadListings(); }, []);
  useEffect(() => { if (tab === 'browse') loadListings(); }, [filters, tab]);

  const clearFilters = () => setFilters({ type: '', county: '', minPrice: '', maxPrice: '', sort: '' });

  const formatPrice = (n) => n ? `KES ${Number(n).toLocaleString()}` : '—';

  return (
    <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'white', zIndex:2400, display:'flex', flexDirection:'column' }}>
      {/* Header */}
      <div style={{ background:'#2E7D32', color:'white', padding:'14px 16px', display:'flex', alignItems:'center', gap:10 }}>
        <button onClick={onClose} style={{ background:'none', border:'none', color:'white', fontSize:22, cursor:'pointer', padding:0, lineHeight:1 }}>←</button>
        <div style={{ flex:1 }}>
          <strong style={{ fontSize:16 }}>🛒 Marketplace</strong>
          <p style={{ margin:'2px 0 0', fontSize:11, opacity:0.9 }}>Buy livestock directly from farmers</p>
        </div>
        {currentFarmer && (
          <span style={{ fontSize:10, background:'rgba(255,255,255,0.15)', padding:'4px 8px', borderRadius:6 }}>
            {currentFarmer.fullName?.split(' ')[0] || 'Farmer'}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', background:'#F5F5F5', borderBottom:'1px solid #E0E0E0' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex:1, padding:'12px 4px', border:'none', cursor:'pointer', fontSize:12, fontWeight:'bold',
              background: tab === t.id ? 'white' : 'transparent',
              color: tab === t.id ? '#2E7D32' : '#666',
              borderBottom: tab === t.id ? '3px solid #2E7D32' : '3px solid transparent',
            }}
          >{t.label}</button>
        ))}
      </div>

      {/* Body */}
      <div style={{ flex:1, overflowY:'auto', padding:14 }}>
        {tab === 'browse' && <BrowseTab {...{ filters, setFilters, showFilters, setShowFilters, activeFilterCount, clearFilters, listings, loading, error, loadListings, onOpenListing, formatPrice }} />}
        {tab === 'offers' && <PlaceholderTab icon="📨" title="My Offers" body="Your active offers on livestock listings will appear here." />}
        {tab === 'selling' && <PlaceholderTab icon="🏷️" title="Selling" body="Your livestock listings and incoming buyer offers will appear here." />}
      </div>
    </div>
  );
}

function PlaceholderTab({ icon, title, body }) {
  return (
    <div style={{ textAlign:'center', padding:'60px 20px', color:'#666' }}>
      <div style={{ fontSize:48, marginBottom:12 }}>{icon}</div>
      <strong style={{ fontSize:16, color:'#333', display:'block', marginBottom:8 }}>{title}</strong>
      <p style={{ fontSize:13, lineHeight:1.5, margin:0 }}>{body}</p>
      <p style={{ fontSize:11, color:'#999', marginTop:12, fontStyle:'italic' }}>Coming in a later block of Session 5B</p>
    </div>
  );
}

function BrowseTab({
  filters, setFilters, showFilters, setShowFilters, activeFilterCount, clearFilters,
  listings, loading, error, loadListings, onOpenListing, formatPrice,
}) {
  return (
    <>
      {/* Filter bar */}
      <div style={{ display:'flex', gap:8, marginBottom:12 }}>
        <button
          onClick={() => setShowFilters(!showFilters)}
          style={{ flex:1, padding:'10px', borderRadius:10, border:'2px solid #2E7D32', background:'white', color:'#2E7D32', fontSize:12, fontWeight:'bold', cursor:'pointer' }}
        >
          🎯 Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
        </button>
        <button
          onClick={loadListings}
          style={{ padding:'10px 14px', borderRadius:10, border:'2px solid #2E7D32', background:'#2E7D32', color:'white', fontSize:12, fontWeight:'bold', cursor:'pointer' }}
        >
          🔄
        </button>
      </div>

      {showFilters && (
        <div style={{ background:'#F9FAFB', border:'1px solid #E0E0E0', borderRadius:12, padding:14, marginBottom:14 }}>
          <label style={labelStyle}>Animal type</label>
          <select value={filters.type} onChange={e => setFilters({ ...filters, type: e.target.value })} style={inputStyle}>
            {ANIMAL_TYPES.map(t => <option key={t} value={t}>{t || 'All types'}</option>)}
          </select>

          <label style={labelStyle}>County</label>
          <select value={filters.county} onChange={e => setFilters({ ...filters, county: e.target.value })} style={inputStyle}>
            {KENYA_COUNTIES.map(c => <option key={c} value={c}>{c || 'All counties'}</option>)}
          </select>

          <div style={{ display:'flex', gap:8 }}>
            <div style={{ flex:1 }}>
              <label style={labelStyle}>Min price (KES)</label>
              <input type="number" inputMode="numeric" value={filters.minPrice} onChange={e => setFilters({ ...filters, minPrice: e.target.value })} placeholder="0" style={inputStyle} />
            </div>
            <div style={{ flex:1 }}>
              <label style={labelStyle}>Max price (KES)</label>
              <input type="number" inputMode="numeric" value={filters.maxPrice} onChange={e => setFilters({ ...filters, maxPrice: e.target.value })} placeholder="500000" style={inputStyle} />
            </div>
          </div>

          <label style={labelStyle}>Sort</label>
          <select value={filters.sort} onChange={e => setFilters({ ...filters, sort: e.target.value })} style={inputStyle}>
            {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>

          <button onClick={clearFilters} style={{ ...primaryBtn, background:'#F0F0F0', color:'#666', marginTop:6 }}>Clear filters</button>
        </div>
      )}

      {error && (
        <div style={{ background:'#FFEBEE', padding:12, borderRadius:10, marginBottom:12 }}>
          <strong style={{ color:'#C62828', fontSize:12 }}>⚠️ {error}</strong>
        </div>
      )}

      {loading && (
        <div style={{ textAlign:'center', padding:40 }}>
          <div style={{ fontSize:28 }}>⏳</div>
          <p style={{ fontSize:12, color:'#666', marginTop:8 }}>Loading listings...</p>
        </div>
      )}

      {!loading && !error && listings.length === 0 && (
        <div style={{ textAlign:'center', padding:'50px 20px' }}>
          <div style={{ fontSize:48, marginBottom:12 }}>🐄</div>
          <strong style={{ fontSize:15, color:'#333', display:'block', marginBottom:8 }}>No listings yet</strong>
          <p style={{ fontSize:12, color:'#666', lineHeight:1.5, margin:0 }}>
            {activeFilterCount > 0
              ? 'Try removing filters or search a different county.'
              : 'Livestock listings will appear here as farmers register animals for sale.'}
          </p>
        </div>
      )}

      {!loading && listings.length > 0 && (
        <>
          <p style={{ fontSize:11, color:'#666', margin:'0 0 10px', textAlign:'center' }}>
            {listings.length} listing{listings.length === 1 ? '' : 's'} found
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {listings.map(l => <ListingCard key={l.id} listing={l} onOpen={() => onOpenListing && onOpenListing(l.id)} formatPrice={formatPrice} />)}
          </div>
        </>
      )}
    </>
  );
}

function ListingCard({ listing, onOpen, formatPrice }) {
  return (
    <div
      onClick={onOpen}
      style={{ display:'flex', gap:12, background:'white', border:'1px solid #E0E0E0', borderRadius:12, padding:12, cursor:'pointer', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}
    >
      <div style={{ width:90, height:90, borderRadius:10, background:'#F5F5F5', overflow:'hidden', flexShrink:0 }}>
        {listing.photoUrl
          ? <img src={listing.photoUrl} alt={listing.type} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32 }}>🐄</div>}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
          <strong style={{ fontSize:14, color:'#333' }}>{listing.type}{listing.breed ? ` · ${listing.breed}` : ''}</strong>
          {listing.negotiable && <span style={{ fontSize:9, background:'#E8F5E9', color:'#2E7D32', padding:'2px 6px', borderRadius:4, fontWeight:'bold' }}>NEGOTIABLE</span>}
        </div>
        <p style={{ fontSize:11, color:'#666', margin:'4px 0 0' }}>
          {listing.gender ? `${listing.gender} · ` : ''}{listing.age ? `${listing.age} · ` : ''}{listing.location?.county || 'Kenya'}
        </p>
        <div style={{ marginTop:8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <strong style={{ fontSize:15, color:'#2E7D32' }}>{formatPrice(listing.askingPrice)}</strong>
          <span style={{ fontSize:10, color:'#999' }}>{listing.views || 0} views · {listing.offerCount || 0} offers</span>
        </div>
      </div>
    </div>
  );
}
