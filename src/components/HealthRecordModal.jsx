// FILE: src/components/HealthRecordModal.jsx
// Two-tier health record viewer + recorder for a livestock passport.
// Tiers: 🩺 vet_verified | 🧑‍🌾 self_reported | 👥 community_attested
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { resizeImageFile } from '../utils/imageUtils';

const inputStyle = { width:'100%', padding:'12px 14px', borderRadius:10, border:'2px solid #E0E0E0', fontSize:14, marginBottom:8, boxSizing:'border-box', fontFamily:'inherit', color:'#333' };
const labelStyle = { fontSize:11, fontWeight:'bold', color:'#555', display:'block', marginBottom:4, marginTop:10 };
const primaryBtn = { width:'100%', padding:14, color:'white', border:'none', borderRadius:25, fontSize:14, fontWeight:'bold', cursor:'pointer', marginTop:8, boxSizing:'border-box' };
const ghostBtn = { ...primaryBtn, background:'#F0F0F0', color:'#666' };

const TIER_META = {
  vet_verified:        { icon: '🩺', label: 'Vet-verified',      bg: '#E8F5E9', fg: '#2E7D32', border: '#A5D6A7' },
  self_reported:       { icon: '🧑‍🌾', label: 'Self-reported',    bg: '#FFF8E1', fg: '#E65100', border: '#FFD54F' },
  community_attested:  { icon: '👥', label: 'Community-attested', bg: '#E3F2FD', fg: '#0D47A1', border: '#90CAF9' },
};

const ROLE_OPTIONS = [
  { id: 'owner',             label: 'I did it myself',  icon: '🧑‍🌾', tier: 'self_reported' },
  { id: 'vet',               label: 'A vet did it',     icon: '🩺', tier: 'vet_verified' },
  { id: 'neighbor',          label: 'A neighbor did it', icon: '👥', tier: 'community_attested' },
  { id: 'extension_officer', label: 'Extension officer', icon: '👥', tier: 'community_attested' },
];

const METHODS = [
  { id: '',           label: '—' },
  { id: 'injection',  label: 'Injection' },
  { id: 'oral',       label: 'Oral' },
  { id: 'pour_on',    label: 'Pour-on' },
  { id: 'spray',      label: 'Spray' },
  { id: 'topical',    label: 'Topical' },
  { id: 'other',      label: 'Other' },
];

