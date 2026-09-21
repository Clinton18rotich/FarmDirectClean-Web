import React, { useState } from 'react';

const inputStyle = { width:'100%', padding:'12px 14px', borderRadius:10, border:'2px solid #E0E0E0', fontSize:15, marginBottom:8, boxSizing:'border-box', fontFamily:'inherit', color:'#333', background:'white' };
const labelStyle = { fontSize:12, fontWeight:'bold', color:'#555', display:'block', marginBottom:4, marginTop:10 };

export default function PhysicalProfileForm({ value, onChange, constants, animalType = 'Cow' }) {
  const [openSection, setOpenSection] = useState('weight');

  const update = (field, val) => {
    onChange({ ...value, [field]: val });
  };

  const toggleSection = (id) => {
    setOpenSection(openSection === id ? null : id);
  };

  // Compute weight from girth + length
  const computedWeight = (() => {
    const g = parseFloat(value.heartGirth);
    const l = parseFloat(value.bodyLength);
    if (!g || !l || g < 30 || l < 30) return null;
    let divisor = 30000;
    if (['Goat', 'Sheep', 'Pig'].includes(animalType)) divisor = 40000;
    else if (!['Cow', 'Bull', 'Heifer', 'Camel', 'Donkey'].includes(animalType)) divisor = 35000;
    return Math.round((g * g * l) / divisor);
  })();

  // BCS description
  const bcsInfo = (() => {
    const s = parseInt(value.bodyConditionScore);
    if (!s) return null;
    return {
      1: { label: 'Emaciated', color: '#C62828', note: 'Severely underweight' },
      2: { label: 'Thin', color: '#FF9800', note: 'Underweight' },
      3: { label: 'Ideal', color: '#4CAF50', note: 'Perfect condition' },
      4: { label: 'Fat', color: '#FF9800', note: 'Slightly heavy' },
      5: { label: 'Obese', color: '#C62828', note: 'Overweight' },
    }[s];
  })();

  const sections = [
    { id: 'weight', icon: '📏', title: 'Size & Weight', hint: value.weight ? `${value.weight} kg` : computedWeight ? `${computedWeight} kg (estimated)` : null },
    { id: 'body', icon: '🍖', title: 'Body Condition', hint: value.bodyConditionScore ? `BCS ${value.bodyConditionScore}` : null },
    { id: 'skin', icon: '🎨', title: 'Skin & Coat', hint: value.coatCondition || null },
    { id: 'udder', icon: '🥛', title: 'Udder & Reproduction', hint: value.dailyMilkYield ? `${value.dailyMilkYield}L/day` : null, showWhen: animalType === 'Cow' && value.gender === 'Female' },
    { id: 'head', icon: '👤', title: 'Head & Features', hint: value.teethAge || null },
    { id: 'legs', icon: '🦵', title: 'Legs & Movement', hint: value.walking || null },
    { id: 'production', icon: '🎯', title: 'Purpose & Production', hint: value.purpose || null },
    { id: 'docs', icon: '📄', title: 'Documents', hint: value.vaccinationCard || null },
  ];

  const renderSelect = (field, options, placeholder = 'Select...') => (
    <select value={value[field] || ''} onChange={e => update(field, e.target.value)} style={inputStyle}>
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );

  const renderMultiSelect = (field, options) => {
    const current = value[field] || [];
    return (
      <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:8}}>
        {options.map(o => {
          const selected = current.includes(o);
          return (
            <button key={o} type="button" onClick={() => {
              update(field, selected ? current.filter(x => x !== o) : [...current, o]);
            }} style={{
              padding:'6px 12px',borderRadius:16,border:'none',
              background: selected ? '#4CAF50' : '#F0F0F0',
              color: selected ? 'white' : '#555',
              fontSize:12,cursor:'pointer',fontWeight:'bold',
            }}>{o}</button>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{background:'#F9FAFB',borderRadius:12,padding:12,marginBottom:12,border:'1px solid #E0E0E0'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
        <strong style={{fontSize:14,color:'#1B5E20'}}>📋 Physical Profile (optional)</strong>
        <span style={{fontSize:10,color:'#999'}}>Tap to expand</span>
      </div>

      <p style={{fontSize:11,color:'#666',margin:'0 0 12px 0',lineHeight:1.4}}>
        The more you fill in, the better the price you'll get. Buyers pay more for verified animals.
      </p>

      {sections.filter(s => s.showWhen !== false).map(section => {
        const isOpen = openSection === section.id;
        return (
          <div key={section.id} style={{marginBottom:6,borderRadius:10,background:'white',overflow:'hidden',border:'1px solid #E0E0E0'}}>
            <button
              type="button"
              onClick={() => toggleSection(section.id)}
              style={{
                width:'100%',padding:'12px 14px',border:'none',background:'white',
                display:'flex',justifyContent:'space-between',alignItems:'center',
                cursor:'pointer',textAlign:'left',fontFamily:'inherit',
              }}
            >
              <span style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:18}}>{section.icon}</span>
                <strong style={{fontSize:13,color:'#333'}}>{section.title}</strong>
              </span>
              <span style={{display:'flex',alignItems:'center',gap:6}}>
                {section.hint && <span style={{fontSize:10,color:'#4CAF50',fontWeight:'bold'}}>{section.hint}</span>}
                <span style={{color:'#999',fontSize:16}}>{isOpen ? '▾' : '▸'}</span>
              </span>
            </button>

            {isOpen && (
              <div style={{padding:'0 14px 14px 14px',borderTop:'1px solid #F0F0F0'}}>
                {section.id === 'weight' && (
                  <>
                    <div style={{background:'#E3F2FD',padding:10,borderRadius:8,marginTop:10,fontSize:11,color:'#1565C0'}}>
                      💡 <strong>Have a scale?</strong> Enter weight directly. <strong>No scale?</strong> Use the tape formula below.
                    </div>

                    <label style={labelStyle}>Weight (kg) — if you have a scale</label>
                    <input
                      type="number"
                      value={value.weight || ''}
                      onChange={e => update('weight', e.target.value)}
                      placeholder="e.g. 400"
                      style={inputStyle}
                    />

                    <div style={{borderTop:'1px dashed #E0E0E0',margin:'12px 0',paddingTop:12}}>
                      <strong style={{fontSize:12,color:'#333'}}>📐 Or use the tape formula:</strong>
                      <p style={{fontSize:11,color:'#666',margin:'4px 0 8px'}}>
                        Measure the animal with a tape. Enter the two numbers below.
                      </p>
                    </div>

                    <label style={labelStyle}>Heart Girth (cm)</label>
                    <input
                      type="number"
                      value={value.heartGirth || ''}
                      onChange={e => update('heartGirth', e.target.value)}
                      placeholder="e.g. 180"
                      style={inputStyle}
                    />

                    <label style={labelStyle}>Body Length (cm)</label>
                    <input
                      type="number"
                      value={value.bodyLength || ''}
                      onChange={e => update('bodyLength', e.target.value)}
                      placeholder="e.g. 140"
                      style={inputStyle}
                    />

                    <label style={labelStyle}>Height at Withers (cm, optional)</label>
                    <input
                      type="number"
                      value={value.heightAtWithers || ''}
                      onChange={e => update('heightAtWithers', e.target.value)}
                      placeholder="e.g. 145"
                      style={inputStyle}
                    />

                    {computedWeight && (
                      <div style={{background:'#E8F5E9',padding:12,borderRadius:10,marginTop:8,border:'1px solid #A5D6A7'}}>
                        <strong style={{fontSize:13,color:'#2E7D32'}}>
                          ✓ Estimated weight: {computedWeight} kg
                        </strong>
                        <p style={{fontSize:10,color:'#666',margin:'4px 0 0'}}>
                          Formula: ({value.heartGirth} × {value.heartGirth} × {value.bodyLength}) ÷ {['Goat','Sheep','Pig'].includes(animalType) ? '40,000' : '30,000'}
                        </p>
                      </div>
                    )}

                    <div style={{background:'#FFF8E1',padding:10,borderRadius:8,marginTop:10,fontSize:11,color:'#E65100'}}>
                      📖 <strong>Need help measuring?</strong> Tap the guide button at the top of the form.
                    </div>
                  </>
                )}

                {section.id === 'body' && (
                  <>
                    <label style={labelStyle}>Body Condition Score (BCS 1-5)</label>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(5, 1fr)',gap:6,marginBottom:8}}>
                      {[1,2,3,4,5].map(s => {
                        const selected = parseInt(value.bodyConditionScore) === s;
                        const colors = {1:'#C62828',2:'#FF9800',3:'#4CAF50',4:'#FF9800',5:'#C62828'};
                        return (
                          <button key={s} type="button" onClick={() => update('bodyConditionScore', s)} style={{
                            padding:'12px 4px',borderRadius:10,border:'none',
                            background: selected ? colors[s] : '#F0F0F0',
                            color: selected ? 'white' : '#555',
                            fontSize:16,fontWeight:'bold',cursor:'pointer',
                          }}>{s}</button>
                        );
                      })}
                    </div>
                    {bcsInfo && (
                      <div style={{background:'white',padding:10,borderRadius:8,border:'1px solid #E0E0E0'}}>
                        <strong style={{fontSize:12,color:bcsInfo.color}}>{bcsInfo.label}</strong>
                        <p style={{fontSize:11,color:'#666',margin:'2px 0 0'}}>{bcsInfo.note}</p>
                      </div>
                    )}

                    <label style={labelStyle}>Muscle Condition</label>
                    {renderSelect('muscleCondition', constants?.muscleCondition?.options || ['Poor','Fair','Good','Excellent'])}

                    <label style={labelStyle}>Fat Cover</label>
                    {renderSelect('fatCover', constants?.fatCover?.options || ['Visible bones','Normal','Fat'])}
                  </>
                )}

                {section.id === 'skin' && (
                  <>
                    <label style={labelStyle}>Coat Condition</label>
                    {renderSelect('coatCondition', constants?.coatCondition?.options || [])}

                    <label style={labelStyle}>Skin Condition</label>
                    {renderSelect('skinCondition', constants?.skinCondition?.options || [])}

                    <label style={labelStyle}>Skin Problems (select all that apply)</label>
                    {renderMultiSelect('skinProblems', constants?.skinProblems?.options || ['None','Ticks','Mange','Ringworm','Wounds'])}

                    <label style={labelStyle}>Coat Color Pattern</label>
                    {renderSelect('coatColorPattern', constants?.coatColorPattern?.options || [])}
                  </>
                )}

                {section.id === 'udder' && (
                  <>
                    <label style={labelStyle}>Udder Size</label>
                    {renderSelect('udderSize', constants?.udderSize?.options || [])}

                    <label style={labelStyle}>Udder Shape</label>
                    {renderSelect('udderShape', constants?.udderShape?.options || [])}

                    <label style={labelStyle}>Teat Condition</label>
                    {renderSelect('teatCondition', constants?.teatCondition?.options || [])}

                    <label style={labelStyle}>Milk Veins</label>
                    {renderSelect('milkVeins', constants?.milkVeins?.options || [])}

                    <label style={labelStyle}>Lactation Status</label>
                    {renderSelect('lactationStatus', constants?.lactationStatus?.options || [])}

                    <label style={labelStyle}>Daily Milk Yield (L/day)</label>
                    <input type="number" step="0.1" value={value.dailyMilkYield || ''} onChange={e => update('dailyMilkYield', e.target.value)} placeholder="e.g. 22" style={inputStyle} />

                    <label style={labelStyle}>Pregnancy Status</label>
                    {renderSelect('pregnancyStatus', constants?.pregnancyStatus?.options || [])}

                    {value.pregnancyStatus === 'Pregnant' && (
                      <>
                        <label style={labelStyle}>Pregnancy (months)</label>
                        <input type="number" value={value.pregnancyMonths || ''} onChange={e => update('pregnancyMonths', e.target.value)} placeholder="e.g. 4" style={inputStyle} />
                      </>
                    )}

                    <label style={labelStyle}>Calving History (number of calves)</label>
                    <input type="number" value={value.calvingHistory || ''} onChange={e => update('calvingHistory', e.target.value)} placeholder="e.g. 2" style={inputStyle} />

                    <label style={labelStyle}>Last Calving Date</label>
                    <input type="date" value={value.lastCalvingDate || ''} onChange={e => update('lastCalvingDate', e.target.value)} style={inputStyle} />
                  </>
                )}

                {section.id === 'head' && (
                  <>
                    <label style={labelStyle}>Horns</label>
                    {renderSelect('horns', constants?.horns?.options || [])}

                    <label style={labelStyle}>Eyes</label>
                    {renderSelect('eyes', constants?.eyes?.options || [])}

                    <label style={labelStyle}>Teeth / Age Indicator</label>
                    {renderSelect('teethAge', constants?.teethAge?.options || [])}

                    <label style={labelStyle}>Ears</label>
                    {renderSelect('ears', constants?.ears?.options || [])}

                    <label style={labelStyle}>Muzzle</label>
                    {renderSelect('muzzle', constants?.muzzle?.options || [])}
                  </>
                )}

                {section.id === 'legs' && (
                  <>
                    <label style={labelStyle}>Hooves</label>
                    {renderSelect('hooves', constants?.hooves?.options || [])}

                    <label style={labelStyle}>Legs</label>
                    {renderSelect('legs', constants?.legs?.options || [])}

                    <label style={labelStyle}>Walking</label>
                    {renderSelect('walking', constants?.walking?.options || [])}

                    <label style={labelStyle}>Joint Swelling</label>
                    {renderSelect('jointSwelling', constants?.jointSwelling?.options || [])}
                  </>
                )}

                {section.id === 'production' && (
                  <>
                    <label style={labelStyle}>Purpose</label>
                    {renderSelect('purpose', constants?.purpose?.options || [])}

                    <label style={labelStyle}>Breed Purity</label>
                    {renderSelect('breedPurity', constants?.breedPurity?.options || [])}

                    <label style={labelStyle}>Sire Information</label>
                    {renderSelect('sireInfo', constants?.sireInfo?.options || [])}

                    <label style={labelStyle}>Dam Passport (optional)</label>
                    <input type="text" value={value.damInfo || ''} onChange={e => update('damInfo', e.target.value.toUpperCase())} placeholder="e.g. KE-COW-ABC123" style={{...inputStyle,fontFamily:'monospace'}} />

                    <label style={labelStyle}>Feed Regime</label>
                    {renderSelect('feedRegime', constants?.feedRegime?.options || [])}
                  </>
                )}

                {section.id === 'docs' && (
                  <>
                    <label style={labelStyle}>Vaccination Card</label>
                    {renderSelect('vaccinationCard', constants?.vaccinationCard?.options || [])}

                    <label style={labelStyle}>Vet Certificate</label>
                    {renderSelect('vetCertificate', constants?.vetCertificate?.options || [])}

                    <label style={labelStyle}>Movement Permit</label>
                    {renderSelect('movementPermit', constants?.movementPermit?.options || [])}

                    <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',marginTop:12,fontSize:13}}>
                      <input type="checkbox" checked={value.brandMark || false} onChange={e => update('brandMark', e.target.checked)} style={{width:18,height:18}} />
                      Animal has brand mark
                    </label>

                    <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',marginTop:8,fontSize:13}}>
                      <input type="checkbox" checked={value.earTag || false} onChange={e => update('earTag', e.target.checked)} style={{width:18,height:18}} />
                      Animal has ear tag
                    </label>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
