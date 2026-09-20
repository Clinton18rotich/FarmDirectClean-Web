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
  const [deathStats, setDeathStats] = useState(null);
  const [homeStats, setHomeStats] = useState(null);
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
      const [s, land, livestock, ds, hs] = await Promise.all([
        api.shamba.stats(),
        api.shamba.listLand(),
        api.shamba.listLivestock(),
        api.shamba.deathStats().catch(() => ({ stats: null })),
        api.shamba.homeSlaughterStats().catch(() => ({ stats: null })),
      ]);
      setStats(s.stats);
      setMyLand(land.land || []);
      setMyLivestock(livestock.livestock || []);
      setDeathStats(ds.stats);
      setHomeStats(hs.stats);
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const modules = [
    { id: 'land', icon: '🏠', title: 'Module A: Digital Land Vault', desc: 'GPS boundaries • Title deeds • 3 witnesses', color: '#4CAF50' },
    { id: 'livestock', icon: '🐄', title: 'Module B: Livestock Passport', desc: 'UUID IDs • Theft protection • Lifecycle tracking', color: '#FF6F00' },
    { id: 'health', icon: '🏥', title: 'Module C: Health & Vet Network', desc: 'Daily SMS check • Vet dispatch (coming soon)', color: '#1565C0' },
    { id: 'meat', icon: '🥩', title: 'Module D: Meat Traceability', desc: 'QR codes • Full chain • Consumer scan', color: '#E65100' },
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

        {/* Live Stats */}
        {stats && (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:12}}>
            <div style={{background:'#E8F5E9',padding:10,borderRadius:10,textAlign:'center'}}>
              <strong style={{fontSize:18,color:'#2E7D32'}}>{stats.livestock.alive || 0}</strong>
              <p style={{fontSize:9,color:'#666',margin:0}}>Alive Animals</p>
            </div>
            <div style={{background:'#FFF3E0',padding:10,borderRadius:10,textAlign:'center'}}>
              <strong style={{fontSize:18,color:'#E65100'}}>{stats.land.total}</strong>
              <p style={{fontSize:9,color:'#666',margin:0}}>Land Parcels</p>
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
// LAND MODULE (unchanged)
// ═══════════════════════════════════════════════════
function LandModule({ myFarmer, myLand, reload }) {
  const [view, setView] = useState('list');
  const [form, setForm] = useState({
    location: null, titleDeed: '', areaHectares: '', landUse: 'Mixed farming', witnesses: [],
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const myOwnLand = myFarmer ? myLand.filter(p => p.ownerPhone === myFarmer.farmer?.phone) : [];

  const addWitness = () => setForm({ ...form, witnesses: [...form.witnesses, { name: '', phone: '' }] });
  const updateWitness = (idx, field, value) => {
    const updated = [...form.witnesses];
    updated[idx] = { ...updated[idx], [field]: value };
    setForm({ ...form, witnesses: updated });
  };

  const submit = async () => {
    setError(null);
    if (!myFarmer) { setError('Please register as farmer first'); return; }
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
      alert('✅ Land registered!\nID: ' + result.land.id);
      await reload();
      setView('list');
      setForm({ location: null, titleDeed: '', areaHectares: '', landUse: 'Mixed farming', witnesses: [] });
    } catch (err) { setError(err.message); }
    finally { setSubmitting(false); }
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
        {form.witnesses.map((w, i) => (
          <div key={i} style={{background:'#F9FAFB',borderRadius:10,padding:10,marginBottom:6,border:'1px solid #E0E0E0'}}>
            <input value={w.name} onChange={e => updateWitness(i, 'name', e.target.value)} placeholder="Witness name" style={{...inputStyle, marginBottom:6}} />
            <input value={w.phone} onChange={e => updateWitness(i, 'phone', e.target.value)} onBlur={e => { if (e.target.value) updateWitness(i, 'phone', normalizeKenyaPhone(e.target.value)); }} placeholder="0712345678" type="tel" style={{...inputStyle, marginBottom:0}} />
          </div>
        ))}
        <button onClick={addWitness} style={{background:'#F0F4F8',border:'1px dashed #90CAF9',borderRadius:10,padding:10,width:'100%',cursor:'pointer',color:'#1565C0',fontWeight:'bold',marginBottom:12}}>+ Add Witness</button>
        <div style={{display:'flex',gap:8}}>
          <button onClick={() => setView('list')} style={{...primaryBtn, background:'#F0F0F0', color:'#666', flex:1}}>← Back</button>
          <button onClick={submit} disabled={submitting || !form.location || !form.areaHectares} style={{...primaryBtn, background: (form.location && form.areaHectares && !submitting) ? '#4CAF50' : '#ccc', flex:2}}>
            {submitting ? '⏳ Saving...' : '✅ Register Land'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h4 style={{fontSize:16,marginBottom:8}}>🏠 My Land ({myOwnLand.length})</h4>
      <button onClick={() => setView('form')} style={{...primaryBtn, background:'#4CAF50', marginBottom:12}}>+ Register New Parcel</button>
      {!myFarmer && <p style={{background:'#FFF8E1',padding:12,borderRadius:10,fontSize:12,color:'#E65100'}}>⚠️ Register as farmer first</p>}
      {myOwnLand.map(p => (
        <div key={p.id} style={{background:'#F0F9F0',borderRadius:12,padding:14,marginBottom:8,border:'1px solid #A5D6A7'}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
            <strong style={{fontSize:13}}>{p.id}</strong>
            <span style={{background: p.status === 'verified' ? '#2E7D32' : '#FF9800', color:'white', padding:'2px 8px', borderRadius:6, fontSize:10, fontWeight:'bold'}}>{p.status === 'verified' ? '✅ VERIFIED' : '⏳ PENDING'}</span>
          </div>
          <p style={{fontSize:12,margin:'2px 0'}}>📍 {p.location?.area || p.location?.locality || p.location?.ward}, {p.location?.county}</p>
          <p style={{fontSize:12,margin:'2px 0'}}>📏 {p.areaHectares} hectares • {p.landUse}</p>
          {p.titleDeed && <p style={{fontSize:11,color:'#666',margin:'2px 0'}}>📜 {p.titleDeed}</p>}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// LIVESTOCK MODULE (UPDATED)
// ═══════════════════════════════════════════════════
function LivestockModule({ myFarmer, myLivestock, reload }) {
  const [view, setView] = useState('list');
  const [tab, setTab] = useState('alive');
  const [form, setForm] = useState({
    type: 'Cow', breed: '', age: '', gender: 'Female', color: '', location: null,
    isNewborn: false, motherPassport: '', fatherPassport: '', birthWeight: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Death modal
  const [deathTarget, setDeathTarget] = useState(null);
  const [deathForm, setDeathForm] = useState({ cause: 'illness', diseaseType: '', description: '', disposalMethod: 'buried' });
  // Home slaughter modal
  const [homeTarget, setHomeTarget] = useState(null);
  const [homeForm, setHomeForm] = useState({ ceremonyType: 'family', numberOfGuests: '', notes: '' });

  const myOwnAnimals = myFarmer ? myLivestock.filter(a => a.ownerPhone === myFarmer.farmer?.phone) : [];
  const alive = myOwnAnimals.filter(a => a.status === 'alive');
  const deceased = myOwnAnimals.filter(a => a.status === 'dead');
  const homeSlaughtered = myOwnAnimals.filter(a => a.status === 'slaughtered_home');

  const displayList = tab === 'alive' ? alive : tab === 'deceased' ? deceased : homeSlaughtered;

  const submit = async () => {
    setError(null);
    if (!myFarmer) { setError('Register as farmer first'); return; }
    setSubmitting(true);
    try {
      const result = await api.shamba.registerLivestock({
        ownerId: myFarmer.farmer?.phone,
        ownerName: myFarmer.farmer?.fullName,
        ownerPhone: myFarmer.farmer?.phone,
        type: form.type,
        breed: form.breed,
        age: form.isNewborn ? null : form.age,
        gender: form.gender,
        color: form.color,
        location: form.location,
        isNewborn: form.isNewborn,
        motherPassport: form.motherPassport || null,
        fatherPassport: form.fatherPassport || null,
        birthWeight: form.birthWeight || null,
      });
      if (!result.success) throw new Error(result.message);
      alert('✅ ' + form.type + ' registered!\nPassport: ' + result.livestock.passportId);
      await reload();
      setView('list');
      setForm({ type: 'Cow', breed: '', age: '', gender: 'Female', color: '', location: null, isNewborn: false, motherPassport: '', fatherPassport: '', birthWeight: '' });
    } catch (err) { setError(err.message); }
    finally { setSubmitting(false); }
  };

  const submitDeath = async () => {
    if (!deathTarget) return;
    try {
      const payload = {
        cause: deathForm.cause,
        description: deathForm.description,
        disposalMethod: deathForm.disposalMethod,
      };
      if (deathForm.cause === 'illness') payload.diseaseType = deathForm.diseaseType;
      const result = await api.shamba.reportDeath(deathTarget.passportId, payload);
      if (!result.success) throw new Error(result.message);
      alert('✅ Death recorded.');
      setDeathTarget(null);
      setDeathForm({ cause: 'illness', diseaseType: '', description: '', disposalMethod: 'buried' });
      await reload();
    } catch (err) { alert('Error: ' + err.message); }
  };

  const submitHome = async () => {
    if (!homeTarget) return;
    try {
      const result = await api.shamba.recordHomeSlaughter(homeTarget.passportId, {
        ceremonyType: homeForm.ceremonyType,
        numberOfGuests: homeForm.numberOfGuests ? parseInt(homeForm.numberOfGuests) : null,
        notes: homeForm.notes,
      });
      if (!result.success) throw new Error(result.message);
      const cert = result.livestock.homeSlaughter?.certificate;
      alert('✅ Home slaughter recorded!\n\nCertificate: ' + (cert?.certificateId || 'N/A') + '\n\nThis meat is for home use only. NOT FOR SALE.');
      setHomeTarget(null);
      setHomeForm({ ceremonyType: 'family', numberOfGuests: '', notes: '' });
      await reload();
    } catch (err) { alert('Error: ' + err.message); }
  };

  const reportStolen = async (passportId) => {
    if (!confirm('Report as STOLEN?\n\nSlaughterhouses will be notified.')) return;
    try {
      await api.shamba.reportStolen(passportId, { reportedBy: myFarmer?.farmer?.fullName, contactPhone: myFarmer?.farmer?.phone });
      alert('🚨 Theft reported.');
      await reload();
    } catch (err) { alert('Error: ' + err.message); }
  };

  // ─── FORM VIEW ───
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

        <div style={{background:'#F0F4F8',borderRadius:10,padding:12,marginBottom:12,marginTop:8}}>
          <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',marginBottom:0}}>
            <input type="checkbox" checked={form.isNewborn} onChange={e => setForm({...form, isNewborn: e.target.checked, age: e.target.checked ? '' : form.age})} style={{width:20,height:20}} />
            <strong style={{fontSize:13,color:'#1B5E20'}}>🐣 This is a NEWBORN (born recently)</strong>
          </label>
        </div>

        {form.isNewborn ? (
          <>
            <label style={labelStyle}>Birth Weight (optional)</label>
            <input value={form.birthWeight} onChange={e => setForm({...form, birthWeight: e.target.value})} placeholder="e.g. 35kg" style={inputStyle} />
            <label style={labelStyle}>Mother's Passport ID (optional)</label>
            <input value={form.motherPassport} onChange={e => setForm({...form, motherPassport: e.target.value.toUpperCase()})} placeholder="e.g. KE-COW-ABC123XY" style={{...inputStyle, textTransform:'uppercase', fontFamily:'monospace'}} />
            <label style={labelStyle}>Father's Passport ID (optional)</label>
            <input value={form.fatherPassport} onChange={e => setForm({...form, fatherPassport: e.target.value.toUpperCase()})} placeholder="e.g. KE-COW-DEF456ZW" style={{...inputStyle, textTransform:'uppercase', fontFamily:'monospace'}} />
          </>
        ) : (
          <>
            <label style={labelStyle}>Age</label>
            <input value={form.age} onChange={e => setForm({...form, age: e.target.value})} placeholder="e.g. 2 years" style={inputStyle} />
            <label style={labelStyle}>Gender</label>
            <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})} style={{...inputStyle, background:'white'}}>
              <option>Female</option><option>Male</option>
            </select>
            <label style={labelStyle}>Color</label>
            <input value={form.color} onChange={e => setForm({...form, color: e.target.value})} placeholder="e.g. Black and white" style={inputStyle} />
          </>
        )}

        {form.isNewborn && (
          <>
            <label style={labelStyle}>Gender</label>
            <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})} style={{...inputStyle, background:'white'}}>
              <option>Female</option><option>Male</option>
            </select>
          </>
        )}

        <LocationPicker value={form.location} onChange={loc => setForm({...form, location: loc})} required label="Where is the animal?" />

        <div style={{display:'flex',gap:8,marginTop:16}}>
          <button onClick={() => setView('list')} style={{...primaryBtn, background:'#F0F0F0', color:'#666', flex:1}}>← Back</button>
          <button onClick={submit} disabled={submitting || !form.breed || !form.location} style={{...primaryBtn, background: (form.breed && form.location && !submitting) ? '#FF6F00' : '#ccc', flex:2}}>
            {submitting ? '⏳ Saving...' : '✅ Register Animal'}
          </button>
        </div>
      </div>
    );
  }

  // ─── LIST VIEW ───
  return (
    <div>
      <h4 style={{fontSize:16,marginBottom:8}}>🐄 My Animals</h4>
      <button onClick={() => setView('form')} style={{...primaryBtn, background:'#FF6F00', marginBottom:12}}>+ Register New Animal</button>

      {/* Tabs */}
      <div style={{display:'flex',gap:6,marginBottom:12,borderBottom:'1px solid #E0E0E0',paddingBottom:8}}>
        <button onClick={() => setTab('alive')} style={{flex:1,padding:'8px 4px',borderRadius:8,border:'none',background:tab==='alive'?'#E8F5E9':'#F5F7FA',color:tab==='alive'?'#2E7D32':'#666',fontSize:12,fontWeight:'bold',cursor:'pointer'}}>
          ✅ Alive ({alive.length})
        </button>
        <button onClick={() => setTab('deceased')} style={{flex:1,padding:'8px 4px',borderRadius:8,border:'none',background:tab==='deceased'?'#FFEBEE':'#F5F7FA',color:tab==='deceased'?'#C62828':'#666',fontSize:12,fontWeight:'bold',cursor:'pointer'}}>
          🕯️ Deceased ({deceased.length})
        </button>
        <button onClick={() => setTab('home')} style={{flex:1,padding:'8px 4px',borderRadius:8,border:'none',background:tab==='home'?'#FFF3E0':'#F5F7FA',color:tab==='home'?'#E65100':'#666',fontSize:12,fontWeight:'bold',cursor:'pointer'}}>
          🏠 Home ({homeSlaughtered.length})
        </button>
      </div>

      {!myFarmer && <p style={{background:'#FFF8E1',padding:12,borderRadius:10,fontSize:12,color:'#E65100'}}>⚠️ Register as farmer first</p>}
      {displayList.length === 0 && myFarmer && <p style={{textAlign:'center',color:'#999',padding:20,fontSize:13}}>No animals in this category</p>}

      {displayList.map(a => {
        const isDead = a.status === 'dead';
        const isHome = a.status === 'slaughtered_home';

        return (
          <div key={a.passportId} style={{
            background: isDead ? '#FFEBEE' : isHome ? '#FFF3E0' : '#FFF8E1',
            borderRadius:12,padding:14,marginBottom:8,
            border: isDead ? '1px solid #EF9A9A' : isHome ? '1px solid #FFE082' : '1px solid #FFE082',
            opacity: isDead || isHome ? 0.9 : 1,
          }}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
              <strong style={{fontSize:13,fontFamily:'monospace'}}>{a.passportId}</strong>
              <span style={{
                background: isDead ? '#C62828' : isHome ? '#E65100' : a.isReportedStolen ? '#C62828' : '#2E7D32',
                color:'white',padding:'2px 8px',borderRadius:6,fontSize:10,fontWeight:'bold'
              }}>
                {isDead ? '🕯️ DECEASED' : isHome ? '🏠 HOME SLAUGHTER' : a.isReportedStolen ? '🚨 STOLEN' : '✅ ALIVE'}
              </span>
            </div>
            <p style={{fontSize:13,margin:'2px 0'}}>
              🐄 {a.type} • {a.breed}
              {a.currentLifeStage && <span style={{marginLeft:6,background:'#E3F2FD',color:'#1565C0',padding:'1px 6px',borderRadius:4,fontSize:10,fontWeight:'bold'}}>{a.currentLifeStage}</span>}
            </p>
            {a.ageDisplay && <p style={{fontSize:11,margin:'2px 0'}}>Age: {a.ageDisplay}</p>}
            {a.gender && <p style={{fontSize:11,margin:'2px 0'}}>{a.gender}{a.color ? ' • ' + a.color : ''}</p>}
            <p style={{fontSize:11,color:'#666',margin:'2px 0'}}>📍 {a.location?.area || a.location?.locality || a.location?.county}</p>

            {isDead && a.deathRecord && (
              <div style={{background:'#FFEBEE',borderRadius:8,padding:8,marginTop:6,fontSize:11}}>
                <strong style={{color:'#C62828'}}>Cause: {a.deathRecord.causeLabel}</strong>
                {a.deathRecord.diseaseType && <span> — {a.deathRecord.diseaseType}</span>}
                <p style={{margin:'2px 0',color:'#666'}}>{new Date(a.deathRecord.deathDate).toLocaleDateString()}</p>
              </div>
            )}

            {isHome && a.homeSlaughter && (
              <div style={{background:'#FFF3E0',borderRadius:8,padding:8,marginTop:6,fontSize:11}}>
                <strong style={{color:'#E65100'}}>{a.homeSlaughter.ceremonyLabel}</strong>
                {a.homeSlaughter.numberOfGuests && <span> — {a.homeSlaughter.numberOfGuests} guests</span>}
                <p style={{margin:'2px 0',color:'#666'}}>{new Date(a.homeSlaughter.ceremonyDate).toLocaleDateString()}</p>
                {a.homeSlaughter.certificate && (
                  <p style={{margin:'4px 0 0',fontFamily:'monospace',fontSize:10,color:'#999'}}>Cert: {a.homeSlaughter.certificate.certificateId}</p>
                )}
              </div>
            )}

            {/* Action buttons for alive animals */}
            {!isDead && !isHome && !a.isReportedStolen && (
              <div style={{display:'flex',gap:6,marginTop:8}}>
                <button onClick={() => setDeathTarget(a)} style={{
                  flex:1,background:'#FFEBEE',color:'#C62828',border:'1px solid #EF9A9A',
                  padding:'8px 6px',borderRadius:8,fontSize:11,cursor:'pointer',fontWeight:'bold'
                }}>🕯️ Report Death</button>
                <button onClick={() => setHomeTarget(a)} style={{
                  flex:1,background:'#FFF3E0',color:'#E65100',border:'1px solid #FFE082',
                  padding:'8px 6px',borderRadius:8,fontSize:11,cursor:'pointer',fontWeight:'bold'
                }}>🏠 For Ceremony</button>
                <button onClick={() => reportStolen(a.passportId)} style={{
                  flex:1,background:'#F5F5F5',color:'#666',border:'1px solid #E0E0E0',
                  padding:'8px 6px',borderRadius:8,fontSize:11,cursor:'pointer',fontWeight:'bold'
                }}>🚨 Stolen</button>
              </div>
            )}
          </div>
        );
      })}

      {/* DEATH MODAL */}
      {deathTarget && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.7)',zIndex:600,display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={() => setDeathTarget(null)}>
          <div style={{background:'white',borderRadius:'20px 20px 0 0',padding:20,maxWidth:450,width:'100%',maxHeight:'85vh',overflowY:'auto'}} onClick={e => e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <h4 style={{margin:0,color:'#C62828',fontSize:16}}>🕯️ Report Death</h4>
              <button onClick={() => setDeathTarget(null)} style={{background:'none',border:'none',fontSize:22,cursor:'pointer',color:'#666'}}>✕</button>
            </div>

            <div style={{background:'#FFEBEE',padding:10,borderRadius:8,marginBottom:12}}>
              <strong style={{fontSize:12,color:'#C62828'}}>{deathTarget.type} • {deathTarget.breed}</strong>
              <p style={{fontSize:11,color:'#666',margin:'2px 0 0'}}>{deathTarget.passportId}</p>
            </div>

            <label style={labelStyle}>Cause of Death *</label>
            <select value={deathForm.cause} onChange={e => setDeathForm({...deathForm, cause: e.target.value})} style={{...inputStyle, background:'white'}}>
              <option value="illness">🦠 Illness / Disease</option>
              <option value="natural">🕰️ Natural (old age)</option>
              <option value="predator">🐆 Predator attack</option>
              <option value="accident">⚠️ Accident</option>
              <option value="theft">🔪 Theft / Illegal slaughter</option>
              <option value="unknown">❓ Unknown</option>
            </select>

            {/* Safety warning */}
            {deathForm.cause === 'illness' && (
              <div style={{background:'#FFEBEE',padding:10,borderRadius:8,marginBottom:12,border:'1px solid #EF9A9A'}}>
                <strong style={{fontSize:11,color:'#C62828'}}>⚠️ CRITICAL: Disease deaths cannot be consumed.</strong>
                <p style={{fontSize:11,color:'#666',margin:'4px 0 0'}}>Animal must be buried or burned immediately. Not for sale, not for consumption.</p>
              </div>
            )}
            {deathForm.cause === 'predator' && (
              <div style={{background:'#FFF3E0',padding:10,borderRadius:8,marginBottom:12,border:'1px solid #FFE082'}}>
                <strong style={{fontSize:11,color:'#E65100'}}>🐆 Eligible for county compensation</strong>
                <p style={{fontSize:11,color:'#666',margin:'4px 0 0'}}>Record the death to file a compensation claim.</p>
              </div>
            )}
            {deathForm.cause === 'accident' && (
              <div style={{background:'#FFF3E0',padding:10,borderRadius:8,marginBottom:12,border:'1px solid #FFE082'}}>
                <strong style={{fontSize:11,color:'#E65100'}}>⚠️ Emergency slaughter possible</strong>
                <p style={{fontSize:11,color:'#666',margin:'4px 0 0'}}>Vet must inspect within 2 hours for meat to be safe.</p>
              </div>
            )}

            {deathForm.cause === 'illness' && (
              <>
                <label style={labelStyle}>Disease Type *</label>
                <input value={deathForm.diseaseType} onChange={e => setDeathForm({...deathForm, diseaseType: e.target.value})} placeholder="e.g. Foot and Mouth Disease" style={inputStyle} />
              </>
            )}

            <label style={labelStyle}>Description</label>
            <textarea value={deathForm.description} onChange={e => setDeathForm({...deathForm, description: e.target.value})} placeholder="e.g. Found dead in the morning" rows={2} style={{...inputStyle, resize:'vertical'}} />

            <label style={labelStyle}>Disposal Method</label>
            <select value={deathForm.disposalMethod} onChange={e => setDeathForm({...deathForm, disposalMethod: e.target.value})} style={{...inputStyle, background:'white'}}>
              <option value="buried">Buried</option>
              <option value="burned">Burned</option>
              <option value="vet">Vet took the carcass</option>
              <option value="other">Other</option>
            </select>

            <div style={{display:'flex',gap:8,marginTop:12}}>
              <button onClick={() => setDeathTarget(null)} style={{...primaryBtn, background:'#F0F0F0', color:'#666', flex:1}}>Cancel</button>
              <button onClick={submitDeath} disabled={deathForm.cause === 'illness' && !deathForm.diseaseType} style={{...primaryBtn, background: (deathForm.cause !== 'illness' || deathForm.diseaseType) ? '#C62828' : '#ccc', flex:2}}>
                🕯️ Record Death
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HOME SLAUGHTER MODAL */}
      {homeTarget && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.7)',zIndex:600,display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={() => setHomeTarget(null)}>
          <div style={{background:'white',borderRadius:'20px 20px 0 0',padding:20,maxWidth:450,width:'100%',maxHeight:'85vh',overflowY:'auto'}} onClick={e => e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <h4 style={{margin:0,color:'#E65100',fontSize:16}}>🏠 Slaughter for Home</h4>
              <button onClick={() => setHomeTarget(null)} style={{background:'none',border:'none',fontSize:22,cursor:'pointer',color:'#666'}}>✕</button>
            </div>

            <div style={{background:'#FFF3E0',padding:10,borderRadius:8,marginBottom:12}}>
              <strong style={{fontSize:12,color:'#E65100'}}>{homeTarget.type} • {homeTarget.breed}</strong>
              <p style={{fontSize:11,color:'#666',margin:'2px 0 0'}}>{homeTarget.passportId}</p>
            </div>

            <div style={{background:'#FFF8E1',padding:10,borderRadius:8,marginBottom:12,border:'1px solid #FFE082'}}>
              <strong style={{fontSize:11,color:'#E65100'}}>⚠️ This meat cannot be sold.</strong>
              <p style={{fontSize:11,color:'#666',margin:'4px 0 0'}}>Home slaughter is for family and guests only. If you want to sell, use a licensed slaughterhouse.</p>
            </div>

            <label style={labelStyle}>Ceremony Type *</label>
            <select value={homeForm.ceremonyType} onChange={e => setHomeForm({...homeForm, ceremonyType: e.target.value})} style={{...inputStyle, background:'white'}}>
              <option value="wedding">💍 Wedding</option>
              <option value="funeral">🕊️ Funeral</option>
              <option value="dowry">🎁 Dowry / Ruracio</option>
              <option value="religious">🕌 Religious (Eid, Diwali)</option>
              <option value="family">👨‍👩‍👧‍👦 Family gathering</option>
              <option value="other">🎉 Other celebration</option>
            </select>

            <label style={labelStyle}>Number of Guests (optional)</label>
            <input value={homeForm.numberOfGuests} onChange={e => setHomeForm({...homeForm, numberOfGuests: e.target.value})} placeholder="e.g. 250" type="number" style={inputStyle} />

            <label style={labelStyle}>Notes (optional)</label>
            <textarea value={homeForm.notes} onChange={e => setHomeForm({...homeForm, notes: e.target.value})} placeholder="e.g. Daughter's wedding" rows={2} style={{...inputStyle, resize:'vertical'}} />

            <div style={{display:'flex',gap:8,marginTop:12}}>
              <button onClick={() => setHomeTarget(null)} style={{...primaryBtn, background:'#F0F0F0', color:'#666', flex:1}}>Cancel</button>
              <button onClick={submitHome} style={{...primaryBtn, background:'#E65100', flex:2}}>
                🏠 Record Home Slaughter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ComingSoon({ name }) {
  return (
    <div style={{textAlign:'center',padding:40}}>
      <span style={{fontSize:60}}>🚧</span>
      <h3 style={{color:'#666'}}>{name}</h3>
      <p style={{fontSize:13,color:'#999'}}>Coming soon</p>
    </div>
  );
}
