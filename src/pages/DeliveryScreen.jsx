import React, { useState } from 'react';
import { ALL_COUNTIES } from '../data/farmData';
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

const RIDERS = [
  { id: 1, name: 'James Mwangi', vehicle: 'Motorcycle', icon: '🏍️', rating: 4.9, price: 200, county: 'Nakuru', village: 'Kaptembwo', deliveries: 234, status: 'Available' },
  { id: 2, name: 'Sarah Akello', vehicle: 'Pickup', icon: '🛻', rating: 4.8, price: 800, county: 'Nakuru', village: 'Section 58', deliveries: 156, status: 'Available' },
  { id: 3, name: 'Peter Kiplagat', vehicle: 'Fuso', icon: '🚚', rating: 4.6, price: 5000, county: 'Uasin Gishu', village: 'Eldoret Town', deliveries: 89, status: 'Available' },
  { id: 4, name: 'Grace Wambui', vehicle: 'Motorcycle', icon: '🏍️', rating: 4.7, price: 300, county: 'Nairobi', village: 'Kawangware', deliveries: 312, status: 'Available' },
  { id: 5, name: 'John Ochieng', vehicle: 'Boat/Ferry', icon: '⛴️', rating: 4.5, price: 2000, county: 'Kisumu', village: 'Kisumu Pier', deliveries: 178, status: 'Available' },
  { id: 6, name: 'David Kiprop', vehicle: 'Tractor', icon: '🚜', rating: 4.8, price: 5000, county: 'Uasin Gishu', village: 'Eldoret', deliveries: 45, status: 'On Delivery' },
];

export default function DeliveryScreen() {
  const [showReg, setShowReg] = useState(false);
  const [filterCounty, setFilterCounty] = useState('All');
  const available = RIDERS.filter(r => r.status === 'Available').length;
  const total = RIDERS.reduce((s, r) => s + r.deliveries, 0);

  const filtered = filterCounty === 'All' ? RIDERS : RIDERS.filter(r => r.county === filterCounty);

  return (
    <div>
      <div style={{ background: '#4CAF50', padding: 16, color: 'white' }}>
        <h3 style={{ margin: 0 }}>🚚 Delivery Network</h3>
        <p style={{ fontSize: 11, opacity: .8, margin: '4px 0 0' }}>County → Village delivery • Auto-assign nearest rider</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, padding: 12 }}>
        <div style={{ background: '#E8F5E9', padding: 12, borderRadius: 10, textAlign: 'center' }}><strong style={{ fontSize: 20, color: '#2E7D32' }}>{RIDERS.length}</strong><p style={{ fontSize: 10, color: 'gray', margin: 0 }}>Riders</p></div>
        <div style={{ background: '#E3F2FD', padding: 12, borderRadius: 10, textAlign: 'center' }}><strong style={{ fontSize: 20, color: '#1565C0' }}>{available}</strong><p style={{ fontSize: 10, color: 'gray', margin: 0 }}>Available</p></div>
        <div style={{ background: '#FFF3E0', padding: 12, borderRadius: 10, textAlign: 'center' }}><strong style={{ fontSize: 20, color: '#E65100' }}>{total}</strong><p style={{ fontSize: 10, color: 'gray', margin: 0 }}>Deliveries</p></div>
      </div>

      <div style={{ padding: 12 }}>
        <button onClick={() => setShowReg(true)} style={{ width: '100%', padding: 16, background: '#FF6F00', color: 'white', border: 'none', borderRadius: 25, fontSize: 16, fontWeight: 'bold', cursor: 'pointer', marginBottom: 12 }}>
          🏍️ Register as a Rider - Earn Money Delivering
        </button>

        {/* Vehicle Types */}
        <h4 style={{ marginBottom: 8 }}>All Vehicle Types Accepted:</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 16 }}>
          {ALL_VEHICLES.map(v => (
            <div key={v.type} style={{ background: 'white', borderRadius: 10, padding: 8, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <span style={{ fontSize: 24 }}>{v.icon}</span>
              <p style={{ fontWeight: 'bold', fontSize: 10, margin: '2px 0' }}>{v.type}</p>
              <p style={{ fontSize: 8, color: 'gray', margin: 0 }}>{v.maxWeight}</p>
            </div>
          ))}
        </div>

        {/* County Filter */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h4 style={{ margin: 0 }}>Registered Riders</h4>
          <select value={filterCounty} onChange={e => setFilterCounty(e.target.value)} style={{ padding: '6px 10px', borderRadius: 16, border: '1px solid #ddd', fontSize: 11, background: 'white' }}>
            <option value="All">All Counties</option>
            {ALL_COUNTIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        {filtered.map(r => (
          <div key={r.id} style={{ background: 'white', borderRadius: 12, padding: 12, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ width: 45, height: 45, borderRadius: '50%', background: r.status === 'Available' ? '#4CAF50' : '#FF6F00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{r.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong style={{ fontSize: 13 }}>{r.name}</strong>
                <span style={{ background: r.status === 'Available' ? '#E8F5E9' : '#FFF3E0', padding: '2px 8px', borderRadius: 8, fontSize: 9, color: r.status === 'Available' ? '#2E7D32' : '#E65100' }}>{r.status}</span>
              </div>
              <p style={{ fontSize: 10, color: 'gray', margin: 0 }}>{r.vehicle} • ⭐{r.rating} • {r.deliveries} deliveries</p>
              <p style={{ fontSize: 10, color: '#4CAF50', margin: 0 }}>📍 {r.village}, {r.county} • KES {r.price}/delivery</p>
            </div>
          </div>
        ))}

        {filtered.length === 0 && <p style={{ textAlign: 'center', color: '#999', padding: 20 }}>No riders in {filterCounty}. Be the first!</p>}
      </div>

      <div style={{ background: '#1B5E20', margin: 12, padding: 20, borderRadius: 16, color: 'white', textAlign: 'center' }}>
        <h3 style={{ margin: '0 0 8px' }}>💰 Earn as a Rider</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <div><strong style={{ fontSize: 18 }}>KES 200-15,000</strong><p style={{ fontSize: 10, margin: 0, opacity: .8 }}>Per Delivery</p></div>
          <div><strong style={{ fontSize: 18 }}>KES 50K-200K</strong><p style={{ fontSize: 10, margin: 0, opacity: .8 }}>Per Month</p></div>
          <div><strong style={{ fontSize: 18 }}>Flexible</strong><p style={{ fontSize: 10, margin: 0, opacity: .8 }}>Your Schedule</p></div>
        </div>
      </div>

      {showReg && <RiderRegister onClose={() => setShowReg(false)} />}
    </div>
  );
}
