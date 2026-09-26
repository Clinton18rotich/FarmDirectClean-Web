// FILE: backend/src/routes/auth.js
// Session 6.20 — simple login by phone number.
// No passwords, no OTP, no SMS.
// A phone number that matches server records = the account for that phone.
//
// Backed by the Africa-aware phone normalization in chat.js (normId).
// Same canonical form for all lookups: <country-code><national-number>.

const express = require('express');
const router = express.Router();
const shamba = require('../services/shamba');
const vetService = require('../services/vet');
const ridersService = require('../services/riders');
const kycService = require('../services/kyc');
const buyerService = require('../services/buyer');

// Copy of the Africa-aware normalizer (kept local to avoid coupling auth → chat)
const AFRICA_COUNTRY_CODES = [
  '254','256','255','257','250','211',
  '251','252','253','291','249',
  '234','233','225','221','223','226',
  '27','263','260','265','258','244',
  '20','218','216','212','213',
  '237','243','242','241','240','235','236',
  '228','229','227','222','224',
  '267','264','266','268','269',
];
const DEFAULT_COUNTRY = '254';
function normId(id) {
  if (!id) return '';
  let d = String(id).replace(/\D/g, '');
  if (!d) return '';
  const sorted = [...AFRICA_COUNTRY_CODES].sort((a, b) => b.length - a.length);
  for (const cc of sorted) {
    if (d.startsWith(cc)) {
      if (cc === DEFAULT_COUNTRY && d.startsWith('2540')) return '254' + d.slice(4);
      return d;
    }
  }
  if (d.startsWith('0')) d = d.slice(1);
  return DEFAULT_COUNTRY + d;
}

/**
 * Look up every identity tied to a phone number.
 * Returns a composite snapshot: farmer (inferred from livestock ownership),
 * vet, rider, and KYC status. No writes.
 */
