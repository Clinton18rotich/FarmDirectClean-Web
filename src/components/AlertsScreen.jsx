import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [readIds, setReadIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('readAlerts') || '[]'); } catch (e) { return []; }
  });

  useEffect(() => { loadAlerts(); }, []);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const [theft, deliveries, slaughterReqs, meatHandlers, deaths, homeSlaughters, smsLog, farmers, riders] =
        await Promise.all([
          api.shamba.listTheftAlerts().catch(() => ({ alerts: [] })),
          api.listDeliveries ? api.listDeliveries().catch(() => ({ deliveries: [] })) : Promise.resolve({ deliveries: [] }),
          api.slaughterhouse.listSlaughterRequests().catch(() => ({ requests: [] })),
          api.meatHandler.list().catch(() => ({ handlers: [] })),
          api.shamba.listDeaths().catch(() => ({ deaths: [] })),
          api.shamba.listHomeSlaughters().catch(() => ({ slaughters: [] })),
          fetch(`${API_BASE}/api/webhook/sms-log`).then(r => r.json()).catch(() => ({ messages: [] })),
          api.listFarmers ? api.listFarmers().catch(() => ({ farmers: [] })) : Promise.resolve({ farmers: [] }),
          api.listRiders ? api.listRiders().catch(() => ({ riders: [] })) : Promise.resolve({ riders: [] }),
        ]);

      const all = [
        ...(theft.alerts || []).map(alertFromTheft),
        ...(deliveries.deliveries || []).map(alertFromDelivery),
        ...(slaughterReqs.requests || []).map(alertFromSlaughterRequest),
        ...(deaths.deaths || []).map(alertFromDeath),
        ...(homeSlaughters.slaughters || []).map(alertFromHomeSlaughter),
        ...(smsLog.messages || []).slice(0, 20).map(alertFromSMS),
        ...(farmers.farmers || []).map(alertFromFarmer),
        ...(riders.riders || []).map(alertFromRider),
      ]
        .filter(Boolean)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setAlerts(all);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  const markRead = (id) => {
    const next = [...new Set([...readIds, id])];
    setReadIds(next);
    localStorage.setItem('readAlerts', JSON.stringify(next));
  };

  const markAllRead = () => {
    const next = [...new Set([...readIds, ...alerts.map(a => a.id)])];
    setReadIds(next);
    localStorage.setItem('readAlerts', JSON.stringify(next));
  };

  const toggleExpand = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    markRead(id);
  };

  const filtered = alerts.filter(a => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !readIds.includes(a.id);
    if (filter === 'critical') return a.severity === 'critical';
    return a.category === filter;
  });

  const unreadCount = alerts.filter(a => !readIds.includes(a.id)).length;

  const categories = [
    { id: 'all', label: 'All', count: alerts.length },
    { id: 'unread', label: 'Unread', count: unreadCount },
    { id: 'theft', label: 'Theft', count: alerts.filter(a => a.category === 'theft').length },
    { id: 'delivery', label: 'Delivery', count: alerts.filter(a => a.category === 'delivery').length },
    { id: 'meat', label: 'Meat', count: alerts.filter(a => a.category === 'meat').length },
    { id: 'death', label: 'Death', count: alerts.filter(a => a.category === 'death').length },
    { id: 'registration', label: 'New Users', count: alerts.filter(a => a.category === 'registration').length },
    { id: 'system', label: 'System', count: alerts.filter(a => a.category === 'system').length },
  ];

  return (
    <div style={{paddingBottom:70}}>
      <div style={{background:'#4CAF50',padding:16,color:'white'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <h3 style={{margin:0}}>🔔 Alerts</h3>
            <p style={{fontSize:11,opacity:.8,margin:'4px 0 0'}}>
              {alerts.length} total • {unreadCount} unread
            </p>
          </div>
          <div style={{display:'flex',gap:6}}>
            <button onClick={loadAlerts} style={{background:'rgba(255,255,255,0.2)',color:'white',border:'none',padding:'6px 12px',borderRadius:16,fontSize:11,cursor:'pointer'}}>
              🔄 Refresh
            </button>
            {unreadCount > 0 && (
              <button onClick={markAllRead} style={{background:'rgba(255,255,255,0.2)',color:'white',border:'none',padding:'6px 12px',borderRadius:16,fontSize:11,cursor:'pointer'}}>
                ✅ Mark All Read
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{display:'flex',gap:6,padding:12,overflowX:'auto',borderBottom:'1px solid #eee'}}>
        {categories.filter(c => c.count > 0 || c.id === 'all').map(c => (
          <button key={c.id} onClick={() => setFilter(c.id)} style={{
            padding:'6px 12px',borderRadius:16,border:'none',
            background: filter === c.id ? '#4CAF50' : '#F0F0F0',
            color: filter === c.id ? 'white' : '#555',
            fontSize:11,cursor:'pointer',whiteSpace:'nowrap',fontWeight:'bold',
          }}>
            {c.label} {c.count > 0 && `(${c.count})`}
          </button>
        ))}
      </div>

      {loading && <p style={{textAlign:'center',color:'#999',padding:20,fontSize:13}}>Loading alerts...</p>}

      {!loading && filtered.length === 0 && (
        <div style={{textAlign:'center',padding:60}}>
          <span style={{fontSize:60}}>🔕</span>
          <h4 style={{color:'#666',marginTop:12}}>No alerts</h4>
          <p style={{fontSize:12,color:'#999'}}>
            {filter === 'all' ? 'Nothing to show yet' : `No ${filter} alerts`}
          </p>
        </div>
      )}

      <div style={{padding:12}}>
        {filtered.map(a => {
          const isUnread = !readIds.includes(a.id);
          const isExpanded = expanded[a.id];
          const severityColor = {
            critical: '#C62828',
            high: '#E65100',
            medium: '#F9A825',
            info: '#1565C0',
          }[a.severity] || '#666';

          return (
            <div key={a.id} onClick={() => toggleExpand(a.id)} style={{
              background: isUnread ? '#FFFDE7' : 'white',
              borderRadius:12,padding:14,marginBottom:8,
              border:'1px solid #E0E0E0',
              borderLeft: `4px solid ${severityColor}`,
              cursor:'pointer',
              boxShadow: isUnread ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
            }}>
              <div style={{display:'flex',gap:10,alignItems:'flex-start'}}>
                <span style={{fontSize:28,flexShrink:0}}>{a.icon}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:6}}>
                    <strong style={{fontSize:13,color:'#333'}}>{a.title}</strong>
                    {isUnread && <span style={{background:'#F44336',color:'white',borderRadius:'50%',width:8,height:8,flexShrink:0}} />}
                  </div>
                  <p style={{fontSize:12,color:'#666',margin:'4px 0 0',lineHeight:1.4}}>{a.body}</p>
                  <p style={{fontSize:10,color:'#999',margin:'6px 0 0'}}>{formatTime(a.createdAt)}</p>

                  {isExpanded && a.details && (
                    <div style={{marginTop:10,paddingTop:10,borderTop:'1px solid #eee'}}>
                      {a.details.map((d, i) => (
                        <p key={i} style={{fontSize:11,margin:'3px 0',color:'#555'}}>
                          <strong>{d.label}:</strong> {d.value}
                        </p>
                      ))}
                      {a.actions && a.actions.length > 0 && (
                        <div style={{display:'flex',gap:6,marginTop:10,flexWrap:'wrap'}}>
                          {a.actions.map((act, i) => (
                            <button key={i} onClick={(e) => { e.stopPropagation(); if (act.onClick) act.onClick(); }} style={{
                              padding:'6px 12px',borderRadius:8,border:'1px solid #4CAF50',
                              background:'white',color:'#4CAF50',fontSize:11,cursor:'pointer',fontWeight:'bold'
                            }}>{act.label}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Alert Builders
// ═══════════════════════════════════════════════════

function alertFromTheft(entry) {
  return {
    id: `theft-${entry.theftId}`,
    category: 'theft',
    severity: 'critical',
    icon: '🚨',
    title: `${entry.animalType} stolen in ${entry.county}`,
    body: `${entry.passportId} reported stolen by ${entry.ownerName}`,
    createdAt: entry.reportedAt,
    details: [
      { label: 'Animal', value: `${entry.animalType} • ${entry.animalBreed}` },
      { label: 'Passport', value: entry.passportId },
      { label: 'Owner', value: `${entry.ownerName} (${entry.ownerPhone})` },
      { label: 'Location', value: `${entry.ward}, ${entry.county}` },
      { label: 'Alerts sent', value: `${entry.totalAlerts} (${entry.summary.slaughterhouses} slaughterhouses, ${entry.summary.butcheries} butcheries, ${entry.summary.community} farmers, ${entry.summary.police} police)` },
    ],
  };
}

function alertFromDelivery(d) {
  const status = d.status || 'PENDING';
  const icons = {
    PENDING: '📦', OFFERING: '📨', ASSIGNED: '🏍️', PICKING_UP: '📦',
    IN_TRANSIT: '🚚', DELIVERED: '✅', COMPLETED: '🎉', FAILED: '❌', CANCELLED: '🚫',
  };
  const titles = {
    PENDING: `New delivery — ${d.pickup?.county || 'unknown'} → ${d.dropoff?.county || 'unknown'}`,
    OFFERING: `Delivery offer sent to rider`,
    ASSIGNED: `Rider assigned for ${d.id}`,
    IN_TRANSIT: `Delivery in transit — ${d.id}`,
    DELIVERED: `Delivered — ${d.id}`,
    COMPLETED: `Delivery completed — ${d.id}`,
    FAILED: `Delivery failed — ${d.id}`,
  };
  return {
    id: `delivery-${d.id}-${status}`,
    category: 'delivery',
    severity: status === 'FAILED' ? 'high' : 'info',
    icon: icons[status] || '📦',
    title: titles[status] || `Delivery ${status}`,
    body: `${d.id} — ${d.buyerName || 'Buyer'} → ${d.farmerName || 'Farmer'}`,
    createdAt: d.assignedAt || d.createdAt,
    details: [
      { label: 'Order', value: d.id },
      { label: 'From', value: d.farmerName || 'Unknown' },
      { label: 'To', value: d.buyerName || 'Unknown' },
      { label: 'Weight', value: d.weight || 'N/A' },
      { label: 'Fee', value: `KES ${d.deliveryFee || 0}` },
    ],
  };
}

function alertFromSlaughterRequest(r) {
  return {
    id: `slaughter-${r.id}`,
    category: 'meat',
    severity: r.status === 'pending_approval' ? 'high' : 'info',
    icon: r.status === 'pending_approval' ? '⏳' : r.status === 'completed' ? '✅' : '🏭',
    title: `Slaughter ${r.status.replace('_', ' ')} — ${r.id}`,
    body: `${r.slaughterhouseName} → ${r.animalType} (${r.animalPassport})`,
    createdAt: r.approvedAt || r.completedAt || r.requestedAt,
    details: [
      { label: 'Facility', value: r.slaughterhouseName },
      { label: 'Animal', value: `${r.animalType} • ${r.animalBreed}` },
      { label: 'Owner', value: r.ownerName },
      { label: 'Approval code', value: r.approvalCode },
      { label: 'Meat tokens', value: (r.meatTokens || []).length },
    ],
  };
}

function alertFromDeath(d) {
  return {
    id: `death-${d.passportId}`,
    category: 'death',
    severity: d.deathRecord?.cause === 'illness' ? 'high' : 'medium',
    icon: '🕯️',
    title: `${d.type} died — ${d.passportId}`,
    body: `Cause: ${d.deathRecord?.causeLabel || 'Unknown'} in ${d.location?.county || 'unknown'}`,
    createdAt: d.deathRecord?.deathDate,
    details: [
      { label: 'Animal', value: `${d.type} • ${d.breed}` },
      { label: 'Owner', value: d.ownerName },
      { label: 'Cause', value: d.deathRecord?.causeLabel },
      { label: 'Disease', value: d.deathRecord?.diseaseType || 'N/A' },
      { label: 'Disposal', value: d.deathRecord?.disposalMethod || 'N/A' },
    ],
  };
}

function alertFromHomeSlaughter(s) {
  return {
    id: `home-${s.passportId}`,
    category: 'meat',
    severity: 'info',
    icon: '🏠',
    title: `Home slaughter — ${s.homeSlaughter?.ceremonyLabel}`,
    body: `${s.type} (${s.passportId}) for ${s.homeSlaughter?.ceremonyLabel}`,
    createdAt: s.homeSlaughter?.ceremonyDate,
    details: [
      { label: 'Animal', value: `${s.type} • ${s.breed}` },
      { label: 'Ceremony', value: s.homeSlaughter?.ceremonyLabel },
      { label: 'Guests', value: s.homeSlaughter?.numberOfGuests || 'N/A' },
      { label: 'Owner', value: s.ownerName },
    ],
  };
}

function alertFromSMS(m) {
  const isPolice = m.to === '999' || m.alertType === 'theft-police';
  return {
    id: `sms-${m.id}`,
    category: m.alertType === 'theft' || m.alertType === 'theft-police' ? 'theft' : 'system',
    severity: isPolice ? 'critical' : 'info',
    icon: isPolice ? '🚓' : '📱',
    title: isPolice ? `Police alerted — ${m.county || 'unknown'}` : `SMS sent to ${m.to}`,
    body: (m.message || '').substring(0, 100) + ((m.message || '').length > 100 ? '...' : ''),
    createdAt: m.sentAt,
    details: [
      { label: 'To', value: m.to },
      { label: 'Status', value: m.status },
      { label: 'Type', value: m.alertType || 'general' },
    ],
  };
}

function alertFromFarmer(f) {
  return {
    id: `farmer-${f.id}`,
    category: 'registration',
    severity: 'info',
    icon: '👨‍🌾',
    title: `New farmer — ${f.fullName}`,
    body: `Registered from ${f.location?.county || 'unknown'} • ${(f.products || []).length} products`,
    createdAt: f.registeredAt,
    details: [
      { label: 'Name', value: f.fullName },
      { label: 'Phone', value: f.phone },
      { label: 'Location', value: `${f.location?.county || 'unknown'}` },
      { label: 'Products', value: (f.products || []).length },
      { label: 'Payment', value: f.payment?.method || 'unknown' },
    ],
  };
}

function alertFromRider(r) {
  return {
    id: `rider-${r.id}`,
    category: 'registration',
    severity: 'info',
    icon: '🏍️',
    title: `New rider — ${r.rider?.fullName}`,
    body: `${r.vehicle?.type || 'Vehicle'} in ${r.location?.county || 'unknown'}`,
    createdAt: r.registeredAt,
    details: [
      { label: 'Name', value: r.rider?.fullName },
      { label: 'Phone', value: r.rider?.phone },
      { label: 'Vehicle', value: r.vehicle?.type },
      { label: 'Location', value: r.location?.county },
      { label: 'Price', value: `KES ${r.pricePerDelivery}` },
    ],
  };
}

function formatTime(iso) {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
