/**
 * Meat Handler Service
 * Tracks meat from slaughterhouse → butchery/supermarket/restaurant → consumer
 */

const storage = require('./storage');

const handlers = storage.objectToMap(storage.load('meat_handlers', {}));

function persist() {
  storage.save('meat_handlers', storage.mapToObject(handlers));
}

const HANDLER_TYPES = ['butchery', 'supermarket', 'restaurant', 'hotel', 'exporter'];

function generateHandlerId() {
  return 'HANDLER-' + Date.now().toString(36).toUpperCase();
}

/**
 * Register a meat handler
 */
function registerHandler(data) {
  const id = generateHandlerId();
  const handler = {
    id,
    businessName: data.businessName,
    type: data.type || 'butchery',
    ownerName: data.ownerName,
    ownerPhone: data.ownerPhone,
    ownerEmail: data.ownerEmail || null,
    location: data.location,
    licenseNumber: data.licenseNumber,
    payment: data.payment || null,
    status: 'pending_verification',
    registeredAt: new Date().toISOString(),
    verifiedAt: null,
    verifiedBy: null,
    totalReceived: 0,
    totalSold: 0,
    totalReturned: 0,
  };

  handlers.set(id, handler);
  persist();

  console.log('🏪 Meat handler registered:', id, '|', data.businessName, '(' + data.type + ')');
  return handler;
}

function getHandler(id) {
  return handlers.get(id);
}

function listHandlers(filter = {}) {
  let list = [...handlers.values()];
  if (filter.status) list = list.filter(h => h.status === filter.status);
  if (filter.type) list = list.filter(h => h.type === filter.type);
  if (filter.county) list = list.filter(h => h.location?.county === filter.county);
  return list.sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt));
}

function verifyHandler(id, verifiedBy) {
  const handler = handlers.get(id);
  if (!handler) return null;
  handler.status = 'active';
  handler.verifiedAt = new Date().toISOString();
  handler.verifiedBy = verifiedBy;
  persist();
  console.log('✅ Meat handler verified:', id);
  return handler;
}

function updateHandlerStats(id, updates) {
  const handler = handlers.get(id);
  if (!handler) return null;
  Object.assign(handler, updates);
  persist();
  return handler;
}

module.exports = {
  HANDLER_TYPES,
  registerHandler,
  getHandler,
  listHandlers,
  verifyHandler,
  updateHandlerStats,
  _handlers: handlers,
};
