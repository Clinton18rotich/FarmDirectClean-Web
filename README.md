# FarmDirect

> Digital infrastructure for Kenyan agriculture — trust, verification, and trade for livestock, land, and produce.

**Repo:** github.com/Clinton18rotich/FarmDirectClean-Web

---

## What FarmDirect Does

FarmDirect is a **trust + trade platform** for Kenyan agriculture with three integrated layers:

1. **Verification** — KYC, land registration, livestock passports
2. **Marketplace** — listings, offers, contact unlock
3. **Trade orchestration** — escrow-funded trade lifecycle with buyer release code

The **animal passport** is the anchor. Every trade references a registered, photo-verified livestock passport.

---

## Core Architecture

```

┌────────────────────────────────────────────────────────┐
│                   VERTICALS (plugins)                  │
│  🐄 livestock · 🌾 crops · 🥩 meat · 🌱 inputs        │
└──────────────────────┬─────────────────────────────────┘
│
┌──────────────────────▼─────────────────────────────────┐
│              TRADES (orchestrator)                     │
│  lifecycle · escrow · delivery · release code          │
└──────────────────────┬─────────────────────────────────┘
│
┌──────────────────────▼─────────────────────────────────┐
│              SERVICES (shared infrastructure)          │
│                                                        │
│  shamba ......... livestock passports                  │
│  market ......... listings + offers + unlocks          │
│  riders ......... delivery partner classes A-G         │
│  trades ......... lifecycle orchestration              │
│  econfirm ....... external escrow provider             │
│  mpesa .......... STK push + B2C                       │
│  kyc ............ seller verification                  │
│  landProtection . GPS boundaries + title vault         │
│  inheritance .... parent-declared land plans           │
│  delivery ....... rider assignment + tracking          │
│  vehicleClasses . capacity/insurance tiers             │
│  reconciliation . payment recovery cron                │
└────────────────────────────────────────────────────────┘

```

---

## The Complete User Flow

### Seller's journey

```

1. Register as farmer (basic)
2. Verify identity — KES 500 KYC
3. Register livestock — photo REQUIRED (anti-theft)
4. Mark for sale — set asking price
5. Receive offers from buyers
6. Counter / accept — negotiation
7. Fund delivery — rider selected, dispatched
8. Ownership transfers on buyer release
9. Get paid via escrow → M-Pesa
10. Rate buyer

```

### Buyer's journey

```

1. Browse marketplace listings
2. Tap listing — sees passport + live animal data
3. Pay KES 100 to unlock seller contact
4. Make offer — KES 45,000 for the cow
5. Negotiate — counter-offer from seller
6. Accept — trade created, listing locked
7. Fund escrow — STK for goods value
8. Negotiate delivery with rider directly
9. Receive animal — inspect
10. Enter 4-digit release code
11. Pay rider directly (M-Pesa)
12. Escrow releases to seller
13. Rate seller + rider

```

### Rider's journey

```

1. Register free — no upfront fee
2. Submit KYC — ID + selfie
3. Get assigned vehicle class (A-G based on vehicle)
4. Go online when available
5. Receive delivery offers matching class
6. Accept + call buyer — negotiate fee
7. Pick up + deliver
8. Get paid directly by buyer
9. Build reputation
10. Auto-promote tier (new → established → trusted)

```

---

## Money Flow (no-splits model)

```

Buyer pays:
• KES 100    → FarmDirect paybill (contact unlock = platform fee)
• KES 45,000 → eConfirm escrow (goods value)
• KES 500+   → rider DIRECTLY (negotiated fee, at handoff)

eConfirm releases:
• KES 45,000 → seller's M-Pesa (minus ~1% eConfirm fee)

FarmDirect keeps:
• KES 100 (already collected at unlock, credited to trade)

Zero PSP license required — FarmDirect never holds client funds.

```

---

## Vehicle Classes (delivery tiers)

| Class | Vehicles | Max Value | Insurance |
|-------|----------|-----------|-----------|
| A | Bicycle, hand cart | KES 2,000 | Not required |
| B | Motorcycle (boda) | KES 5,000 | Not required |
| C | Tuk Tuk | KES 15,000 | Self-declared |
| D | Probox, small pickup | KES 30,000 | Self-declared |
| E | Pickup, small lorry | KES 100,000 | Certificate required |
| F | Canter, Fuso | KES 500,000 | Certificate required |
| G | Trailer, ferry | Unlimited | Certificate required |

