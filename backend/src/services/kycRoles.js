// FILE: backend/src/services/kycRoles.js
// Role-specific KYC requirements. The `documents` array lists what the
// user must upload; `identity` lists what must be verified against IPRS.

const ROLES = {
  farmer: {
    id: 'farmer',
    label: 'Farmer / Seller',
    fee: 500,
    identity: ['national_id', 'selfie'],
    documents: [],
    autoApprovalEligible: true,
    description: 'Sell livestock and produce on FarmDirect',
  },
  rider: {
    id: 'rider',
    label: 'Delivery Rider',
    fee: 500,
    identity: ['national_id', 'selfie'],
    documents: [
      { key: 'vehicle_photo', label: 'Photo of your vehicle', required: true },
      { key: 'driving_license', label: 'Driving license (if applicable)', required: false },
    ],
    autoApprovalEligible: false,
    description: 'Deliver livestock and produce for buyers',
  },
  vet: {
    id: 'vet',
    label: 'Veterinary Professional',
    fee: 1000,
    identity: ['national_id', 'selfie'],
    documents: [
      { key: 'kvb_license', label: 'KVB License (Kenya Veterinary Board)', required: true, hasNumber: true, hasExpiry: true },
      { key: 'practicing_certificate', label: 'Current Practicing Certificate', required: true, hasExpiry: true },
      { key: 'employment_proof', label: 'Employment proof (government vets only)', required: false },
    ],
    autoApprovalEligible: false,
    description: 'Treat sick animals, verify deaths, sign slaughter approvals',
  },
  slaughterhouse: {
    id: 'slaughterhouse',
    label: 'Slaughterhouse',
    fee: 2000,
    identity: ['manager_id', 'manager_selfie'],
    documents: [
      { key: 'business_registration', label: 'Business registration certificate', required: true },
      { key: 'premises_license', label: 'Slaughterhouse premises license', required: true, hasExpiry: true },
      { key: 'dvs_health_certificate', label: 'DVS health certificate', required: true, hasExpiry: true },
      { key: 'water_quality_certificate', label: 'Water quality certificate', required: false, hasExpiry: true },
    ],
    autoApprovalEligible: false,
    description: 'Operate a licensed livestock slaughter facility',
  },
  butcher: {
    id: 'butcher',
    label: 'Butcher / Meat Shop',
    fee: 1000,
    identity: ['national_id', 'selfie'],
    documents: [
      { key: 'business_registration', label: 'Business registration certificate', required: true },
      { key: 'premises_license', label: 'Premises license', required: true, hasExpiry: true },
      { key: 'county_health_certificate', label: 'County public health certificate', required: true, hasExpiry: true },
    ],
    autoApprovalEligible: false,
    description: 'Sell meat directly to consumers',
  },
  meat_handler: {
    id: 'meat_handler',
    label: 'Meat Handler / Transport',
    fee: 300,
    identity: ['national_id', 'selfie'],
    documents: [
      { key: 'health_certificate', label: 'Food handler health certificate', required: true, hasExpiry: true },
    ],
    autoApprovalEligible: false,
    description: 'Transport or handle meat between facilities',
  },
  fisherman: {
    id: 'fisherman',
    label: 'Fisherman / Aquatic Seller',
    fee: 500,
    identity: ['national_id', 'selfie'],
    documents: [
      { key: 'kefs_fishing_license', label: 'KeFS fishing license (Kenya Fisheries Service)', required: true, hasNumber: true, hasExpiry: true },
      { key: 'bmu_membership', label: 'Beach Management Unit (BMU) membership', required: false },
      { key: 'boat_registration', label: 'Boat registration (if applicable)', required: false, hasNumber: true },
    ],
    autoApprovalEligible: false,
    description: 'Sell fish and aquatic products (regulated by KeFS, not DVS)',
  },
};

function getRole(roleId) {
  return ROLES[roleId] || null;
}

function listRoles() {
  return Object.values(ROLES);
}

function getFee(roleId) {
  const r = ROLES[roleId];
  return r ? r.fee : 500;
}

module.exports = { ROLES, getRole, listRoles, getFee };
