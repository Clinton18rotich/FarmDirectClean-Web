/**
 * Inheritance Plan Service
 *
 * Allows a parent (parcel owner) to declare how their land should be
 * distributed among their children after they pass away — or as a
 * living transfer.
 *
 * The declaration is NOT a legal will. It is documented intent, witnessed
 * by 3 family elders and confirmed by each beneficiary. Useful for:
 *   - Preventing sibling disputes after the parent dies
 *   - Supporting adverse possession claims (12-year rule)
 *   - Evidence for the Ministry of Lands when formal subdivision is filed
 *
 * Free service. No payments involved.
 */

const storage = require('./storage');
const sms = require('./sms');

const plans = storage.objectToMap(storage.load('inheritance_plans', {}));
const beneficiaries = storage.objectToMap(storage.load('inheritance_beneficiaries', {}));
const elders = storage.objectToMap(storage.load('inheritance_elders', {}));

function persist() {
  storage.save('inheritance_plans', storage.mapToObject(plans));
  storage.save('inheritance_beneficiaries', storage.mapToObject(beneficiaries));
  storage.save('inheritance_elders', storage.mapToObject(elders));
}

function genId(prefix) {
  return prefix + '-' + Date.now().toString(36).toUpperCase() + '-' +
    Math.random().toString(36).slice(2, 6).toUpperCase();
}

function genCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

const MAX_BENEFICIARIES = 20;
const REQUIRED_ELDERS = 3;

/**
 * Declare an inheritance plan for a parcel.
 * Only the parcel owner can declare.
 */
function declarePlan(parcelId, parcel, data) {
  if (!parcel) return { error: 'Parcel not found' };
  if (plans[parcelId] && plans[parcelId].status === 'activated') {
    return { error: 'Plan already activated. Withdraw first to make changes.' };
  }

  const {
    parentName,
    parentPhone,
    notes,
    beneficiaries: benList,
    elders: eldList,
  } = data;

  if (!parentName || !parentPhone) {
    return { error: 'Parent name and phone required' };
  }
  if (!Array.isArray(benList) || benList.length === 0) {
    return { error: 'At least one beneficiary required' };
  }
  if (benList.length > MAX_BENEFICIARIES) {
    return { error: `Maximum ${MAX_BENEFICIARIES} beneficiaries` };
  }
  if (!Array.isArray(eldList) || eldList.length !== REQUIRED_ELDERS) {
    return { error: `Exactly ${REQUIRED_ELDERS} elders required` };
  }

  // Validate share sum ≈ 1.0 (allow 0.99–1.01 for rounding)
  const totalShare = benList.reduce((s, b) => s + Number(b.share || 0), 0);
  if (totalShare < 0.99 || totalShare > 1.01) {
    return { error: `Beneficiary shares must sum to 1.0 (currently ${totalShare.toFixed(2)})` };
  }

  // Withdraw any existing plan for this parcel (fresh declaration)
  if (plans[parcelId]) {
    const oldPlan = plans[parcelId];
    for (const bid of oldPlan.beneficiaryIds || []) delete beneficiaries[bid];
    for (const eid of oldPlan.elderIds || []) delete elders[eid];
  }

  const now = new Date().toISOString();
  const beneficiaryIds = [];
  const elderIds = [];

  for (const b of benList) {
    const bid = genId('BEN');
    const bene = {
      id: bid,
      parcelId,
      name: b.name,
      phone: b.phone,
      relationship: b.relationship || 'Child',
      share: Number(b.share),
      landNote: b.landNote || '',
      status: 'invited',       // invited | confirmed | disputed
      confirmationCode: genCode(),
      invitedAt: now,
      confirmedAt: null,
      disputedAt: null,
      disputeReason: null,
    };
    beneficiaries[bid] = bene;
    beneficiaryIds.push(bid);
  }

  for (const e of eldList) {
    const eid = genId('ELD');
    const elder = {
      id: eid,
      parcelId,
      name: e.name,
      phone: e.phone,
      relationship: e.relationship || 'Family elder',
      status: 'invited',       // invited | confirmed | objected
      confirmationCode: genCode(),
      invitedAt: now,
      confirmedAt: null,
      objectedAt: null,
      objectionReason: null,
    };
    elders[eid] = elder;
    elderIds.push(eid);
  }

  const plan = {
    parcelId,
    parentName,
    parentPhone,
    notes: notes || '',
    beneficiaryIds,
    elderIds,
    status: 'declared',        // declared | activated | disputed | withdrawn
    declaredAt: now,
    updatedAt: now,
    activatedAt: null,
    disputedAt: null,
    disputedBy: null,
    withdrawnAt: null,
  };

  plans[parcelId] = plan;
  persist();

  // Send invites (async, fire-and-forget)
  sendInvites(plan).catch(err => console.error('Invite SMS error:', err.message));

  return { plan: enrichPlan(plan) };
}

