import React, { useState } from 'react';

const ORDERS = [
  { id: 'ORD-ABC123', rider: 'James Mwangi', vehicle: '🏍️ Motorcycle', status: 'On the way', eta: '15 min', pickup: 'Nakuru Town', dropoff: 'Naivasha', lat: -0.3031, lng: 36.0800 },
  { id: 'ORD-DEF456', rider: 'Sarah Akello', vehicle: '🛻 Pickup', status: 'Picked up', eta: '30 min', pickup: 'Nakuru West', dropoff: 'Gilgil', lat: -0.3050, lng: 36.0700 },
];

export default function TrackingScreen() {
  const [selectedOrder, setSelectedOrder] = useState(null);

  return (
    <div>
      <div style={{ background: '#4CAF50', padding: 16, color: 'white' }}>
        <h3 style={{ margin: 0 }}>📍 Live Tracking</h3>
        <p style={{ fontSize: 11, opacity: .8, margin: '4px 0 0' }}>Track your deliveries in real-time</p>
      </div>

      {selectedOrder ? (
        <div style={{ padding: 16 }}>
          <button onClick={() => setSelectedOrder(null)} style={{ background: 'none', border: 'none', color: '#4CAF50', fontWeight: 'bold', cursor: 'pointer', marginBottom: 12 }}>← Back to Orders</button>
          
          <div style={{ background: 'white', borderRadius: 16, padding: 20, marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <h3>📦 Order #{selectedOrder.id}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
              <div style={{ background: '#E8F5E9', padding: 12, borderRadius: 10 }}>
                <strong>📍 Pickup</strong>
                <p style={{ fontSize: 12, margin: '4px 0 0' }}>{selectedOrder.pickup}</p>
              </div>
              <div style={{ background: '#FFEBEE', padding: 12, borderRadius: 10 }}>
                <strong>📦 Delivery</strong>
                <p style={{ fontSize: 12, margin: '4px 0 0' }}>{selectedOrder.dropoff}</p>
              </div>
            </div>
          </div>

          {/* Map Placeholder */}
          <div style={{ background: '#E8F5E9', height: 300, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', border: '2px solid #4CAF50', marginBottom: 12 }}>
            <span style={{ fontSize: 60 }}>🗺️</span>
            <p style={{ fontWeight: 'bold', color: '#2E7D32' }}>Live Map View</p>
            <p style={{ fontSize: 11, color: '#666' }}>📍 {selectedOrder.lat}, {selectedOrder.lng}</p>
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#4CAF50', margin: '0 auto' }} />
                <p style={{ fontSize: 9 }}>Pickup</p>
              </div>
              <div style={{ width: 60, height: 2, background: '#4CAF50', marginTop: 5 }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#FF6F00', margin: '0 auto', animation: 'pulse 1s infinite' }} />
                <p style={{ fontSize: 9 }}>Rider</p>
              </div>
              <div style={{ width: 60, height: 2, background: '#ddd', marginTop: 5 }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#C62828', margin: '0 auto' }} />
                <p style={{ fontSize: 9 }}>Delivery</p>
              </div>
            </div>
          </div>

          <div style={{ background: 'white', borderRadius: 12, padding: 14, marginBottom: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>🏍️ {selectedOrder.rider}</strong>
              <span style={{ background: '#FFF3E0', padding: '4px 10px', borderRadius: 10, fontSize: 10, color: '#E65100' }}>{selectedOrder.status}</span>
            </div>
            <p style={{ fontSize: 11, color: 'gray', margin: '4px 0' }}>{selectedOrder.vehicle}</p>
            <p style={{ fontSize: 14, fontWeight: 'bold', color: '#2E7D32' }}>⏰ ETA: {selectedOrder.eta}</p>
          </div>

          <button onClick={() => window.open('tel:254700000000')} style={{ width: '100%', padding: 14, background: '#4CAF50', color: 'white', border: 'none', borderRadius: 25, fontWeight: 'bold', cursor: 'pointer' }}>📞 Call Rider</button>
        </div>
      ) : (
        <div style={{ padding: 12 }}>
          {ORDERS.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <span style={{ fontSize: 60 }}>📦</span>
              <p style={{ color: '#666' }}>No active deliveries</p>
              <p style={{ fontSize: 12, color: '#999' }}>Orders from marketplace will appear here</p>
            </div>
          ) : (
            ORDERS.map(o => (
              <div key={o.id} onClick={() => setSelectedOrder(o)} style={{ background: 'white', borderRadius: 12, padding: 14, marginBottom: 8, cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>📦 #{o.id}</strong>
                  <span style={{ background: '#FFF3E0', padding: '4px 10px', borderRadius: 10, fontSize: 10, color: '#E65100' }}>{o.status}</span>
                </div>
                <p style={{ fontSize: 11, margin: '4px 0' }}>📍 {o.pickup} → 📦 {o.dropoff}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: 'gray' }}>🏍️ {o.rider}</span>
                  <span style={{ fontWeight: 'bold', color: '#2E7D32', fontSize: 13 }}>ETA: {o.eta}</span>
                </div>
                <div style={{ background: '#E0E0E0', height: 6, borderRadius: 3, marginTop: 8, overflow: 'hidden' }}>
                  <div style={{ width: o.status === 'On the way' ? '40%' : '60%', height: '100%', background: '#4CAF50', borderRadius: 3 }} />
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