**Jobs are only offered to riders whose class can handle the value.**

---

## Services Inventory

| Service | Lines | Purpose |
|---------|-------|---------|
| trades.js | ~820 | Trade lifecycle orchestrator |
| market.js | ~807 | Listings + offers + contact unlocks |
| shamba.js | ~1,800 | Livestock passports + land + slaughterhouses |
| riders.js | ~500 | Rider registration + matching |
| vehicleClasses.js | ~100 | Capacity tiers A-G |
| kyc.js | ~618 | Identity verification |
| landProtection.js | ~1,140 | GPS boundaries + inheritance |
| inheritance.js | ~393 | Parent-declared plans |
| delivery.js | ~224 | Rider dispatch + tracking |
| econfirm.js | ~57 | Escrow provider client |
| mpesa.js | ~228 | M-Pesa STK + B2C |
| reconciliation.js | ~230 | Payment recovery |
| pricing.js | ~232 | Fee calculations |
| revenue.js | ~95 | Revenue tracking |
| kycRoles.js | ~120 | Role-aware KYC config (7 roles: farmer/rider/vet/slaughterhouse/butcher/handler/fisherman) |
| exemptionProviders/ | ~150 | Legal exemption verification — manual now, DVS-ready |
| vet.js | ~620 | Veterinary professionals + sick reports + treatment dispatch |
| healthEvents.js | ~250 | Two-tier health records (self-reported + vet-verified) — Session 6.13 |
| location.js | ~150 | Kenya county/ward/sub-county lookup |
| sms.js | ~200 | Africa's Talking SMS (stub in dev, real in prod) |
| theftAlert.js | ~180 | Theft broadcast tiers (high-value: Cow/Camel/Donkey) |

---

## Backup & Restore

The entire database is JSON files in `backend/data/storage/`.

```bash
# Snapshot (default: keep last 30)
./scripts/backup.sh

# Custom retention
FD_BACKUP_KEEP=100 ./scripts/backup.sh

# List available snapshots
./scripts/restore.sh

# Preview a restore (dry run, writes nothing)
./scripts/restore.sh latest

# Actually restore
CONFIRM=1 ./scripts/restore.sh latest
CONFIRM=1 ./scripts/restore.sh 2026-09-26-164127
```

Snapshots land in `backups/YYYY-MM-DD-HHMMSS/` (gitignored). The
`trades.json.critical` copy in each snapshot is a belt-and-braces
duplicate of the trade ledger.

**After any restore, restart the backend** so it reloads state from disk:

```bash
pkill -9 -f 'server.js'; sleep 2
cd backend && nohup node src/server.js > ~/fd-server.log 2>&1 &
```


---

## API Surface

```

POST   /api/shamba/livestock/register
POST   /api/shamba/livestock/:id/list-for-sale
GET    /api/shamba/livestock/saleable

POST   /api/market/listings
GET    /api/market/listings?county=Bomet
POST   /api/market/listings/:id/unlock
POST   /api/market/offers
POST   /api/market/offers/:id/accept

POST   /api/rider/register
POST   /api/rider/:id/kyc/submit
POST   /api/rider/:id/online
POST   /api/rider/match

POST   /api/trades/create
POST   /api/trades/:id/fund
POST   /api/trades/:id/release
GET    /api/trades/:id
GET    /api/trades/user/:userId

POST   /api/kyc/request                            (role-aware: farmer/rider/vet/...)
POST   /api/kyc/:id/pay
GET    /api/kyc/roles                              (Session 6.12a — list roles)
GET    /api/kyc/roles/:role                        (requirements per role)

POST   /api/land-protection/parcels/register
POST   /api/land-protection/parcels/:id/pay

POST   /api/shamba/livestock/:id/transfer          (Session 5A — gift/inheritance/dowry/sale)

POST   /api/slaughterhouse/slaughter/request
POST   /api/slaughterhouse/slaughter/:id/exemption (Session 6.2 — donkey legal gate)
GET    /api/slaughterhouse/slaughter/:id/exemption
POST   /api/slaughterhouse/slaughter/:id/complete
GET    /api/slaughterhouse/meat/verify/:token      (donkey warning + slaughter story)

POST   /api/admin/exemption/queue                  (Session 6.2 — review queue)
POST   /api/admin/exemption/:id/approve
POST   /api/admin/exemption/:id/reject

POST   /api/webhook/mpesa      (Safaricom callback)
POST   /api/webhook/sms        (Africa's Talking inbound — YES/NO/CONFIRM/DISPUTE/WEIGH)

```

