/**
 * Vehicle Classes — Delivery tiers by capacity and value
 *
 * Riders are assigned a class based on their vehicle. Trades require
 * a class that can handle the value of goods being delivered.
 *
 * Insurance requirements:
 *   - Class A-B: no insurance required (boda, bicycle)
 *   - Class C-D: self-declared insurance (tuktuk, probox)
 *   - Class E-G: insurance certificate uploaded + verified
 */

const VEHICLE_CLASSES = {
  A: {
    code: 'A',
    name: 'Light',
    vehicles: ['Bicycle', 'Hand Cart', 'Donkey Cart'],
    maxValue: 2000,
    maxWeight: 200,
    insuranceRequired: false,
    insuranceVerification: 'none',
    description: 'Small items, within estate or town',
  },
  B: {
    code: 'B',
    name: 'Boda',
    vehicles: ['Motorcycle'],
    maxValue: 5000,
    maxWeight: 100,
    insuranceRequired: false,
    insuranceVerification: 'none',
    description: 'Small parcels, documents, light items',
  },
  C: {
    code: 'C',
    name: 'TukTuk',
    vehicles: ['Tuk Tuk'],
    maxValue: 15000,
    maxWeight: 300,
    insuranceRequired: false,
    insuranceVerification: 'self_declared',
    description: 'Market goods, medium parcels',
  },
  D: {
    code: 'D',
    name: 'Small Transport',
    vehicles: ['Probox', 'Small Pickup', 'Van'],
    maxValue: 30000,
    maxWeight: 800,
    insuranceRequired: false,
    insuranceVerification: 'self_declared',
    description: 'Business deliveries, small cargo',
  },
  E: {
    code: 'E',
    name: 'Pickup',
    vehicles: ['Pickup', 'Small Lorry'],
    maxValue: 100000,
    maxWeight: 1500,
    insuranceRequired: true,
    insuranceVerification: 'upload_required',
    description: 'Farm produce, livestock, medium cargo',
  },
  F: {
    code: 'F',
    name: 'Commercial',
    vehicles: ['Canter', 'Fuso'],
    maxValue: 500000,
    maxWeight: 5000,
    insuranceRequired: true,
    insuranceVerification: 'upload_required',
    description: 'Bulk produce, high-value livestock, cross-county',
  },
  G: {
    code: 'G',
    name: 'Heavy',
    vehicles: ['Trailer', 'Large Trailer', 'Boat', 'Boat/Ferry', 'Ferry'],
    maxValue: 5000000,
    maxWeight: 20000,
    insuranceRequired: true,
    insuranceVerification: 'upload_required',
    description: 'Heavy cargo, long distance, water transport',
  },
};

/**
 * Determine vehicle class from vehicle type
 */
function getClassForVehicle(vehicleType) {
  if (!vehicleType) return null;
  const normalized = String(vehicleType).trim();
  for (const [code, def] of Object.entries(VEHICLE_CLASSES)) {
    if (def.vehicles.includes(normalized)) {
      return { code, ...def };
    }
  }
  // Unknown vehicle type — default to lowest class
  return { code: 'B', ...VEHICLE_CLASSES.B };
}

/**
 * Determine minimum class required to deliver a given value
 */
function getRequiredClass(valueKes) {
  const value = Number(valueKes) || 0;
  if (value <= VEHICLE_CLASSES.A.maxValue) return 'A';
  if (value <= VEHICLE_CLASSES.B.maxValue) return 'B';
  if (value <= VEHICLE_CLASSES.C.maxValue) return 'C';
  if (value <= VEHICLE_CLASSES.D.maxValue) return 'D';
  if (value <= VEHICLE_CLASSES.E.maxValue) return 'E';
  if (value <= VEHICLE_CLASSES.F.maxValue) return 'F';
  return 'G';
}

/**
 * Get the class code of a rider (based on their vehicle)
 */
function getRiderClass(rider) {
  if (!rider || !rider.vehicle) return null;
  return getClassForVehicle(rider.vehicle.type)?.code || 'B';
}

/**
 * Check if a rider can handle a given value
 */
function canRiderHandleValue(rider, valueKes) {
  const riderClass = getRiderClass(rider);
  const requiredClass = getRequiredClass(valueKes);
  return riderClass >= requiredClass; // alphabetical: G is highest
}

/**
 * Check if rider's insurance is valid (by class requirement)
 */
function isInsuranceValid(rider) {
  const cls = VEHICLE_CLASSES[getRiderClass(rider)];
  if (!cls || !cls.insuranceRequired) return true; // not required

  const ins = rider.vehicle?.insurance;
  if (!ins || !ins.uploaded || !ins.verified) return false;
  if (!ins.expiry) return false;

  // Check expiry
  const expiry = new Date(ins.expiry);
  if (isNaN(expiry.getTime())) return false;
  return expiry > new Date();
}

module.exports = {
  VEHICLE_CLASSES,
  getClassForVehicle,
  getRequiredClass,
  getRiderClass,
  canRiderHandleValue,
  isInsuranceValid,
};