/**
 * Send invite SMS to beneficiaries and elders.
 * Called after declarePlan.
 */
async function sendInvites(plan) {
  const parcel = require('./landProtection').getParcel(plan.parcelId);
  const location = parcel ? `${parcel.village || parcel.ward || ''}, ${parcel.county}`.trim() : 'your land';

  for (const bid of plan.beneficiaryIds) {
    const b = beneficiaries[bid];
    const msg = `FarmDirect Inheritance\n\n${plan.parentName} has named you as a beneficiary of the land in ${location}.\n\nYour share: ${(b.share * 100).toFixed(0)}%\n${b.landNote ? 'Note: ' + b.landNote + '\n' : ''}\nReply:\nCONFIRM ${b.confirmationCode} - accept\nDISPUTE ${b.confirmationCode} <reason> - object\n\nParcel: ${plan.parcelId}`;
    await sms.sendSms(b.phone, msg).catch(() => {});
  }

  for (const eid of plan.elderIds) {
    const e = elders[eid];
    const msg = `FarmDirect Inheritance\n\n${plan.parentName} requests you to witness the inheritance plan for land in ${location}.\n\nBeneficiaries: ${plan.beneficiaryIds.length} children\nReply:\nCONFIRM ${e.confirmationCode} - witness\nOBJECT ${e.confirmationCode} <reason> - decline\n\nParcel: ${plan.parcelId}`;
    await sms.sendSms(e.phone, msg).catch(() => {});
  }
}

/**
 * Beneficiary confirms via SMS or app.
 */
function confirmBeneficiary(beneficiaryId, code) {
  const b = beneficiaries[beneficiaryId];
  if (!b) return { error: 'Beneficiary not found' };
  if (b.confirmationCode !== code) return { error: 'Invalid code' };
  if (b.status === 'confirmed') return { error: 'Already confirmed' };
  if (b.status === 'disputed') return { error: 'Already disputed' };

  b.status = 'confirmed';
  b.confirmedAt = new Date().toISOString();
  persist();

  const result = checkActivation(b.parcelId);
  return { beneficiary: b, planStatus: result.plan?.status };
}

/**
 * Beneficiary disputes.
 */
function disputeBeneficiary(beneficiaryId, code, reason) {
  const b = beneficiaries[beneficiaryId];
  if (!b) return { error: 'Beneficiary not found' };
  if (b.confirmationCode !== code) return { error: 'Invalid code' };
  if (b.status !== 'invited') return { error: 'Already ' + b.status };

  b.status = 'disputed';
  b.disputedAt = new Date().toISOString();
  b.disputeReason = reason || 'No reason given';

  const plan = plans[b.parcelId];
  if (plan) {
    plan.status = 'disputed';
    plan.disputedAt = new Date().toISOString();
    plan.disputedBy = b.id;
  }
  persist();

  return { beneficiary: b, plan: enrichPlan(plan) };
}

/**
 * Elder confirms as witness.
 */
function confirmElder(elderId, code) {
  const e = elders[elderId];
  if (!e) return { error: 'Elder not found' };
  if (e.confirmationCode !== code) return { error: 'Invalid code' };
  if (e.status !== 'invited') return { error: 'Already ' + e.status };

  e.status = 'confirmed';
  e.confirmedAt = new Date().toISOString();
  persist();

  const result = checkActivation(e.parcelId);
  return { elder: e, planStatus: result.plan?.status };
}

/**
 * Elder objects to witnessing.
 */
function objectElder(elderId, code, reason) {
  const e = elders[elderId];
  if (!e) return { error: 'Elder not found' };
  if (e.confirmationCode !== code) return { error: 'Invalid code' };
  if (e.status !== 'invited') return { error: 'Already ' + e.status };

  e.status = 'objected';
  e.objectedAt = new Date().toISOString();
  e.objectionReason = reason || 'No reason given';
  persist();

  const result = checkActivation(e.parcelId);
  return { elder: e, planStatus: result.plan?.status };
}

