import React, { useState, useEffect } from 'react';
import RiderRegister from './RiderRegister';

const ALL_VEHICLES = [
  { type: 'Motorcycle', icon: '🏍️', maxWeight: '100kg', price: 'KES 200-500', desc: 'Small parcels, documents, food' },
  { type: 'Boda Boda', icon: '🛵', maxWeight: '80kg', price: 'KES 100-300', desc: 'Passengers, small items' },
  { type: 'Tuk Tuk', icon: '🛺', maxWeight: '300kg', price: 'KES 300-800', desc: 'Market goods, medium parcels' },
  { type: 'Probox', icon: '🚗', maxWeight: '500kg', price: 'KES 500-1,500', desc: 'Business deliveries' },
  { type: 'Pickup', icon: '🛻', maxWeight: '1000kg', price: 'KES 800-3,000', desc: 'Farm produce, furniture' },
  { type: 'Van', icon: '🚐', maxWeight: '1500kg', price: 'KES 500-2,000', desc: 'Medium cargo, sealed goods' },
  { type: 'Matatu', icon: '🚌', maxWeight: '2000kg', price: 'KES 1,000-3,000', desc: 'Group deliveries, market days' },
  { type: 'Canter', icon: '🚛', maxWeight: '4000kg', price: 'KES 2,500-8,000', desc: 'Bulk produce, construction' },
  { type: 'Fuso', icon: '🚚', maxWeight: '7000kg', price: 'KES 5,000-15,000', desc: 'Heavy bulk, cross-county' },
  { type: 'Tractor', icon: '🚜', maxWeight: '5000kg', price: 'KES 3,000-10,000', desc: 'Farm equipment, hauling' },
  { type: 'Trailer', icon: '🚒', maxWeight: '20000kg', price: 'KES 15,000-50,000', desc: 'Very heavy, long distance' },
  { type: 'Bicycle', icon: '🚲', maxWeight: '30kg', price: 'KES 50-150', desc: 'Small items, within estate' },
  { type: 'Hand Cart', icon: '🛒', maxWeight: '200kg', price: 'KES 100-300', desc: 'Market goods, within town' },
  { type: 'Donkey Cart', icon: '🫏', maxWeight: '400kg', price: 'KES 200-500', desc: 'Rural areas, farm produce' },
  { type: 'Boat/Ferry', icon: '⛴️', maxWeight: '5000kg', price: 'KES 1,000-5,000', desc: 'Lakeside/island deliveries' },
];

const MOCK_RIDERS = [
  { id: 'mock-1', name: 'James Mwangi', vehicle: 'Motorcycle', icon: '🏍️', rating: 4.9, pricePerDelivery: 200, county: 'Nakuru', village: 'Kaptembwo', totalDeliveries: 234, status: 'active', isMock: true },
  { id: 'mock-2', name: 'Sarah Akello', vehicle: 'Pickup', icon: '🛻', rating: 4.8, pricePerDelivery: 800, county: 'Nakuru', village: 'Section 58', totalDeliveries: 156, status: 'active', isMock: true },
  { id: 'mock-3', name: 'Peter Kiplagat', vehicle: 'Fuso', icon: '🚚', rating: 4.6, pricePerDelivery: 5000, county: 'Uasin Gishu', village: 'Eldoret Town', totalDeliveries: 89, status: 'active', isMock: true },
  { id: 'mock-4', name: 'Grace Wambui', vehicle: 'Motorcycle', icon: '🏍️', rating: 4.7, pricePerDelivery: 300, county: 'Nairobi', village: 'Kawangware', totalDeliveries: 312, status: 'active', isMock: true },
  { id: 'mock-5', name: 'John Ochieng', vehicle: 'Boat/Ferry', icon: '⛴️', rating: 4.5, pricePerDelivery: 2000, county: 'Kisumu', village: 'Kisumu Pier', totalDeliveries: 178, status: 'active', isMock: true },
  { id: 'mock-6', name: 'David Kiprop', vehicle: 'Tractor', icon: '🚜', rating: 4.8, pricePerDelivery: 5000, county: 'Uasin Gishu', village: 'Eldoret', totalDeliveries: 45, status: 'active', isMock: true },
];

