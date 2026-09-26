// FILE: backend/src/services/buyer.js
// Session 6.20 — buyer identity. Free to register. Buyer = someone who
// buys livestock/produce. Not a KYC'd role — no fee, no verification.
// Delivery addresses stored for logistics.

const storage = require('./storage');

const buyers = storage.objectToMap(storage.load('buyers', {}));

function persist() {
  storage.save('buyers', storage.mapToObject(buyers));
}

// Same Africa-aware normalization used in chat.js / auth.js
const AFRICA_COUNTRY_CODES = [
  '254','256','255','257','250','211','251','252','253','291','249',
  '234','233','225','221','223','226','27','263','260','265','258','244',
  '20','218','216','212','213','237','243','242','241','240','235','236',
  '228','229','227','222','224','267','264','266','268','269',
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

function genBuyerId() {
  return 'BUYER-' + Date.now().toString(36).toUpperCase();
}

const BUYER_TYPES = ['individual', 'hotel', 'restaurant', 'butchery', 'trader', 'other'];

/**
 * Register a new buyer.
 * data = { phone, fullName, buyerType, businessName?, deliveryCounty,
 *          deliveryArea?, deliveryNotes? }
 */
function registerBuyer(data) {
  const { phone, fullName, buyerType, businessName, deliveryCounty, deliveryArea, deliveryNotes } = data || {};
  if (!phone) return { error: 'Phone required' };
  if (!fullName || !fullName.trim()) return { error: 'Name required' };
  if (!buyerType || !BUYER_TYPES.includes(buyerType)) return { error: 'Invalid buyer type' };
  if (!deliveryCounty || !deliveryCounty.trim()) return { error: 'Delivery county required' };

  const canonical = normId(phone);
  if (!canonical) return { error: 'Invalid phone' };

  // Prevent duplicate by phone
  for (const b of buyers.values()) {
    if (normId(b.phone) === canonical) {
      return { error: 'This phone is already registered as a buyer', existing: b };
    }
  }

  const id = genBuyerId();
  const now = new Date().toISOString();
  const buyer = {
    id,
    phone: canonical,
    phoneRaw: phone,
    fullName: fullName.trim(),
    buyerType,
    businessName: businessName ? businessName.trim() : null,
    deliveryAddresses: [{
      label: 'Default',
      county: deliveryCounty.trim(),
      area: deliveryArea ? deliveryArea.trim() : null,
      notes: deliveryNotes ? deliveryNotes.trim() : null,
      isDefault: true,
    }],
    totalUnlocks: 0,
    totalOffers: 0,
    createdAt: now,
    updatedAt: now,
  };

  buyers.set(id, buyer);
  persist();
  console.log('🛒 Buyer registered:', id, '|', buyer.fullName, '|', buyer.buyerType, '|', buyer.phone);
  return { buyer };
}

function getBuyer(id) {
  return buyers.get(id) || null;
}

function getBuyerByPhone(phone) {
  if (!phone) return null;
  const target = normId(phone);
  if (!target) return null;
  for (const b of buyers.values()) {
    if (normId(b.phone) === target) return b;
  }
  return null;
}

function listBuyers(filter = {}) {
  let list = [...buyers.values()];
  if (filter.buyerType) list = list.filter(b => b.buyerType === filter.buyerType);
  if (filter.county) list = list.filter(b => (b.deliveryAddresses || []).some(a => (a.county || '').toLowerCase() === filter.county.toLowerCase()));
  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return list;
}

function addDeliveryAddress(buyerId, address) {
  const buyer = buyers.get(buyerId);
  if (!buyer) return { error: 'Buyer not found' };
  if (!address || !address.county) return { error: 'County required' };
  buyer.deliveryAddresses = buyer.deliveryAddresses || [];
  const newAddr = {
    label: address.label || ('Address ' + (buyer.deliveryAddresses.length + 1)),
    county: address.county.trim(),
    area: address.area ? address.area.trim() : null,
    notes: address.notes ? address.notes.trim() : null,
    isDefault: !!address.isDefault && buyer.deliveryAddresses.length === 0,
  };
  if (address.isDefault) {
    buyer.deliveryAddresses.forEach(a => a.isDefault = false);
    newAddr.isDefault = true;
  }
  buyer.deliveryAddresses.push(newAddr);
  buyer.updatedAt = new Date().toISOString();
  buyers.set(buyerId, buyer);
  persist();
  return { buyer };
}

function getStats() {
  const all = [...buyers.values()];
  const byType = {};
  for (const b of all) byType[b.buyerType] = (byType[b.buyerType] || 0) + 1;
  return { total: all.length, byType };
}

module.exports = {
  registerBuyer,
  getBuyer,
  getBuyerByPhone,
  listBuyers,
  addDeliveryAddress,
  getStats,
  BUYER_TYPES,
  _buyers: buyers,
};
