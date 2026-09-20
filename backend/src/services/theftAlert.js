/**
 * Theft Alert System
 * Broadcasts theft alerts to slaughterhouses, butcheries, farmers, police
 */

const sms = require('./sms');
const storage = require('./storage');

// Store alert history per animal
const alertHistory = storage.objectToMap(storage.load('theft_alerts', {}));

// Police stations by county (placeholder — will be filled with real data)
const POLICE_BY_COUNTY = {
  'Nairobi': '999',
  'Nakuru': '999',
  'Bomet': '999',
  'Kisumu': '999',
  'Mombasa': '999',
  'Uasin Gishu': '999',
  'Kiambu': '999',
  'Nyeri': '999',
  'Machakos': '999',
  'Kajiado': '999',
  // Default to 999 for all others
};

// Neighboring counties (reuse from matching.js logic)
const NEIGHBORS = {
  'Nairobi': ['Kiambu', 'Machakos', 'Kajiado'],
  'Kiambu': ['Nairobi', "Murang'a", 'Nakuru', 'Kajiado'],
  'Nakuru': ['Nairobi', 'Kiambu', 'Nyandarua', 'Laikipia', 'Baringo', 'Kericho', 'Narok', 'Kajiado'],
  'Mombasa': ['Kilifi', 'Kwale'],
  'Kisumu': ['Siaya', 'Nandi', 'Kericho', 'Homa Bay', 'Nyamira'],
  'Uasin Gishu': ['Trans Nzoia', 'Elgeyo Marakwet', 'Nandi', 'Baringo', 'Kericho'],
  'Kakamega': ['Vihiga', 'Bungoma', 'Nandi', 'Siaya', 'Busia'],
  'Bomet': ['Kericho', 'Narok', 'Nyamira', 'Nakuru', 'Kisii'],
  'Meru': ['Tharaka Nithi', 'Isiolo', 'Laikipia', 'Nyeri'],
  'Machakos': ['Nairobi', 'Kiambu', 'Kajiado', 'Makueni', 'Embu', "Murang'a"],
  'Kajiado': ['Nairobi', 'Kiambu', 'Machakos', 'Narok'],
  'Kilifi': ['Mombasa', 'Kwale', 'Tana River'],
};

const HIGH_VALUE_TYPES = ['Cow', 'Camel', 'Donkey'];

function persist() {
  storage.save('theft_alerts', storage.mapToObject(alertHistory));
}

function getPoliceNumber(county) {
  return POLICE_BY_COUNTY[county] || '999';
}

function getNeighborCounties(county) {
  return NEIGHBORS[county] || [];
}

function maskPhone(phone) {
  if (!phone || phone.length < 8) return phone;
  const digits = phone.replace(/\D/g, '');
  return '+' + digits.slice(0, 5) + '****' + digits.slice(-3);
}

/**
 * Broadcast theft alert
 * Called after a farmer reports theft
 */
