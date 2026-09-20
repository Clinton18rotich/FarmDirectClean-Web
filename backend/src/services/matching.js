/**
 * Rider Matching Service
 * County/ward based matching with neighboring county expansion
 */

// Kenya county adjacency (simplified — key neighbors)
// Full adjacency would come from GIS data later
const NEIGHBORS = {
  'Nairobi': ['Kiambu', 'Machakos', 'Kajiado'],
  'Kiambu': ['Nairobi', 'Murang\'a', 'Nakuru', 'Kajiado'],
  'Nakuru': ['Nairobi', 'Kiambu', 'Nyandarua', 'Laikipia', 'Baringo', 'Kericho', 'Narok', 'Kajiado'],
  'Naivasha': ['Nakuru', 'Kiambu', 'Nairobi'],
  'Mombasa': ['Kilifi', 'Kwale'],
  'Kisumu': ['Siaya', 'Nandi', 'Kericho', 'Homa Bay', 'Nyamira'],
  'Uasin Gishu': ['Trans Nzoia', 'Elgeyo Marakwet', 'Nandi', 'Baringo', 'Kericho'],
  'Kakamega': ['Vihiga', 'Bungoma', 'Nandi', 'Siaya', 'Busia'],
  'Meru': ['Tharaka Nithi', 'Isiolo', 'Laikipia', 'Nyeri'],
  'Machakos': ['Nairobi', 'Kiambu', 'Kajiado', 'Makueni', 'Embu', 'Murang\'a'],
  'Kajiado': ['Nairobi', 'Kiambu', 'Machakos', 'Narok'],
  'Kilifi': ['Mombasa', 'Kwale', 'Tana River'],
  // Default: no neighbors
};

function getNeighborCounties(county) {
  return NEIGHBORS[county] || [];
}

/**
 * Find eligible riders for a delivery
 * @param {Object} delivery - The delivery order
 * @param {Array} allRiders - All registered riders
 * @param {Object} options - { includeNeighbors: bool, excludeIds: [] }
 * @returns {Array} Sorted list of eligible riders
 */
function findEligibleRiders(delivery, allRiders, options = {}) {
  const { includeNeighbors = false, excludeIds = [] } = options;
  const pickupCounty = delivery.pickup?.county;
  const pickupWard = delivery.pickup?.ward;

  if (!pickupCounty) return [];

  const eligibleCounties = [pickupCounty, ...(includeNeighbors ? getNeighborCounties(pickupCounty) : [])];

  // Filter riders
  const eligible = allRiders.filter(rider => {
    // Skip if excluded
    if (excludeIds.includes(rider.id)) return false;
    if (delivery.rejectedBy.includes(rider.id)) return false;

    // Must be online
    if (!rider.isOnline) return false;

    // Must not have active order
    if (rider.currentOrderId) return false;

    // Must be in matching county
    const riderCounty = rider.location?.county;
    if (!eligibleCounties.includes(riderCounty)) return false;

    return true;
  });

  // Score riders
  const scored = eligible.map(rider => {
    let score = 100;

    // Same county = bonus
    if (rider.location?.county === pickupCounty) score += 50;
    else score += 10; // neighbor county = smaller bonus

    // Same ward = big bonus
    if (pickupWard && rider.location?.ward === pickupWard) score += 100;

    // Closer base = higher score
    if (rider.radiusKm) score += Math.min(rider.radiusKm, 30);

    // Higher rating = higher score
    if (rider.rating) score += rider.rating * 10;

    // More deliveries = more reliable
    if (rider.totalDeliveries) score += Math.min(rider.totalDeliveries / 10, 20);

    // Lower price = cheaper for platform (small bonus)
    if (rider.pricePerDelivery) score += Math.max(0, 10 - rider.pricePerDelivery / 100);

    return { rider, score };
  });

  // Sort descending
  scored.sort((a, b) => b.score - a.score);
  return scored.map(s => s.rider);
}

module.exports = {
  findEligibleRiders,
  getNeighborCounties,
};
