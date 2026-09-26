import React, { useState, useEffect } from 'react';
import LocationPicker from './LocationPicker';
import PhysicalProfileForm from './PhysicalProfileForm';
import MeasurementGuideModal from './MeasurementGuideModal';
import LandPaymentSheet from './LandPaymentSheet';
import ListForSaleModal from './ListForSaleModal';
import PhotoViewer from './PhotoViewer';
import PhotoGalleryModal from './PhotoGalleryModal';
import TransferOwnershipModal from './TransferOwnershipModal';
import KYCModal from './KYCModal';
import HealthRecordModal from './HealthRecordModal';
import SelfServiceOrDispatchModal from './SelfServiceOrDispatchModal';
import { api } from '../services/api';
import { normalizeKenyaPhone, isValidKenyaPhone } from '../utils/phone';
import RequireIdentityModal from './RequireIdentityModal';

const ANIMAL_TYPES = ['Cow', 'Goat', 'Sheep', 'Pig', 'Chicken', 'Camel', 'Donkey', 'Rabbit'];
const LAND_USES = ['Crop farming', 'Livestock grazing', 'Mixed farming', 'Residential', 'Commercial'];

const inputStyle = { width:'100%', padding:'14px 16px', borderRadius:10, border:'2px solid #E0E0E0', fontSize:16, marginBottom:8, boxSizing:'border-box', fontFamily:'inherit', color:'#333' };
const labelStyle = { fontSize:12, fontWeight:'bold', color:'#555', display:'block', marginBottom:4, marginTop:8 };
const primaryBtn = { width:'100%', padding:16, color:'white', border:'none', borderRadius:25, fontSize:16, fontWeight:'bold', cursor:'pointer', marginTop:8, boxSizing:'border-box' };

export default function ShambaSafi({ onClose, onBrowseMarketplace, onRequireAuth }) {
  const [activeModule, setActiveModule] = useState(null);
  const [identityPrompt, setIdentityPrompt] = useState(null);

  // 6.20h: one-tap path to registration for anonymous users
  const requestFarmerRegistration = () => {
    setIdentityPrompt({
      action: 'register as a farmer',
      roleHint: 'farmer',
    });
  };
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
    { id: 'slaughterhouse', icon: '🏭', title: 'Module E: Slaughterhouse Portal', desc: 'Register • Lookup • Slaughter • Meat tokens', color: '#7B1FA2' },
    { id: 'butchery', icon: '🏪', title: 'Module F: Butchery Portal', desc: 'Receive meat • Sell • Track inventory', color: '#C2185B' },
    { id: 'land-sovereignty', icon: '🏠', title: 'Module G: Land Sovereignty', desc: 'GPS boundaries • Title vault • Witnesses • Eviction SOS', color: '#2E7D32' },
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

            {activeModule === 'land' && <LandModule myFarmer={myFarmer} myLand={myLand} reload={loadAll} onRequestRegister={requestFarmerRegistration} />}
            {activeModule === 'livestock' && <LivestockModule myFarmer={myFarmer} myLivestock={myLivestock} reload={loadAll} onBrowseMarketplace={onBrowseMarketplace} onRequestRegister={requestFarmerRegistration} />}
            {activeModule === 'health' && <VetModule />}
            {activeModule === 'meat' && <VerifyMeatView onBack={() => setActiveModule(null)} />}
            {activeModule === 'slaughterhouse' && <SlaughterhouseModule />}
            {activeModule === 'butchery' && <ButcheryModule />}
            {activeModule === 'land-sovereignty' && <LandSovereigntyModule />}
          </div>
        )}

        <div style={{background:'#E3F2FD',padding:10,borderRadius:8,marginTop:12,fontSize:11}}>
          <strong>🔐 Blockchain-Lite:</strong> Records hashed locally • Immutable record
        </div>
      {identityPrompt && (
        <RequireIdentityModal
          action={identityPrompt.action}
          roleHint={identityPrompt.roleHint}
          onSignIn={() => { setIdentityPrompt(null); onRequireAuth && onRequireAuth('signin'); }}
          onCreate={() => { setIdentityPrompt(null); onRequireAuth && onRequireAuth('create'); }}
          onClose={() => setIdentityPrompt(null)}
        />
      )}
    </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// LAND MODULE (unchanged)
