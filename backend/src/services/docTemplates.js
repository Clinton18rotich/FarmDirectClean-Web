// FILE: backend/src/services/docTemplates.js
// Session 6.14-a — Printable document templates.
// Renders HTML documents (print → PDF via browser) from FarmDirect data.
// Bilingual EN + SW headers. No external deps.

// ─── Helpers ────────────────────────────────────────────────
function esc(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtDate(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return iso; }
}

function fmtDateTime(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

// ─── Shared styles ──────────────────────────────────────────
const STYLES = `
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; background: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  .doc {
    max-width: 780px; margin: 20px auto; background: white; padding: 40px 48px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08); color: #222; line-height: 1.5;
  }
  .header { text-align: center; border-bottom: 3px double #2E7D32; padding-bottom: 16px; margin-bottom: 24px; }
  .brand { font-size: 28px; font-weight: bold; color: #2E7D32; letter-spacing: 0.5px; }
  .brand-sub { font-size: 11px; color: #666; margin-top: 2px; letter-spacing: 1px; text-transform: uppercase; }
  .doc-title-en { font-size: 20px; font-weight: bold; margin-top: 20px; color: #1B5E20; }
  .doc-title-sw { font-size: 14px; font-style: italic; color: #555; margin-top: 2px; }
  .ref { font-size: 11px; color: #666; margin-top: 8px; font-family: monospace; }
  .section { margin-bottom: 22px; }
  .section-title { font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #2E7D32; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #E0E0E0; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; }
  .grid-full { grid-template-columns: 1fr; }
  .field { font-size: 13px; }
  .field-label { color: #666; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
  .field-value { color: #111; font-weight: 500; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
  .badge-verified { background: #E8F5E9; color: #2E7D32; }
  .badge-self { background: #FFF8E1; color: #E65100; }
  .badge-community { background: #E3F2FD; color: #1565C0; }
  .sig-block { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
  .sig-line { border-top: 1px solid #333; padding-top: 6px; font-size: 11px; color: #555; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px dashed #ccc; font-size: 10px; color: #888; text-align: center; line-height: 1.6; }
  .stamp { position: absolute; right: 40px; top: 40px; border: 3px solid #2E7D32; color: #2E7D32; font-weight: bold; padding: 8px 16px; border-radius: 8px; transform: rotate(-12deg); font-size: 12px; opacity: 0.85; }
  @media print {
    body { background: white; }
    .doc { box-shadow: none; margin: 0; max-width: 100%; }
    @page { margin: 15mm; }
  }
`;

// ─── Vaccination / treatment certificate ────────────────────
function renderVaccinationCert({ event, animal, owner, vet }) {
  if (!event) return { error: 'No event provided' };

  const tierBadge =
    event.tier === 'vet_verified' ? '<span class="badge badge-verified">Vet verified · Imethibitishwa</span>' :
    event.tier === 'community_attested' ? '<span class="badge badge-community">Community attested</span>' :
    '<span class="badge badge-self">Self reported · Binafsi</span>';

  const performer = event.performedBy || {};
  const verifier = event.verifiedBy || null;
  const vetRecord = vet || null;

  const certRef = 'FD-CERT-' + (event.id || '').replace(/^HE-/, '').slice(0, 8).toUpperCase();
  const issuedAt = new Date().toISOString();

  return {
    html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(certRef)} — FarmDirect</title>
<style>${STYLES}</style>
</head>
<body>
<div class="doc">
  <div class="header">
    <div class="brand">FarmDirect</div>
    <div class="brand-sub">Digital Livestock Registry · Sajili ya Mifugo</div>
    <div class="doc-title-en">Animal Health Certificate</div>
    <div class="doc-title-sw">Cheti cha Afya ya Mnyama</div>
    <div class="ref">Ref: ${esc(certRef)} · Issued ${esc(fmtDate(issuedAt))}</div>
  </div>

  <div class="section">
    <div class="section-title">Animal · Mnyama</div>
    <div class="grid">
      <div class="field"><div class="field-label">Passport No.</div><div class="field-value" style="font-family:monospace">${esc(animal?.passportId || event.passportId || '—')}</div></div>
      <div class="field"><div class="field-label">Type / Breed</div><div class="field-value">${esc(animal?.animalType || animal?.type || '—')}${animal?.breed ? ' · ' + esc(animal.breed) : ''}</div></div>
      <div class="field"><div class="field-label">Sex / Age</div><div class="field-value">${esc(animal?.sex || '—')}${animal?.ageMonths ? ' · ' + esc(animal.ageMonths) + ' months' : ''}</div></div>
      <div class="field"><div class="field-label">Owner · Mmiliki</div><div class="field-value">${esc(owner?.name || performer.name || '—')}</div></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Treatment / Vaccination · Matibabu</div>
    <div class="grid">
      <div class="field"><div class="field-label">Event type</div><div class="field-value">${esc(event.eventTypeLabel || event.eventType || '—')}</div></div>
      <div class="field"><div class="field-label">Date administered</div><div class="field-value">${esc(fmtDate(event.eventDate))}</div></div>
      <div class="field"><div class="field-label">Product · Dawa</div><div class="field-value">${esc(event.product || '—')}</div></div>
      <div class="field"><div class="field-label">Dosage · Kipimo</div><div class="field-value">${esc(event.dosage || '—')}</div></div>
      <div class="field"><div class="field-label">Method</div><div class="field-value">${esc(event.method || '—')}</div></div>
      <div class="field"><div class="field-label">Batch No.</div><div class="field-value">${esc(event.batchNumber || '—')}</div></div>
      <div class="field grid-full"><div class="field-label">Notes</div><div class="field-value">${esc(event.notes || '—')}</div></div>
      <div class="field grid-full"><div class="field-label">Status</div><div class="field-value">${tierBadge}</div></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Administered by · Aliyetoa</div>
    <div class="grid">
      <div class="field"><div class="field-label">Name</div><div class="field-value">${esc(performer.name || '—')}</div></div>
      <div class="field"><div class="field-label">Role</div><div class="field-value">${esc(performer.role || '—')}</div></div>
      ${verifier ? `
      <div class="field"><div class="field-label">Countersigned by</div><div class="field-value">${esc(verifier.name || '—')}</div></div>
      <div class="field"><div class="field-label">Vet license</div><div class="field-value">${esc(vetRecord?.kvaLicenseNumber || (verifier.kvbVerified ? 'KVB Verified' : '—'))}</div></div>
      <div class="field grid-full"><div class="field-label">Verified on</div><div class="field-value">${esc(fmtDateTime(event.verifiedAt))}</div></div>
      ` : ''}
    </div>
  </div>

  <div class="sig-block">
    <div>
      <div style="height:50px"></div>
      <div class="sig-line">Attending officer signature &amp; stamp<br><em>Sahihi ya afisa na muhuri</em></div>
    </div>
    <div>
      <div style="height:50px"></div>
      <div class="sig-line">Owner signature<br><em>Sahihi ya mmiliki</em></div>
    </div>
  </div>

  <div class="footer">
    This certificate is generated by FarmDirect from the digital livestock registry. Verify authenticity at any time using the passport number above.<br>
    Cheti hiki kimetolewa na FarmDirect kutoka kwa sajili ya kidijitali ya mifugo.<br>
    <strong>farmdirect.co.ke</strong> · Ref ${esc(certRef)} · ${esc(fmtDateTime(issuedAt))}
  </div>
</div>
</body>
</html>`,
    reference: certRef,
    issuedAt,
  };
}

// ─── Stubs for future docs (6.14-b+) ────────────────────────
function renderMovementPermit(/* { trade, animal, owner, buyer } */) {
  return { error: 'Not implemented yet — coming in 6.14-b' };
}

function renderHealthCert(/* { animal, vet } */) {
  return { error: 'Not implemented yet — coming in 6.14-b' };
}

module.exports = {
  renderVaccinationCert,
  renderMovementPermit,
  renderHealthCert,
  // exported for tests
  _esc: esc,
  _fmtDate: fmtDate,
};