---

## Environment

```bash
# Core
PORT=3001
NODE_ENV=development

# M-Pesa (Safaricom Daraja)
MPESA_ENV=sandbox
BASE_URL=https://sandbox.safaricom.co.ke
CONSUMER_KEY=<from Daraja>
CONSUMER_SECRET=<from Daraja>
SHORT_CODE=174379
PASSKEY=bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919
CALLBACK_URL=https://<tunnel>.trycloudflare.com/api/webhook/mpesa

# eConfirm escrow
ECONFIRM_BASE_URL=https://econfirm.co.ke/api/v1
ECONFIRM_API_KEY=<from econfirm.co.ke/api>

# SMS (Africa's Talking)
AFRICASTALKING_ENV=sandbox
AFRICASTALKING_USERNAME=sandbox
AFRICASTALKING_API_KEY=

# KYC
KYC_PROVIDER=mock
DIDIT_API_KEY=
```

---

Development Setup (Termux on Android)

```bash
# One-time setup
pkg install nodejs git cloudflared

# Daily launch — 3 Termux sessions

# Session 1 — public tunnel
cd ~/FarmDirectClean-Web/backend
./start-tunnel.sh

# Session 2 — backend
cd ~/FarmDirectClean-Web/backend
node src/server.js

# Session 3 — frontend
cd ~/FarmDirectClean-Web
npm run dev
```

Aliases (add to ~/.bashrc)

```bash
alias tn="cd ~/FarmDirectClean-Web"
alias tb="cd ~/FarmDirectClean-Web/backend"
alias tunnel="cd ~/FarmDirectClean-Web/backend && ./start-tunnel.sh"
alias serve="cd ~/FarmDirectClean-Web/backend && node src/server.js"
alias fr="pkill -9 -f 'node src/server.js'; sleep 1; cd ~/FarmDirectClean-Web/backend && node src/server.js"
set +H
```

---

Testing the Full Lifecycle

```bash
# 1. Seller registers + lists
curl -X POST localhost:3001/api/shamba/livestock/register \
  -H "Content-Type: application/json" \
  -d '{"ownerId":"SELLER-1","ownerName":"Test","ownerPhone":"0700000001","type":"Cow","breed":"Friesian","location":{"county":"Bomet"},"photoUrl":"data:..."}'

curl -X POST localhost:3001/api/shamba/livestock/KE-COW-XXX/list-for-sale \
  -H "Content-Type: application/json" \
  -d '{"ownerId":"SELLER-1","askingPrice":45000}'

# 2. Market listing
curl -X POST localhost:3001/api/market/listings \
  -H "Content-Type: application/json" \
  -d '{"passportId":"KE-COW-XXX","sellerId":"SELLER-1"}'

# 3. Buyer unlocks contact
curl -X POST localhost:3001/api/market/listings/LIST-XXX/unlock \
  -H "Content-Type: application/json" \
  -d '{"buyerId":"BUYER-1","buyerPhone":"254708374149"}'

# 4. Buyer makes offer
curl -X POST localhost:3001/api/market/offers \
  -H "Content-Type: application/json" \
  -d '{"listingId":"LIST-XXX","buyerId":"BUYER-1","amount":42000}'

# 5. Seller accepts
curl -X POST localhost:3001/api/market/offers/OFFER-XXX/accept \
  -H "Content-Type: application/json" \
  -d '{"by":"SELLER-1"}'

# 6. Create trade
curl -X POST localhost:3001/api/trades/create \
  -H "Content-Type: application/json" \
  -d '{"offerId":"OFFER-XXX","creatorId":"BUYER-1"}'

# 7. Fund trade
curl -X POST localhost:3001/api/trades/TRADE-XXX/fund

# 8. Rider accepts
curl -X POST localhost:3001/api/trades/TRADE-XXX/rider-accepted \
  -H "Content-Type: application/json" \
  -d '{"riderId":"RDR-1","riderName":"John"}'

# 9. Delivery complete
curl -X POST localhost:3001/api/trades/TRADE-XXX/delivery-complete

# 10. Release with code
curl -X POST localhost:3001/api/trades/TRADE-XXX/release \
  -H "Content-Type: application/json" \
  -d '{"code":"1234","buyerId":"BUYER-1","riderPaymentRef":"MPESA-REF"}'
```

