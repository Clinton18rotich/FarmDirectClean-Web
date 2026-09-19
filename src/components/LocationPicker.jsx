import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function LocationPicker({ value, onChange, required = true, label = 'Delivery Location' }) {
  const [useManual, setUseManual] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const [counties, setCounties] = useState([]);
  const [constituencies, setConstituencies] = useState([]);
  const [wards, setWards] = useState([]);
  const [localities, setLocalities] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [county, setCounty] = useState(value?.county || '');
  const [constituency, setConstituency] = useState(value?.constituency || '');
  const [ward, setWard] = useState(value?.ward || '');
  const [locality, setLocality] = useState(value?.locality || '');
  const [area, setArea] = useState(value?.area || '');
  const [manual, setManual] = useState(value?.manual || '');

  useEffect(() => {
    console.log('📍 LocationPicker: loading counties...');
    api.location.counties()
      .then(r => {
        console.log('📍 Counties response:', r);
        if (r.success) {
          setCounties(r.counties || []);
        } else {
          setError(r.message || 'Failed to load counties');
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('❌ Counties error:', err);
        setError('Cannot reach backend. Is it running?');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!county) { setConstituencies([]); setLocalities([]); return; }
    api.location.constituencies(county).then(r => setConstituencies(r.constituencies || [])).catch(()=>{});
    api.location.localities(county).then(r => setLocalities(r.localities || [])).catch(()=>{});
  }, [county]);

  useEffect(() => {
    if (!county) { setWards([]); return; }
    api.location.wards(county, constituency).then(r => setWards(r.wards || [])).catch(()=>{});
  }, [county, constituency]);

  useEffect(() => {
    if (!county) { setAreas([]); return; }
    api.location.areas(county, locality).then(r => setAreas(r.areas || [])).catch(()=>{});
  }, [county, locality]);

  const update = (patch) => {
    onChange({ county, constituency, ward, locality, area, manual, useManual, ...patch });
  };

  const summary = useManual ? manual : [area, locality, ward, constituency, county].filter(Boolean).join(', ');
  const isComplete = useManual ? manual.length > 3 : !!county;

  useEffect(() => {
    if (searchText.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const t = setTimeout(() => {
      api.location.search(searchText, 15).then(r => {
        setSearchResults(r.results || []);
        setSearching(false);
      }).catch(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [searchText]);

  const pickResult = (r) => {
    if (r.type === 'county') {
      setCounty(r.name);
      update({ county: r.name });
    } else if (r.type === 'constituency') {
      setCounty(r.county); setConstituency(r.name);
      update({ county: r.county, constituency: r.name });
    } else if (r.type === 'ward') {
      setCounty(r.county); setConstituency(r.constituency); setWard(r.name);
      update({ county: r.county, constituency: r.constituency, ward: r.name });
    } else if (r.type === 'locality') {
      setCounty(r.county); setLocality(r.name);
      update({ county: r.county, locality: r.name });
    } else if (r.type === 'area') {
      setCounty(r.county); setLocality(r.locality); setArea(r.name);
      update({ county: r.county, locality: r.locality, area: r.name });
    }
    setSearchResults([]); setSearchText(''); setShowSearch(false);
  };

  const typeLabel = (type) => ({
    county: 'County', subCounty: 'Sub-County', constituency: 'Constituency',
    ward: 'Ward', locality: 'Locality', area: 'Village'
  }[type] || type);

  const typeColor = (type) => ({
    county: '#0D47A1', subCounty: '#1976D2', constituency: '#7B1FA2',
    ward: '#C2185B', locality: '#00796B', area: '#E65100'
  }[type] || '#666');

  if (loading) return (
    <div style={{ background: '#F9FAFB', borderRadius: 12, padding: 20, marginBottom: 16, textAlign: 'center' }}>
      <p style={{ fontSize: 15, color: '#666', margin: 0 }}>📍 Loading locations...</p>
    </div>
  );

  if (error) return (
    <div style={{ background: '#FFEBEE', borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <p style={{ fontSize: 14, color: '#C62828', margin: 0 }}>⚠️ {error}</p>
      <p style={{ fontSize: 11, color: '#666', margin: '6px 0 0' }}>
        Backend should be at http://localhost:3001
      </p>
    </div>
  );

  return (
    <div style={{ background: 'white', borderRadius: 14, padding: 16, marginBottom: 16, border: '1px solid #E0E0E0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <strong style={{ fontSize: 16, color: '#1B5E20' }}>
          📍 {label} {required && <span style={{ color: '#C62828' }}>*</span>}
        </strong>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setShowSearch(!showSearch)} style={{
            background: showSearch ? '#4CAF50' : 'white',
            color: showSearch ? 'white' : '#4CAF50',
            border: '1px solid #4CAF50', borderRadius: 8,
            padding: '8px 12px', fontSize: 16, cursor: 'pointer',
            minWidth: 44, minHeight: 40
          }}>{showSearch ? '✕' : '🔍'}</button>
          <button onClick={() => { setUseManual(!useManual); update({ useManual: !useManual }); }} style={{
            background: useManual ? '#4CAF50' : 'white',
            color: useManual ? 'white' : '#4CAF50',
            border: '1px solid #4CAF50', borderRadius: 8,
            padding: '8px 12px', fontSize: 16, cursor: 'pointer',
            minWidth: 44, minHeight: 40
          }}>{useManual ? '📋' : '✍️'}</button>
        </div>
      </div>

      {showSearch && !useManual && (
        <>
          <input
            autoFocus
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            placeholder="Search village, estate, market..."
            style={inputStyle}
          />
          {searching && <p style={{ fontSize: 12, color: '#999', margin: '4px 0' }}>Searching...</p>}
          {searchResults.length > 0 && (
            <div style={{ background: 'white', borderRadius: 10, border: '1px solid #E0E0E0', maxHeight: 240, overflowY: 'auto', marginBottom: 12 }}>
              {searchResults.map((r, i) => (
                <div key={i} onClick={() => pickResult(r)} style={{ padding: '12px 14px', borderBottom: '1px solid #F0F0F0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ background: typeColor(r.type), color: 'white', padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 'bold', flexShrink: 0 }}>
                    {typeLabel(r.type)}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 'bold', color: '#333' }}>{r.name}</div>
                    {r.county && <div style={{ fontSize: 11, color: '#666' }}>{r.county}{r.constituency ? ` • ${r.constituency}` : ''}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {useManual ? (
        <textarea
          value={manual}
          onChange={e => { setManual(e.target.value); update({ manual: e.target.value }); }}
          placeholder="Type your full address, e.g. Kihoto Village, Naivasha, Nakuru"
          rows={3}
          style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
        />
      ) : (
        <>
          <select value={county} onChange={e => { const v = e.target.value; setCounty(v); setConstituency(''); setWard(''); setLocality(''); setArea(''); update({ county: v, constituency: '', ward: '', locality: '', area: '' }); }} style={selectStyle}>
            <option value="">Select County</option>
            {counties.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}
          </select>

          {county && constituencies.length > 0 && (
            <select value={constituency} onChange={e => { const v = e.target.value; setConstituency(v); setWard(''); update({ constituency: v, ward: '' }); }} style={selectStyle}>
              <option value="">Select Constituency</option>
              {constituencies.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}
            </select>
          )}

          {constituency && wards.length > 0 && (
            <select value={ward} onChange={e => { const v = e.target.value; setWard(v); update({ ward: v }); }} style={selectStyle}>
              <option value="">Select Ward</option>
              {wards.map(w => <option key={w.code} value={w.name}>{w.name}</option>)}
            </select>
          )}

          {county && localities.length > 0 && (
            <select value={locality} onChange={e => { const v = e.target.value; setLocality(v); setArea(''); update({ locality: v, area: '' }); }} style={selectStyle}>
              <option value="">Select Locality</option>
              {localities.map((l, i) => <option key={l.name + i} value={l.name}>{l.name}</option>)}
            </select>
          )}

          {locality && areas.length > 0 && (
            <select value={area} onChange={e => { const v = e.target.value; setArea(v); update({ area: v }); }} style={selectStyle}>
              <option value="">Select Village / Area</option>
              {areas.map((a, i) => <option key={a.name + i} value={a.name}>{a.name}</option>)}
            </select>
          )}
        </>
      )}

      {isComplete && summary && (
        <div style={{ background: '#E8F5E9', borderRadius: 10, padding: 12, marginTop: 10, color: '#2E7D32', display: 'flex', alignItems: 'center', gap: 10, border: '1px solid #A5D6A7' }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>✓</span>
          <span style={{ fontSize: 13, lineHeight: 1.4 }}>{summary}</span>
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '14px 16px', borderRadius: 10,
  border: '2px solid #E0E0E0', fontSize: 16, marginBottom: 10,
  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  color: '#333', background: 'white',
};

const selectStyle = {
  width: '100%', padding: '14px 16px', borderRadius: 10,
  border: '2px solid #E0E0E0', fontSize: 16, marginBottom: 10,
  background: 'white', boxSizing: 'border-box', fontFamily: 'inherit',
  color: '#333', cursor: 'pointer', appearance: 'none',
  backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3e%3cpath d='M6 9l6 6 6-6'/%3e%3c/svg%3e")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
  backgroundSize: '20px',
  paddingRight: 40,
};