export default function HealthRecordModal({ animal, currentFarmer, currentVet, onClose, onUpdated }) {
  const [view, setView] = useState('timeline'); // timeline | add-event
  const [events, setEvents] = useState([]);
  const [eventTypes, setEventTypes] = useState([]);
  const [commonProducts, setCommonProducts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Add-event form state
  const [form, setForm] = useState({
    role: 'owner',
    eventType: '',
    eventDate: new Date().toISOString().slice(0, 10),
    product: '',
    customProduct: '',
    dosage: '',
    method: '',
    batchNumber: '',
    notes: '',
    photo: null,
    vetId: '',
    vetName: '',
    neighborName: '',
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [eventsRes, typesRes] = await Promise.all([
        api.shamba.listHealthEvents(animal.passportId),
        api.shamba.healthEventTypes(),
      ]);
      setEvents(eventsRes.events || []);
      if (typesRes.success) {
        setEventTypes(typesRes.eventTypes || []);
        setCommonProducts(typesRes.commonProducts || {});
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [animal.passportId]);

  const isVet = !!currentVet;
  const vetVerifiedCount = events.filter(e => e.tier === 'vet_verified').length;

  const handlePhoto = async (file) => {
    if (!file) return;
    try {
      const resized = await resizeImageFile(file, { maxDim: 800, quality: 0.6 });
      setForm(prev => ({ ...prev, photo: resized }));
    } catch (err) {
      setError('Photo processing failed: ' + err.message);
    }
  };

  const submitEvent = async () => {
    setError(null);
    if (!form.eventType) { setError('Choose an event type'); return; }

    let performedBy;
    if (form.role === 'owner') {
      performedBy = { role: 'owner', userId: currentFarmer?.id || currentFarmer?.phone, name: currentFarmer?.fullName || 'Owner' };
    } else if (form.role === 'vet') {
      if (!currentVet && !form.vetName) { setError('Vet name required'); return; }
      performedBy = {
        role: 'vet',
        userId: currentVet?.id || currentVet?.phone || form.vetId || null,
        name: currentVet?.fullName || form.vetName,
        kvbVerified: !!currentVet?.verified,
      };
    } else if (form.role === 'neighbor') {
      if (!form.neighborName) { setError('Neighbor name required'); return; }
      performedBy = { role: 'neighbor', name: form.neighborName };
    } else {
      performedBy = { role: 'extension_officer', name: form.neighborName || 'Extension officer' };
    }

    const product = form.product === '__other__' ? form.customProduct.trim() : form.product.trim();

    setSubmitting(true);
    try {
      const res = await api.shamba.recordHealthEvent(animal.passportId, {
        eventType: form.eventType,
        eventDate: form.eventDate,
        performedBy,
        product: product || null,
        dosage: form.dosage.trim() || null,
        method: form.method || null,
        batchNumber: form.batchNumber.trim() || null,
        notes: form.notes.trim() || null,
        photos: form.photo ? [form.photo] : [],
      });
      if (!res.success) throw new Error(res.message);
      // Reset form + back to timeline
      setForm({
        role: 'owner', eventType: '', eventDate: new Date().toISOString().slice(0, 10),
        product: '', customProduct: '', dosage: '', method: '', batchNumber: '',
        notes: '', photo: null, vetId: '', vetName: '', neighborName: '',
      });
      await load();
      if (onUpdated) onUpdated();
      setView('timeline');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const countersign = async (event) => {
    if (!isVet) return;
    if (!window.confirm(`Countersign this event as Dr. ${currentVet.fullName}? This upgrades it to Vet-verified.`)) return;
    try {
      const res = await api.shamba.countersignHealthEvent(animal.passportId, event.id, {
        vetId: currentVet.id || currentVet.phone,
        vetName: currentVet.fullName,
        kvbVerified: !!currentVet.verified,
      });
      if (!res.success) throw new Error(res.message);
      await load();
      if (onUpdated) onUpdated();
    } catch (err) {
      setError(err.message);
    }
  };

  const availableProducts = form.eventType ? (commonProducts[form.eventType] || []) : [];

  const fmtDate = (iso) => {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch { return iso.slice(0, 10); }
  };

  return (
    <div
      style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.7)', zIndex:2500, display:'flex', alignItems:'flex-end', justifyContent:'center' }}
      onClick={onClose}
    >
      <div
        style={{ background:'white', borderRadius:'20px 20px 0 0', padding:20, maxWidth:480, width:'100%', maxHeight:'92vh', overflowY:'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
          <div>
            <h3 style={{ margin:0, color:'#2E7D32', fontSize:18 }}>
              {view === 'timeline' ? '🩺 Health Record' : '➕ Add Health Event'}
            </h3>
            <p style={{ fontSize:11, color:'#666', margin:'2px 0 0' }}>
              {animal.passportId} · {animal.type} {animal.breed}
            </p>
          </div>
          {view === 'timeline' ? (
            <button onClick={onClose} style={{ background:'none', border:'none', fontSize:24, cursor:'pointer', color:'#666' }}>✕</button>
          ) : (
            <button onClick={() => setView('timeline')} style={{ background:'none', border:'none', fontSize:14, cursor:'pointer', color:'#2E7D32', fontWeight:'bold' }}>← Back</button>
          )}
        </div>

        {error && (
          <div style={{ background:'#FFEBEE', padding:12, borderRadius:10, marginBottom:12 }}>
            <strong style={{ color:'#C62828', fontSize:12 }}>⚠️ {error}</strong>
          </div>
        )}

        {/* TIMELINE VIEW */}
        {view === 'timeline' && (
          <>
            <div style={{ background:'#E8F5E9', border:'1px solid #A5D6A7', borderRadius:10, padding:12, marginBottom:14, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <p style={{ margin:0, fontSize:12, color:'#1B5E20', fontWeight:'bold' }}>
                  {events.length} event{events.length === 1 ? '' : 's'}
                </p>
                <p style={{ margin:'2px 0 0', fontSize:11, color:'#2E7D32' }}>
                  {vetVerifiedCount} vet-verified · {events.length - vetVerifiedCount} self/community
                </p>
              </div>
            </div>

            <button onClick={() => setView('add-event')} style={{ ...primaryBtn, background:'#2E7D32' }}>
              ➕ Add Health Event
            </button>

            {loading && (
              <div style={{ textAlign:'center', padding:30 }}>
                <div style={{ fontSize:24 }}>⏳</div>
                <p style={{ fontSize:11, color:'#666', marginTop:6 }}>Loading events...</p>
              </div>
            )}

            {!loading && events.length === 0 && (
              <div style={{ textAlign:'center', padding:'40px 20px', color:'#666' }}>
                <div style={{ fontSize:44, marginBottom:10 }}>🩺</div>
                <strong style={{ fontSize:14, color:'#333', display:'block', marginBottom:6 }}>No health events yet</strong>
                <p style={{ fontSize:12, lineHeight:1.5, margin:0 }}>
                  Record deworming, vaccinations, sprays, or any care — even if you did it yourself.
                  Documented animals fetch higher prices.
                </p>
              </div>
            )}

            {!loading && events.length > 0 && (
              <div style={{ marginTop:14 }}>
                {events.map(e => (
                  <EventCard key={e.id} event={e} isVet={isVet} onCountersign={() => countersign(e)} fmtDate={fmtDate} />
                ))}
              </div>
            )}

            <button onClick={onClose} style={ghostBtn}>Close</button>
          </>
        )}

        {/* ADD EVENT VIEW */}
        {view === 'add-event' && (
          <>
            <div style={{ background:'#E3F2FD', border:'1px solid #90CAF9', borderRadius:10, padding:10, marginBottom:12 }}>
              <p style={{ margin:0, fontSize:11, color:'#0D47A1', lineHeight:1.5 }}>
                💡 <strong>Report what actually happened.</strong> Self-reported events are trusted — a vet can countersign later to upgrade them.
              </p>
            </div>

            {/* Role toggle */}
            <label style={labelStyle}>Who did this?</label>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:6 }}>
              {ROLE_OPTIONS.map(r => {
                const active = form.role === r.id;
                // Only show vet option if we have a currentVet OR allow manual entry (for testing)
                const showVet = r.id !== 'vet' || isVet || true;
                if (!showVet) return null;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setForm({ ...form, role: r.id })}
                    style={{
                      padding:'10px 8px',
                      borderRadius:10,
                      border: active ? '2px solid #2E7D32' : '2px solid #E0E0E0',
                      background: active ? '#E8F5E9' : 'white',
                      color: active ? '#2E7D32' : '#666',
                      fontSize:11, fontWeight:'bold', cursor:'pointer',
                    }}
                  >
                    {r.icon} {r.label}
                  </button>
                );
              })}
            </div>

            {/* Vet name if 'vet' role and no currentVet */}
            {form.role === 'vet' && !currentVet && (
              <input
                value={form.vetName}
                onChange={e => setForm({ ...form, vetName: e.target.value })}
                placeholder="Vet name (e.g. Dr. Jane Wanjiku)"
                style={inputStyle}
              />
            )}

            {/* Neighbor name */}
            {(form.role === 'neighbor' || form.role === 'extension_officer') && (
              <input
                value={form.neighborName}
                onChange={e => setForm({ ...form, neighborName: e.target.value })}
                placeholder={form.role === 'neighbor' ? 'Neighbor name' : 'Extension officer name'}
                style={inputStyle}
              />
            )}

            {/* Event type grid */}
            <label style={labelStyle}>What happened? *</label>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:6, marginBottom:8 }}>
              {eventTypes.map(t => {
                const active = form.eventType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setForm({ ...form, eventType: t.id, product: '', customProduct: '' })}
                    style={{
                      padding:'10px 4px',
                      borderRadius:10,
                      border: active ? '2px solid #2E7D32' : '2px solid #E0E0E0',
                      background: active ? '#E8F5E9' : 'white',
                      color: active ? '#2E7D32' : '#666',
                      fontSize:10, fontWeight:'bold', cursor:'pointer',
                      display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                    }}
                  >
                    <span style={{ fontSize:20 }}>{t.icon}</span>
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Product picker */}
            {form.eventType && availableProducts.length > 0 && (
              <>
                <label style={labelStyle}>Product used</label>
                <select
                  value={form.product}
                  onChange={e => setForm({ ...form, product: e.target.value })}
                  style={{ ...inputStyle, background:'white' }}
                >
                  <option value="">— Select —</option>
                  {availableProducts.map(p => <option key={p} value={p}>{p}</option>)}
                  <option value="__other__">Other (type below)</option>
                </select>
                {form.product === '__other__' && (
                  <input
                    value={form.customProduct}
                    onChange={e => setForm({ ...form, customProduct: e.target.value })}
                    placeholder="Enter product name"
                    style={inputStyle}
                  />
                )}
              </>
            )}

            {/* Date */}
            <label style={labelStyle}>Date</label>
            <input
              type="date"
              value={form.eventDate}
              onChange={e => setForm({ ...form, eventDate: e.target.value })}
              style={inputStyle}
            />

            {/* Dosage + method */}
            <div style={{ display:'flex', gap:8 }}>
              <div style={{ flex:1 }}>
                <label style={labelStyle}>Dosage</label>
                <input
                  value={form.dosage}
                  onChange={e => setForm({ ...form, dosage: e.target.value })}
                  placeholder="e.g. 10ml"
                  style={inputStyle}
                />
              </div>
              <div style={{ flex:1 }}>
                <label style={labelStyle}>Method</label>
                <select
                  value={form.method}
                  onChange={e => setForm({ ...form, method: e.target.value })}
                  style={{ ...inputStyle, background:'white' }}
                >
                  {METHODS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
              </div>
            </div>

            {/* Batch (vaccination only) */}
            {form.eventType === 'vaccination' && (
              <>
                <label style={labelStyle}>Batch number</label>
                <input
                  value={form.batchNumber}
                  onChange={e => setForm({ ...form, batchNumber: e.target.value })}
                  placeholder="e.g. BATCH-2026-0142"
                  style={inputStyle}
                />
              </>
            )}

            {/* Notes */}
            <label style={labelStyle}>Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Any extra details..."
              rows={2}
              style={{ ...inputStyle, resize:'vertical', minHeight:56 }}
            />

            {/* Photo */}
            <label style={labelStyle}>Photo of packaging (optional)</label>
            <input
              type="file"
              accept="image/*"
              id="health-photo-input"
              onChange={e => { handlePhoto(e.target.files?.[0]); e.target.value = ''; }}
              style={{ display:'none' }}
            />
            {!form.photo ? (
              <button
                type="button"
                onClick={() => document.getElementById('health-photo-input').click()}
                style={{ width:'100%', padding:'10px', background:'white', border:'2px dashed #90CAF9', borderRadius:10, color:'#1565C0', fontSize:11, fontWeight:'bold', cursor:'pointer' }}
              >
                📷 Upload photo
              </button>
            ) : (
              <div>
                <img src={form.photo} alt="Event" style={{ width:'100%', maxHeight:120, objectFit:'cover', borderRadius:10 }} />
                <button onClick={() => setForm({ ...form, photo: null })} style={{ background:'none', border:'none', color:'#C62828', fontSize:11, cursor:'pointer', textDecoration:'underline', marginTop:4 }}>
                  Remove photo
                </button>
              </div>
            )}

            <button
              onClick={submitEvent}
              disabled={submitting || !form.eventType}
              style={{ ...primaryBtn, background: (submitting || !form.eventType) ? '#CCC' : '#2E7D32' }}
            >
              {submitting ? '⏳ Saving...' : '✓ Save Event'}
            </button>
            <button onClick={() => setView('timeline')} style={ghostBtn}>Cancel</button>
          </>
        )}
      </div>
    </div>
  );
}

function EventCard({ event, isVet, onCountersign, fmtDate }) {
  const meta = TIER_META[event.tier] || TIER_META.self_reported;
  const canCountersign = isVet && event.tier !== 'vet_verified';

  return (
    <div style={{ background:'white', border:`1px solid ${meta.border}`, borderRadius:12, padding:12, marginBottom:10 }}>
      {/* Header row */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10, marginBottom:6 }}>
        <div style={{ display:'flex', gap:10, alignItems:'flex-start', flex:1, minWidth:0 }}>
          <div style={{ fontSize:22, flexShrink:0 }}>{meta.icon}</div>
          <div style={{ minWidth:0 }}>
            <strong style={{ fontSize:13, color:'#333' }}>{event.eventTypeLabel || event.eventType}</strong>
            <p style={{ fontSize:11, color:'#666', margin:'2px 0 0' }}>
              {fmtDate(event.eventDate)} · by {event.performedBy?.name || event.performedBy?.role || 'unknown'}
            </p>
          </div>
        </div>
        <span style={{ fontSize:9, background:meta.bg, color:meta.fg, padding:'3px 8px', borderRadius:6, fontWeight:'bold', flexShrink:0, whiteSpace:'nowrap' }}>
          {meta.label}
        </span>
      </div>

      {/* Details */}
      {(event.product || event.dosage || event.method || event.batchNumber) && (
        <div style={{ fontSize:11, color:'#555', paddingTop:6, borderTop:'1px solid #F5F5F5', display:'flex', flexWrap:'wrap', gap:8 }}>
          {event.product && <span>💊 <strong>{event.product}</strong></span>}
          {event.dosage && <span>· {event.dosage}</span>}
          {event.method && <span>· {event.method.replace('_', '-')}</span>}
          {event.batchNumber && <span>· batch {event.batchNumber}</span>}
        </div>
      )}

      {event.notes && (
        <p style={{ fontSize:11, color:'#666', margin:'6px 0 0', fontStyle:'italic' }}>"{event.notes}"</p>
      )}

      {event.photos && event.photos.length > 0 && (
        <img src={event.photos[0]} alt="Event" style={{ width:'100%', maxHeight:140, objectFit:'cover', borderRadius:8, marginTop:8 }} />
      )}

      {event.verifiedBy && (
        <div style={{ background:'#E8F5E9', borderRadius:6, padding:'4px 8px', marginTop:8, display:'inline-block' }}>
          <span style={{ fontSize:10, color:'#2E7D32', fontWeight:'bold' }}>
            ✓ Countersigned by {event.verifiedBy.name || event.verifiedBy.role}
            {event.previousTier && event.previousTier !== event.tier && ` (was ${event.previousTier.replace('_', ' ')})`}
          </span>
        </div>
      )}

      {canCountersign && (
        <button
          onClick={onCountersign}
          style={{ marginTop:8, padding:'8px 14px', background:'white', border:'1px solid #2E7D32', color:'#2E7D32', borderRadius:8, fontSize:11, fontWeight:'bold', cursor:'pointer' }}
        >
          ✓ Countersign as vet
        </button>
      )}
    </div>
  );
}