/**
 * Auto-activate when all beneficiaries + all elders have confirmed.
 */
function checkActivation(parcelId) {
  const plan = plans[parcelId];
  if (!plan) return { error: 'No plan' };
  if (plan.status !== 'declared') return { plan: enrichPlan(plan) };

  const allBenConfirmed = plan.beneficiaryIds.every(
    id => beneficiaries[id].status === 'confirmed'
  );
  const allEldersConfirmed = plan.elderIds.every(
    id => elders[id].status === 'confirmed'
  );

  if (allBenConfirmed && allEldersConfirmed) {
    plan.status = 'activated';
    plan.activatedAt = new Date().toISOString();
    plan.updatedAt = plan.activatedAt;
    persist();
    console.log('🏠 Inheritance plan activated:', parcelId);
  }
  return { plan: enrichPlan(plan) };
}

/**
 * Parent withdraws the plan (only before activation).
 */
function withdrawPlan(parcelId, parentPhone) {
  const plan = plans[parcelId];
  if (!plan) return { error: 'No plan to withdraw' };
  if (plan.parentPhone !== parentPhone) return { error: 'Only the parent can withdraw' };
  if (plan.status === 'activated') {
    return { error: 'Cannot withdraw an activated plan. Contact FarmDirect support.' };
  }

  plan.status = 'withdrawn';
  plan.withdrawnAt = new Date().toISOString();
  plan.updatedAt = plan.withdrawnAt;
  persist();

  return { plan: enrichPlan(plan) };
}

/**
 * Enrich a plan with full beneficiary + elder objects (for API response).
 */
function enrichPlan(plan) {
  if (!plan) return null;
  return {
    ...plan,
    beneficiaries: (plan.beneficiaryIds || []).map(id => beneficiaries[id]).filter(Boolean),
    elders: (plan.elderIds || []).map(id => elders[id]).filter(Boolean),
    summary: {
      totalBeneficiaries: plan.beneficiaryIds?.length || 0,
      confirmedBeneficiaries: (plan.beneficiaryIds || [])
        .map(id => beneficiaries[id])
        .filter(b => b && b.status === 'confirmed').length,
      disputedBeneficiaries: (plan.beneficiaryIds || [])
        .map(id => beneficiaries[id])
        .filter(b => b && b.status === 'disputed').length,
      totalElders: plan.elderIds?.length || 0,
      confirmedElders: (plan.elderIds || [])
        .map(id => elders[id])
        .filter(e => e && e.status === 'confirmed').length,
      objectedElders: (plan.elderIds || [])
        .map(id => elders[id])
        .filter(e => e && e.status === 'objected').length,
    },
  };
}

function getPlan(parcelId) {
  return enrichPlan(plans[parcelId]);
}

/**
 * SMS reply handler entry point.
 * Called from webhook.js when a beneficiary or elder replies.
 *
 * Format:
 *   CONFIRM <CODE>            → find by code (any type)
 *   DISPUTE <CODE> <reason>   → beneficiary only
 *   OBJECT  <CODE> <reason>   → elder only
 */
function handleSmsReply(fromPhone, action, code, rest) {
  // Find matching beneficiary or elder by code + phone
  const bene = Object.values(beneficiaries).find(
    b => b.confirmationCode === code && normalizePhone(b.phone) === normalizePhone(fromPhone)
  );
  if (bene) {
    if (action === 'CONFIRM') return confirmBeneficiary(bene.id, code);
    if (action === 'DISPUTE') return disputeBeneficiary(bene.id, code, rest);
    return { error: 'Unknown action for beneficiary' };
  }

  const elder = Object.values(elders).find(
    e => e.confirmationCode === code && normalizePhone(e.phone) === normalizePhone(fromPhone)
  );
  if (elder) {
    if (action === 'CONFIRM') return confirmElder(elder.id, code);
    if (action === 'OBJECT')  return objectElder(elder.id, code, rest);
    return { error: 'Unknown action for elder' };
  }

  return { error: 'No match for code' };
}

function normalizePhone(p) {
  return String(p || '').replace(/\D/g, '').slice(-9);
}

module.exports = {
  declarePlan,
  confirmBeneficiary,
  disputeBeneficiary,
  confirmElder,
  objectElder,
  withdrawPlan,
  getPlan,
  handleSmsReply,
  enrichPlan,
  // For testing / admin
  _plans: plans,
  _beneficiaries: beneficiaries,
  _elders: elders,
};