export default function DeliveryScreen() {
  const [showReg, setShowReg] = useState(false);
  const [filterCounty, setFilterCounty] = useState('All');
  const [realRiders, setRealRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myRider, setMyRider] = useState(null);

  // Load real riders from backend
  const loadRiders = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/rider/list');
      const data = await res.json();
      if (data.success && data.riders) {
        const normalized = data.riders.map(r => ({
          id: r.id,
          name: r.rider.fullName,
          vehicle: r.vehicle.type,
          icon: r.vehicle.icon,
          rating: r.rating || 5.0,
          pricePerDelivery: r.pricePerDelivery,
          county: r.location?.county || 'Unknown',
          village: r.location?.area || r.location?.locality || r.location?.ward || '',
          subCounty: r.location?.subCounty || '',
          totalDeliveries: r.totalDeliveries || 0,
          status: r.status,
          isOnline: r.isOnline,
          isRegistered: true,
        }));
        setRealRiders(normalized);
        console.log('📍 Loaded', normalized.length, 'real riders');
      }
    } catch (err) {
      console.error('Failed to load riders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRiders();
    try {
      const saved = localStorage.getItem('riderRegistration');
      if (saved) setMyRider(JSON.parse(saved));
    } catch (e) {}
  }, []);

  const handleRiderRegistered = (data) => {
    setMyRider(data);
    loadRiders();
    setShowReg(false);
  };

  // Real riders replace mock data when they exist
  const hasRealRiders = realRiders.length > 0;
  const displayRiders = hasRealRiders ? realRiders : MOCK_RIDERS;
  const isDemoMode = !hasRealRiders;

  const available = displayRiders.filter(r => r.status === 'active').length;
  const totalDeliveries = displayRiders.reduce((s, r) => s + (r.totalDeliveries || 0), 0);

  // Get unique counties from riders
  const counties = [...new Set(displayRiders.map(r => r.county).filter(Boolean))].sort();
  const filtered = filterCounty === 'All' ? displayRiders : displayRiders.filter(r => r.county === filterCounty);

  return (
    <div>
      <div style={{ background: '#4CAF50', padding: 16, color: 'white' }}>
        <h3 style={{ margin: 0 }}>🚚 Delivery Network</h3>
        <p style={{ fontSize: 11, opacity: .8, margin: '4px 0 0' }}>
          {isDemoMode 
            ? 'Demo riders • Register to go live' 
            : `${displayRiders.length} registered riders • ${counties.length} counties`}
        </p>
      </div>

      {/* Demo Mode Banner */}
      {isDemoMode && (
        <div style={{
          margin: '12px 12px 0', background: '#FFF8E1', border: '2px dashed #FFB74D',
          borderRadius: 12, padding: 14
        }}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
            <span style={{fontSize:24}}>🧪</span>
            <div style={{flex:1}}>
              <strong style={{fontSize:13,color:'#E65100'}}>Demo Riders</strong>
              <p style={{fontSize:11,margin:'2px 0 0',color:'#666'}}>These are sample riders. Real registered riders will replace them.</p>
            </div>
          </div>
        </div>
      )}

      {/* Live Mode Banner */}
      {!isDemoMode && !myRider && (
        <div style={{
          margin: '12px 12px 0', background: '#E8F5E9', border: '1px solid #A5D6A7',
          borderRadius: 12, padding: 14, display: 'flex', alignItems: 'center', gap: 10
        }}>
          <span style={{fontSize:24}}>✅</span>
          <div style={{flex:1}}>
            <strong style={{fontSize:13,color:'#2E7D32'}}>Live Delivery Network</strong>
            <p style={{fontSize:11,margin:'2px 0 0',color:'#666'}}>
              {realRiders.length} rider{realRiders.length !== 1 ? 's' : ''} registered
            </p>
          </div>
        </div>
      )}

      {/* My Rider Banner */}
      {myRider && (
        <div style={{
          margin: '12px 12px 0', background: '#E3F2FD', border: '1px solid #90CAF9',
          borderRadius: 12, padding: 14
        }}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontSize:24}}>🏍️</span>
            <div style={{flex:1}}>
              <strong style={{fontSize:13,color:'#0D47A1'}}>
                You are registered as {myRider.rider?.fullName}
              </strong>
              <p style={{fontSize:11,margin:'2px 0 0',color:'#1565C0'}}>
                {myRider.vehicle?.icon} {myRider.vehicle?.type} • KES {myRider.pricePerDelivery}/delivery
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, padding: 12 }}>
        <div style={{ background: '#E8F5E9', padding: 12, borderRadius: 10, textAlign: 'center' }}>
          <strong style={{ fontSize: 20, color: '#2E7D32' }}>{displayRiders.length}</strong>
          <p style={{ fontSize: 10, color: 'gray', margin: 0 }}>Riders</p>
        </div>
        <div style={{ background: '#E3F2FD', padding: 12, borderRadius: 10, textAlign: 'center' }}>
          <strong style={{ fontSize: 20, color: '#1565C0' }}>{available}</strong>
          <p style={{ fontSize: 10, color: 'gray', margin: 0 }}>Available</p>
        </div>
        <div style={{ background: '#FFF3E0', padding: 12, borderRadius: 10, textAlign: 'center' }}>
          <strong style={{ fontSize: 20, color: '#E65100' }}>{totalDeliveries}</strong>
          <p style={{ fontSize: 10, color: 'gray', margin: 0 }}>Deliveries</p>
        </div>
      </div>

      <div style={{ padding: 12 }}>
        <button onClick={() => setShowReg(true)} style={{ width: '100%', padding: 16, background: '#FF6F00', color: 'white', border: 'none', borderRadius: 25, fontSize: 16, fontWeight: 'bold', cursor: 'pointer', marginBottom: 12 }}>
          🏍️ Register as a Rider - Earn Money Delivering
        </button>

        {/* Vehicle Types */}
        <h4 style={{ marginBottom: 8 }}>All Vehicle Types Accepted:</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 16 }}>
          {ALL_VEHICLES.slice(0, 9).map(v => (
            <div key={v.type} style={{ background: 'white', borderRadius: 10, padding: 8, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <span style={{ fontSize: 24 }}>{v.icon}</span>
              <p style={{ fontWeight: 'bold', fontSize: 10, margin: '2px 0' }}>{v.type}</p>
              <p style={{ fontSize: 8, color: 'gray', margin: 0 }}>{v.maxWeight}</p>
            </div>
          ))}
        </div>

        {/* County Filter */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h4 style={{ margin: 0 }}>
            {isDemoMode ? 'Demo Riders' : 'Registered Riders'} ({filtered.length})
          </h4>
          <select value={filterCounty} onChange={e => setFilterCounty(e.target.value)} style={{ padding: '6px 10px', borderRadius: 16, border: '1px solid #ddd', fontSize: 11, background: 'white' }}>
            <option value="All">All Counties</option>
            {counties.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        {loading && <p style={{ textAlign: 'center', color: '#999', fontSize: 12 }}>Loading riders...</p>}

        {filtered.length === 0 && !loading && (
          <p style={{ textAlign: 'center', color: '#999', fontSize: 12, padding: 20 }}>
            No riders in {filterCounty} yet
          </p>
        )}

        {filtered.map(r => (
          <div key={r.id} style={{
            background: r.isRegistered ? '#F0F9F0' : 'white',
            borderRadius: 12, padding: 12, marginBottom: 8,
            border: r.isRegistered ? '2px solid #A5D6A7' : '1px solid #E0E0E0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 36 }}>{r.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: 13 }}>{r.name}</strong>
                  <span style={{
                    background: r.isRegistered ? '#2E7D32' : '#9E9E9E',
                    color: 'white', padding: '2px 6px', borderRadius: 4,
                    fontSize: 8, fontWeight: 'bold'
                  }}>
                    {r.isRegistered ? '✅ VERIFIED' : 'DEMO'}
                  </span>
                </div>
                <p style={{ fontSize: 11, color: 'gray', margin: '2px 0' }}>
                  {r.icon} {r.vehicle} • ⭐ {r.rating}
                </p>
                <p style={{ fontSize: 11, color: 'gray', margin: 0 }}>
                  📍 {r.village}{r.village && r.county ? ', ' : ''}{r.county}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11 }}>
                  <span style={{ color: '#2E7D32', fontWeight: 'bold' }}>KES {r.pricePerDelivery}/delivery</span>
                  <span style={{ color: '#666' }}>{r.totalDeliveries} deliveries</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showReg && <RiderRegister onClose={() => setShowReg(false)} onRegister={handleRiderRegistered} />}
    </div>
  );
}
