import React, { useState, useEffect } from 'react';
import LocationPicker from './LocationPicker';
import { api } from '../services/api';
import { normalizeKenyaPhone, isValidKenyaPhone } from '../utils/phone';

const ANIMAL_TYPES = ['Cow', 'Goat', 'Sheep', 'Pig', 'Chicken', 'Camel', 'Donkey', 'Rabbit'];
const LAND_USES = ['Crop farming', 'Livestock grazing', 'Mixed farming', 'Residential', 'Commercial'];

const inputStyle = { width:'100%', padding:'14px 16px', borderRadius:10, border:'2px solid #E0E0E0', fontSize:16, marginBottom:8, boxSizing:'border-box', fontFamily:'inherit', color:'#333' };
const labelStyle = { fontSize:12, fontWeight:'bold', color:'#555', display:'block', marginBottom:4, marginTop:8 };
const primaryBtn = { width:'100%', padding:16, color:'white', border:'none', borderRadius:25, fontSize:16, fontWeight:'bold', cursor:'pointer', marginTop:8, boxSizing:'border-box' };

export default function ShambaSafi({ onClose }) {
  const [activeModule, setActiveModule] = useState(null);
  const [myFarmer, setMyFarmer] = useState(null);
  const [myLand, setMyLand] = useState([]);
  const [myLivestock, setMyLivestock] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('farmerRegistration');
      if (saved) setMyFarmer(JSON.parse(saved));
    } catch (e) {}
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const [s, land, livestock] = await Promise.all([
        api.shamba.stats(),
        api.shamba.listLand(),
        api.shamba.listLivestock(),
      ]);
      setStats(s.stats);
      setMyLand(land.land || []);
      setMyLivestock(livestock.livestock || []);
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const modules = [
    { id: 'land', icon: '🏠', title: 'Module A: Digital Land Vault', desc: 'GPS boundaries • Title deeds • 3 witnesses', color: '#4CAF50' },
    { id: 'livestock', icon: '🐄', title: 'Module B: Livestock Passport', desc: 'UUID IDs • Theft protection • Community trust', color: '#FF6F00' },
    { id: 'health', icon: '🏥', title: 'Module C: Health & Vet Network', desc: 'Daily SMS check • Vet dispatch (coming soon)', color: '#1565C0' },
    { id: 'meat', icon: '🥩', title: 'Module D: Meat Traceability', desc: 'QR codes • SMS 334 verification (coming soon)', color: '#E65100' },
  ];

  return (
    <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',zIndex:500,display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={onClose}>
      <div style={{background:'white',borderRadius:'20px 20px 0 0',padding:20,maxWidth:450,width:'100%',maxHeight:'92vh',overflowY:'auto'}} onClick={e => e.stopPropagation()}>

        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <div>
            <h2 style={{margin:0,color:'#2E7D32',fontSize:20}}>🛡️ Shamba & Mfugo Safi</h2>
            <p style={{fontSize:11,color:'#666',margin:'2px 0 0 0'}}>Digital Livestock & Land Sovereignty</p>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:24,cursor:'pointer',color:'#666'}}>✕</button>
        </div>

        {/* Stats bar */}
        {stats && (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:12}}>
            <div style={{background:'#E8F5E9',padding:10,borderRadius:10,textAlign:'center'}}>
              <strong style={{fontSize:18,color:'#2E7D32'}}>{stats.land.total}</strong>
              <p style={{fontSize:9,color:'#666',margin:0}}>Land Parcels</p>
            </div>
            <div style={{background:'#FFF3E0',padding:10,borderRadius:10,textAlign:'center'}}>
              <strong style={{fontSize:18,color:'#E65100'}}>{stats.livestock.total}</strong>
              <p style={{fontSize:9,color:'#666',margin:0}}>Animals</p>
            </div>
            <div style={{background:'#E3F2FD',padding:10,borderRadius:10,textAlign:'center'}}>
              <strong style={{fontSize:18,color:'#1565C0'}}>{stats.land.totalHectares.toFixed(1)}</strong>
              <p style={{fontSize:9,color:'#666',margin:0}}>Hectares</p>
            </div>
          </div>
        )}

        <div style={{background:'#E3F2FD',padding:10,borderRadius:8,marginBottom:12,border:'1px solid #90CAF9'}}>
          <strong style={{fontSize:11}}>🛡️ Bottom-Up Model:</strong>
          <span style={{fontSize:11}}> Community owns data • Government verifies</span>
        </div>

        {!activeModule ? (
          <div>
            {modules.map(m => (
              <div key={m.id} onClick={() => setActiveModule(m.id)} style={{
                background:'white',borderRadius:12,padding:14,margin:'8px 0',
                borderLeft:'4px solid ' + m.color,
                boxShadow:'0 1px 3px rgba(0,0,0,0.08)',cursor:'pointer'
              }}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <span style={{fontSize:36}}>{m.icon}</span>
                  <div style={{flex:1}}>
                    <h4 style={{margin:0,fontSize:14}}>{m.title}</h4>
                    <p style={{fontSize:11,color:'#666',margin:'2px 0 0 0'}}>{m.desc}</p>
                  </div>
                  <span style={{color:'#4CAF50',fontSize:20}}>→</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            <button onClick={() => setActiveModule(null)} style={{background:'none',border:'none',color:'#4CAF50',fontWeight:'bold',cursor:'pointer',marginBottom:8,fontSize:14}}>← Back to Modules</button>

            {activeModule === 'land' && <LandModule myFarmer={myFarmer} myLand={myLand} reload={loadAll} />}
            {activeModule === 'livestock' && <LivestockModule myFarmer={myFarmer} myLivestock={myLivestock} reload={loadAll} />}
            {activeModule === 'health' && <ComingSoon name="Health & Vet Network" />}
            {activeModule === 'meat' && <ComingSoon name="Meat Traceability" />}
          </div>
        )}

        <div style={{background:'#E3F2FD',padding:10,borderRadius:8,marginTop:12,fontSize:11}}>
          <strong>🔐 Blockchain-Lite:</strong> Records hashed locally • Immutable record
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// LAND MODULE
// ═══════════════════════════════════════════════════
function LandModule({ myFarmer, myLand, reload }) {
  const [view, setView] = useState('list');
  const [form, setForm] = useState({
    location: null,
    titleDeed: '',
    areaHectares: '',
    landUse: 'Mixed farming',
    witnesses: [],
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const myOwnLand = myFarmer ? myLand.filter(p => p.ownerPhone === myFarmer.farmer?.phone) : [];

  const addWitness = () => {
    setForm({ ...form, witnesses: [...form.witnesses, { name: '', phone: '' }] });
  };

  const updateWitness = (idx, field, value) => {
    const updated = [...form.witnesses];
    updated[idx] = { ...updated[idx], [field]: value };
    setForm({ ...form, witnesses: updated });
  };

  const submit = async () => {
    setError(null);
    if (!myFarmer) {
      setError('Please register as farmer first');
      return;
    }
    setSubmitting(true);
    try {
      const result = await api.shamba.registerLand({
        ownerId: myFarmer.farmer?.phone,
        ownerName: myFarmer.farmer?.fullName,
        ownerPhone: myFarmer.farmer?.phone,
        location: form.location,
        titleDeed: form.titleDeed,
        areaHectares: parseFloat(form.areaHectares),
        landUse: form.landUse,
        witnesses: form.witnesses.filter(w => w.name && w.phone),
      });
      if (!result.success) throw new Error(result.message);
      alert('✅ Land registered!\nID: ' + result.land.id + '\nHash: ' + result.land.recordHash);
      await reload();
      setView('list');
      setForm({ location: null, titleDeed: '', areaHectares: '', landUse: 'Mixed farming', witnesses: [] });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (view === 'form') {
    return (
      <div>
        <h4 style={{fontSize:16,marginBottom:12}}>🏠 Register Land Parcel</h4>
        {error && <div style={{background:'#FFEBEE',padding:12,borderRadius:10,marginBottom:12}}><strong style={{color:'#C62828',fontSize:12}}>⚠️ {error}</strong></div>}

        <LocationPicker value={form.location} onChange={loc => setForm({...form, location: loc})} required label="Where is the land?" />

        <label style={labelStyle}>Title Deed Number (optional)</label>
        <input value={form.titleDeed} onChange={e => setForm({...form, titleDeed: e.target.value})} placeholder="e.g. NBI/2024/12345" style={inputStyle} />

        <label style={labelStyle}>Area (Hectares) *</label>
        <input value={form.areaHectares} onChange={e => setForm({...form, areaHectares: e.target.value})} placeholder="e.g. 2.5" type="number" step="0.1" style={inputStyle} />

        <label style={labelStyle}>Land Use</label>
        <select value={form.landUse} onChange={e => setForm({...form, landUse: e.target.value})} style={{...inputStyle, background:'white'}}>
          {LAND_USES.map(u => <option key={u}>{u}</option>)}
        </select>

        <label style={labelStyle}>Community Witnesses (optional)</label>
        <p style={{fontSize:11,color:'#666',margin:'2px 0 8px'}}>3 witnesses = verified parcel</p>
        {form.witnesses.map((w, i) => (
          <div key={i} style={{background:'#F9FAFB',borderRadius:10,padding:10,marginBottom:6,border:'1px solid #E0E0E0'}}>
            <input value={w.name} onChange={e => updateWitness(i, 'name', e.target.value)} placeholder="Witness name" style={{...inputStyle, marginBottom:6}} />
            <input value={w.phone} onChange={e => updateWitness(i, 'phone', e.target.value)} onBlur={e => { if (e.target.value) updateWitness(i, 'phone', normalizeKenyaPhone(e.target.value)); }} placeholder="0712345678" type="tel" style={{...inputStyle, marginBottom:0}} />
          </div>
        ))}
        <button onClick={addWitness} style={{background:'#F0F4F8',border:'1px dashed #90CAF9',borderRadius:10,padding:10,width:'100%',cursor:'pointer',color:'#1565C0',fontWeight:'bold',marginBottom:12}}>+ Add Witness</button>

        <div style={{display:'flex',gap:8,marginTop:16}}>
          <button onClick={() => setView('list')} style={{...primaryBtn, background:'#F0F0F0', color:'#666', flex:1}}>← Back</button>
          <button onClick={submit} disabled={submitting || !form.location || !form.areaHectares}
            style={{...primaryBtn, background: (form.location && form.areaHectares && !submitting) ? '#4CAF50' : '#ccc', flex:2}}>
            {submitting ? '⏳ Saving...' : '✅ Register Land'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h4 style={{fontSize:16,marginBottom:8}}>🏠 My Land Parcels ({myOwnLand.length})</h4>
      <button onClick={() => setView('form')} style={{...primaryBtn, background:'#4CAF50', marginBottom:12}}>+ Register New Parcel</button>

      {!myFarmer && <p style={{background:'#FFF8E1',padding:12,borderRadius:10,fontSize:12,color:'#E65100'}}>⚠️ Register as farmer first to add land</p>}

      {myOwnLand.length === 0 && myFarmer && <p style={{textAlign:'center',color:'#999',padding:20,fontSize:13}}>No land registered yet</p>}

      {myOwnLand.map(p => (
        <div key={p.id} style={{background:'#F0F9F0',borderRadius:12,padding:14,marginBottom:8,border:'1px solid #A5D6A7'}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
            <strong style={{fontSize:13}}>{p.id}</strong>
            <span style={{background: p.status === 'verified' ? '#2E7D32' : '#FF9800', color:'white', padding:'2px 8px', borderRadius:6, fontSize:10, fontWeight:'bold'}}>
              {p.status === 'verified' ? '✅ VERIFIED' : '⏳ PENDING'}
            </span>
          </div>
          <p style={{fontSize:12,margin:'2px 0'}}>📍 {p.location?.area || p.location?.locality || p.location?.ward}, {p.location?.county}</p>
          <p style={{fontSize:12,margin:'2px 0'}}>📏 {p.areaHectares} hectares • {p.landUse}</p>
          {p.titleDeed && <p style={{fontSize:11,color:'#666',margin:'2px 0'}}>📜 {p.titleDeed}</p>}
          <p style={{fontSize:10,color:'#999',margin:'4px 0 0',fontFamily:'monospace'}}>Hash: {p.recordHash}</p>
          <p style={{fontSize:11,color:'#666',margin:'4px 0 0'}}>👥 {p.witnesses.length} witnesses</p>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// LIVESTOCK MODULE
// ═══════════════════════════════════════════════════
function LivestockModule({ myFarmer, myLivestock, reload }) {
  const [view, setView] = useState('list');
  const [form, setForm] = useState({
    type: 'Cow', breed: '', age: '', gender: 'Female', color: '', location: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const myOwnAnimals = myFarmer ? myLivestock.filter(a => a.ownerPhone === myFarmer.farmer?.phone) : [];

  const submit = async () => {
    setError(null);
    if (!myFarmer) { setError('Please register as farmer first'); return; }
    setSubmitting(true);
    try {
      const result = await api.shamba.registerLivestock({
        ownerId: myFarmer.farmer?.phone,
        ownerName: myFarmer.farmer?.fullName,
        ownerPhone: myFarmer.farmer?.phone,
        type: form.type,
        breed: form.breed,
        age: form.age,
        gender: form.gender,
        color: form.color,
        location: form.location,
      });
      if (!result.success) throw new Error(result.message);
      alert(`✅ ${form.type} registered!\nPassport: ${result.livestock.passportId}`);
      await reload();
      setView('list');
      setForm({ type: 'Cow', breed: '', age: '', gender: 'Female', color: '', location: null });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const reportStolen = async (passportId) => {
    if (!confirm('Report this animal as STOLEN?\n\nSlaughterhouses will be notified. This cannot be undone.')) return;
    try {
      await api.shamba.reportStolen(passportId, {
        reportedBy: myFarmer?.farmer?.fullName,
        contactPhone: myFarmer?.farmer?.phone,
        location: myFarmer?.location,
      });
      alert('🚨 Theft reported. Slaughterhouses notified.');
      await reload();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  if (view === 'form') {
    return (
      <div>
        <h4 style={{fontSize:16,marginBottom:12}}>🐄 Register Animal</h4>
        {error && <div style={{background:'#FFEBEE',padding:12,borderRadius:10,marginBottom:12}}><strong style={{color:'#C62828',fontSize:12}}>⚠️ {error}</strong></div>}

        <label style={labelStyle}>Animal Type *</label>
        <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} style={{...inputStyle, background:'white'}}>
          {ANIMAL_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>

        <label style={labelStyle}>Breed *</label>
        <input value={form.breed} onChange={e => setForm({...form, breed: e.target.value})} placeholder="e.g. Friesian, Galla, Dorper" style={inputStyle} />

        <label style={labelStyle}>Age</label>
        <input value={form.age} onChange={e => setForm({...form, age: e.target.value})} placeholder="e.g. 2 years" style={inputStyle} />

        <label style={labelStyle}>Gender</label>
        <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})} style={{...inputStyle, background:'white'}}>
          <option>Female</option>
          <option>Male</option>
        </select>

        <label style={labelStyle}>Color</label>
        <input value={form.color} onChange={e => setForm({...form, color: e.target.value})} placeholder="e.g. Black and white" style={inputStyle} />

        <LocationPicker value={form.location} onChange={loc => setForm({...form, location: loc})} required label="Where is the animal?" />

        <div style={{display:'flex',gap:8,marginTop:16}}>
          <button onClick={() => setView('list')} style={{...primaryBtn, background:'#F0F0F0', color:'#666', flex:1}}>← Back</button>
          <button onClick={submit} disabled={submitting || !form.breed || !form.location}
            style={{...primaryBtn, background: (form.breed && form.location && !submitting) ? '#FF6F00' : '#ccc', flex:2}}>
            {submitting ? '⏳ Saving...' : '✅ Register Animal'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h4 style={{fontSize:16,marginBottom:8}}>🐄 My Animals ({myOwnAnimals.length})</h4>
      <button onClick={() => setView('form')} style={{...primaryBtn, background:'#FF6F00', marginBottom:12}}>+ Register New Animal</button>

      {!myFarmer && <p style={{background:'#FFF8E1',padding:12,borderRadius:10,fontSize:12,color:'#E65100'}}>⚠️ Register as farmer first to add animals</p>}

      {myOwnAnimals.length === 0 && myFarmer && <p style={{textAlign:'center',color:'#999',padding:20,fontSize:13}}>No animals registered yet</p>}

      {myOwnAnimals.map(a => (
        <div key={a.passportId} style={{
          background: a.isReportedStolen ? '#FFEBEE' : '#FFF8E1',
          borderRadius:12,padding:14,marginBottom:8,
          border: a.isReportedStolen ? '1px solid #EF9A9A' : '1px solid #FFE082'
        }}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
            <strong style={{fontSize:13,fontFamily:'monospace'}}>{a.passportId}</strong>
            <span style={{
              background: a.isReportedStolen ? '#C62828' : '#2E7D32',
              color:'white',padding:'2px 8px',borderRadius:6,fontSize:10,fontWeight:'bold'
            }}>
              {a.isReportedStolen ? '🚨 STOLEN' : '✅ ALIVE'}
            </span>
          </div>
          <p style={{fontSize:12,margin:'2px 0'}}>🐄 {a.type} • {a.breed}</p>
          {a.age && <p style={{fontSize:11,margin:'2px 0'}}>Age: {a.age} • {a.gender}</p>}
          <p style={{fontSize:11,color:'#666',margin:'2px 0'}}>📍 {a.location?.area || a.location?.locality || a.location?.county}</p>
          <p style={{fontSize:10,color:'#999',margin:'4px 0 0',fontFamily:'monospace'}}>Hash: {a.recordHash}</p>

          {!a.isReportedStolen && (
            <button onClick={() => reportStolen(a.passportId)} style={{
              marginTop:8,background:'#FFEBEE',color:'#C62828',border:'1px solid #EF9A9A',
              padding:'6px 12px',borderRadius:8,fontSize:11,cursor:'pointer',fontWeight:'bold'
            }}>🚨 Report Stolen</button>
          )}
        </div>
      ))}
    </div>
  );
}

function ComingSoon({ name }) {
  return (
    <div style={{textAlign:'center',padding:40}}>
      <span style={{fontSize:60}}>🚧</span>
      <h3 style={{color:'#666'}}>{name}</h3>
      <p style={{fontSize:13,color:'#999'}}>Coming soon — needs SMS + USSD integration</p>
    </div>
  );
}