---

The Four Build Sessions

Session 1 — Livestock Marketplace Primitives

· photos[] field, photoUrl required on register
· forSale state machine (none → active → paused → sold)
· markForSale(), markSold(), withdrawFromSale()
· updateOwnership() with history append
· frozenByTradeId lock during active trades
· getSaleableLivestock() search
· livestockPlugin interface

Session 2 — Rider Classes & Availability

· Vehicle classes A-G with value caps + insurance
· Free rider onboarding (no upfront fee)
· KYC submission + admin approval
· Availability calendar + online toggle
· Reliability scoring (0-100)
· Tier auto-promotion
· getEligibleRiders() for delivery matching

Session 3 — Market Layer

· Listings (reference shamba passports)
· Offers with turn-based negotiation
· Contact unlock (KES 100) via STK
· Webhook routing for unlocks
· Reconciliation for stuck unlocks
· Force-confirm dev route (production-gated)
· 21 frontend API methods

Session 4 — Trade Orchestration

· trades.js — full lifecycle orchestrator
· Create from accepted offer → escrow → delivery
· Sequential rider matching with escalation
· 4-digit buyer release code
· Ownership transfer on completion
· Dispute handling
· Deprecated legacy escrow route

---

What's Next

Session 5A ✅ Photos, photo gallery, transfer ownership (shipped 2026-09-23)
Session 5B ✅ Buyer marketplace UI — 9 screens, full trade loop verified (2026-09-24)
Session 6.1 ✅ Donkey filter chips + slaughter-ban warning banners
Session 6.2 ✅ Donkey slaughter SMS gate + legal exemption + traceability
Session 6.12a ✅ Role-aware KYC refactor (7 roles)
Session 6.12b ✅ Vet activation + role-aware KYCModal + fisherman placeholder

Upcoming (unblocked):
· Session 6.13 — Health events (two-tier: self-reported + vet-verified)
· Session 6.14 — Document templates (auto-fill vaccination certs, permits)
· Session 4B — Multi-leg shipment tracking (Track nav: booking office → transit → delivery)
· Session 6.11 — Real chat (threads scoped to trades)
· Session 6.7 — Livestock inheritance (reuses transferOwnership)
· Session 6.8 — Bulk / share sales (sell N of M animals)
· Session 6.9 — Land enhancements (geodesic area, perimeter, GPS accuracy)
· Session 13 — Crops vertical (batch registry, grade certs, weight proof)

Blocked (external):
· Session 5C — Real eConfirm escrow (pending their API reply)
· Session 9 — USSD *384# (pending Africa's Talking production)
· Production — Company registration → Paybill → Daraja production

---

Production Priorities

1. Company registration (3-4 weeks offline)
2. Paybill application (Safaricom)
3. eConfirm — confirm API access
4. Didit — sign up for KYC (500 free/month)
5. Africa's Talking — sign up for SMS
6. Flip .env to production

---

Status

Component Status
Backend services ✅ Complete
Backend routes ✅ Complete
Webhook integration ✅ Complete
M-Pesa integration ✅ Verified vs Safaricom sandbox
Escrow integration ⚠️ Simulated — waiting on eConfirm API access
Frontend (KYC + land) ✅ Complete
Frontend (market + trades) ✅ Complete — full loop verified 2026-09-24
Donkey enforcement (Slaughter Ban 2020) ✅ Complete — SMS gate + exemption + traceability
Role-aware KYC ✅ Complete — 7 roles
Vet verification (KVB) ✅ Complete — KYCModal role='vet' wired
Health events (two-tier) ✅ Complete — self-reported + vet-verified
Chat (backend + frontend) ✅ Complete — threads scoped to listings/trades
Simple login (phone-based) ✅ Complete — /api/auth/lookup + /api/auth/restore
Free buyer registration ✅ Complete — no fee, delivery address captured
Multi-role gate (farmer-vet self-service) ✅ Complete
Privacy masking (meat contact reveal) ✅ Complete
Google OAuth ⏳ Deferred to 6.20g — needs Google Cloud Console Client ID
Multi-leg shipment tracking ⏳ Next up — Session 4B