async function broadcastTheftAlert(animal, theftReport, entities) {
  const {
    slaughterhouses = [],
    meatHandlers = [],
    farmersInWard = [],
  } = entities;

  const theftId = 'THEFT-' + Date.now().toString(36).toUpperCase();
  const alerts = [];

  const animalCounty = animal.location?.county || 'Unknown';
  const animalWard = animal.location?.ward || '';
  const animalArea = animal.location?.area || animal.location?.locality || '';
  const locationLabel = [animalArea, animalWard, animalCounty].filter(Boolean).join(', ');

  // Base message (short for SMS)
  const shortMessage = `🚨 FARMDIRECT THEFT ALERT
${animal.type} (${animal.breed}) stolen
ID: ${animal.passportId}
From: ${locationLabel}
Owner: ${theftReport.contactPhone}
If seen, call owner or 999 IMMEDIATELY.`;

  // ═══ 1. Alert all slaughterhouses in same county ═══
  const sameCountyFacilities = slaughterhouses.filter(s => 
    s.location?.county === animalCounty && s.status === 'active'
  );

  for (const facility of sameCountyFacilities) {
    try {
      await sms.sendSms(facility.operatorPhone, shortMessage, {
        alertType: 'theft',
        theftId,
        role: 'slaughterhouse',
        entityId: facility.id,
      });
      alerts.push({ type: 'slaughterhouse', id: facility.id, name: facility.businessName, phone: facility.operatorPhone, county: facility.location?.county, status: 'sent' });
    } catch (err) {
      alerts.push({ type: 'slaughterhouse', id: facility.id, name: facility.businessName, status: 'failed', error: err.message });
    }
  }

  // ═══ 2. Alert neighboring county slaughterhouses ═══
  const neighborCounties = getNeighborCounties(animalCounty);
  const neighborFacilities = slaughterhouses.filter(s => 
    neighborCounties.includes(s.location?.county) && s.status === 'active'
  );

  for (const facility of neighborFacilities) {
    try {
      await sms.sendSms(facility.operatorPhone, shortMessage, {
        alertType: 'theft',
        theftId,
        role: 'slaughterhouse-neighbor',
        entityId: facility.id,
      });
      alerts.push({ type: 'slaughterhouse-neighbor', id: facility.id, name: facility.businessName, county: facility.location?.county, status: 'sent' });
    } catch (err) {
      alerts.push({ type: 'slaughterhouse-neighbor', id: facility.id, status: 'failed' });
    }
  }

  // ═══ 3. Alert meat handlers (butcheries) in same county ═══
  const sameCountyHandlers = meatHandlers.filter(h => 
    h.location?.county === animalCounty && h.status === 'active'
  );

  const handlerMessage = `🚨 FARMDIRECT THEFT ALERT
${animal.type} stolen from ${animal.ownerName}
ID: ${animal.passportId}
Report to owner: ${theftReport.contactPhone}
Do NOT accept this animal for processing.`;

  for (const handler of sameCountyHandlers) {
    try {
      await sms.sendSms(handler.ownerPhone, handlerMessage, {
        alertType: 'theft',
        theftId,
        role: 'butchery',
        entityId: handler.id,
      });
      alerts.push({ type: 'butchery', id: handler.id, name: handler.businessName, county: handler.location?.county, status: 'sent' });
    } catch (err) {
      alerts.push({ type: 'butchery', id: handler.id, status: 'failed' });
    }
  }

  // ═══ 4. Community alert (high-value animals only) ═══
  if (HIGH_VALUE_TYPES.includes(animal.type) && farmersInWard.length > 0) {
    const communityMessage = `🚨 FarmDirect Alert:
${animal.type} stolen in ${animalWard}
ID: ${animal.passportId}
Report sightings: ${theftReport.contactPhone}
KES 5,000 bounty offered.`;

    // Limit to 50 farmers to prevent SMS cost explosion
    const recipients = farmersInWard.slice(0, 50);

    for (const farmer of recipients) {
      try {
        await sms.sendSms(farmer.phone, communityMessage, {
          alertType: 'theft',
          theftId,
          role: 'community',
        });
        alerts.push({ type: 'community', name: farmer.name, county: animalCounty, status: 'sent' });
      } catch (err) {
        alerts.push({ type: 'community', status: 'failed' });
      }
    }
  }

  // ═══ 5. Police notification ═══
  const policeNumber = getPoliceNumber(animalCounty);
  const policeMessage = `FARMDIRECT THEFT REPORT
Animal: ${animal.type} (${animal.breed})
ID: ${animal.passportId}
Owner: ${animal.ownerName} (${theftReport.contactPhone})
Location: ${locationLabel}
Reported: ${new Date().toLocaleString()}
Ref: ${theftId}`;

  try {
    await sms.sendSms(policeNumber, policeMessage, {
      alertType: 'theft-police',
      theftId,
      county: animalCounty,
    });
    alerts.push({ type: 'police', phone: policeNumber, county: animalCounty, status: 'sent' });
  } catch (err) {
    alerts.push({ type: 'police', status: 'failed' });
  }

  // ═══ Store alert history ═══
  const historyEntry = {
    theftId,
    passportId: animal.passportId,
    animalType: animal.type,
    animalBreed: animal.breed,
    ownerName: animal.ownerName,
    ownerPhone: theftReport.contactPhone,
    county: animalCounty,
    ward: animalWard,
    reportedAt: theftReport.reportedAt,
    totalAlerts: alerts.filter(a => a.status === 'sent').length,
    alerts,
    summary: {
      slaughterhouses: alerts.filter(a => a.type === 'slaughterhouse' || a.type === 'slaughterhouse-neighbor').length,
      butcheries: alerts.filter(a => a.type === 'butchery').length,
      community: alerts.filter(a => a.type === 'community').length,
      police: alerts.filter(a => a.type === 'police').length,
    },
    status: 'active',
  };

  alertHistory[theftId] = historyEntry;
  persist();

  console.log('🚨 THEFT ALERT BROADCAST:', theftId);
  console.log('   Animal:', animal.passportId, animal.type);
  console.log('   Alerts sent:', historyEntry.totalAlerts);
  console.log('   Breakdown:', historyEntry.summary);

  return historyEntry;
}

/**
 * Get alert history for an animal
 */
function getAlertHistory(passportId) {
  return Object.values(alertHistory).filter(a => a.passportId === passportId);
}

/**
 * Get all active alerts
 */
function listActiveAlerts() {
  return Object.values(alertHistory)
    .filter(a => a.status === 'active')
    .sort((a, b) => new Date(b.reportedAt) - new Date(a.reportedAt));
}

/**
 * Mark animal as found/recovered
 */
function resolveAlert(theftId, resolution) {
  const entry = alertHistory[theftId];
  if (!entry) return null;
  entry.status = 'resolved';
  entry.resolvedAt = new Date().toISOString();
  entry.resolution = resolution || { note: 'Animal recovered' };
  persist();
  console.log('✅ Theft alert resolved:', theftId);
  return entry;
}

/**
 * Get stats
 */
function getStats() {
  const all = Object.values(alertHistory);
  return {
    total: all.length,
    active: all.filter(a => a.status === 'active').length,
    resolved: all.filter(a => a.status === 'resolved').length,
    last30Days: all.filter(a => new Date(a.reportedAt) > new Date(Date.now() - 30*24*60*60*1000)).length,
    totalAlertsSent: all.reduce((s, a) => s + (a.totalAlerts || 0), 0),
  };
}

module.exports = {
  broadcastTheftAlert,
  getAlertHistory,
  listActiveAlerts,
  resolveAlert,
  getStats,
  _history: alertHistory,
};
