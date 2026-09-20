const express = require('express');
const router = express.Router();
const shamba = require('../services/shamba');

function normalizeKenyaPhone(input) {
  if (!input) return '';
  let digits = String(input).replace(/[^\d]/g, '');
  if (digits.startsWith('254')) { /* ok */ }
  else if (digits.startsWith('0')) digits = '254' + digits.slice(1);
  else if (digits.length === 9) digits = '254' + digits;
  else return input;
  if (digits.length !== 12) return input;
  return '+' + digits;
}

// HEALTH
router.get('/health', (req, res) => {
  res.json({ success: true, message: 'Shamba & Mfugo Safi running', stats: shamba.getStats() });
});

router.get('/stats', (req, res) => {
  res.json({ success: true, stats: shamba.getStats() });
});

// MODULE A: LAND VAULT
router.post('/land/register', (req, res) => {
  try {
    const { ownerId, ownerName, ownerPhone, location, titleDeed, areaHectares, landUse, witnesses } = req.body;

    if (!ownerName || !ownerPhone) {
      return res.status(400).json({ success: false, message: 'Owner name and phone required' });
    }
    if (!location) {
      return res.status(400).json({ success: false, message: 'Location required' });
    }
    if (!areaHectares || areaHectares <= 0) {
      return res.status(400).json({ success: false, message: 'Area (hectares) required' });
    }

    const parcel = shamba.registerLand({
      ownerId,
      ownerName,
      ownerPhone: normalizeKenyaPhone(ownerPhone),
      location,
      titleDeed,
      areaHectares: parseFloat(areaHectares),
      landUse,
      witnesses: (witnesses || []).map(w => ({
        ...w,
        phone: normalizeKenyaPhone(w.phone),
      })),
    });

    res.json({ success: true, land: parcel });
  } catch (error) {
    console.error('❌ Land register error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/land/list', (req, res) => {
  res.json({ success: true, land: shamba.listLand() });
});

router.get('/land/owner/:ownerId', (req, res) => {
  res.json({ success: true, land: shamba.getLandByOwner(req.params.ownerId) });
});

router.get('/land/:id', (req, res) => {
  const parcel = shamba.getLand(req.params.id);
  if (!parcel) return res.status(404).json({ success: false, message: 'Land not found' });
  res.json({ success: true, land: parcel });
});

router.post('/land/:id/witness', (req, res) => {
  const { name, phone } = req.body;
  if (!name || !phone) return res.status(400).json({ success: false, message: 'Witness name and phone required' });
  const parcel = shamba.addWitness(req.params.id, { name, phone: normalizeKenyaPhone(phone) });
  if (!parcel) return res.status(404).json({ success: false, message: 'Land not found' });
  res.json({ success: true, land: parcel });
});

// MODULE B: LIVESTOCK PASSPORT
router.post('/livestock/register', (req, res) => {
  try {
    const {
      ownerId, ownerName, ownerPhone, type, breed, age, color, gender, location, photoUrl,
      isNewborn, birthDate, motherPassport, fatherPassport, birthWeight,
    } = req.body;

    if (!ownerName || !ownerPhone) {
      return res.status(400).json({ success: false, message: 'Owner name and phone required' });
    }
    if (!type) return res.status(400).json({ success: false, message: 'Animal type required' });
    if (!breed) return res.status(400).json({ success: false, message: 'Breed required' });
    if (!location) return res.status(400).json({ success: false, message: 'Location required' });

    const animal = shamba.registerLivestock({
      ownerId,
      ownerName,
      ownerPhone: normalizeKenyaPhone(ownerPhone),
      type,
      breed,
      age,
      color,
      gender,
      location,
      photoUrl,
      isNewborn,
      birthDate,
      motherPassport,
      fatherPassport,
      birthWeight,
    });

    if (animal.error) {
      return res.status(400).json({ success: false, message: animal.error });
    }

    res.json({ success: true, livestock: animal });
  } catch (error) {
    console.error('❌ Livestock register error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * Get animal lineage (3 generations + offspring)
 */
router.get('/livestock/:passportId/lineage', (req, res) => {
  const lineage = shamba.getLineage(req.params.passportId);
  if (!lineage) return res.status(404).json({ success: false, message: 'Animal not found' });
  res.json({ success: true, lineage });
});

/**
 * Get enriched single animal (with life stage)
 */
router.get('/livestock/:passportId/enriched', (req, res) => {
  const animal = shamba.getEnrichedLivestock(req.params.passportId);
  if (!animal) return res.status(404).json({ success: false, message: 'Animal not found' });
  res.json({ success: true, livestock: animal });
});

/**
 * Get enriched livestock by owner
 */
router.get('/livestock/owner/:ownerId/enriched', (req, res) => {
  const list = shamba.getEnrichedLivestockByOwner(req.params.ownerId);
  res.json({ success: true, livestock: list });
});

router.get('/livestock/list', (req, res) => {
  res.json({ success: true, livestock: shamba.listLivestock() });
});

router.get('/livestock/owner/:ownerId', (req, res) => {
  res.json({ success: true, livestock: shamba.getLivestockByOwner(req.params.ownerId) });
});

router.get('/livestock/:passportId', (req, res) => {
  const animal = shamba.getLivestock(req.params.passportId);
  if (!animal) return res.status(404).json({ success: false, message: 'Animal not found' });
  res.json({ success: true, livestock: animal });
});

router.post('/livestock/:passportId/report-stolen', (req, res) => {
  const { reportedBy, description, location, contactPhone } = req.body;
  const animal = shamba.reportStolen(req.params.passportId, {
    reportedBy: reportedBy || 'Owner',
    description,
    location,
    contactPhone: contactPhone ? normalizeKenyaPhone(contactPhone) : null,
  });
  if (!animal) return res.status(404).json({ success: false, message: 'Animal not found' });
  res.json({ success: true, livestock: animal });
});

router.post('/livestock/:passportId/vaccination', (req, res) => {
  const { name, vetName, date, nextDue } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Vaccine name required' });
  const animal = shamba.addVaccination(req.params.passportId, { name, vetName, date, nextDue });
  if (!animal) return res.status(404).json({ success: false, message: 'Animal not found' });
  res.json({ success: true, livestock: animal });
});

module.exports = router;

// ═══════════════════════════════════════════════════
// DEATH TRACKING ROUTES
// ═══════════════════════════════════════════════════

router.get('/death-causes', (req, res) => {
  res.json({ success: true, causes: shamba.DEATH_CAUSES });
});

router.post('/livestock/:passportId/death', (req, res) => {
  try {
    const { cause, diseaseType, description, deathDate, location, photoUrl, insurance, disposalMethod, reportedBy, reportedByPhone } = req.body;

    if (!cause) {
      return res.status(400).json({ success: false, message: 'Cause required' });
    }

    const validCauses = shamba.DEATH_CAUSES.map(c => c.id);
    if (!validCauses.includes(cause)) {
      return res.status(400).json({ success: false, message: 'Invalid cause. Must be one of: ' + validCauses.join(', ') });
    }

    if (cause === 'illness' && !diseaseType) {
      return res.status(400).json({ success: false, message: 'Disease type required when cause is illness' });
    }

    const result = shamba.reportAnimalDeath(req.params.passportId, {
      cause,
      diseaseType,
      description,
      deathDate,
      location,
      photoUrl,
      insurance,
      disposalMethod,
      reportedBy,
      reportedByPhone: reportedByPhone ? normalizeKenyaPhone(reportedByPhone) : undefined,
    });

    if (result.error) return res.status(400).json({ success: false, message: result.error });
    res.json({ success: true, livestock: result });
  } catch (error) {
    console.error('❌ Death report error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/livestock/:passportId/death/verify-vet', (req, res) => {
  try {
    const { vetName, vetLicense, vetPhone, confirmedCause, notes } = req.body;
    if (!vetName) return res.status(400).json({ success: false, message: 'Vet name required' });

    const result = shamba.verifyDeathByVet(req.params.passportId, {
      vetName, vetLicense, vetPhone, confirmedCause, notes,
    });

    if (result.error) return res.status(400).json({ success: false, message: result.error });
    res.json({ success: true, livestock: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/livestock/:passportId/death', (req, res) => {
  const record = shamba.getDeathRecord(req.params.passportId);
  if (!record) return res.status(404).json({ success: false, message: 'No death record' });
  res.json({ success: true, deathRecord: record });
});

router.get('/deaths/list', (req, res) => {
  res.json({
    success: true,
    deaths: shamba.listDeaths({
      cause: req.query.cause,
      county: req.query.county,
      ownerId: req.query.ownerId,
      fromDate: req.query.fromDate,
      toDate: req.query.toDate,
    }),
  });
});

router.get('/deaths/stats', (req, res) => {
  res.json({ success: true, stats: shamba.getDeathStats() });
});

router.get('/deaths/outbreaks', (req, res) => {
  res.json({ success: true, outbreaks: shamba.detectOutbreaks() });
});

// ═══════════════════════════════════════════════════
// MEAT SAFETY
// ═══════════════════════════════════════════════════

router.get('/safety/:passportId', (req, res) => {
  const animal = shamba._livestock?.get ? shamba._livestock.get(req.params.passportId) : null;
  if (!animal) return res.status(404).json({ success: false, message: 'Animal not found' });
  if (animal.status !== 'dead' || !animal.deathRecord) {
    return res.status(400).json({ success: false, message: 'Animal is not deceased' });
  }
  const safety = shamba.classifyMeatSafety(animal.deathRecord);
  res.json({ success: true, passportId: req.params.passportId, safety, deathRecord: animal.deathRecord });
});

// ═══════════════════════════════════════════════════
// HOME SLAUGHTER (CEREMONY)
// ═══════════════════════════════════════════════════

router.get('/ceremony-types', (req, res) => {
  res.json({ success: true, types: shamba.CEREMONY_TYPES });
});

router.post('/livestock/:passportId/home-slaughter', (req, res) => {
  try {
    const { ceremonyType, ceremonyDate, numberOfGuests, slaughteredBy, location, notes, photos } = req.body;

    if (!ceremonyType) {
      return res.status(400).json({ success: false, message: 'Ceremony type required' });
    }

    const validTypes = shamba.CEREMONY_TYPES.map(c => c.id);
    if (!validTypes.includes(ceremonyType)) {
      return res.status(400).json({ success: false, message: 'Invalid ceremony type. Must be: ' + validTypes.join(', ') });
    }

    const result = shamba.recordHomeSlaughter(req.params.passportId, {
      ceremonyType, ceremonyDate, numberOfGuests, slaughteredBy, location, notes, photos,
    });

    if (result.error) return res.status(400).json({ success: false, message: result.error });
    res.json({ success: true, livestock: result });
  } catch (error) {
    console.error('❌ Home slaughter error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/livestock/:passportId/home-slaughter', (req, res) => {
  const record = shamba.getHomeSlaughterRecord(req.params.passportId);
  if (!record) return res.status(404).json({ success: false, message: 'No home slaughter record' });
  res.json({ success: true, homeSlaughter: record });
});

router.get('/home-slaughters/list', (req, res) => {
  res.json({
    success: true,
    slaughters: shamba.listHomeSlaughters({
      ceremonyType: req.query.ceremonyType,
      county: req.query.county,
      ownerId: req.query.ownerId,
      fromDate: req.query.fromDate,
      toDate: req.query.toDate,
    }),
  });
});

router.get('/home-slaughters/stats', (req, res) => {
  res.json({ success: true, stats: shamba.getHomeSlaughterStats() });
});