---

---

## Verticals & Roles

FarmDirect is organised as **verticals** (livestock, fisheries, crops, meat, inputs) that share a common **KYC + trade + delivery** infrastructure. Each vertical has its own regulator, its own facilities, and its own product model.

### Registered KYC roles (7)

| Role | Fee | Regulator | Purpose |
|------|-----|-----------|---------|
| `farmer` | KES 500 | County Agriculture | Sell livestock + crops |
| `rider` | KES 500 | NTSA (vehicle) | Deliver goods |
| `vet` | KES 1,000 | KVB (Kenya Veterinary Board) | Treat, verify, sign |
| `slaughterhouse` | KES 2,000 | DVS | Slaughter livestock |
| `butcher` | KES 1,000 | County Health | Sell meat |
| `meat_handler` | KES 300 | County Health | Transport / handle meat |
| `fisherman` | KES 500 | **KeFS** (Kenya Fisheries Service) | Sell fish & aquatic products |

Every role shares the same KYC pipeline (`kyc.js` + `kycRoles.js`). Adding a new role is a config change, not a code change.

### Fisherman / Aquatic vertical (planned)

Fishermen are **not** farmers — they need a distinct vertical because:

- **Different regulator**: KeFS, not DVS or county agriculture
- **Different facilities**: **landing sites** (not slaughterhouses) — regulated by Beach Management Units (BMUs)
- **Different product model**: **batch/weight-based** (kg of tilapia) — not individual animal passports
- **Different handling**: cold chain (ice, refrigeration), not heat/slaughter
- **Different buyer flow**: hotels/restaurants direct, not peer-to-peer farmers
- **Different documents**: KeFS fishing license, BMU membership, boat registration — **not** KVB license or DVS permits

**Aquatic products in scope:** fish (tilapia, catfish, Nile perch), prawns, crabs, octopus, seaweed, sea cucumbers.

**Why not fold into farmer?** Because forcing fishermen through farmer KYC causes:
- Wrong documents requested (KVB instead of KeFS)
- Wrong marketplace filters (fish under "livestock")
- Wrong regulations (veterinary law applied to fisheries)
- Wrong trust model (cold-chain proof ≠ animal passport)

**Status:** `fisherman` role already registered in `kycRoles.js`. Requires:
1. `fisheries.js` service (parallel to `shamba.js` for fish batches)
2. `LandingSite` facility model (parallel to `Slaughterhouse`)
3. Marketplace "Fisheries" filter chip
4. Batch registry UI (register a catch, not an individual fish)

### Other future verticals

| Vertical | Regulator | Notes |
|----------|-----------|-------|
| **Wildlife farming** (crocodile, ostrich) | KWS | Different permit, individual animal model similar to livestock |
| **Beekeeping** (honey, beeswax) | County Agriculture | Can fold under `farmer` — no slaughter, no cold chain |
| **Crops** (maize, beans, vegetables) | KEPHIS | Batch registry + grade certs + weight proof (Session 13) |
| **Input suppliers** (seeds, fertilizer) | KEBS | SKU-based, not batch or passport (Session 14) |
| **Fish processing** (smoked, dried) | KeFS + County Health | Like butcher but for fish |

### Design principle

**KYC is the shared layer. Each vertical owns its own service, marketplace filter, and facilities model.** Adding a vertical means:
- 1 new entry in `kycRoles.js` (5 minutes)
- 1 new service file (e.g. `fisheries.js`)
- 1 new facility type (e.g. `LandingSite`)
- 1 new marketplace filter chip

No refactor of existing code. This is why the role-aware KYC refactor (Session 6.12a) mattered.

---

Built by Clinton Rotich in Termux on Android.

Every backend service tested. Every state transition verified. Every bug documented.

The economy works.
