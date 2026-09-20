/**
 * Delivery Order Service
 * Manages order lifecycle, rider assignment, offer cascade
 */

const sms = require('./sms');
const storage = require('./storage');

const deliveries = storage.objectToMap(storage.load('deliveries', {}));

function persist() { storage.save('deliveries', storage.mapToObject(deliveries)); }

// Order statuses
const STATUS = {
  PENDING: 'PENDING',           // created, waiting for rider
  OFFERING: 'OFFERING',         // offer sent to a rider
  ASSIGNED: 'ASSIGNED',         // rider accepted
  PICKING_UP: 'PICKING_UP',     // rider heading to farmer
  IN_TRANSIT: 'IN_TRANSIT',     // rider picked up, delivering
  DELIVERED: 'DELIVERED',       // delivered, waiting for buyer confirmation
  COMPLETED: 'COMPLETED',       // buyer confirmed, escrow released
  CANCELLED: 'CANCELLED',       // order cancelled
  FAILED: 'FAILED',             // no rider found
};

const SMS_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const NEIGHBOR_EXPANSION_MS = 5 * 60 * 1000; // expand after 5 min

// In-memory active offers with timers
const activeOffers = new Map();

/**
 * Create a new delivery order
 */
function createDelivery(data) {
  const id = 'DEL-' + Date.now().toString(36).toUpperCase();
  const delivery = {
    id,
    // Parties
    buyerId: data.buyerId,
    buyerName: data.buyerName,
    buyerPhone: data.buyerPhone,
    farmerId: data.farmerId,
    farmerName: data.farmerName,
    farmerPhone: data.farmerPhone,
    // Locations (county/ward matching)
    pickup: data.pickup,      // { county, ward, locality, area, manual }
    dropoff: data.dropoff,    // { county, ward, locality, area, manual }
    // Order details
    items: data.items || [],
    weight: data.weight || null,
    deliveryFee: data.deliveryFee || 0,
    escrowId: data.escrowId,
    // State
    status: STATUS.PENDING,
    currentRiderId: null,
    offeredTo: [],            // Rider IDs we've offered to
    rejectedBy: [],           // Rider IDs who said no
    history: [{
      status: STATUS.PENDING,
      at: new Date().toISOString(),
      note: 'Order created',
    }],
    // Timing
    createdAt: new Date().toISOString(),
    assignedAt: null,
    deliveredAt: null,
    completedAt: null,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min total
  };

  deliveries.set(id, delivery);
  console.log('📦 Delivery created:', id, '|', pickupLabel(data.pickup), '→', pickupLabel(data.dropoff));
  return delivery;
}

function pickupLabel(loc) {
  if (!loc) return 'Unknown';
  return loc.area || loc.locality || loc.ward || loc.county || 'Unknown';
}

/**
 * Get delivery by ID
 */
function getDelivery(id) {
  return deliveries.get(id);
}

/**
 * List deliveries with filters
 */
function listDeliveries(filter = {}) {
  let list = [...deliveries.values()];
  if (filter.status) list = list.filter(d => d.status === filter.status);
  if (filter.riderId) list = list.filter(d => d.currentRiderId === filter.riderId);
  if (filter.buyerId) list = list.filter(d => d.buyerId === filter.buyerId);
  if (filter.farmerId) list = list.filter(d => d.farmerId === filter.farmerId);
  return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * Update delivery status
 */
function updateStatus(id, status, note) {
  const delivery = deliveries.get(id);
  if (!delivery) return null;
  delivery.status = status;
  delivery.history.push({
    status,
    at: new Date().toISOString(),
    note: note || '',
  });
  if (status === STATUS.ASSIGNED) delivery.assignedAt = new Date().toISOString();
  if (status === STATUS.DELIVERED) delivery.deliveredAt = new Date().toISOString();
  if (status === STATUS.COMPLETED) delivery.completedAt = new Date().toISOString();
  console.log('📦 Delivery', id, '→', status, note ? '(' + note + ')' : '');
  return delivery;
}

/**
 * Send SMS offer to a rider
 */
async function offerToRider(deliveryId, rider) {
  const delivery = deliveries.get(deliveryId);
  if (!delivery) return null;

  // Prevent duplicate offers
  if (delivery.offeredTo.includes(rider.id)) return null;

  delivery.offeredTo.push(rider.id);
  delivery.status = STATUS.OFFERING;

  const message = 
    `FarmDirect: New delivery request!\n` +
    `From: ${pickupLabel(delivery.pickup)}\n` +
    `To: ${pickupLabel(delivery.dropoff)}\n` +
    `Weight: ${delivery.weight || 'Light'}\n` +
    `Your fee: KES ${delivery.deliveryFee}\n` +
    `Reply YES to accept (5 min)\n` +
    `Reply NO to decline\n` +
    `Order: ${delivery.id}`;

  await sms.sendSms(rider.rider.phone, message, { orderId: deliveryId, riderId: rider.id });

  delivery.history.push({
    status: 'OFFER_SENT',
    at: new Date().toISOString(),
    note: `Offered to ${rider.rider.fullName} (${rider.id})`,
  });

  return delivery;
}

/**
 * Handle rider response (YES/NO)
 */
async function handleRiderReply(riderId, orderId, response) {
  const delivery = deliveries.get(orderId);
  if (!delivery) return { success: false, message: 'Order not found' };

  if (delivery.status !== STATUS.OFFERING) {
    return { success: false, message: 'Order no longer accepting responses' };
  }

  if (response === 'YES' || response === 'ACCEPT') {
    // Check race condition — is another rider already assigned?
    if (delivery.currentRiderId) {
      return { success: false, message: 'Already assigned to another rider' };
    }

    delivery.currentRiderId = riderId;
    updateStatus(orderId, STATUS.ASSIGNED, `Rider ${riderId} accepted`);

    // Notify buyer
    sms.sendSms(
      delivery.buyerPhone,
      `FarmDirect: Good news! Your delivery ${delivery.id} is assigned. ` +
      `Track at farmdirect.co.ke/track/${delivery.id}`,
      { orderId }
    );

    return { success: true, message: 'Delivery assigned', delivery };
  } else if (response === 'NO' || response === 'DECLINE') {
    delivery.rejectedBy.push(riderId);
    delivery.history.push({
      status: 'OFFER_REJECTED',
      at: new Date().toISOString(),
      note: `Rider ${riderId} declined`,
    });
    return { success: true, message: 'Declined' };
  }

  return { success: false, message: 'Invalid response' };
}

/**
 * Get delivery stats
 */
function getStats() {
  const all = [...deliveries.values()];
  return {
    total: all.length,
    pending: all.filter(d => d.status === STATUS.PENDING).length,
    offering: all.filter(d => d.status === STATUS.OFFERING).length,
    assigned: all.filter(d => d.status === STATUS.ASSIGNED).length,
    inTransit: all.filter(d => d.status === STATUS.IN_TRANSIT).length,
    delivered: all.filter(d => d.status === STATUS.DELIVERED).length,
    completed: all.filter(d => d.status === STATUS.COMPLETED).length,
    failed: all.filter(d => d.status === STATUS.FAILED).length,
  };
}

module.exports = {
  STATUS,
  createDelivery,
  getDelivery,
  listDeliveries,
  updateStatus,
  offerToRider,
  handleRiderReply,
  getStats,
  pickupLabel,
  _deliveries: deliveries,
};
