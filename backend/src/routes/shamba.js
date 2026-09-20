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
    const { ownerId, ownerName, ownerPhone, type, breed, age, color, gender, location, photoUrl } = req.body;

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
    });

    res.json({ success: true, livestock: animal });
  } catch (error) {
    console.error('❌ Livestock register error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
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