router.post('/lookup', (req, res) => {
  try {
    const { phone } = req.body || {};
    if (!phone) return res.status(400).json({ success: false, message: 'phone required' });

    const canonical = normId(phone);
    if (!canonical || canonical.length < 10) {
      return res.status(400).json({ success: false, message: 'Invalid phone number' });
    }

    // 1. Farmer — inferred from livestock ownership
    let farmer = null;
    try {
      const all = shamba._livestock ? Array.from(shamba._livestock.values()) : [];
      const mine = all.filter(a => {
        const owner = normId(a.ownerPhone || a.ownerId);
        return owner && owner === canonical;
      });
      if (mine.length > 0) {
        const sample = mine[0];
        farmer = {
          phone: sample.ownerPhone || phone,
          fullName: sample.ownerName || null,
          animalCount: mine.length,
          location: sample.location || null,
        };
      }
    } catch (e) { /* silent */ }

    // 2. Vet — via getVetByPhone
    let vet = null;
    try {
      const v = vetService.getVetByPhone(phone) || vetService.getVetByPhone('+' + canonical) || vetService.getVetByPhone('0' + canonical.slice(-9));
      if (v) {
        vet = {
          id: v.id,
          fullName: v.fullName,
          phone: v.phone,
          vetType: v.vetType,
          status: v.status,
          verified: !!v.verified,
          specializations: v.specializations || [],
          location: v.location || null,
        };
      }
    } catch (e) { /* silent */ }

    // 3. Rider — via getRiderByPhone
    let rider = null;
    try {
      const r = ridersService.getRiderByPhone(phone);
      if (r) {
        rider = {
          id: r.id,
          fullName: r.fullName,
          phone: r.phone,
          vehicleClass: r.vehicleClass,
          kycStatus: r.kycStatus,
          online: !!r.online,
          tier: r.tier,
        };
      }
    } catch (e) { /* silent */ }

    // 4. KYC tier
    let kycTier = 'basic';
    try {
      const v = kycService.getVerificationByUser(phone)
             || kycService.getVerificationByUser('+' + canonical)
             || kycService.getVerificationByUser(canonical);
      if (v && v.verified) kycTier = 'verified';
      else if (v && v.status === 'pending_payment') kycTier = 'basic';
    } catch (e) { /* silent */ }

    // 5. Buyer identity (Session 6.20)
    let buyer = null;
    try {
      const b = buyerService.getBuyerByPhone(phone);
      if (b) {
        buyer = {
          id: b.id,
          fullName: b.fullName,
          phone: b.phone,
          buyerType: b.buyerType,
          businessName: b.businessName,
          deliveryAddresses: b.deliveryAddresses || [],
        };
      }
    } catch (e) { /* silent */ }

    const found = !!(farmer || vet || rider || buyer);

    console.log('🔑 Auth lookup:', canonical, '| found:', found,
      '| farmer:', !!farmer, '| vet:', !!vet, '| rider:', !!rider);

    res.json({
      success: true,
      found,
      canonical,
      farmer,
      vet,
      rider,
      buyer,
      kycTier,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * Restore a full session for this phone number.
 * Same lookup, but returns a farmerRegistration-shaped object that the
 * frontend can drop straight into localStorage.
 */
router.post('/restore', (req, res) => {
  try {
    const { phone } = req.body || {};
    if (!phone) return res.status(400).json({ success: false, message: 'phone required' });

    const canonical = normId(phone);
    if (!canonical) return res.status(400).json({ success: false, message: 'Invalid phone' });

    // Reuse lookup
    const lookupReq = { body: { phone: canonical } };
    let lookupData = null;
    const fakeRes = {
      status: () => fakeRes,
      json: (payload) => { lookupData = payload; return fakeRes; },
    };
    // Manually invoke lookup logic by calling the route handler inline
    // Simpler: replicate the lookup by hitting our own internal function
    // — but to avoid infinite loops, just do the same work here.

    // 1. Farmer
    let farmer = null;
    const all = shamba._livestock ? Array.from(shamba._livestock.values()) : [];
    const mine = all.filter(a => {
      const owner = normId(a.ownerPhone || a.ownerId);
      return owner && owner === canonical;
    });
    if (mine.length > 0) {
      farmer = {
        fullName: mine[0].ownerName,
        phone: mine[0].ownerPhone || phone,
        location: mine[0].location || null,
        animalCount: mine.length,
      };
    }

    // 2. Vet
    let vet = null;
    try {
      const v = vetService.getVetByPhone(phone) || vetService.getVetByPhone('+' + canonical);
      if (v) vet = { id: v.id, fullName: v.fullName, phone: v.phone };
    } catch (e) { /* silent */ }

    // 3. Rider
    let rider = null;
    try {
      const r = ridersService.getRiderByPhone(phone);
      if (r) rider = { id: r.id, fullName: r.fullName, phone: r.phone, vehicleClass: r.vehicleClass };
    } catch (e) { /* silent */ }

    // 4. Buyer
    let buyer = null;
    let buyerRegistration = null;
    try {
      const b = buyerService.getBuyerByPhone(phone);
      if (b) {
        buyer = { id: b.id, fullName: b.fullName, phone: b.phone, buyerType: b.buyerType };
        buyerRegistration = {
          id: b.id,
          fullName: b.fullName,
          phone: b.phone,
          buyerType: b.buyerType,
          businessName: b.businessName,
          deliveryAddresses: b.deliveryAddresses || [],
          _restored: true,
        };
      }
    } catch (e) { /* silent */ }

    if (!farmer && !vet && !rider && !buyer) {
      return res.json({ success: true, found: false, message: 'No account found for this phone number' });
    }

    // Build a farmerRegistration-shaped object if a farmer exists
    const farmerRegistration = farmer ? {
      farmer: {
        fullName: farmer.fullName,
        phone: farmer.phone,
        location: farmer.location,
      },
      payment: null,
      products: [],
      registeredAt: new Date().toISOString(),
      _restored: true,
    } : null;

    const vetId = vet ? vet.id : null;
    const riderRegistration = rider ? {
      id: rider.id,
      fullName: rider.fullName,
      phone: rider.phone,
      vehicleClass: rider.vehicleClass,
      _restored: true,
    } : null;

    console.log('🔑 Auth restore:', canonical, '| farmer:', !!farmer, '| vet:', !!vet, '| rider:', !!rider);

    res.json({
      success: true,
      found: true,
      canonical,
      farmer,
      vet,
      rider,
      buyer,
      farmerRegistration,
      vetId,
      riderRegistration,
      buyerRegistration,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * Register a new buyer. Free. No KYC. Delivery address captured for logistics.
 * Body: { phone, fullName, buyerType, businessName?, deliveryCounty, deliveryArea?, deliveryNotes? }
 */
router.post('/register-buyer', (req, res) => {
  try {
    const result = buyerService.registerBuyer(req.body || {});
    if (result.error) {
      return res.status(400).json({ success: false, message: result.error, existing: result.existing });
    }
    res.json({ success: true, buyer: result.buyer });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * Add another delivery address to an existing buyer.
 * Body: { buyerId, address: { label, county, area, notes, isDefault } }
 */
router.post('/buyer/:id/address', (req, res) => {
  try {
    const { address } = req.body || {};
    const result = buyerService.addDeliveryAddress(req.params.id, address);
    if (result.error) return res.status(400).json({ success: false, message: result.error });
    res.json({ success: true, buyer: result.buyer });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