// ═══════════════════════════════════════════════════
function LandModule({ myFarmer, myLand, reload, onRequestRegister }) {
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
      {!myFarmer && (
          <div style={{background:'#FFF8E1',padding:12,borderRadius:10,fontSize:12,color:'#E65100',marginBottom:10}}>
            <div style={{marginBottom:8}}>⚠️ Register as farmer first</div>
            <button
              onClick={onRequestRegister}
              style={{padding:'8px 16px',borderRadius:20,border:'none',background:'#E65100',color:'white',fontSize:12,fontWeight:'bold',cursor:'pointer'}}
            >
              📝 Register as farmer →
            </button>
          </div>
        )}
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
function LivestockModule({ myFarmer, myLivestock, reload, onBrowseMarketplace, onRequestRegister }) {
  const [view, setView] = useState('list');

  // Session 5A: List for sale
  const [listTarget, setListTarget] = useState(null);

  // Session 5A Part 2: photo viewer + gallery
  const [photoViewer, setPhotoViewer] = useState(null);
  const [photoGalleryTarget, setPhotoGalleryTarget] = useState(null);
  const [transferTarget, setTransferTarget] = useState(null);
  const [healthTarget, setHealthTarget] = useState(null);
  
  // Load physical attribute constants on mount
  useEffect(() => {
    api.shamba.physicalAttributes()
      .then(r => setConstants(r.attributes))
      .catch(err => console.error('Failed to load attributes:', err));
  }, []);
  const [tab, setTab] = useState('alive');
  const [form, setForm] = useState({
    type: 'Cow', breed: '', age: '', gender: 'Female', color: '', location: null,
    photoUrl: '',
    isNewborn: false, motherPassport: '', fatherPassport: '', birthWeight: '',
    // Physical profile (all optional)
    weight: '', heartGirth: '', bodyLength: '', heightAtWithers: '',
    bodyConditionScore: '', muscleCondition: '', fatCover: '',
    coatCondition: '', skinCondition: '', skinProblems: [], coatColorPattern: '',
    udderSize: '', udderShape: '', teatCondition: '', milkVeins: '',
    lactationStatus: '', dailyMilkYield: '', pregnancyStatus: '', pregnancyMonths: '',
    calvingHistory: '', lastCalvingDate: '',
    horns: '', eyes: '', teethAge: '', ears: '', muzzle: '',
    hooves: '', legs: '', walking: '', jointSwelling: '',
    purpose: '', breedPurity: '', sireInfo: '', damInfo: '', feedRegime: '',
    vaccinationCard: '', vetCertificate: '', movementPermit: '',
    brandMark: false, earTag: false,
  });
  const [submitting, setSubmitting] = useState(false);

// Session 5A: Photo picker — works for both camera and gallery inputs
  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rawDataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const img = await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = rawDataUrl;
      });

      const MAX_DIM = 800;          // reduced from 1024
      let { width, height } = img;
      if (width > MAX_DIM || height > MAX_DIM) {
        if (width > height) {
          height = Math.round((height * MAX_DIM) / width);
          width = MAX_DIM;
        } else {
          width = Math.round((width * MAX_DIM) / height);
          height = MAX_DIM;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.6);   // reduced from 0.75

      setForm({ ...form, photoUrl: resizedDataUrl });
      console.log('📸 Photo resized to', Math.round(resizedDataUrl.length / 1024), 'KB');
    } catch (err) {
      console.error('Photo processing failed:', err);
      alert('Could not process photo: ' + err.message);
    }
    // Reset the input so the same file can be picked again if needed
    e.target.value = '';
  };

  const [error, setError] = useState(null);
  const [showGuide, setShowGuide] = useState(false);
  const [constants, setConstants] = useState(null);

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
        // Photo (Session 5A)
        photoUrl: form.photoUrl,
        photos: form.photoUrl ? [form.photoUrl] : [],
        // Owner & basic
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

        // Physical profile (all optional)
        weight: form.weight || null,
        heartGirth: form.heartGirth || null,
        bodyLength: form.bodyLength || null,
        heightAtWithers: form.heightAtWithers || null,
        bodyConditionScore: form.bodyConditionScore || null,
        muscleCondition: form.muscleCondition || null,
        fatCover: form.fatCover || null,
        coatCondition: form.coatCondition || null,
        skinCondition: form.skinCondition || null,
        skinProblems: form.skinProblems || [],
        coatColorPattern: form.coatColorPattern || null,
        udderSize: form.udderSize || null,
        udderShape: form.udderShape || null,
        teatCondition: form.teatCondition || null,
        milkVeins: form.milkVeins || null,
        lactationStatus: form.lactationStatus || null,
        dailyMilkYield: form.dailyMilkYield || null,
        pregnancyStatus: form.pregnancyStatus || null,
        pregnancyMonths: form.pregnancyMonths || null,
        calvingHistory: form.calvingHistory || null,
        lastCalvingDate: form.lastCalvingDate || null,
        horns: form.horns || null,
        eyes: form.eyes || null,
        teethAge: form.teethAge || null,
        ears: form.ears || null,
        muzzle: form.muzzle || null,
        hooves: form.hooves || null,
        legs: form.legs || null,
        walking: form.walking || null,
        jointSwelling: form.jointSwelling || null,
        purpose: form.purpose || null,
        breedPurity: form.breedPurity || null,
        sireInfo: form.sireInfo || null,
        damInfo: form.damInfo || null,
        feedRegime: form.feedRegime || null,
        vaccinationCard: form.vaccinationCard || null,
        vetCertificate: form.vetCertificate || null,
        movementPermit: form.movementPermit || null,
        brandMark: form.brandMark || false,
        earTag: form.earTag || false,
      });
      if (!result.success) throw new Error(result.message);
      alert('✅ ' + form.type + ' registered!\nPassport: ' + result.livestock.passportId);
      await reload();
      setView('list');
      setForm({
        type: 'Cow', breed: '', age: '', gender: 'Female', color: '', location: null,
        isNewborn: false, motherPassport: '', fatherPassport: '', birthWeight: '',
        weight: '', heartGirth: '', bodyLength: '', heightAtWithers: '',
        bodyConditionScore: '', muscleCondition: '', fatCover: '',
        coatCondition: '', skinCondition: '', skinProblems: [], coatColorPattern: '',
        udderSize: '', udderShape: '', teatCondition: '', milkVeins: '',
        lactationStatus: '', dailyMilkYield: '', pregnancyStatus: '', pregnancyMonths: '',
        calvingHistory: '', lastCalvingDate: '',
        horns: '', eyes: '', teethAge: '', ears: '', muzzle: '',
        hooves: '', legs: '', walking: '', jointSwelling: '',
        purpose: '', breedPurity: '', sireInfo: '', damInfo: '', feedRegime: '',
        vaccinationCard: '', vetCertificate: '', movementPermit: '',
        brandMark: false, earTag: false,
      });
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

        {/* Session 5A: Photo upload — dual camera + gallery */}
        <label style={labelStyle}>Photo * <span style={{fontWeight:'normal',color:'#999'}}>(required for theft protection)</span></label>
        <div style={{background:'#F9FAFB', borderRadius:10, padding:12, marginBottom:12, border:'2px dashed #ddd', textAlign:'center'}}>
          {form.photoUrl ? (
            <div>
              <img
                src={form.photoUrl}
                alt="Animal"
                style={{maxWidth:'100%', maxHeight:200, borderRadius:8, marginBottom:8}}
              />
              <button
                type="button"
                onClick={() => setForm({...form, photoUrl: ''})}
                style={{background:'#FFEBEE', color:'#C62828', border:'none', padding:'6px 12px', borderRadius:6, fontSize:11, cursor:'pointer', fontWeight:'bold'}}
              >
                ✕ Remove Photo
              </button>
            </div>
          ) : (
            <div style={{padding:16}}>
              <span style={{fontSize:48, display:'block', marginBottom:8}}>📸</span>
              <strong style={{fontSize:15, color:'#2E7D32', display:'block', marginBottom:4}}>Add a Photo of This Animal</strong>
              <span style={{fontSize:11, color:'#666', display:'block', marginBottom:14}}>Shows the animal as it looks today. Prevents theft.</span>

              <div style={{display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap'}}>
                {/* Camera button */}
                <button
                  type="button"
                  onClick={() => document.getElementById('animal-photo-camera').click()}
                  style={{
                    background:'#2E7D32',
                    color:'white',
                    border:'none',
                    padding:'12px 20px',
                    borderRadius:20,
                    fontSize:13,
                    fontWeight:'bold',
                    cursor:'pointer',
                    display:'flex',
                    alignItems:'center',
                    gap:6
                  }}
                >
                  📷 Take Photo
                </button>

                {/* Gallery button */}
                <button
                  type="button"
                  onClick={() => document.getElementById('animal-photo-gallery').click()}
                  style={{
                    background:'white',
                    color:'#2E7D32',
                    border:'2px solid #2E7D32',
                    padding:'10px 20px',
                    borderRadius:20,
                    fontSize:13,
                    fontWeight:'bold',
                    cursor:'pointer',
                    display:'flex',
                    alignItems:'center',
                    gap:6
                  }}
                >
                  🖼️ From Gallery
                </button>
              </div>

              {/* Camera input — opens camera directly */}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                id="animal-photo-camera"
                onChange={handlePhotoSelect}
                style={{display:'none'}}
              />

              {/* Gallery input — opens file picker */}
              <input
                type="file"
                accept="image/*"
                id="animal-photo-gallery"
                onChange={handlePhotoSelect}
                style={{display:'none'}}
              />
            </div>
          )}
        </div>

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

        {/* Guide button */}
        <button
          type="button"
          onClick={() => setShowGuide(true)}
          style={{
            width:'100%',padding:12,borderRadius:10,
            border:'2px dashed #4CAF50',background:'#E8F5E9',
            color:'#2E7D32',fontWeight:'bold',fontSize:13,
            cursor:'pointer',marginBottom:12,
          }}
        >
          📏 How do I measure weight? (Guide + Calculator)
        </button>

        {/* Physical Profile — collapsible sections */}
        <PhysicalProfileForm
          value={form}
          onChange={(updated) => setForm({...form, ...updated})}
          constants={constants}
          animalType={form.type}
        />

        <div style={{display:'flex',gap:8,marginTop:16}}>
          <button onClick={() => setView('list')} style={{...primaryBtn, background:'#F0F0F0', color:'#666', flex:1}}>← Back</button>
          <button onClick={submit} disabled={submitting || !form.breed || !form.location || !form.photoUrl} style={{...primaryBtn, background: (form.breed && form.location && form.photoUrl && !submitting) ? '#FF6F00' : '#ccc', flex:2}}>
            {submitting ? '⏳ Saving...' : '✅ Register Animal'}
          </button>
        </div>

        {/* GUIDE MODAL — inside form view so it shows when button is tapped */}
        {showGuide && (
          <MeasurementGuideModal 
            onClose={() => setShowGuide(false)} 
            animalType={form.type}
          />
        )}
      </div>
    );
  }

  // ─── LIST VIEW ───
  return (
    <div>
      <h4 style={{fontSize:16,marginBottom:8}}>🐄 My Animals</h4>
      <button onClick={() => setView('form')} style={{...primaryBtn, background:'#FF6F00', marginBottom:12}}>+ Register New Animal</button>

      {onBrowseMarketplace && (
        <button onClick={onBrowseMarketplace} style={{...primaryBtn, background:'white', color:'#2E7D32', border:'2px solid #2E7D32', marginBottom:12}}>🛒 Browse Marketplace</button>
      )}

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

      {!myFarmer && (
          <div style={{background:'#FFF8E1',padding:12,borderRadius:10,fontSize:12,color:'#E65100',marginBottom:10}}>
            <div style={{marginBottom:8}}>⚠️ Register as farmer first</div>
            <button
              onClick={onRequestRegister}
              style={{padding:'8px 16px',borderRadius:20,border:'none',background:'#E65100',color:'white',fontSize:12,fontWeight:'bold',cursor:'pointer'}}
            >
              📝 Register as farmer →
            </button>
          </div>
        )}
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
            {/* SESSION 5A PHOTO CARD — shows animal photo */}
            <div style={{display:'flex',gap:10,alignItems:'flex-start',marginBottom:6}}>
              {a.photoUrl && (
                <div style={{position:'relative', flexShrink:0, cursor:'pointer'}}
                  onClick={() => setPhotoViewer({
                    src: a.photoUrl,
                    caption: `${a.passportId} · ${a.type} ${a.breed}${a.ageDisplay ? ' · ' + a.ageDisplay : ''}`,
                  })}
                >
                  <img
                    src={a.photoUrl}
                    alt={a.passportId}
                    style={{
                      width:64,
                      height:64,
                      borderRadius:8,
                      objectFit:'cover',
                      border:'2px solid #E0E0E0',
                      background:'#F5F5F5',
                    }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  {(a.photos?.length || 1) > 1 && (
                    <span style={{
                      position:'absolute',
                      bottom:4,
                      right:4,
                      background:'rgba(0,0,0,0.7)',
                      color:'white',
                      fontSize:10,
                      padding:'2px 6px',
                      borderRadius:10,
                      fontWeight:'bold',
                    }}>
                      {a.photos.length}
                    </span>
                  )}
                </div>
              )}
              <div style={{flex:1, minWidth:0}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:2}}>
                  <strong style={{fontSize:13,fontFamily:'monospace'}}>{a.passportId}</strong>
                  <span style={{
                    background: isDead ? '#C62828' : isHome ? '#E65100' : a.isReportedStolen ? '#C62828' : '#2E7D32',
                    color:'white',padding:'2px 8px',borderRadius:6,fontSize:10,fontWeight:'bold',
                    flexShrink:0,
                  }}>
                    {isDead ? '🕯️ DECEASED' : isHome ? '🏠 HOME SLAUGHTER' : a.isReportedStolen ? '🚨 STOLEN' : '✅ ALIVE'}
                  </span>
                </div>
              </div>
            </div>

            {/* Rest of the card content — closes the outer flex wrapper visually */}
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

            {/* Session 5A: Photos management */}
            {!isDead && !a.isReportedStolen && (
              <button
                onClick={() => setPhotoGalleryTarget(a)}
                style={{
                  width:'100%',
                  marginTop:6,
                  background:'#E3F2FD',
                  color:'#1565C0',
                  border:'1px solid #90CAF9',
                  padding:'8px',
                  borderRadius:8,
                  fontSize:11,
                  cursor:'pointer',
                  fontWeight:'bold',
                }}
              >
                📸 Photos {a.photos?.length ? `(${a.photos.length})` : ''}
              </button>
            )}

            {/* Session 6.13: Health Record — two-tier self/vet-verified events */}
            {!isDead && !a.isReportedStolen && (
              <button
                onClick={() => setHealthTarget(a)}
                style={{
                  width:'100%',
                  marginTop:6,
                  background:'#E8F5E9',
                  color:'#1B5E20',
                  border:'1px solid #A5D6A7',
                  padding:'8px',
                  borderRadius:8,
                  fontSize:11,
                  cursor:'pointer',
                  fontWeight:'bold',
                }}
              >
                🩺 Health Record
              </button>
            )}

            {/* Session 5A: Transfer ownership (gift / inheritance / dowry / direct sale) */}
            {!isDead && !isHome && !a.isReportedStolen && (
              <button
                onClick={() => setTransferTarget(a)}
                style={{
                  width:'100%',
                  marginTop:6,
                  background:'#FFF8E1',
                  color:'#E65100',
                  border:'1px solid #FFD54F',
                  padding:'8px',
                  borderRadius:8,
                  fontSize:11,
                  cursor:'pointer',
                  fontWeight:'bold',
                }}
              >
                🤝 Transfer
              </button>
            )}

            {/* Session 5A: List for Sale / Withdraw */}
            {!isDead && !isHome && !a.isReportedStolen && a.photoUrl && (
              <div style={{marginTop:8}}>
                {a.forSale && a.forSale.status === 'active' ? (
                  <div style={{display:'flex',gap:6,alignItems:'center'}}>
                    <div style={{flex:1,background:'#E8F5E9',padding:'8px 10px',borderRadius:8,border:'1px solid #A5D6A7'}}>
                      <span style={{fontSize:11,color:'#2E7D32',fontWeight:'bold'}}>
                        ✅ Listed at KES {a.forSale.askingPrice?.toLocaleString()}
                      </span>
                    </div>
                    <button onClick={() => setListTarget({ ...a, _withdraw: true })} style={{
                      background:'#FFEBEE',color:'#C62828',border:'1px solid #EF9A9A',
                      padding:'8px 12px',borderRadius:8,fontSize:11,cursor:'pointer',fontWeight:'bold'
                    }}>Withdraw</button>
                  </div>
                ) : (
                  <button onClick={() => setListTarget(a)} style={{
                    width:'100%',background:'#2E7D32',color:'white',border:'none',
                    padding:'10px',borderRadius:8,fontSize:12,cursor:'pointer',fontWeight:'bold'
                  }}>💰 List for Sale</button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* MEASUREMENT GUIDE MODAL */}
      {showGuide && (
        <MeasurementGuideModal 
          onClose={() => setShowGuide(false)} 
          animalType={form.type}
        />
      )}

      {/* SESSION 5A: LIST FOR SALE MODAL */}
      {listTarget && !listTarget._withdraw && (
        <ListForSaleModal
          animal={listTarget}
          onClose={() => setListTarget(null)}
          onListed={async () => {
            setListTarget(null);
            if (reload) await reload();
          }}
        />
      )}

      {/* SESSION 5A: WITHDRAW CONFIRMATION */}
      {listTarget && listTarget._withdraw && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.7)',zIndex:600,display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={() => setListTarget(null)}>
          <div style={{background:'white',borderRadius:'20px 20px 0 0',padding:20,maxWidth:450,width:'100%'}} onClick={e => e.stopPropagation()}>
            <h4 style={{margin:0,color:'#C62828',fontSize:16,marginBottom:8}}>⚠️ Withdraw from Sale?</h4>
            <p style={{fontSize:12,color:'#666',lineHeight:1.5}}>
              Your animal will be removed from the marketplace. You can list it again any time.
            </p>
            <div style={{display:'flex',gap:8,marginTop:16}}>
              <button onClick={() => setListTarget(null)} style={{flex:1,padding:12,background:'#F0F0F0',color:'#666',border:'none',borderRadius:25,fontSize:14,fontWeight:'bold',cursor:'pointer'}}>Cancel</button>
              <button onClick={async () => {
                try {
                  const res = await api.shamba.withdrawFromSale(listTarget.passportId, {
                    ownerId: listTarget.ownerId,
                    reason: 'Withdrawn by owner from app',
                  });
                  if (!res.success) throw new Error(res.message);
                  setListTarget(null);
                  if (reload) await reload();
                } catch (err) {
                  alert('Failed: ' + err.message);
                }
              }} style={{flex:1,padding:12,background:'#C62828',color:'white',border:'none',borderRadius:25,fontSize:14,fontWeight:'bold',cursor:'pointer'}}>Withdraw</button>
            </div>
          </div>
        </div>
      )}

      {/* SESSION 5A PART 2: Photo viewer */}
      {photoViewer && (
        <PhotoViewer
          src={photoViewer.src}
          caption={photoViewer.caption}
          onClose={() => setPhotoViewer(null)}
        />
      )}

      {/* SESSION 5A PART 2: Photo gallery */}
      {photoGalleryTarget && (
        <PhotoGalleryModal
          animal={photoGalleryTarget}
          onClose={() => setPhotoGalleryTarget(null)}
          onUpdated={async () => {
            setPhotoGalleryTarget(null);
            if (reload) await reload();
          }}
        />
      )}

      {/* Session 5A: Transfer Ownership modal */}
      {transferTarget && (
        <TransferOwnershipModal
          animal={transferTarget}
          onClose={() => setTransferTarget(null)}
          onUpdated={async () => {
            setTransferTarget(null);
            if (reload) await reload();
          }}
        />
      )}

      {/* Session 6.13: Health Record modal */}
      {healthTarget && (
        <HealthRecordModal
          animal={healthTarget}
          currentFarmer={myFarmer ? { id: myFarmer.farmer?.phone, fullName: myFarmer.farmer?.fullName, phone: myFarmer.farmer?.phone } : null}
          currentVet={null}
          onClose={() => setHealthTarget(null)}
          onUpdated={async () => {
            if (reload) await reload();
          }}
        />
      )}

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


// MODULE E: SLAUGHTERHOUSE PORTAL
function SlaughterhouseModule() {
  const [view, setView] = useState('home');
  const [myFacility, setMyFacility] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [regForm, setRegForm] = useState({ businessName: '', operatorName: '', operatorPhone: '', location: null, licenseNumber: '', capacityPerDay: 20 });
  const [lookupId, setLookupId] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupError, setLookupError] = useState(null);
  const [requestTarget, setRequestTarget] = useState(null);
  const [packagesCount, setPackagesCount] = useState(3);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const saved = localStorage.getItem('slaughterhouseId');
      const [facilities, reqs] = await Promise.all([
        api.slaughterhouse.list().catch(() => ({ slaughterhouses: [] })),
        api.slaughterhouse.listSlaughterRequests().catch(() => ({ requests: [] })),
      ]);
      setRequests(reqs.requests || []);
      if (saved) {
        const my = (facilities.slaughterhouses || []).find(f => f.id === saved);
        if (my) setMyFacility(my);
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const register = async () => {
    try {
      const result = await api.slaughterhouse.register(regForm);
      if (!result.success) throw new Error(result.message);
      localStorage.setItem('slaughterhouseId', result.slaughterhouse.id);
      setMyFacility(result.slaughterhouse);
      alert('Registered! ID: ' + result.slaughterhouse.id);
      await loadAll();
      setView('home');
    } catch (err) { alert('Error: ' + err.message); }
  };

  const lookup = async () => {
    setLookupResult(null); setLookupError(null);
    try {
      const result = await api.slaughterhouse.lookupAnimal(lookupId.trim().toUpperCase());
      setLookupResult(result);
    } catch (err) { setLookupError('Animal not found'); }
  };

  const requestSlaughter = async () => {
    if (!myFacility) return alert('Register slaughterhouse first');
    try {
      const result = await api.slaughterhouse.requestSlaughter({ slaughterhouseId: myFacility.id, animalPassport: requestTarget.passportId, numberOfPackages: packagesCount });
      if (!result.success) throw new Error(result.message);
      alert('Request sent! Code: ' + result.request.approvalCode);
      setRequestTarget(null);
      await loadAll();
      setView('requests');
    } catch (err) { alert('Error: ' + err.message); }
  };

  const completeSlaughter = async (reqId, pkgs) => {
    try {
      const result = await api.slaughterhouse.completeSlaughter(reqId, { numberOfPackages: pkgs });
      if (!result.success) throw new Error(result.message);
      alert('Complete! ' + result.tokens.length + ' tokens generated.');
      await loadAll();
    } catch (err) { alert('Error: ' + err.message); }
  };

  if (loading) return <div style={{padding:40,textAlign:'center'}}>Loading...</div>;

  if (view === 'home') {
    const myRequests = myFacility ? requests.filter(r => r.slaughterhouseId === myFacility.id) : [];
    const pending = myRequests.filter(r => r.status === 'pending_approval').length;
    const approved = myRequests.filter(r => r.status === 'approved').length;
    const completed = myRequests.filter(r => r.status === 'completed').length;
    return (
      <div>
        <h4 style={{fontSize:16,marginBottom:12}}>Slaughterhouse Portal</h4>
        {!myFacility ? (
          <div>
            <div style={{background:'#F3E5F5',padding:14,borderRadius:12,marginBottom:12}}>
              <strong style={{fontSize:14,color:'#6A1B9A'}}>🏭 No facility yet?</strong>
              <p style={{fontSize:12,color:'#666',margin:'4px 0 0'}}>Register in 2 minutes. Admin verifies your license.</p>
            </div>
            <button onClick={() => setView('register')} style={{...primaryBtn, background:'#7B1FA2'}}>➕ Add My Slaughterhouse</button>
          </div>
        ) : (
          <div>
            <div style={{background:'#F3E5F5',padding:14,borderRadius:12,marginBottom:12}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                <strong style={{fontSize:14}}>{myFacility.businessName}</strong>
                <span style={{background: myFacility.status === 'active' ? '#2E7D32' : '#FF9800',color:'white',padding:'2px 8px',borderRadius:6,fontSize:10,fontWeight:'bold'}}>{myFacility.status === 'active' ? 'ACTIVE' : 'PENDING'}</span>
              </div>
              <p style={{fontSize:11,color:'#666',margin:'2px 0'}}>{myFacility.location?.county}</p>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:12}}>
              <div style={{background:'#FFF3E0',padding:10,borderRadius:10,textAlign:'center'}}><strong style={{fontSize:18,color:'#E65100'}}>{pending}</strong><p style={{fontSize:9,margin:0}}>Pending</p></div>
              <div style={{background:'#E3F2FD',padding:10,borderRadius:10,textAlign:'center'}}><strong style={{fontSize:18,color:'#1565C0'}}>{approved}</strong><p style={{fontSize:9,margin:0}}>Approved</p></div>
              <div style={{background:'#E8F5E9',padding:10,borderRadius:10,textAlign:'center'}}><strong style={{fontSize:18,color:'#2E7D32'}}>{completed}</strong><p style={{fontSize:9,margin:0}}>Completed</p></div>
            </div>
            <button onClick={() => setView('lookup')} style={{...primaryBtn, background:'#7B1FA2'}}>Lookup Animal</button>
            <button onClick={() => setView('requests')} style={{...primaryBtn, background:'white', color:'#7B1FA2', border:'2px solid #7B1FA2'}}>Requests ({myRequests.length})</button>
            <button onClick={() => setView('verify')} style={{...primaryBtn, background:'white', color:'#7B1FA2', border:'2px solid #7B1FA2'}}>Verify Meat</button>
          </div>
        )}
      </div>
    );
  }

  if (view === 'register') {
    return (
      <div>
        <h4 style={{fontSize:16,marginBottom:12}}>Register Slaughterhouse</h4>
        <label style={labelStyle}>Business Name *</label>
        <input value={regForm.businessName} onChange={e => setRegForm({...regForm, businessName: e.target.value})} placeholder="Nakuru Meat Processing" style={inputStyle} />
        <label style={labelStyle}>Operator Name *</label>
        <input value={regForm.operatorName} onChange={e => setRegForm({...regForm, operatorName: e.target.value})} placeholder="John Mwangi" style={inputStyle} />
        <label style={labelStyle}>Operator Phone *</label>
        <input value={regForm.operatorPhone} onChange={e => setRegForm({...regForm, operatorPhone: e.target.value})} onBlur={e => e.target.value && setRegForm({...regForm, operatorPhone: normalizeKenyaPhone(e.target.value)})} placeholder="0712345678" type="tel" style={inputStyle} />
        <label style={labelStyle}>License *</label>
        <input value={regForm.licenseNumber} onChange={e => setRegForm({...regForm, licenseNumber: e.target.value})} placeholder="MOA/SLH/2024/123" style={inputStyle} />
        <label style={labelStyle}>Daily Capacity</label>
        <input value={regForm.capacityPerDay} onChange={e => setRegForm({...regForm, capacityPerDay: parseInt(e.target.value) || 0})} type="number" style={inputStyle} />
        <LocationPicker value={regForm.location} onChange={loc => setRegForm({...regForm, location: loc})} required label="Location" />
        <div style={{display:'flex',gap:8,marginTop:12}}>
          <button onClick={() => setView('home')} style={{...primaryBtn, background:'#F0F0F0', color:'#666', flex:1}}>Back</button>
          <button onClick={register} disabled={!regForm.businessName || !regForm.operatorName || !regForm.operatorPhone || !regForm.licenseNumber || !regForm.location} style={{...primaryBtn, background:'#7B1FA2', flex:2}}>Register</button>
        </div>
      </div>
    );
  }

  if (view === 'lookup') {
    return (
      <div>
        <h4 style={{fontSize:16,marginBottom:12}}>Lookup Animal</h4>
        <input value={lookupId} onChange={e => setLookupId(e.target.value.toUpperCase())} placeholder="KE-COW-ABC123XY" style={{...inputStyle, fontFamily:'monospace'}} />
        <button onClick={lookup} disabled={!lookupId} style={{...primaryBtn, background: lookupId ? '#7B1FA2' : '#ccc'}}>Lookup</button>
        {lookupError && <div style={{background:'#FFEBEE',padding:12,borderRadius:10,marginTop:12}}><strong style={{color:'#C62828',fontSize:12}}>{lookupError}</strong></div>}
        {lookupResult && (
          <div style={{marginTop:12}}>
            {lookupResult.blocked ? (
              <div style={{background:'#FFEBEE',padding:14,borderRadius:12,border:'2px solid #C62828'}}>
                <strong style={{color:'#C62828',fontSize:14}}>BLOCKED</strong>
                <p style={{fontSize:12,margin:'6px 0',color:'#C62828'}}>{lookupResult.message}</p>
              </div>
            ) : (
              <div>
                <div style={{background:'#E8F5E9',padding:14,borderRadius:12,border:'2px solid #4CAF50',marginBottom:12}}>
                  <strong style={{color:'#2E7D32',fontSize:14}}>ELIGIBLE</strong>
                </div>
                <div style={{background:'white',borderRadius:12,padding:14,border:'1px solid #E0E0E0',marginBottom:12}}>
                  <p style={{fontSize:13,margin:'2px 0'}}><strong>{lookupResult.animal.type} - {lookupResult.animal.breed}</strong></p>
                  <p style={{fontSize:11,margin:'2px 0'}}>Owner: {lookupResult.animal.ownerName}</p>
                  <p style={{fontSize:11,margin:'2px 0'}}>Phone: {lookupResult.animal.ownerPhone}</p>
                </div>
                <button onClick={() => setRequestTarget(lookupResult.animal)} style={{...primaryBtn, background:'#7B1FA2'}}>Request Slaughter</button>
              </div>
            )}
          </div>
        )}
        {requestTarget && (
          <div style={{background:'#F3E5F5',borderRadius:12,padding:14,marginTop:12}}>
            <strong style={{fontSize:14,color:'#6A1B9A'}}>Request Slaughter</strong>
            <label style={labelStyle}>Packages</label>
            <input type="number" value={packagesCount} onChange={e => setPackagesCount(parseInt(e.target.value) || 1)} style={inputStyle} />
            <div style={{display:'flex',gap:8}}>
              <button onClick={() => setRequestTarget(null)} style={{...primaryBtn, background:'#F0F0F0', color:'#666', flex:1}}>Cancel</button>
              <button onClick={requestSlaughter} style={{...primaryBtn, background:'#7B1FA2', flex:2}}>Send Request</button>
            </div>
          </div>
        )}
        <button onClick={() => setView('home')} style={{...primaryBtn, background:'none', color:'#666', marginTop:8}}>Back</button>
      </div>
    );
  }

  if (view === 'requests') {
    const myRequests = myFacility ? requests.filter(r => r.slaughterhouseId === myFacility.id) : [];
    return (
      <div>
        <h4 style={{fontSize:16,marginBottom:12}}>Requests</h4>
        <button onClick={() => setView('home')} style={{...primaryBtn, background:'none', color:'#666', marginBottom:8}}>Back</button>
        {myRequests.length === 0 && <p style={{textAlign:'center',color:'#999',padding:20}}>No requests</p>}
        {myRequests.map(r => (
          <div key={r.id} style={{background: r.status === 'completed' ? '#E8F5E9' : '#FFF3E0', borderRadius:12, padding:14, marginBottom:8, border:'1px solid #E0E0E0'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
              <strong style={{fontSize:12,fontFamily:'monospace'}}>{r.id}</strong>
              <span style={{background: r.status === 'completed' ? '#2E7D32' : '#FF9800', color:'white', padding:'2px 8px', borderRadius:6, fontSize:10}}>{r.status.toUpperCase()}</span>
            </div>
            <p style={{fontSize:12,margin:'2px 0'}}>{r.animalType} - {r.animalBreed}</p>
            <p style={{fontSize:11,margin:'2px 0'}}>Owner: {r.ownerName}</p>
            {r.status === 'pending_approval' && <div style={{background:'#FFF3E0',padding:8,borderRadius:8,marginTop:6,fontSize:11,color:'#E65100'}}>Waiting for owner</div>}
            {r.status === 'approved' && <button onClick={() => completeSlaughter(r.id, 3)} style={{...primaryBtn, background:'#7B1FA2', marginTop:8}}>Complete Slaughter</button>}
            {r.status === 'completed' && r.meatTokens && (
              <div style={{marginTop:8}}>
                {r.meatTokens.map(t => <p key={t} style={{fontSize:10,fontFamily:'monospace',margin:'2px 0',color:'#666'}}>{t}</p>)}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (view === 'verify') return <VerifyMeatView onBack={() => setView('home')} />;
  return null;
}

// MODULE F: BUTCHERY PORTAL
function ButcheryModule() {
  const [view, setView] = useState('home');
  const [myHandler, setMyHandler] = useState(null);
  const [received, setReceived] = useState([]);
  const [loading, setLoading] = useState(true);
  const [regForm, setRegForm] = useState({ businessName: '', type: 'butchery', ownerName: '', ownerPhone: '', location: null, licenseNumber: '' });
  const [tokenInput, setTokenInput] = useState('');
  const [tokenResult, setTokenResult] = useState(null);
  const [tokenError, setTokenError] = useState(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const saved = localStorage.getItem('meatHandlerId');
      const handlers = await api.meatHandler.list().catch(() => ({ handlers: [] }));
      if (saved) {
        const my = (handlers.handlers || []).find(h => h.id === saved);
        if (my) {
          setMyHandler(my);
          const rec = await api.meatHandler.getReceived(saved).catch(() => ({ received: [] }));
          setReceived(rec.received || []);
        }
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const register = async () => {
    try {
      const result = await api.meatHandler.register(regForm);
      if (!result.success) throw new Error(result.message);
      localStorage.setItem('meatHandlerId', result.handler.id);
      setMyHandler(result.handler);
      alert('Registered! ID: ' + result.handler.id);
      await loadAll();
      setView('home');
    } catch (err) { alert('Error: ' + err.message); }
  };

  const receiveMeat = async () => {
    setTokenResult(null); setTokenError(null);
    try {
      const verify = await api.meatHandler.getChain(tokenInput.trim().toUpperCase());
      if (!verify.success) throw new Error('Not found');
      setTokenResult(verify.chain);
    } catch (err) { setTokenError('Token not found'); }
  };

  const confirmReceive = async () => {
    try {
      const result = await api.meatHandler.receiveMeat({ token: tokenInput.trim().toUpperCase(), handlerId: myHandler.id, notes: 'Received' });
      if (!result.success) throw new Error(result.message);
      alert('Received!');
      setTokenInput(''); setTokenResult(null);
      await loadAll();
    } catch (err) { alert('Error: ' + err.message); }
  };

  const sellMeat = async (token) => {
    try {
      const result = await api.meatHandler.sellMeat({ token, handlerId: myHandler.id, notes: 'Sold' });
      if (!result.success) throw new Error(result.message);
      alert('Sold');
      await loadAll();
    } catch (err) { alert('Error: ' + err.message); }
  };

  if (loading) return <div style={{padding:40,textAlign:'center'}}>Loading...</div>;

  if (view === 'home') {
    return (
      <div>
        <h4 style={{fontSize:16,marginBottom:12}}>Butchery Portal</h4>
        {!myHandler ? (
          <div>
            <div style={{background:'#FCE4EC',padding:14,borderRadius:12,marginBottom:12}}>
              <strong style={{fontSize:14,color:'#C2185B'}}>🏪 No business yet?</strong>
              <p style={{fontSize:12,color:'#666',margin:'4px 0 0'}}>Butchery, supermarket, restaurant, or hotel. Register in 2 minutes.</p>
            </div>
            <button onClick={() => setView('register')} style={{...primaryBtn, background:'#C2185B'}}>➕ Add My Business</button>
          </div>
        ) : (
          <div>
            <div style={{background:'#FCE4EC',padding:14,borderRadius:12,marginBottom:12}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                <strong style={{fontSize:14}}>{myHandler.businessName}</strong>
                <span style={{background: myHandler.status === 'active' ? '#2E7D32' : '#FF9800',color:'white',padding:'2px 8px',borderRadius:6,fontSize:10}}>{myHandler.status.toUpperCase()}</span>
              </div>
              <p style={{fontSize:11,color:'#666',margin:'2px 0'}}>{myHandler.type} - {myHandler.location?.county}</p>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:12}}>
              <div style={{background:'#E8F5E9',padding:10,borderRadius:10,textAlign:'center'}}><strong style={{fontSize:18,color:'#2E7D32'}}>{myHandler.totalReceived || 0}</strong><p style={{fontSize:9,margin:0}}>Received</p></div>
              <div style={{background:'#E3F2FD',padding:10,borderRadius:10,textAlign:'center'}}><strong style={{fontSize:18,color:'#1565C0'}}>{myHandler.totalSold || 0}</strong><p style={{fontSize:9,margin:0}}>Sold</p></div>
              <div style={{background:'#FFF3E0',padding:10,borderRadius:10,textAlign:'center'}}><strong style={{fontSize:18,color:'#E65100'}}>{received.length}</strong><p style={{fontSize:9,margin:0}}>Stock</p></div>
            </div>
            <button onClick={() => setView('receive')} style={{...primaryBtn, background:'#C2185B'}}>Receive Meat</button>
            <button onClick={() => setView('inventory')} style={{...primaryBtn, background:'white', color:'#C2185B', border:'2px solid #C2185B'}}>Inventory ({received.length})</button>
          </div>
        )}
      </div>
    );
  }

  if (view === 'register') {
    return (
      <div>
        <h4 style={{fontSize:16,marginBottom:12}}>Register Business</h4>
        <label style={labelStyle}>Type</label>
        <select value={regForm.type} onChange={e => setRegForm({...regForm, type: e.target.value})} style={{...inputStyle, background:'white'}}>
          <option value="butchery">Butchery</option>
          <option value="supermarket">Supermarket</option>
          <option value="restaurant">Restaurant</option>
          <option value="hotel">Hotel</option>
        </select>
        <label style={labelStyle}>Business Name *</label>
        <input value={regForm.businessName} onChange={e => setRegForm({...regForm, businessName: e.target.value})} placeholder="Nakuru Fresh Butchery" style={inputStyle} />
        <label style={labelStyle}>Owner Name *</label>
        <input value={regForm.ownerName} onChange={e => setRegForm({...regForm, ownerName: e.target.value})} placeholder="Mary Wanjiku" style={inputStyle} />
        <label style={labelStyle}>Owner Phone *</label>
        <input value={regForm.ownerPhone} onChange={e => setRegForm({...regForm, ownerPhone: e.target.value})} onBlur={e => e.target.value && setRegForm({...regForm, ownerPhone: normalizeKenyaPhone(e.target.value)})} placeholder="0722334455" type="tel" style={inputStyle} />
        <label style={labelStyle}>License *</label>
        <input value={regForm.licenseNumber} onChange={e => setRegForm({...regForm, licenseNumber: e.target.value})} placeholder="MOA/BUT/2024/456" style={inputStyle} />
        <LocationPicker value={regForm.location} onChange={loc => setRegForm({...regForm, location: loc})} required label="Location" />
        <div style={{display:'flex',gap:8,marginTop:12}}>
          <button onClick={() => setView('home')} style={{...primaryBtn, background:'#F0F0F0', color:'#666', flex:1}}>Back</button>
          <button onClick={register} disabled={!regForm.businessName || !regForm.ownerName || !regForm.ownerPhone || !regForm.licenseNumber || !regForm.location} style={{...primaryBtn, background:'#C2185B', flex:2}}>Register</button>
        </div>
      </div>
    );
  }

  if (view === 'receive') {
    return (
      <div>
        <h4 style={{fontSize:16,marginBottom:12}}>Receive Meat</h4>
        <input value={tokenInput} onChange={e => setTokenInput(e.target.value.toUpperCase())} placeholder="MEAT-YAV42JVH" style={{...inputStyle, fontFamily:'monospace'}} />
        <button onClick={receiveMeat} disabled={!tokenInput} style={{...primaryBtn, background: tokenInput ? '#C2185B' : '#ccc'}}>Verify Token</button>
        {tokenError && <div style={{background:'#FFEBEE',padding:12,borderRadius:10,marginTop:12}}><strong style={{color:'#C62828',fontSize:12}}>{tokenError}</strong></div>}
        {tokenResult && (
          <div style={{marginTop:12,background:'#E8F5E9',padding:14,borderRadius:12,border:'2px solid #4CAF50'}}>
            <strong style={{color:'#2E7D32',fontSize:13}}>Valid Token</strong>
            <p style={{fontSize:11,margin:'6px 0'}}>{tokenResult.animalType} - {tokenResult.animalBreed}</p>
            <p style={{fontSize:11,margin:'2px 0'}}>Farmer: {tokenResult.farmerName}</p>
            <p style={{fontSize:11,margin:'2px 0'}}>From: {tokenResult.slaughterhouseName}</p>
            <button onClick={confirmReceive} style={{...primaryBtn, background:'#C2185B', marginTop:12}}>Confirm Receipt</button>
          </div>
        )}
        <button onClick={() => setView('home')} style={{...primaryBtn, background:'none', color:'#666'}}>Back</button>
      </div>
    );
  }

  if (view === 'inventory') {
    return (
      <div>
        <h4 style={{fontSize:16,marginBottom:12}}>Inventory ({received.length})</h4>
        <button onClick={() => setView('home')} style={{...primaryBtn, background:'none', color:'#666', marginBottom:8}}>Back</button>
        {received.length === 0 && <p style={{textAlign:'center',color:'#999',padding:20}}>Empty</p>}
        {received.map(m => (
          <div key={m.token} style={{background:'#FFF8E1',borderRadius:12,padding:14,marginBottom:8,border:'1px solid #FFE082'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
              <strong style={{fontSize:12,fontFamily:'monospace'}}>{m.token}</strong>
              <span style={{background:'#2E7D32',color:'white',padding:'2px 8px',borderRadius:6,fontSize:10}}>IN STOCK</span>
            </div>
            <p style={{fontSize:12,margin:'2px 0'}}>{m.animalType} - {m.animalBreed}</p>
            <p style={{fontSize:11,margin:'2px 0',color:'#666'}}>Farmer: {m.farmerName}</p>
            <button onClick={() => sellMeat(m.token)} style={{...primaryBtn, background:'#C2185B', marginTop:8}}>Mark Sold</button>
          </div>
        ))}
      </div>
    );
  }

  return null;
}

// MEAT VERIFICATION VIEW
function VerifyMeatView({ onBack }) {
  const [token, setToken] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [revealedPhone, setRevealedPhone] = useState(null);
  const [revealId, setRevealId] = useState(null);

  const verify = async () => {
    setResult(null); setError(null); setRevealedPhone(null); setRevealId(null);
    const clean = token.trim().toUpperCase();
    try {
      // Primary: slaughterhouse.verifyMeat — includes donkey warning + slaughter story
      const s = await api.slaughterhouse.verifyMeat(clean);
      if (s && s.success !== false) {
        setResult({ ...s, _fromVerify: true });
      } else {
        // Fallback: chain of custody
        const r = await api.meatHandler.getChain(clean);
        if (!r.success) throw new Error('Not found');
        setResult({ chain: r.chain, _fromChain: true });
      }
    } catch (err) {
      // Try chain as fallback
      try {
        const r = await api.meatHandler.getChain(clean);
        if (!r.success) throw new Error('Not found');
        setResult({ chain: r.chain, _fromChain: true });
      } catch (e2) {
        setError('Token not found');
      }
    }
  };

  return (
    <div>
      <h4 style={{fontSize:16,marginBottom:12}}>Verify Meat</h4>
      <input value={token} onChange={e => setToken(e.target.value.toUpperCase())} placeholder="MEAT-YAV42JVH" style={{...inputStyle, fontFamily:'monospace'}} />
      <button onClick={verify} disabled={!token} style={{...primaryBtn, background: token ? '#7B1FA2' : '#ccc'}}>Verify</button>
      {error && <div style={{background:'#FFEBEE',padding:12,borderRadius:10,marginTop:12}}><strong style={{color:'#C62828',fontSize:12}}>{error}</strong></div>}
      {result && (
        <div style={{marginTop:12}}>
          {/* DONKEY / high-scrutiny warning — from verifyMeat */}
          {(result.highScrutiny || (result.species || '').toLowerCase() === 'donkey' || result.notForHumanConsumption) && (
            <div style={{background:'#FFEBEE',border:'2px solid #C62828',borderRadius:12,padding:14,marginBottom:12}}>
              <strong style={{color:'#C62828',fontSize:15,display:'block'}}>🛡️ {result.warning || 'Protected species'}</strong>
              {result.notForHumanConsumption && (
                <p style={{margin:'6px 0 0',fontSize:12,color:'#B71C1C',fontWeight:'bold'}}>
                  NOT FOR HUMAN CONSUMPTION
                </p>
              )}
              {result.intendedUse && (
                <p style={{margin:'4px 0 0',fontSize:11,color:'#666'}}>
                  Intended use: <strong>{result.intendedUse.replace('_', ' ')}</strong>
                </p>
              )}
            </div>
          )}

          {/* Slaughter story */}
          {result.slaughterStory && (
            <div style={{background:'#FFF8E1',border:'1px solid #FFD54F',borderRadius:12,padding:14,marginBottom:12}}>
              <strong style={{fontSize:12,color:'#E65100',display:'block',marginBottom:8}}>📋 SLAUGHTER STORY</strong>
              <div style={{fontSize:11,color:'#333',lineHeight:1.7}}>
                <div><strong>Exemption:</strong> {(result.slaughterStory.exemptionType || '').replace('_', ' ')}</div>
                <div><strong>Legal ref:</strong> {result.slaughterStory.exemptionRef || '—'}</div>
                <div><strong>Authorized by:</strong> {result.slaughterStory.authorizedBy || '—'}</div>
                <div><strong>Original owner:</strong> {result.slaughterStory.originalOwner || '—'}</div>
                <div><strong>Facility:</strong> {result.slaughterStory.slaughterhouse || '—'}</div>
                {result.slaughterStory.ownerConsent && (
                  <div style={{marginTop:6,paddingTop:6,borderTop:'1px solid #FFE082'}}>
                    <strong>Owner consent:</strong>
                    <div style={{paddingLeft:10}}>• Replied: <strong>{result.slaughterStory.ownerConsent.response || 'YES'}</strong></div>
                    <div style={{paddingLeft:10}}>
                      • Via: <strong>{revealedPhone || result.slaughterStory.ownerConsent.viaPhone || '—'}</strong>
                      {!revealedPhone && result.slaughterStory.ownerConsent.viaPhone && (
                        <button
                          onClick={async () => {
                            if (!window.confirm('Revealing the full phone number is logged for audit. Continue?')) return;
                            try {
                              const r = await api.slaughterhouse.revealMeatContact(token.trim().toUpperCase());
                              if (r.success) {
                                setRevealedPhone(r.contact.phone);
                                setRevealId(r.revealId);
                              } else {
                                alert(r.message || 'Failed to reveal');
                              }
                            } catch (e) {
                              alert('Failed to reveal: ' + e.message);
                            }
                          }}
                          style={{ marginLeft:6, background:'none', border:'none', color:'#1976D2', fontSize:10, cursor:'pointer', textDecoration:'underline', padding:0 }}
                        >
                          Show full number
                        </button>
                      )}
                    </div>
                    {revealedPhone && (
                      <div style={{marginTop:4, padding:'6px 8px', background:'#FFF8E1', borderRadius:6, fontSize:10}}>
                        <span style={{color:'#E65100'}}>✓ Reveal logged ({revealId})</span>
                      </div>
                    )}
                    <div style={{paddingLeft:10}}>• At: {result.slaughterStory.ownerConsent.respondedAt ? new Date(result.slaughterStory.ownerConsent.respondedAt).toLocaleString() : '—'}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{background:'#E8F5E9',padding:14,borderRadius:12,border:'2px solid #4CAF50',marginBottom:12}}>
            <strong style={{color:'#2E7D32',fontSize:14}}>VERIFIED</strong>
            {result.species && <span style={{fontSize:11,color:'#666',marginLeft:8}}>({result.species})</span>}
          </div>
          {result.sourceAnimal && (
            <div style={{background:'white',borderRadius:12,padding:14,border:'1px solid #E0E0E0',marginBottom:8}}>
              <strong style={{fontSize:12}}>Source Animal</strong>
              <p style={{fontSize:11,margin:'4px 0'}}>{result.sourceAnimal.type} - {result.sourceAnimal.breed}</p>
              <p style={{fontSize:11,margin:'2px 0',color:'#666'}}>Farmer: {result.sourceAnimal.farmer?.name}</p>
            </div>
          )}
          {result.chain && (
            <div style={{background:'white',borderRadius:12,padding:14,border:'1px solid #E0E0E0'}}>
              <strong style={{fontSize:12}}>Chain</strong>
              {result.chain.map((c, i) => (
                <div key={i} style={{marginTop:6,fontSize:11}}>
                  <strong>{i+1}. {c.holder?.toUpperCase()}:</strong> {c.name || 'Consumer'}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {onBack && <button onClick={onBack} style={{...primaryBtn, background:'none', color:'#666', marginTop:8}}>Back</button>}
    </div>
  );
}




// MODULE C: VETERINARY NETWORK
function VetModule() {
  const [view, setView] = useState('home');
  const [myFarmer, setMyFarmer] = useState(null);
  const [myVet, setMyVet] = useState(null);
  const [kycVetOpen, setKycVetOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [sickReports, setSickReports] = useState([]);
  const [vets, setVets] = useState([]);
  const [constants, setConstants] = useState(null);
  const [loading, setLoading] = useState(true);

  const [regForm, setRegForm] = useState({
    fullName: '', phone: '', email: '', kvaLicenseNumber: '',
    vetType: 'private', specializations: ['general'],
    location: null, coverageRadius: 20,
    acceptsEmergency: true, availableHours: '08:00 - 18:00',
    consultationFee: 500,
    paymentMethod: 'pochi', pochiPhone: '',
  });

  const [sickTarget, setSickTarget] = useState(null);
  const [sickForm, setSickForm] = useState({ symptoms: [], symptomDetails: '', urgency: 'medium' });
  const [selfServiceData, setSelfServiceData] = useState(null);
  const [vetHealthTarget, setVetHealthTarget] = useState(null);
  const [myAnimals, setMyAnimals] = useState([]);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const savedFarmer = localStorage.getItem('farmerRegistration');
      if (savedFarmer) setMyFarmer(JSON.parse(savedFarmer));

      const savedVetId = localStorage.getItem('vetId');
      const [s, reports, vetsList, c] = await Promise.all([
        api.vet.stats().catch(() => ({ stats: null })),
        api.vet.listSickReports().catch(() => ({ reports: [] })),
        api.vet.list().catch(() => ({ vets: [] })),
        api.vet.constants().catch(() => null),
      ]);
      setStats(s.stats);
      setSickReports(reports.reports || []);
      setVets(vetsList.vets || []);
      if (c) setConstants(c);

      if (savedVetId) {
        const my = (vetsList.vets || []).find(v => v.id === savedVetId);
        if (my) setMyVet(my);
      }

      // Load my livestock (not products)
      if (savedFarmer) {
        const farmer = JSON.parse(savedFarmer);
        const phone = farmer.farmer?.phone;
        if (phone) {
          const live = await api.shamba.listLivestock().catch(() => ({ livestock: [] }));
          const mine = (live.livestock || []).filter(a => a.ownerPhone === phone && a.status === 'alive');
          setMyAnimals(mine);
        }
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const submitVetRegistration = async () => {
    try {
      const result = await api.vet.register({
        ...regForm,
        payment: regForm.vetType !== 'government' ? {
          method: regForm.paymentMethod,
          pochiPhone: regForm.pochiPhone,
        } : null,
      });
      if (!result.success) throw new Error(result.message);
      localStorage.setItem('vetId', result.vet.id);
      setMyVet(result.vet);
      alert('Registered! ID: ' + result.vet.id);
      await loadAll();
      setView('home');
    } catch (err) { alert('Error: ' + err.message); }
  };

  const toggleSymptom = (symptomId) => {
    const has = sickForm.symptoms.includes(symptomId);
    const next = has ? sickForm.symptoms.filter(s => s !== symptomId) : [...sickForm.symptoms, symptomId];
    setSickForm({
      ...sickForm,
      symptoms: next,
    });
  };

  const submitSickReport = async (forceDispatch = false) => {
    // Guard: when called as onClick={submitSickReport}, the first argument
    // is a React event object. Only honor explicit `true`.
    const force = forceDispatch === true;
    if (!sickTarget || sickForm.symptoms.length === 0) return;
    try {
      const result = await api.vet.reportSick({
        passportId: sickTarget.passportId,
        farmerName: myFarmer?.farmer?.fullName || sickTarget.ownerName,
        farmerPhone: myFarmer?.farmer?.phone || sickTarget.ownerPhone,
        location: sickTarget.location,
        symptoms: sickForm.symptoms,
        symptomDetails: sickForm.symptomDetails,
        urgency: sickForm.urgency,
        _forceDispatch: force,
      });
      if (!result.success) throw new Error(result.message);

      if (result.selfServiceAvailable) {
        setSelfServiceData({
          animal: result.animal,
          reporterVetId: result.reporterVetId,
          reporterVetName: result.reporterVetName,
        });
        return;
      }

      alert('Report submitted! ' + result.message);
      setSickTarget(null);
      setSickForm({ symptoms: [], symptomDetails: '', urgency: 'medium' });
      await loadAll();
      setView('my-reports');
    } catch (err) { alert('Error: ' + err.message); }
  };

  // Session 6.21: multi-role choice modal — rendered in both home and report-sick views
  const renderVetHealthRecordModal = () => {
    if (!vetHealthTarget) return null;
    return (
      <HealthRecordModal
        animal={vetHealthTarget}
        currentFarmer={myFarmer?.farmer ? { id: myFarmer.farmer.phone, fullName: myFarmer.farmer.fullName, phone: myFarmer.farmer.phone } : null}
        currentVet={myVet || null}
        onClose={() => setVetHealthTarget(null)}
        onUpdated={async () => {
          setVetHealthTarget(null);
          await loadAll();
        }}
      />
    );
  };

  const renderSelfServiceModal = () => {
    if (!selfServiceData) return null;
    return (
      <SelfServiceOrDispatchModal
        animal={selfServiceData.animal}
        reporterVetName={selfServiceData.reporterVetName}
        onSelfService={() => {
          setVetHealthTarget({
            passportId: selfServiceData.animal.passportId,
            type: selfServiceData.animal.type,
            breed: selfServiceData.animal.breed,
            _prefillVet: {
              role: 'vet',
              name: selfServiceData.reporterVetName,
              userId: myFarmer?.farmer?.phone,
              kvbVerified: true,
            },
          });
          setSelfServiceData(null);
          setSickTarget(null);
          setSickForm({ symptoms: [], symptomDetails: '', urgency: 'medium' });
        }}
        onRequestAnother={async () => {
          const target = sickTarget;
          const form = sickForm;
          console.log('🟠 onRequestAnother called', { target, form });
          setSelfServiceData(null);
          if (!target) { alert('target is null — aborting'); return; }
          try {
            console.log('🟠 calling API with _forceDispatch: true');
            const result = await api.vet.reportSick({
              passportId: target.passportId,
              farmerName: myFarmer?.farmer?.fullName || target.ownerName,
              farmerPhone: myFarmer?.farmer?.phone || target.ownerPhone,
              location: target.location,
              symptoms: form.symptoms,
              symptomDetails: form.symptomDetails,
              urgency: form.urgency,
              _forceDispatch: true,
            });
            if (!result.success) throw new Error(result.message);
            alert('Dispatched: ' + result.message);
            setSickTarget(null);
            setSickForm({ symptoms: [], symptomDetails: '', urgency: 'medium' });
            await loadAll();
            setView('my-reports');
          } catch (err) { alert('Error: ' + err.message); }
        }}
        onClose={() => setSelfServiceData(null)}
      />
    );
  };

  if (loading) return <div style={{padding:40,textAlign:'center'}}>Loading vet network...</div>;

  if (view === 'home') {
    const myReports = myFarmer ? sickReports.filter(r => r.farmerPhone === myFarmer.farmer?.phone) : [];
    return (
      <div>
        <h4 style={{fontSize:16,marginBottom:12}}>Veterinary Network</h4>
        {stats && (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:12}}>
            <div style={{background:'#E3F2FD',padding:10,borderRadius:10,textAlign:'center'}}>
              <strong style={{fontSize:18,color:'#1565C0'}}>{stats.vets.active}</strong>
              <p style={{fontSize:9,color:'#666',margin:0}}>Active Vets</p>
            </div>
            <div style={{background:'#FFF3E0',padding:10,borderRadius:10,textAlign:'center'}}>
              <strong style={{fontSize:18,color:'#E65100'}}>{stats.reports.total}</strong>
              <p style={{fontSize:9,color:'#666',margin:0}}>Sick Reports</p>
            </div>
            <div style={{background:'#E8F5E9',padding:10,borderRadius:10,textAlign:'center'}}>
              <strong style={{fontSize:18,color:'#2E7D32'}}>{stats.treatments.total}</strong>
              <p style={{fontSize:9,color:'#666',margin:0}}>Treatments</p>
            </div>
          </div>
        )}

        {myVet ? (
          <div style={{background:'#E3F2FD',padding:14,borderRadius:12,marginBottom:12,border:'1px solid #90CAF9'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
              <strong style={{fontSize:14}}>Dr. {myVet.fullName}</strong>
              <span style={{background: myVet.status === 'active' ? '#2E7D32' : '#FF9800', color:'white', padding:'2px 8px', borderRadius:6, fontSize:10}}>
                {myVet.status === 'active' ? 'ACTIVE' : 'PENDING'}
              </span>
            </div>
            <p style={{fontSize:11,color:'#666',margin:'2px 0'}}>{myVet.isGovt ? 'Govt Vet' : 'Private'} - {myVet.specializations?.join(', ')}</p>
            <p style={{fontSize:11,color:'#666',margin:'2px 0'}}>{myVet.location?.county}</p>
            {!myVet.verified && (
              <div style={{marginTop:10, background:'#FFF8E1', border:'1px solid #FFD54F', borderRadius:10, padding:12}}>
                <strong style={{fontSize:12, color:'#E65100'}}>🪪 Verify your credentials to activate</strong>
                <p style={{fontSize:11, color:'#BF360C', margin:'4px 0 8px', lineHeight:1.5}}>
                  Upload your KVB license + practicing certificate. KES 1,000 one-time. Approved vets appear in the dispatch pool and can sign treatments.
                </p>
                <button
                  onClick={() => setKycVetOpen(true)}
                  style={{ width:'100%', background:'#E65100', color:'white', border:'none', padding:'12px', borderRadius:10, fontSize:12, fontWeight:'bold', cursor:'pointer' }}
                >
                  Verify Now — KES 1,000
                </button>
              </div>
            )}
            {myVet.verified && myVet.kvbLicenseVerified && (
              <div style={{marginTop:8, display:'inline-block', background:'#E8F5E9', border:'1px solid #A5D6A7', borderRadius:8, padding:'4px 10px'}}>
                <span style={{fontSize:10, color:'#2E7D32', fontWeight:'bold'}}>✓ KVB VERIFIED</span>
              </div>
            )}
          </div>
        ) : (
          <button onClick={() => setView('register-vet')} style={{...primaryBtn, background:'#1565C0'}}>Register as Vet</button>
        )}

        {myFarmer && <button onClick={() => setView('report-sick')} style={{...primaryBtn, background:'#E65100'}}>Report Sick Animal</button>}
        <button onClick={() => setView('my-reports')} style={{...primaryBtn, background:'white', color:'#1565C0', border:'2px solid #1565C0'}}>My Reports ({myReports.length})</button>
        <button onClick={() => setView('find-vets')} style={{...primaryBtn, background:'white', color:'#1565C0', border:'2px solid #1565C0'}}>Find Vets ({vets.length})</button>

        {/* KYC MODAL for vet verification */}
        {kycVetOpen && myVet && (
          <KYCModal
            userId={myVet.phone}
            userType="vet"
            role="vet"
            userName={myVet.fullName}
            userPhone={myVet.phone}
            onClose={() => setKycVetOpen(false)}
            onVerified={async () => {
              setKycVetOpen(false);
              await loadAll();
              alert('✅ Your vet credentials are verified. You can now be dispatched to cases.');
            }}
          />
        )}

      </div>
    );
  }

  if (view === 'register-vet') {
    return (
      <div>
        <h4 style={{fontSize:16,marginBottom:12}}>Register as Vet</h4>
        <label style={labelStyle}>Vet Type *</label>
        <select value={regForm.vetType} onChange={e => setRegForm({...regForm, vetType: e.target.value})} style={{...inputStyle, background:'white'}}>
          <option value="private">Private Practice</option>
          <option value="government">Government Vet</option>
          <option value="clinic">Clinic-Based</option>
          <option value="mobile">Mobile / Ambulatory</option>
        </select>
        <label style={labelStyle}>Full Name *</label>
        <input value={regForm.fullName} onChange={e => setRegForm({...regForm, fullName: e.target.value})} placeholder="Dr. James Mwangi" style={inputStyle} />
        <label style={labelStyle}>Phone *</label>
        <input value={regForm.phone} onChange={e => setRegForm({...regForm, phone: e.target.value})} onBlur={e => e.target.value && setRegForm({...regForm, phone: normalizeKenyaPhone(e.target.value)})} placeholder="0712345678" type="tel" style={inputStyle} />
        {regForm.vetType !== 'government' && (
          <>
            <label style={labelStyle}>KVB License Number *</label>
            <input value={regForm.kvaLicenseNumber} onChange={e => setRegForm({...regForm, kvaLicenseNumber: e.target.value})} placeholder="KVB/2024/1234" style={inputStyle} />
          </>
        )}
        <label style={labelStyle}>Specializations</label>
        <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:8}}>
          {constants?.specializations?.map(s => {
            const selected = regForm.specializations.includes(s.id);
            return (
              <button key={s.id} onClick={() => setRegForm({
                ...regForm,
                specializations: selected
                  ? regForm.specializations.filter(x => x !== s.id)
                  : [...regForm.specializations, s.id],
              })} style={{
                padding:'8px 14px',borderRadius:20,border:'none',
                background: selected ? '#1565C0' : '#F0F0F0',
                color: selected ? 'white' : '#555',
                fontSize:12,cursor:'pointer',fontWeight:'bold',
              }}>{s.icon} {s.label}</button>
            );
          })}
        </div>
        <label style={labelStyle}>Coverage Radius: {regForm.coverageRadius} km</label>
        <input type="range" min="5" max="100" value={regForm.coverageRadius} onChange={e => setRegForm({...regForm, coverageRadius: parseInt(e.target.value)})} style={{width:'100%',marginBottom:8}} />
        <label style={labelStyle}>Consultation Fee (KES)</label>
        <input value={regForm.consultationFee} onChange={e => setRegForm({...regForm, consultationFee: parseInt(e.target.value) || 0})} type="number" style={inputStyle} />
        <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',margin:'8px 0'}}>
          <input type="checkbox" checked={regForm.acceptsEmergency} onChange={e => setRegForm({...regForm, acceptsEmergency: e.target.checked})} style={{width:20,height:20}} />
          <strong style={{fontSize:13}}>I accept emergency cases</strong>
        </label>
        <LocationPicker value={regForm.location} onChange={loc => setRegForm({...regForm, location: loc})} required label="Where do you practice?" />
        <div style={{display:'flex',gap:8,marginTop:16}}>
          <button onClick={() => setView('home')} style={{...primaryBtn, background:'#F0F0F0', color:'#666', flex:1}}>Back</button>
          <button onClick={submitVetRegistration} disabled={!regForm.fullName || !regForm.phone || !regForm.location || (regForm.vetType !== 'government' && !regForm.kvaLicenseNumber)} style={{...primaryBtn, background:'#1565C0', flex:2}}>Register</button>
        </div>
      </div>
    );
  }

  if (view === 'report-sick') {
    return (
      <div>
        {renderVetHealthRecordModal()}
        {renderSelfServiceModal()}
        <h4 style={{fontSize:16,marginBottom:12}}>Report Sick Animal</h4>
        {sickTarget ? (
          <div>
            <div style={{background:'#FFF3E0',padding:14,borderRadius:12,marginBottom:12}}>
              <strong style={{fontSize:13}}>{sickTarget.type} - {sickTarget.breed}</strong>
              <p style={{fontSize:11,margin:'4px 0 0',fontFamily:'monospace'}}>{sickTarget.passportId}</p>
            </div>
            <label style={labelStyle}>Symptoms (tap to select) *</label>
            <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:12}}>
              {constants?.symptoms?.map(s => {
                const selected = sickForm.symptoms.includes(s.id);
                return (
                  <button key={s.id} onClick={() => toggleSymptom(s.id)} style={{
                    padding:'8px 12px',borderRadius:20,border:'none',
                    background: selected ? '#E65100' : '#F0F0F0',
                    color: selected ? 'white' : '#555',
                    fontSize:12,cursor:'pointer',fontWeight:'bold',
                  }}>{s.icon} {s.label}</button>
                );
              })}
            </div>
            <label style={labelStyle}>Urgency</label>
            <select value={sickForm.urgency} onChange={e => setSickForm({...sickForm, urgency: e.target.value})} style={{...inputStyle, background:'white'}}>
              {constants?.urgencyLevels?.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
            </select>
            <label style={labelStyle}>Additional Details</label>
            <textarea value={sickForm.symptomDetails} onChange={e => setSickForm({...sickForm, symptomDetails: e.target.value})} placeholder="Describe what you've noticed..." rows={3} style={{...inputStyle, resize:'vertical'}} />
            <div style={{display:'flex',gap:8}}>
              <button onClick={() => setSickTarget(null)} style={{...primaryBtn, background:'#F0F0F0', color:'#666', flex:1}}>Cancel</button>
              <button onClick={() => submitSickReport(false)} disabled={sickForm.symptoms.length === 0} style={{...primaryBtn, background:'#E65100', flex:2}}>Submit Report</button>
            </div>
          </div>
        ) : (
          <div>
            <p style={{fontSize:12,color:'#666',marginBottom:12}}>Select the sick animal:</p>
            {myAnimals.length === 0 && <p style={{textAlign:'center',color:'#999',padding:20}}>No animals registered</p>}
            {myAnimals.map(a => (
              <div key={a.passportId} onClick={() => setSickTarget(a)} style={{
                background:'white',borderRadius:12,padding:14,marginBottom:8,
                border:'1px solid #E0E0E0',cursor:'pointer',display:'flex',gap:10,alignItems:'center'
              }}>
                <span style={{fontSize:28}}>{
                  a.type === 'Cow' ? '🐄' :
                  a.type === 'Goat' ? '🐐' :
                  a.type === 'Sheep' ? '🐑' :
                  a.type === 'Pig' ? '🐷' :
                  a.type === 'Chicken' ? '🐔' :
                  a.type === 'Camel' ? '🐪' : '🐾'
                }</span>
                <div style={{flex:1}}>
                  <strong style={{fontSize:13}}>{a.type} • {a.breed}</strong>
                  <p style={{fontSize:11,color:'#666',margin:'4px 0 0',fontFamily:'monospace'}}>{a.passportId}</p>
                  {a.currentLifeStage && <span style={{fontSize:10,background:'#E3F2FD',color:'#1565C0',padding:'1px 6px',borderRadius:4}}>{a.currentLifeStage}</span>}
                </div>
                <span style={{color:'#4CAF50',fontSize:20}}>→</span>
              </div>
            ))}
          </div>
        )}
        <button onClick={() => setView('home')} style={{...primaryBtn, background:'none', color:'#666', marginTop:8}}>Back</button>
      </div>
    );
  }

  if (view === 'my-reports') {
    const myReports = myFarmer ? sickReports.filter(r => r.farmerPhone === myFarmer.farmer?.phone) : [];
    return (
      <div>
        <h4 style={{fontSize:16,marginBottom:12}}>My Sick Reports ({myReports.length})</h4>
        <button onClick={() => setView('home')} style={{...primaryBtn, background:'none', color:'#666', marginBottom:8}}>Back</button>
        {myReports.length === 0 && <p style={{textAlign:'center',color:'#999',padding:20}}>No reports yet</p>}
        {myReports.map(r => (
          <div key={r.id} style={{
            background: r.status === 'resolved' ? '#E8F5E9' : '#FFF3E0',
            borderRadius:12,padding:14,marginBottom:8,
            border:'1px solid #E0E0E0'
          }}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
              <strong style={{fontSize:12,fontFamily:'monospace'}}>{r.id}</strong>
              <span style={{background: r.status === 'resolved' ? '#2E7D32' : '#E65100',color:'white',padding:'2px 8px',borderRadius:6,fontSize:10,fontWeight:'bold'}}>{r.status.toUpperCase()}</span>
            </div>
            <p style={{fontSize:12,margin:'2px 0'}}>{r.animalType} - {r.animalBreed}</p>
            <p style={{fontSize:11,margin:'2px 0',color:'#666'}}>Symptoms: {r.symptoms.join(', ')}</p>
            <p style={{fontSize:11,margin:'2px 0',color:'#666'}}>Urgency: {r.urgency}</p>
          </div>
        ))}
      </div>
    );
  }

  if (view === 'find-vets') {
    return (
      <div>
        <h4 style={{fontSize:16,marginBottom:12}}>Find Vets ({vets.length})</h4>
        <button onClick={() => setView('home')} style={{...primaryBtn, background:'none', color:'#666', marginBottom:8}}>Back</button>
        {vets.length === 0 && <p style={{textAlign:'center',color:'#999',padding:20}}>No vets registered</p>}
        {vets.map(v => (
          <div key={v.id} style={{
            background: v.status === 'active' ? '#E3F2FD' : '#FFF3E0',
            borderRadius:12,padding:14,marginBottom:8,
            border:'1px solid #E0E0E0'
          }}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
              <strong style={{fontSize:13}}>{v.isGovt ? '[GOVT] ' : ''}{v.fullName}</strong>
              <span style={{background: v.status === 'active' ? '#2E7D32' : '#FF9800',color:'white',padding:'2px 8px',borderRadius:6,fontSize:10}}>{v.status.toUpperCase()}</span>
            </div>
            <p style={{fontSize:11,margin:'2px 0',color:'#666'}}>{v.vetType} - {v.specializations?.join(', ')}</p>
            <p style={{fontSize:11,margin:'2px 0',color:'#666'}}>{v.location?.county}, {v.location?.ward}</p>
            <p style={{fontSize:11,margin:'2px 0',color:'#666'}}>{v.phone}</p>
          </div>
        ))}
      </div>
    );
  }

  return null;
}



// MODULE G: LAND SOVEREIGNTY
function LandSovereigntyModule() {
  const [view, setView] = useState('home');
  const [myFarmer, setMyFarmer] = useState(null);
  const [parcels, setParcels] = useState([]);
  const [selectedParcel, setSelectedParcel] = useState(null);
  const [paymentParcel, setPaymentParcel] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Register form
  const [regForm, setRegForm] = useState({
    location: null,
    county: '', subCounty: '', ward: '', village: '',
    titleDeed: '', areaHectares: '', landUse: 'Mixed farming',
    description: '', waypoints: [],
    // Owner info (auto-filled if logged in as farmer)
    ownerName: '',
    ownerPhone: '',
  });

  // GPS recording
  const [recording, setRecording] = useState(false);
  const [currentGps, setCurrentGps] = useState(null);

  // Title deed
  const [deedNumber, setDeedNumber] = useState('');

  // Witness invite
  const [witnessForm, setWitnessForm] = useState({ name: '', phone: '', relationship: 'Neighbor' });

  // SOS
  const [sosActive, setSosActive] = useState(false);
  const [sosSituation, setSosSituation] = useState('');

  // Emergency contacts
  const [emergencyForm, setEmergencyForm] = useState({ name: '', phone: '', relationship: '' });
  const [emergencyContacts, setEmergencyContacts] = useState([]);

  // Lease
  const [leaseForm, setLeaseForm] = useState({
    landownerName: '', landownerPhone: '', tenantName: '', tenantPhone: '',
    purpose: 'Cattle grazing', monthlyFee: '', startDate: '', endDate: '', terms: '',
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem('farmerRegistration');
      if (saved) setMyFarmer(JSON.parse(saved));
    } catch (e) {}
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const [s, parcelsList] = await Promise.all([
        api.landProtection.stats().catch(() => ({ stats: null })),
        api.landProtection.listParcels().catch(() => ({ parcels: [] })),
      ]);
      setStats(s.stats);
      setParcels(parcelsList.parcels || []);

      // Load emergency contacts
      if (myFarmer?.farmer?.phone) {
        const ec = await api.landProtection.getEmergencyContacts(myFarmer.farmer.phone).catch(() => ({ contacts: [] }));
        setEmergencyContacts(ec.contacts || []);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const myParcels = myFarmer 
    ? parcels.filter(p => p.ownerPhone === myFarmer.farmer?.phone)
    : [];

  // GPS recording — continuous watch
  const startRecording = () => {
    if (!navigator.geolocation) {
      alert('GPS not available on this device. Use manual entry below.');
      return;
    }
    setRecording(true);
    if (window._gpsWatchId) navigator.geolocation.clearWatch(window._gpsWatchId);

    window._gpsWatchId = navigator.geolocation.watchPosition(
      (pos) => {
        setCurrentGps({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => {
        console.warn('GPS error:', err.message);
        if (err.code === 1) {
          alert('Location permission denied. Enable in browser settings, or use manual entry.');
        }
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 2000 }
    );
  };

  const stopRecording = () => {
    if (window._gpsWatchId) {
      navigator.geolocation.clearWatch(window._gpsWatchId);
      window._gpsWatchId = null;
    }
    setRecording(false);
    setCurrentGps(null);
  };

  const recordWaypoint = () => {
    if (!currentGps) {
      alert('Waiting for GPS signal... Make sure you are outdoors with a clear view of the sky.');
      return;
    }
    const label = `Point ${regForm.waypoints.length + 1}`;
    const updated = [...regForm.waypoints, { ...currentGps, label }];
    setRegForm({ ...regForm, waypoints: updated });
    // Don't clear GPS — watch continues
  };

  const submitParcel = async () => {
    if (!regForm.county) { alert('Location required'); return; }
    if (regForm.waypoints.length < 3) { alert('Record at least 3 GPS waypoints to form a boundary'); return; }

    // Use form fields (auto-filled if logged in, or manual entry)
    const ownerName = regForm.ownerName || myFarmer?.farmer?.fullName;
    const ownerPhone = regForm.ownerPhone || myFarmer?.farmer?.phone;
    const ownerId = ownerPhone;

    if (!ownerName) { alert('Owner name required'); return; }
    if (!ownerPhone) { alert('Owner phone required'); return; }

    const normalizedPhone = ownerPhone.startsWith('+') ? ownerPhone : normalizeKenyaPhone(ownerPhone);

    try {
      const result = await api.landProtection.registerParcel({
        ownerId,
        ownerName,
        ownerPhone: normalizedPhone,
        ...regForm,
      });
      if (!result.success) throw new Error(result.message);
      await loadAll();
      // Open payment sheet — parcel will activate after KES 500
      setPaymentParcel(result.parcel);
      setRegForm({
        county: '', subCounty: '', ward: '', village: '',
        titleDeed: '', areaHectares: '', landUse: 'Mixed farming',
        description: '', waypoints: [],
      });
      if (window._gpsWatchId) {
        navigator.geolocation.clearWatch(window._gpsWatchId);
        window._gpsWatchId = null;
      }
      setRecording(false);
    } catch (err) { alert('Error: ' + err.message); }
  };

  const uploadDeed = async (parcelId) => {
    if (!deedNumber) { alert('Enter title deed number'); return; }
    try {
      const result = await api.landProtection.uploadTitleDeed(parcelId, { titleDeedNumber: deedNumber });
      if (!result.success) throw new Error(result.message);
      alert('✅ Title deed vaulted! Hash: ' + result.parcel.titleDeedHash);
      setDeedNumber('');
      await loadAll();
      const updated = await api.landProtection.getParcel(parcelId);
      setSelectedParcel(updated.parcel);
    } catch (err) { alert('Error: ' + err.message); }
  };

  const inviteWitness = async (parcelId) => {
    if (!witnessForm.name || !witnessForm.phone) { alert('Name and phone required'); return; }
    try {
      const result = await api.landProtection.inviteWitness(parcelId, witnessForm);
      if (!result.success) throw new Error(result.message);
      alert('✅ Witness invited!\n\nCode: ' + result.witness.confirmationCode + '\n\nThey will receive an SMS. Share the code with them.');
      setWitnessForm({ name: '', phone: '', relationship: 'Neighbor' });
      const updated = await api.landProtection.getParcel(parcelId);
      setSelectedParcel(updated.parcel);
    } catch (err) { alert('Error: ' + err.message); }
  };

  const triggerSOS = async (parcelId) => {
    if (!sosSituation) { alert('Describe the situation briefly'); return; }
    if (!confirm('🚨 TRIGGER EVICTION SOS?\n\nThis will alert:\n• National Land Commission\n• Your emergency contacts\n• All 3 witnesses\n• Local police\n• FarmDirect admin\n\nOnly use if you are actually being evicted.')) return;
    try {
      const result = await api.landProtection.triggerSOS(parcelId, {
        reporterName: myFarmer?.farmer?.fullName,
        reporterPhone: myFarmer?.farmer?.phone,
        situation: sosSituation,
      });
      if (!result.success) throw new Error(result.message);
      alert('🚨 SOS SENT!\n\n' + result.sos.totalAlerts + ' alerts sent.\n\nHelp is coming. Stay safe.');
      setSosActive(false);
      setSosSituation('');
      const updated = await api.landProtection.getParcel(parcelId);
      setSelectedParcel(updated.parcel);
    } catch (err) { alert('Error: ' + err.message); }
  };

  const verifyWithLivestock = async (parcelId) => {
    // Get farmer's livestock
    try {
      const live = await api.shamba.listLivestock();
      const myAnimals = (live.livestock || []).filter(a => 
        a.ownerPhone === myFarmer.farmer?.phone && a.status === 'alive'
      );
      if (myAnimals.length === 0) {
        alert('You have no livestock registered. Register animals first.');
        return;
      }
      const passports = myAnimals.map(a => a.passportId);
      const result = await api.landProtection.verifyWithLivestock(parcelId, passports);
      if (!result.success) throw new Error(result.message);
      alert('📊 VERIFICATION RESULT\n\n' + result.conclusion);
    } catch (err) { alert('Error: ' + err.message); }
  };

  const saveEmergency = async () => {
    if (!emergencyForm.name || !emergencyForm.phone) { alert('Name and phone required'); return; }
    try {
      const updated = [...emergencyContacts, emergencyForm];
      await api.landProtection.saveEmergencyContacts(myFarmer.farmer?.phone, { contacts: updated });
      setEmergencyContacts(updated);
      setEmergencyForm({ name: '', phone: '', relationship: '' });
      alert('✅ Contact saved');
    } catch (err) { alert('Error: ' + err.message); }
  };

  const createLease = async (parcelId) => {
    try {
      const result = await api.landProtection.createLease({
        parcelId,
        landownerId: myFarmer.farmer?.phone,
        ...leaseForm,
      });
      if (!result.success) throw new Error(result.message);
      alert('✅ Lease created!\n\nApproval code: ' + result.lease.approvalCode + '\n\nSMS sent to landowner.');
      setLeaseForm({
        landownerName: '', landownerPhone: '', tenantName: '', tenantPhone: '',
        purpose: 'Cattle grazing', monthlyFee: '', startDate: '', endDate: '', terms: '',
      });
      setView('home');
    } catch (err) { alert('Error: ' + err.message); }
  };

  if (loading) return <div style={{padding:40,textAlign:'center'}}>Loading land records...</div>;

  // ─── HOME ───
  if (view === 'home') {
    return (
      <div>
        <h4 style={{fontSize:16,marginBottom:12}}>🏠 Land Sovereignty</h4>

        {stats && (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:12}}>
            <div style={{background:'#E8F5E9',padding:10,borderRadius:10,textAlign:'center'}}>
              <strong style={{fontSize:18,color:'#2E7D32'}}>{stats.verifiedParcels}</strong>
              <p style={{fontSize:9,color:'#666',margin:0}}>Verified</p>
            </div>
            <div style={{background:'#FFF3E0',padding:10,borderRadius:10,textAlign:'center'}}>
              <strong style={{fontSize:18,color:'#E65100'}}>{stats.totalHectares.toFixed(1)}</strong>
              <p style={{fontSize:9,color:'#666',margin:0}}>Hectares</p>
            </div>
            <div style={{background:'#E3F2FD',padding:10,borderRadius:10,textAlign:'center'}}>
              <strong style={{fontSize:18,color:'#1565C0'}}>{stats.confirmedWitnesses}</strong>
              <p style={{fontSize:9,color:'#666',margin:0}}>Witnesses</p>
            </div>
          </div>
        )}

        <div style={{background:'#E3F2FD',padding:12,borderRadius:10,marginBottom:12,border:'1px solid #90CAF9'}}>
          <strong style={{fontSize:12,color:'#0D47A1'}}>🛡️ Your Land, Protected</strong>
          <p style={{fontSize:11,color:'#1565C0',margin:'4px 0 0'}}>
            GPS boundary + title deed hash + 3 witnesses = immutable proof that cannot be burned, stolen, or deleted.
          </p>
        </div>

        <button onClick={() => { setView('register'); startRecording(); }} style={{...primaryBtn, background:'#2E7D32'}}>
          ➕ Register New Parcel
        </button>

        <h5 style={{fontSize:14,marginTop:16,marginBottom:8}}>My Parcels ({myParcels.length})</h5>

        {myParcels.length === 0 && (
          <p style={{textAlign:'center',color:'#999',padding:20,fontSize:13}}>No parcels registered yet</p>
        )}

        {myParcels.map(p => (
          <div key={p.id} onClick={async () => {
            const detail = await api.landProtection.getParcel(p.id);
            setSelectedParcel(detail.parcel);
            setView('detail');
          }} style={{
            background: p.status === 'verified' ? '#E8F5E9' : p.status === 'disputed' ? '#FFEBEE' : '#FFF3E0',
            borderRadius:12,padding:14,marginBottom:8,border:'1px solid #E0E0E0',cursor:'pointer'
          }}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
              <strong style={{fontSize:13,fontFamily:'monospace'}}>{p.id}</strong>
              <span style={{background: p.status === 'verified' ? '#2E7D32' : p.status === 'disputed' ? '#C62828' : '#FF9800', color:'white', padding:'2px 8px', borderRadius:6, fontSize:10, fontWeight:'bold'}}>
                {p.status === 'verified' ? '✅ VERIFIED' : p.status === 'disputed' ? '🚨 DISPUTED' : '⏳ PENDING'}
              </span>
            </div>
            <p style={{fontSize:12,margin:'2px 0'}}>📍 {p.village || p.ward}, {p.county}</p>
            <p style={{fontSize:12,margin:'2px 0'}}>📏 {p.areaDisplay || p.areaProvisional?.display || '—'} • {p.landUse}</p>
            <p style={{fontSize:11,margin:'4px 0 0',color:'#666'}}>
              🛰️ {p.waypoints.length} GPS points • 👥 {p.confirmedWitnesses}/3 witnesses
            </p>
            {!p.feePaid && (
              <button
                onClick={(e) => { e.stopPropagation(); setPaymentParcel(p); }}
                style={{...primaryBtn, background:'#2E7D32', padding:10, fontSize:13, marginTop:8}}
              >
                💳 Pay KES {p.fee || 500} to Activate
              </button>
            )}
            {p.landmarkHash && <p style={{fontSize:10,margin:'2px 0 0',color:'#999',fontFamily:'monospace'}}>{p.landmarkHash}</p>}
          </div>
        ))}

        {paymentParcel && (
          <LandPaymentSheet
            parcel={paymentParcel}
            onClose={() => setPaymentParcel(null)}
            onPaid={() => { loadAll(); }}
            onInviteWitnesses={() => {
              setPaymentParcel(null);
              setView('detail');
              api.landProtection.getParcel(paymentParcel.id).then(r => {
                setSelectedParcel(r.parcel);
              });
            }}
          />
        )}
      </div>
    );
  }

  // ─── REGISTER PARCEL ───
  if (view === 'register') {
    return (
      <div>
        <button onClick={() => { setView('home'); setRecording(false); }} style={{background:'none',border:'none',color:'#2E7D32',fontWeight:'bold',cursor:'pointer',marginBottom:8,fontSize:14}}>← Back</button>
        <h4 style={{fontSize:16,marginBottom:12}}>🏠 Register Land Parcel</h4>

        {/* OWNER INFO — only shown if not logged in as farmer */}
        {!myFarmer && (
          <div style={{background:'#F0F4F8',padding:12,borderRadius:10,marginBottom:12,border:'1px solid #90CAF9'}}>
            <strong style={{fontSize:13,color:'#0D47A1'}}>👤 Land Owner Information</strong>
            <p style={{fontSize:11,color:'#666',margin:'4px 0 10px'}}>You're not logged in as a farmer. Fill in your details below.</p>

            <label style={labelStyle}>Full Name *</label>
            <input 
              value={regForm.ownerName} 
              onChange={e => setRegForm({...regForm, ownerName: e.target.value})} 
              placeholder="e.g. Kipngetich Clinton" 
              style={inputStyle} 
            />

            <label style={labelStyle}>Phone Number *</label>
            <input 
              value={regForm.ownerPhone} 
              onChange={e => setRegForm({...regForm, ownerPhone: e.target.value})} 
              onBlur={e => e.target.value && setRegForm({...regForm, ownerPhone: normalizeKenyaPhone(e.target.value)})}
              placeholder="0704519744" 
              type="tel"
              style={inputStyle} 
            />
          </div>
        )}

        {/* SHARED LOCATION PICKER */}
        <LocationPicker 
          value={regForm.location} 
          onChange={(loc) => {
            if (!loc) return;
            setRegForm({
              ...regForm,
              location: loc,
              county: loc.county || '',
              subCounty: loc.subCounty || '',
              ward: loc.ward || '',
              village: loc.area || loc.locality || '',
            });
          }} 
          required 
          label="Where is the land located?" 
        />

        {regForm.county && (
          <div style={{background:'#E8F5E9',padding:10,borderRadius:8,marginBottom:12,fontSize:11}}>
            <strong style={{color:'#2E7D32'}}>📍 Location set:</strong>
            <br />
            {[regForm.village, regForm.ward, regForm.subCounty, regForm.county].filter(Boolean).join(', ')}
          </div>
        )}

        <label style={labelStyle}>Title Deed Number</label>
        <input value={regForm.titleDeed} onChange={e => setRegForm({...regForm, titleDeed: e.target.value})} placeholder="BOM/2024/001" style={inputStyle} />

        <label style={labelStyle}>Area (Hectares) — optional, computed from GPS</label>
        <input type="number" step="0.01" value={regForm.areaHectares} onChange={e => setRegForm({...regForm, areaHectares: e.target.value})} placeholder="2.5" style={inputStyle} />

        <label style={labelStyle}>Land Use</label>
        <select value={regForm.landUse} onChange={e => setRegForm({...regForm, landUse: e.target.value})} style={{...inputStyle, background:'white'}}>
          <option>Mixed farming</option>
          <option>Crop farming</option>
          <option>Livestock grazing</option>
          <option>Residential</option>
          <option>Commercial</option>
        </select>

        {/* GPS RECORDING */}
        <div style={{background:'#E8F5E9',padding:14,borderRadius:12,marginTop:16,marginBottom:12,border:'2px solid #4CAF50'}}>
          <strong style={{fontSize:14,color:'#1B5E20'}}>🛰️ GPS Boundary Recording</strong>
          <p style={{fontSize:11,color:'#666',margin:'4px 0 8px'}}>
            Walk to each corner of your land. Tap "Record Point" at every corner. Need 3+ points.
          </p>

          {/* GPS ENABLE BUTTON */}
          {!recording && (
            <button
              onClick={startRecording}
              style={{
                width:'100%',
                padding:14,
                borderRadius:10,
                background:'#1565C0',
                color:'white',
                border:'none',
                fontSize:14,
                fontWeight:'bold',
                cursor:'pointer',
                marginBottom:10,
              }}
            >
              📡 Enable GPS Tracking
            </button>
          )}

          {recording && !currentGps && (
            <div style={{background:'#FFF8E1',padding:10,borderRadius:8,marginBottom:8,fontSize:11,color:'#E65100'}}>
              📡 Acquiring GPS signal... Please wait or move to open sky.
            </div>
          )}

          {currentGps && (
            <div style={{background:'#E8F5E9',padding:10,borderRadius:8,marginBottom:8,fontSize:11,border:'1px solid #A5D6A7'}}>
              <strong style={{color:'#2E7D32'}}>✅ GPS Active</strong>
              <br /><strong>Position:</strong> {currentGps.lat.toFixed(6)}, {currentGps.lng.toFixed(6)}
              <br /><span style={{color:'#666'}}>Accuracy: ±{Math.round(currentGps.accuracy)}m</span>
            </div>
          )}

          <button onClick={recordWaypoint} disabled={!currentGps} style={{
            ...primaryBtn, 
            background: currentGps ? '#4CAF50' : '#ccc',
            marginTop:8,
          }}>
            📍 Record Point #{regForm.waypoints.length + 1}
          </button>

          {/* Manual coordinate entry fallback */}
          <div style={{marginTop:12,paddingTop:12,borderTop:'1px dashed #A5D6A7'}}>
            <strong style={{fontSize:11,color:'#555',display:'block',marginBottom:6}}>Or enter coordinates manually:</strong>
            <div style={{display:'flex',gap:6}}>
              <input 
                type="number" 
                step="0.000001"
                placeholder="Latitude"
                id="manualLat"
                style={{...inputStyle, marginBottom:0, fontSize:12, padding:'8px 10px'}}
              />
              <input 
                type="number" 
                step="0.000001"
                placeholder="Longitude"
                id="manualLng"
                style={{...inputStyle, marginBottom:0, fontSize:12, padding:'8px 10px'}}
              />
            </div>
            <button 
              onClick={() => {
                const lat = parseFloat(document.getElementById('manualLat').value);
                const lng = parseFloat(document.getElementById('manualLng').value);
                if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
                  alert('Enter valid latitude and longitude');
                  return;
                }
                const label = `Point ${regForm.waypoints.length + 1}`;
                const updated = [...regForm.waypoints, { lat, lng, label, manual: true }];
                setRegForm({ ...regForm, waypoints: updated });
                document.getElementById('manualLat').value = '';
                document.getElementById('manualLng').value = '';
              }}
              style={{...primaryBtn, background:'#1565C0', marginTop:8, fontSize:13, padding:'10px 14px'}}
            >
              ➕ Add Manual Point
            </button>
            <p style={{fontSize:10,color:'#666',margin:'6px 0 0',lineHeight:1.4}}>
              💡 How to find your coordinates: Open Google Maps → long-press your farm location → copy the lat/lng numbers.
            </p>
          </div>

          {regForm.waypoints.length > 0 && (
            <div style={{marginTop:12}}>
              <strong style={{fontSize:12,color:'#333'}}>Recorded Points ({regForm.waypoints.length}):</strong>
              {regForm.waypoints.map((w, i) => (
                <div key={i} style={{background:'white',padding:8,borderRadius:6,marginTop:4,fontSize:10,fontFamily:'monospace'}}>
                  {w.label}: {w.lat.toFixed(6)}, {w.lng.toFixed(6)}
                </div>
              ))}
            </div>
          )}
        </div>

        <label style={labelStyle}>Description (optional)</label>
        <textarea value={regForm.description} onChange={e => setRegForm({...regForm, description: e.target.value})} placeholder="e.g. Family land, inherited from grandfather" rows={2} style={{...inputStyle, resize:'vertical'}} />

        <div style={{display:'flex',gap:8,marginTop:16}}>
          <button onClick={() => { setView('home'); setRecording(false); }} style={{...primaryBtn, background:'#F0F0F0', color:'#666', flex:1}}>Cancel</button>
          <button onClick={submitParcel} disabled={regForm.waypoints.length < 3} style={{...primaryBtn, background: regForm.waypoints.length >= 3 ? '#2E7D32' : '#ccc', flex:2}}>
            ✅ Register Parcel
          </button>
        </div>
      </div>
    );
  }

  // ─── PARCEL DETAIL ───
  if (view === 'detail' && selectedParcel) {
    const p = selectedParcel;
    const progress = p.verificationProgress || { required: 3, confirmed: 0, percent: 0 };

    return (
      <div>
        <button onClick={() => setView('home')} style={{background:'none',border:'none',color:'#2E7D32',fontWeight:'bold',cursor:'pointer',marginBottom:8,fontSize:14}}>← Back</button>

        <div style={{background: p.status === 'verified' ? '#E8F5E9' : '#FFF3E0', padding:14, borderRadius:12, marginBottom:12, border:'1px solid #E0E0E0'}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
            <strong style={{fontSize:13,fontFamily:'monospace'}}>{p.id}</strong>
            <span style={{background: p.status === 'verified' ? '#2E7D32' : '#FF9800', color:'white', padding:'2px 8px', borderRadius:6, fontSize:10, fontWeight:'bold'}}>
              {p.status.toUpperCase()}
            </span>
          </div>
          <p style={{fontSize:12,margin:'2px 0'}}>📍 {p.village || p.ward}, {p.county}</p>
          <p style={{fontSize:12,margin:'2px 0'}}>📏 {p.areaHectares} ha • {p.landUse}</p>
          <p style={{fontSize:11,margin:'4px 0 0',color:'#666'}}>🛰️ {p.waypoints.length} GPS points</p>
          {p.landmarkHash && <p style={{fontSize:10,margin:'4px 0 0',color:'#999',fontFamily:'monospace'}}>{p.landmarkHash}</p>}
        </div>

        {/* SOS BUTTON */}
        {!sosActive ? (
          <button onClick={() => setSosActive(true)} style={{
            width:'100%',padding:16,borderRadius:12,
            background:'#C62828',color:'white',border:'none',
            fontSize:16,fontWeight:'bold',cursor:'pointer',
            marginBottom:12,boxShadow:'0 4px 12px rgba(198,40,40,0.3)',
          }}>🚨 EVICTION SOS</button>
        ) : (
          <div style={{background:'#FFEBEE',padding:14,borderRadius:12,marginBottom:12,border:'2px solid #C62828'}}>
            <strong style={{fontSize:13,color:'#C62828'}}>🚨 Trigger Eviction SOS?</strong>
            <textarea value={sosSituation} onChange={e => setSosSituation(e.target.value)} placeholder="Describe the situation..." rows={3} style={{...inputStyle, marginTop:8}} />
            <div style={{display:'flex',gap:8}}>
              <button onClick={() => setSosActive(false)} style={{...primaryBtn, background:'#F0F0F0', color:'#666', flex:1}}>Cancel</button>
              <button onClick={() => triggerSOS(p.id)} style={{...primaryBtn, background:'#C62828', flex:2}}>🚨 SEND SOS</button>
            </div>
          </div>
        )}

        {/* TITLE DEED */}
        <div style={{background:'#F9FAFB',padding:14,borderRadius:12,marginBottom:12}}>
          <strong style={{fontSize:13,color:'#1565C0'}}>📜 Title Deed Vault</strong>
          {p.titleDeedHash ? (
            <div style={{marginTop:8}}>
              <p style={{fontSize:11,color:'#2E7D32',fontWeight:'bold'}}>✅ Vaulted</p>
              <p style={{fontSize:10,color:'#666',fontFamily:'monospace'}}>{p.titleDeedHash}</p>
            </div>
          ) : (
            <div style={{marginTop:8}}>
              <input value={deedNumber} onChange={e => setDeedNumber(e.target.value)} placeholder="Title deed number" style={inputStyle} />
              <button onClick={() => uploadDeed(p.id)} style={{...primaryBtn, background:'#1565C0'}}>🔒 Store in Vault</button>
            </div>
          )}
        </div>

        {/* WITNESSES */}
        <div style={{background:'#F9FAFB',padding:14,borderRadius:12,marginBottom:12}}>
          <strong style={{fontSize:13,color:'#E65100'}}>👥 Witness Verification ({progress.confirmed}/{progress.required})</strong>
          <div style={{background:'#E0E0E0',height:8,borderRadius:4,marginTop:8,overflow:'hidden'}}>
            <div style={{width: progress.percent + '%', height:'100%', background: progress.percent >= 100 ? '#4CAF50' : '#FF9800', transition:'width 0.3s'}} />
          </div>

          {(p.witnessDetails || []).map(w => (
            <div key={w.id} style={{background:'white',padding:10,borderRadius:8,marginTop:8,fontSize:11}}>
              <div style={{display:'flex',justifyContent:'space-between'}}>
                <strong>{w.name}</strong>
                <span style={{background: w.status === 'confirmed' ? '#2E7D32' : '#FF9800', color:'white', padding:'1px 6px', borderRadius:4, fontSize:9, fontWeight:'bold'}}>
                  {w.status.toUpperCase()}
                </span>
              </div>
              <p style={{margin:'2px 0',color:'#666'}}>{w.relationship} • {w.phone}</p>
              {w.status === 'invited' && <p style={{margin:'2px 0',color:'#E65100',fontFamily:'monospace',fontSize:10}}>Code: {w.confirmationCode}</p>}
            </div>
          ))}

          {progress.confirmed < 3 && (
            <div style={{marginTop:10}}>
              <input value={witnessForm.name} onChange={e => setWitnessForm({...witnessForm, name: e.target.value})} placeholder="Witness name" style={inputStyle} />
              <input value={witnessForm.phone} onChange={e => setWitnessForm({...witnessForm, phone: e.target.value})} onBlur={e => e.target.value && setWitnessForm({...witnessForm, phone: normalizeKenyaPhone(e.target.value)})} placeholder="0712345678" type="tel" style={inputStyle} />
              <select value={witnessForm.relationship} onChange={e => setWitnessForm({...witnessForm, relationship: e.target.value})} style={{...inputStyle, background:'white'}}>
                <option>Neighbor</option>
                <option>Chief</option>
                <option>Relative</option>
                <option>Elder</option>
              </select>
              <button onClick={() => inviteWitness(p.id)} style={{...primaryBtn, background:'#E65100'}}>👥 Invite Witness</button>
            </div>
          )}
        </div>

        {/* LAND-LIVESTOCK MATCH */}
        <button onClick={() => verifyWithLivestock(p.id)} style={{...primaryBtn, background:'#1565C0', marginBottom:12}}>
          🐄 Verify with My Livestock
        </button>

        {/* CREATE LEASE */}
        <button onClick={() => setView('lease-create')} style={{...primaryBtn, background:'#7B1FA2'}}>
          📄 Create Grazing Lease
        </button>

        {/* HISTORY */}
        <div style={{background:'#F9FAFB',padding:14,borderRadius:12,marginTop:12}}>
          <strong style={{fontSize:12,color:'#333'}}>📋 History</strong>
          {(p.history || []).slice(-8).reverse().map((h, i) => (
            <div key={i} style={{fontSize:11,padding:'6px 0',borderBottom:'1px solid #E0E0E0'}}>
              <strong>{h.action}</strong>
              <p style={{margin:'2px 0',color:'#666',fontSize:10}}>{new Date(h.at).toLocaleString()}</p>
              <p style={{margin:0,color:'#666',fontSize:10}}>{h.note}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── CREATE LEASE ───
  if (view === 'lease-create' && selectedParcel) {
    return (
      <div>
        <button onClick={() => setView('detail')} style={{background:'none',border:'none',color:'#2E7D32',fontWeight:'bold',cursor:'pointer',marginBottom:8,fontSize:14}}>← Back</button>
        <h4 style={{fontSize:16,marginBottom:12}}>📄 Create Grazing Lease</h4>

        <label style={labelStyle}>Landowner Name *</label>
        <input value={leaseForm.landownerName} onChange={e => setLeaseForm({...leaseForm, landownerName: e.target.value})} placeholder="Sarah Wanjiku" style={inputStyle} />

        <label style={labelStyle}>Landowner Phone *</label>
        <input value={leaseForm.landownerPhone} onChange={e => setLeaseForm({...leaseForm, landownerPhone: e.target.value})} onBlur={e => e.target.value && setLeaseForm({...leaseForm, landownerPhone: normalizeKenyaPhone(e.target.value)})} placeholder="0722334455" type="tel" style={inputStyle} />

        <label style={labelStyle}>Tenant Name (you) *</label>
        <input value={leaseForm.tenantName} onChange={e => setLeaseForm({...leaseForm, tenantName: e.target.value})} placeholder="James Kiprop" style={inputStyle} />

        <label style={labelStyle}>Tenant Phone *</label>
        <input value={leaseForm.tenantPhone} onChange={e => setLeaseForm({...leaseForm, tenantPhone: e.target.value})} onBlur={e => e.target.value && setLeaseForm({...leaseForm, tenantPhone: normalizeKenyaPhone(e.target.value)})} placeholder="0712345678" type="tel" style={inputStyle} />

        <label style={labelStyle}>Purpose</label>
        <select value={leaseForm.purpose} onChange={e => setLeaseForm({...leaseForm, purpose: e.target.value})} style={{...inputStyle, background:'white'}}>
          <option>Cattle grazing</option>
          <option>Goat grazing</option>
          <option>Camel grazing</option>
          <option>Crop farming</option>
          <option>Mixed use</option>
        </select>

        <label style={labelStyle}>Monthly Fee (KES)</label>
        <input type="number" value={leaseForm.monthlyFee} onChange={e => setLeaseForm({...leaseForm, monthlyFee: e.target.value})} placeholder="15000" style={inputStyle} />

        <label style={labelStyle}>Start Date</label>
        <input type="date" value={leaseForm.startDate} onChange={e => setLeaseForm({...leaseForm, startDate: e.target.value})} style={inputStyle} />

        <label style={labelStyle}>End Date</label>
        <input type="date" value={leaseForm.endDate} onChange={e => setLeaseForm({...leaseForm, endDate: e.target.value})} style={inputStyle} />

        <label style={labelStyle}>Terms</label>
        <textarea value={leaseForm.terms} onChange={e => setLeaseForm({...leaseForm, terms: e.target.value})} placeholder="e.g. Tenant may graze up to 20 cattle" rows={2} style={{...inputStyle, resize:'vertical'}} />

        <div style={{display:'flex',gap:8,marginTop:16}}>
          <button onClick={() => setView('detail')} style={{...primaryBtn, background:'#F0F0F0', color:'#666', flex:1}}>Cancel</button>
          <button onClick={() => createLease(selectedParcel.id)} disabled={!leaseForm.landownerName || !leaseForm.landownerPhone || !leaseForm.tenantName || !leaseForm.tenantPhone} style={{...primaryBtn, background:'#7B1FA2', flex:2}}>📄 Create Lease</button>
        </div>
      </div>
    );
  }

  return null;
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
