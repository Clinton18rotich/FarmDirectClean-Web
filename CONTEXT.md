# FarmDirect — Complete Project Context

## What This Is

FarmDirect is a Kenyan agricultural platform that uses basic phones + toll-free SMS to create an unbreakable digital chain of proof. It protects farmers from theft and eviction, protects consumers from diseased meat, and gives government real-time data.

**Full vision:** Complete Feature → Problem Matrix with 30 features (livestock passport, GPS boundaries, title vault, eviction SOS, meat traceability, pricing engine, etc.)

## Repos

- **FarmDirectClean-Web** (main web repo): github.com/Clinton18rotich/FarmDirectClean-Web
- **FarmDirect** (Android, not yet ported): github.com/Clinton18rotich/FarmDirect
- **shambadirect** (old prototype, to archive): github.com/Clinton18rotich/shambadirect

## Local Setup

- **Web frontend**: `~/FarmDirectClean-Web` (React 19 + Vite 8, port 5173)
- **Backend**: `~/FarmDirectClean-Web/backend` (Node.js + Express, port 3001)
- **Storage**: `~/FarmDirectClean-Web/backend/data/storage/*.json` (JSON files, gitignored)
- **Parts cache**: `~/farm-parts/` (temp component files)
- **Termux**: Android on-device development

## Tech Stack

- Frontend: React 19, Vite 8, no router (single-file App.jsx with tab state)
- Backend: Express, in-memory Maps + JSON file persistence
- Phone: Kenya normalization (+254) via `src/utils/phone.js`
- SMS: Africa's Talking stub mode (ready for real when API key added)
- Escrow: eConfirm adapter (mock mode, ready for real key)
- Locations: 4,837 Kenya places from IEBC-sourced data

## Git History (17 commits, all pushed)

bccfc4d — 🏠 Module G Complete: SOS + Land-Livestock + Leases + Nomadic
7d051fc — 🏠 Module G: GPS Boundaries + Title Vault + Witness Verification
f53b24c — 🎨 Frontend: Physical Profile + Bilingual Guide + SVG Diagrams
8b3a2e1 — 🐄 Livestock Physical Profile + Measurement Guide + Pricing
ab33ed6 — 🏥 Complete Veterinary Network — Module C
d88c851 — 🔔 Working Alerts Feed
76106f1 — 🏭 Module E: Slaughterhouse Portal + Module F: Butchery Portal
4e42915 — 🕯️ Frontend: Death Report + Home Slaughter UI
4ff7220 — 🚨 Real Theft Alert System
d7214f2 — 🕯️ Death Tracking + Meat Safety + Home Slaughter
31f7fb0 — 🥩 Meat Handler + Rich Consumer Traceability
46baeed — 🏭 Slaughterhouse Portal + Full Meat Traceability
27935f2 — 🛡️ Shamba & Mfugo Safi
83c24c9 — 🏍️ Rider + Delivery + Persistence
fe39d9a — 🌾 Farmer + Location + Pochi
d3d06e3 — 💰 Escrow + Business Dashboard + Revenue

## Architecture — 7 ShambaSafi Modules

Inside `src/components/ShambaSafi.jsx` (2043 lines):

| # | Module | Status | Line |
|---|--------|--------|------|
| A | Land Vault (basic) | ✅ Working | — |
| B | Livestock Passport (40+ physical fields, bilingual guide) | ✅ Working | — |
| C | Vet Network (registration, dispatch, treatment) | ✅ Working | 1171 |
| D | Meat Traceability (via Verify view) | ✅ Working | — |
| E | Slaughterhouse Portal | ✅ Working | — |
| F | Butchery Portal | ✅ Working | 941 |
| G | **Land Sovereignty** (GPS, vault, witnesses, SOS, leases) | ✅ **NEW** | 1506 |

## Backend Services (in backend/src/services/)

| File | Purpose |
|------|---------|
| `shamba.js` | Land Vault + Livestock Passport + Death tracking + Home slaughter + Safety classification |
| `vet.js` | Vet registration + sick reports + dispatch + treatment + quarantine |
| `meatHandler.js` | Butchery/supermarket registration |
| `landProtection.js` | GPS boundaries + title vault + witnesses + SOS + leases + nomadic |
| `delivery.js` | Order lifecycle + rider matching |
| `matching.js` | County/ward matching engine |
| `sms.js` | Africa's Talking adapter (stub mode) |
| `storage.js` | JSON file persistence |
| `theftAlert.js` | Theft broadcast to slaughterhouses + police |
| `pricing.js` | Tiered commission engine |
| `discount.js` | Seller discount requests + admin approval |
| `measurementGuide.js` | Bilingual measurement instructions (EN/SW) |
| `physicalAttributes.js` | Livestock physical attribute schema |

## Backend Routes (in backend/src/routes/)

- `/api/shamba` — livestock, land, death, home slaughter
- `/api/vet` — veterinary network
- `/api/meat-handler` — butcheries
- `/api/slaughterhouse` — slaughterhouses
- `/api/land-protection` — Module G
- `/api/delivery` — delivery orders
- `/api/farmer` — farmer registration
- `/api/rider` — rider registration
- `/api/pricing` — commission tiers
- `/api/discount` — discount requests
- `/api/location` — Kenya locations (4,837 places)
- `/api/escrow` — eConfirm adapter (mock)
- `/api/pochi` — Pochi payments
- `/api/webhook` — SMS/USSD callbacks
- `/api/business` — revenue tracking

## Frontend Components (in src/components/)

- `ShambaSafi.jsx` (2043 lines) — main module container with all 7 modules
- `PhysicalProfileForm.jsx` — 8 collapsible sections for livestock
- `MeasurementGuideModal.jsx` — bilingual measurement guide
- `MeasurementDiagram.jsx` — SVG cow diagrams
- `LocationPicker.jsx` — Kenya county/ward cascading picker
- `RiderRegister.jsx` — rider registration
- `FarmerRegister.jsx` — farmer registration
- `Checkout.jsx` — checkout with Wallet/Till/Paybill/Pochi
- `AlertsScreen.jsx` — unified alerts feed

## Key Feature Details

### Livestock Physical Profile (40+ fields)
- Weight OR heart girth + body length (auto-compute weight via formula)
- Body Condition Score (BCS 1-5) with interpretation
- Skin/coat, udder, pregnancy, hooves, teeth, documents
- Auto-computed market value (KES) + breed comparison
- Bilingual measurement guide (English + Kiswahili) with SVG diagrams
- SMS WEIGH command: text "WEIGH 180 140 Cow" → returns weight

### Land Sovereignty (Module G)
- Register parcels with GPS waypoints (live walking)
- Title deed hashing → immutable landmark hash
- Invite 3 neighbors via SMS → auto-verified at 3 confirmations
- Eviction SOS → alerts NLC + contacts + witnesses + police (8 recipients)
- Land-livestock match → verify ownership via animal locations
- Rental grazing leases with SMS approval
- Nomadic herd exemption for pastoralists

### Meat Chain
- Slaughterhouse: request slaughter → owner SMS approval code
- Meat tokens generated (one per package)
- Butchery receives + sells
- Consumer scans token → sees full chain with animal data
- Fraud reporting + auto-block

### Theft Alert
- Theft reported → SMS broadcast to same + neighbor county slaughterhouses, butcheries, community farmers, police (999)
- Alert history preserved for investigation

### Pricing
- Tiered commission: flat KES 20 / 3.5% / 5% / 6% / 7% by order size
- Seller discount request workflow with auto-qualification
- Admin approval dashboard (backend only, no UI yet)

## Current State — Where We Left Off

**Session 5A + 5B COMPLETE — shipped 2026-09-24**

Session 5A commits:
- `424e516` 📸 Photos, photo gallery, list-for-sale, transfer ownership
- `50d2d26` 🧹 Trim whitespace on names, phones, age tags

Session 5B commits (17 commits, `a8d0303` through `cda1c86`):
- MarketplaceScreen (3-tab shell: Browse / My Offers / Selling)
- ListingDetailScreen (passport view, ownership history, seller card)
- UnlockContactModal (KES 100 STK + dev bypass + polling)
- MakeOfferModal (quick-adjust % + note + phone)
- MyOffersTab (buyer's offers, withdraw, track)
- SellingTab (listings + incoming offers, accept/counter/reject)
- TradeCheckout (escrow review + fund + poll, handles "already exists")
- TradeTrackingScreen (role-aware timeline, release code, actions)
- ReleaseCodeModal (4-digit PIN entry, attempt tracking, lockout)
- RiderJobPipeline (active/completed jobs, accept/mark delivered)
- ErrorBoundary (catches render errors, shows on-screen)
- Backend fixes: seller listings return status/sellerId, dup-listing
  prevention, dev-skip-rider route, trade object on error response

All pushed to origin/master. Local + remote in sync. Build clean.

**Verified end-to-end via Android Chrome:**
1. Home → Browse → Marketplace
2. Browse listings → tap card → ListingDetailScreen
3. Unlock contact (KES 100 STK + dev bypass) → CTA flips to Make Offer
4. Make Offer → My Offers tab shows ⏳ Pending
5. Selling tab shows incoming offer with Accept/Counter/Reject
6. Accept → offer flips to ✅ Accepted → Proceed to Escrow CTA
7. TradeCheckout → Create trade → Fund escrow (simulated)
8. TradeTracking → release code 4695 displayed → Enter Release Code
9. ReleaseCodeModal → enter 4695 → 🎉 Escrow Released
10. Trade status `completed`, 8 history events logged end-to-end

**Total shipped:** ~1,400 lines of frontend across 9 new components
+ ~15 backend fixes, all committed and tested.

## What's Missing (Priority Order)

1. **Session 5C — Real eConfirm escrow** — blocked on eConfirm API reply.
   Currently everything runs with simulated escrow (mode='simulated').
   When they reply: swap mpesa.stkPush + econfirm.createEscrow/release.
   Zero UI changes needed — backend client only.

2. **Session 6 — Livestock inheritance** — reuses `transferOwnership()`
   with `reason='inheritance'`. Backend + UI both straightforward now
   that transfer flow is proven.

3. **Home 'Livestock' tab gap** — Home grid reads only from
   /api/farmer/list (produce). Selecting "Livestock" filter shows 0
   even when livestock listings exist. Either merge data sources or
   add "See livestock on Marketplace" CTA.

4. **My Trades screen** — currently no persistent way to see all trades.
   Tracking screens are only reachable via specific offers. Add a
   "Trades" section to MarketplaceScreen or bottom-nav.

5. **Real integrations**: Africa's Talking SMS, Didit KYC, M-Pesa
   production (all blocked on company registration / paybill)

6. **Android port** (4-6 hrs): port entire backend + frontend to
   FarmDirect Android repo

## How To Resume in a New Chat

1. Read this file: `cat ~/FarmDirectClean-Web/CONTEXT.md`
2. Check git: `git log --oneline -5`
3. Start backend: `cd ~/FarmDirectClean-Web/backend && node src/server.js`
4. Start frontend: `cd ~/FarmDirectClean-Web && npm run dev`
5. Open browser: `http://localhost:5173`

## Vocabulary / Naming

- **Shamba** = farm (Kiswahili)
- **Mfugo** = livestock (Kiswahili)
- **Safi** = clean/safe
- **ShambaSafi** = the main module container (7 sub-modules)
- **Pochi la Biashara** = M-Pesa small business wallet
- **Parcel** = land registration unit (PARCEL-XXXXX)
- **Passport** = livestock ID (KE-COW-XXXXX)
- **Meat Token** = QR code for meat package (MEAT-XXXXX)
- **Theft Alert** = SMS broadcast on theft (THEFT-XXXXX)
- **SOS Alert** = eviction emergency (SOS-XXXXX)

## Working Style

- User prefers step-by-step with verification between steps
- Always test with curl before building frontend
- Heredoc (`cat > file << 'EOF'`) sometimes fails on Termux — use Python or temp files
- Large components written to `~/farm-parts/` then inserted via Python
- Confirm before pushing (git status → add → commit → push)
- Kenya-first: real data, KES currency, Kiswahili support, M-Pesa integration

## Immediate Next Action

**Test Module G in browser** and report:
- Does 7 modules show?
- Does Module G open?
- Does the home screen show stats + parcel list?
- Any console errors?

Then push to GitHub.

## Session Update — Latest

**Added since last update:**
- KYC service (backend/src/services/kyc.js) with payment gating
- KYC routes (backend/src/routes/kyc.js) — 10 endpoints
- Seller tiers: Basic (free, KES 5K) / Verified (KES 500, KES 500K) / Premium (KES 200/mo, KES 5M)
- Frontend Module G (Land Sovereignty) — complete and pushed

**Frontend KYC integration NOT done yet** — this is the next task:
1. KYC modal with ID input
2. M-Pesa STK push for KES 500
3. Verified badge on profile
4. Seller tier display in dashboard
5. Gate listings > KES 5,000 behind KYC

**Backend KYC provider:** currently `mock` mode (in .env)
To go live: sign up at didit.me, set KYC_PROVIDER=didit, DIDIT_API_KEY=xxx

**Latest commits:**
- 1735b3d — Frontend Module G (Land Sovereignty)
- 4c42612 — KYC + Payment Gating + Seller Tiers
- 4e38966 — Project Context Document

## Session Update — KYC Frontend Complete

**Added:**
- KYCModal.jsx (223 lines) — full verification flow
- api.kyc methods (10 endpoints)
- App.jsx integration (state, badge, banner, modal)
- Verified ✅ badge in header for verified users
- Blue "Get Verified" banner for unverified farmers
- Green "Verified Seller" banner after verification

**Current KYC mode:**
- M-Pesa: SIMULATED (no real charge)
- IPRS: MOCK provider (always approves)

**To go LIVE:**
1. Real M-Pesa:
   - Backend: POST /api/kyc/:id/pay → STK push
   - Callback: confirm payment → run verification
   - Frontend: replace simulate with real API call
   - Needs: Safaricom Daraja sandbox credentials
2. Real IPRS:
   - Sign up at didit.me (500 free/month)
   - Set KYC_PROVIDER=didit + DIDIT_API_KEY in .env
   - Restart backend

**Latest commits:**
- 5993078 — Frontend: KYC Verification + Seller Tiers UI
- 4c42612 — Backend: KYC + Payment Gating + Seller Tiers
- 1735b3d — Frontend: Module G Land Sovereignty
- 7e51515 — Update context with KYC session

## Session Summary — 2026-09-22

**Shipped:** Complete paid-verification system, code-complete and tested in simulated mode.

**Commits (5):**
- 120fd5d — Real M-Pesa STK push (KYC)
- 78b3d3e — Land fees (KES 500 / 2000)
- 04743d9 — Area fix (m²/acres/ha + promotion + hash freeze)
- 2fb9bbe — Land payment sheet (frontend)
- 3caba70 — Production hardening (reconciliation + IP whitelist + SMS mode)

**Ready for:** Sandbox testing with real Daraja credentials.
**No code changes needed** to flip simulated → sandbox → production.

**Next priorities:**
1. Daraja sandbox test with own phone (~2h)
2. Company registration (name search → BRS → KRA → CR12 → bank → Paybill)
3. Inheritance plan feature (free, no payments needed)

**Three pending gaps addressed in 3caba70:**
- Reconciliation cron for lost callbacks ✅
- Safaricom IP whitelist on /mpesa ✅
- SMS endpoint env-awareness ✅

**Still not built:** inheritance plan, share sales, adverse possession, eConfirm webhook, USSD, government dashboard, blockchain-lite backup.

## 🎉 Sandbox M-Pesa Verified — 2026-09-22

First real STK push accepted by Safaricom Daraja:
- KYC request: KYC-MUCP74J0
- checkoutRequestId: ws_CO_220920261616385708374149
- responseCode: 0 (Success)
- Callback URL: https://deal-denied-san-securities.trycloudflare.com/api/webhook/mpesa

Integration stack fully verified end-to-end:
✅ mpesa.js OAuth token generation
✅ STK Push API call format
✅ Callback URL reachability via Cloudflare Tunnel
✅ Daraja sandbox authentication

Full simulated→real transition demonstrated. Production
credentials alone are what remains for go-live.

## Service Persistence Rules (learned 2026-09-22)

Every persistent service MUST follow these rules:

1. Use storage.objectToMap(), not `new Map()`:
   ✅ const things = storage.objectToMap(storage.load('things', {}));
   ❌ const things = new Map();

2. Use Map methods, never brackets:
   ✅ things.set(id, obj) / things.get(id) / things.delete(id)
   ❌ things[id] = obj / things[id]

3. Define persist() AND call it after every mutation:
   function persist() {
     storage.save('things', storage.mapToObject(things));
   }
   things.set(id, obj);
   persist();   ← MUST call

4. new Map() is ONLY for short-lived caches:
   - activeOffers (in delivery.js)
   - saveTimers (in storage.js)
   - Any ephemeral, per-request state

Bug class discovered:
Object.values(Map) returns bracket-assigned properties
(Object.fromEntries(Map)) does not — this silently split
"read" from "write" paths, making persistence failures invisible.

Files fixed this session:
- kyc.js (earlier)
- inheritance.js (earlier)
- theftAlert.js (earlier)
- escrow.js (now)
- delivery.js (now)
- pochi.js (now)

Verification command (run periodically):
  for f in backend/src/services/*.js backend/src/routes/*.js; do
    if grep -q 'new Map()' "$f" 2>/dev/null; then
      if ! grep -q 'activeOffers\|saveTimers\|cache\[' "$f" 2>/dev/null; then
        echo "⚠️  $f has new Map()"
      fi
    fi
  done

## Positioning Insight (2026-09-23)

Kenya does not have a public, accessible national animal registry.
FarmDirect's livestock passport system is the first consumer-facing
version of this infrastructure.

This changes how the marketplace works:
- Farmers MUST register animals before listing them
- The redirect from "I want to sell livestock" → "Register your animal"
  is not a UX choice — it's the onboarding path to the national registry
- Every farmer who joins becomes a data point in this registry
- When ANITRAC (gov RFID system) rolls out, FarmDirect is the consumer
  layer already in place

Marketing angle: "Kenya's first farm-level animal registry — 
built by farmers, for farmers, before the government did it."

This is a moat. Protect it.

## Session 5A — COMPLETE (2026-09-23)

**SHAs:** `424e516` (main) + `50d2d26` (trim cleanup). Both pushed.

**What landed:**

Frontend:
- Dual camera/gallery photo upload with auto-resize (800px @ 60%)
- Photo required at registration; PhotoViewer full-screen on tap
- PhotoGalleryModal: auto-saves each add/delete, age tags, no Save button
- ListForSaleModal + List for Sale / Withdraw buttons on animal card
- TransferOwnershipModal: gift / inheritance / dowry / direct sale flows
  - Witness section auto-shows for Gift (exactly 2 required)
  - Optional new photo at transfer becomes primary
  - Confirm screen with 30-day warning
- Transfer button on card (row 1, next to Photos)

Backend:
- Photos persist as { url, age, addedAt } objects
- Read-time normalizer upgrades legacy string URLs (no migration)
- POST /api/shamba/livestock/:id/transfer
- transferOwnership() service:
  - witnesses: exactly 2 required for gifts, optional otherwise
  - 30-day frozenUntil lock post-transfer
  - ownership history append with transferReason / note / witnesses
  - optional new photo becomes primary
- Express body limit raised to 10 MB (base64 photos)

**Design decisions locked in code:**
- No KYC to RECEIVE a gift (KYC only needed to sell)
- Exactly 2 family witnesses for gift transfers
- Recipient sees animal immediately in "My Animals"
- 30-day freeze after any transfer (prevent disputes)
- Newest photo at transfer becomes primary automatically
- Photo age tags persist as objects with addedAt timestamps
- Auto-save in PhotoGalleryModal (no unsaved-changes modal)

**Original vision (still holds):** Farmers sell directly to buyers,
eliminating brokers. The animal passport is the anchor. Kenya has
no public national animal registry — FarmDirect's passport is the
first consumer-facing version. When ANITRAC (gov RFID) rolls out,
FarmDirect is the consumer layer already in place.

**Verification completed:** All UI flows exercised via Android Chrome
(register with photo, add 2nd photo with age tag, list for sale at
KES 85,000, open Transfer modal, select Gift, fill witnesses, reach
Confirm screen). Server verified via curl: photos array contains
2 objects with age tags, primary photoUrl matches photos[0].
Backend transfer flow verified separately via curl (gift with 2
witnesses -> owner changed -> frozenUntil set -> re-transfer rejected).

## Known Issues Log (2026-09-23)

### 🐛 Passport IDs use `O` but render like `0`
Livestock passport IDs use letter `O` (e.g. `KE-COW-OO8SI8DW`), but
in the default UI font `O` and `0` are visually identical. Users
reading the ID off the screen type `KE-COW-008SI8DW`, which fails
lookups with "Animal not found". This bit us during Session 5A
verification.

**Fix options (Session 5B candidate or small dedicated patch):**
1. Exclude ambiguous characters (O, I, l, 0, 1, S, 5, Z, 2) from the
   passport ID generator — cleanest long-term fix
2. Add a copy-to-clipboard button next to the passport ID on the card
3. Use a monospace font with slashed zero for ID display

Recommend (1) + (2).

### 🐛 Legacy trailing whitespace in owner names
Older registrations stored names like `'Kipngetich Clinton '` (trailing
space). This split owner counts — `'Kipngetich Clinton '` (1 animal) vs
`'Kipngetich Clinton'` (17 animals). Fixed in `50d2d26` for all new
data (frontend + backend trims), but existing records still have the
bad data. **Needs a migration pass — not yet scheduled.**

### 🔴 No auth layer — session in localStorage only
Farmer identity is stored in browser localStorage. Clearing Chrome
data or opening a fresh browser profile loses the farmer identity;
user must re-register with the same phone to restore. Works for demo,
but blocks production.

**Future:** phone + OTP login (Kenya-friendly). Pairs naturally with
Session 9 (USSD access *384#) since both are phone-based identity.

### 🟡 Multi-Vite port confusion during dev
When Vite is restarted without killing previous processes, it lands on
5174/5175/5176, and Chrome serves cached localStorage against a
different port. Symptom: "Register as farmer first" while animals
exist server-side.

**Rule:** Always `pkill -9 -f vite` before `npm run dev`. Add to
CONTEXT or a dev-only README section.

### 🟡 Chunk size warning at build
Vite warns `Some chunks are larger than 500 kB after minification`
(~570 kB main bundle). Pre-existing, cosmetic. Fix with dynamic
imports / code-splitting in a future session.

## Session 5B — Bugs Found & Fixed (2026-09-24)

### 🐛 Search listings stripped status/sellerId from response
`market.searchListings` returns a curated item shape (id, passportId,
askingPrice, views, animal basics) — but omitting `status` caused
SellingTab's `listings.filter(l => l.status === 'active')` to filter
EVERYTHING out. Symptom: "0 listings" in Selling tab.

**Fix `cda1c86`:** add `sellerId`, `sellerName`, `status` to the
returned item shape. Frontend filter also made tolerant of missing
status.

### 🐛 Duplicate listing created when user taps List for Sale twice
No backend check prevented two active listings for the same passport
+ seller. **Fix `cda1c86`:** `createListing` now rejects if an active
listing already exists for the same passportId + sellerId.

### 🐛 TradeCheckout 90s false timeout on simulated funding
Poll logic only accepted `funded`/`in_transit`/`delivered`/`completed`.
But fundTrade returns `matching_rider` (successful funding → matching).
Modal would spin for 90s then show timeout.

**Fix `28cd7a7`:** `FUNDED_OR_LATER` array treats any post-funding
status as success: matching_rider, rider_assigned, awaiting_release,
releasing, completed, no_rider_available, disputed, failed.

### 🐛 TradeCheckout stuck when trade already exists
After the first checkout attempt, second tap on "Proceed to Escrow"
hit "Trade already exists" but had no escape route — modal just showed
the error.

**Fix `cda1c86`:** backend now passes `trade` object on error; frontend
detects the "already exists" case and calls `onTrack(trade.id)` to
jump straight to tracking screen.

### 🐛 Timeline highlighted stage 1 on completed trades
`STAGES.findIndex(s => s.statuses.includes(status))` returns the first
match. Since `completed` appears in every stage's statuses array, the
timeline always showed stage 1 highlighted.

**Fix `cda1c86` (5B-14):** walk backwards through STAGES to find the
LAST matching stage.

### 🔴 DEV GOTCHA — `pkill -9 -f 'node src/server.js'` misses processes
Servers started with `cd backend && node src/server.js` don't match
the exact-pattern pkill. Four stale servers were racing for port 3001,
curls hit the oldest (pre-fix code), and fixes appeared "not to work."

**Always use `pkill -9 -f 'server.js'`** (broader pattern, catches all
paths ending in server.js). Same class of issue as the multi-Vite
port confusion.

### 🟡 `no_rider_available` is a dead-end for testing
The only registered rider has null vehicleClass/online → matching
never succeeds → trades stuck. Added `/api/trades/:id/dev-skip-rider`
(dev-only, gated by NODE_ENV) to flip status to awaiting_release so
the release flow can be tested.

### 🟡 ErrorBoundary now permanent
Wrapped around ShambaSafi in App.jsx. Caught the `onBrowseMarketplace`
ReferenceError that would have been a white-screen debug session
otherwise. Consider wrapping MarketplaceScreen, TradeTrackingScreen,
and other heavy components too.

### 🟡 Backend releaseCode visible to anyone who fetches trade
Trade object exposes `releaseCode` in API responses. UI hides it
from non-buyers, but API should mask server-side. **Future:**
in `/trades/:id` route, strip `releaseCode` unless `req.query.buyerId
=== trade.buyerId`.

### 🟡 `.pre-*` backup files accumulating in src/components/
`FarmerRegister.jsx.pre-block3i`, `PhotoGalleryModal.jsx.pre-block3f`,
`PhotoGalleryModal.jsx.pre-block3i`, `ShambaSafi.jsx.pre-block3e`,
`ShambaSafi.jsx.pre-payment-sheet`, `ShambaSafi.jsx.pre-5b10d-fix`,
etc. Already in .gitignore, but clutter `ls`. Clean up in a future
session: `rm src/components/*.pre-*`.

### 🟡 App.jsx `checkoutTrade` state now redundant
MarketplaceScreen owns its own `checkoutOffer` state (5B-10f), so
App.jsx's `checkoutTrade` + render is dormant. Remove in cleanup.

---

## Session 6 — COMPLETE (2026-09-25)

Six blocks shipped on the way to full post-5B integration:

| Block | Commit | Summary |
|-------|--------|---------|
| 6.1 | `37ea14e` | Donkey filter chips + slaughter-ban warning banners |
| 6.2 | `a562976` | Donkey slaughter SMS gate + legal exemption + traceability |
| 6.12a | `227ac36` | Role-aware KYC refactor (7 roles) |
| 6.12b | `eadaaf3` | Vet activation + role-aware KYCModal + fisherman placeholder |
| README | `7d641dd` | Full README refresh — Verticals & Roles section |
| cleanup | various | .pre-* purge, missing 5B-10f/5B-11 commits |

### Donkey protection (Kenya Slaughter Ban 2020)

Full enforcement pipeline:
1. Slaughter request for a donkey → status `awaiting_owner_sms`
2. Auto-SMS to registered owner with 6-char approval code
3. Owner replies `YES <code>` or `NO <code>` via SMS
4. 24h timeout → `owner_timeout` (blocked)
5. Owner consent → status `awaiting_exemption`
6. Facility submits DVS/vet exemption document
7. Admin approves via `/api/admin/exemption/:id/approve`
8. Only then can `completeSlaughter` run
9. Meat token carries full story: exemption type, ref, issuer, owner
   consent (SMS text + timestamp), original owner, facility
10. Consumer scan (`/api/slaughterhouse/meat/verify/:token`) shows
    DONKEY warning + `intendedUse: 'disposal'` + not-for-human-consumption

**Provider abstraction:** `exemptionProviders/{index,manual,dvs}.js`
- `manual` — admin reviews uploads (current, default)
- `dvs` — real DVS API (stub ready, `EXEMPTION_PROVIDER=dvs` activates)
- Fallback: DVS fails → manual

Verified end-to-end:
- Donkey `KE-DONK-SVBE14GF` → slaughter request → SMS code 1724
- Owner YES → `awaiting_exemption` → complete BLOCKED
- Exemption `DVS-BMT-2026-0417` submitted → admin approved
- Complete → 2 meat tokens (MEAT-NRYSIH38, MEAT-FUYS6DBB)
- `verifyMeat()` returns full slaughter story

### Role-aware KYC (6.12a)

`kycRoles.js` central config with 7 registered roles:

| Role | Fee | Regulator | Documents |
|------|-----|-----------|-----------|
| farmer | 500 | County Ag | — |
| rider | 500 | NTSA | vehicle_photo, driving_license |
| vet | 1,000 | KVB | kvb_license, practicing_certificate, employment_proof |
| slaughterhouse | 2,000 | DVS | business_registration, premises_license, dvs_health_certificate, water_quality_certificate |
| butcher | 1,000 | County Health | business_registration, premises_license, county_health_certificate |
| meat_handler | 300 | County Health | health_certificate |
| fisherman | 500 | **KeFS** | kefs_fishing_license, bmu_membership, boat_registration |

`createVerificationRequest({ role, documents, metadata })` validates required docs per role. Fee is role-specific. Verification record extended with `role`, `roleLabel`, `documents{}`, `metadata`, `expiry`, `history[]`.

**Activation hook:** `runVerification()` on success calls
`vet.activateVetByUserId()` or `riders.activateRiderByUserId()` — role
services handle their own activation from the KYC approval.

**Frontend:** `KYCModal` now takes `role` prop (defaults to farmer, so
backward compatible). Fetches `GET /api/kyc/roles/:role`, renders
dynamic document uploads, submits to `/api/kyc/request`.

**VetModule** wired: shows "Verify Now — KES 1,000" CTA when
`myVet && !myVet.verified`, KYCModal(role='vet') renders inline,
`✓ KVB VERIFIED` badge when approved.

### Verticals & Roles (2026-09-25 — strategic decision)

**Fisherman is not a farmer.** Full reasoning captured in README
"Verticals & Roles" section. Summary:

- **Regulator:** KeFS (Kenya Fisheries Service), not DVS or county ag
- **Facilities:** landing sites (BMU-managed), not slaughterhouses
- **Product model:** batch/weight-based (kg of tilapia), not individual
  animal passport
- **Handling:** cold chain (ice, refrigeration), not heat/slaughter
- **Documents:** KeFS license, BMU membership, boat registration — not
  KVB / DVS / KWS

**Why separate:** forcing fishermen into "farmer" causes wrong
documents requested, wrong marketplace filter, wrong regulations,
wrong trust model.

**Design principle:** KYC is the shared layer. Each vertical owns its
own service, marketplace filter, and facilities. Adding a vertical =
1 kycRoles entry + 1 service file + 1 facility type + 1 filter chip.
**No refactor needed** — this is why 6.12a mattered.

**Other future verticals:**
- Wildlife (crocodile, ostrich) — KWS, individual animal model like
  livestock
- Beekeeping — fits under `farmer` (no slaughter, no cold chain)
- Crops (Session 13) — KEPHIS, batch registry + grade certs + weight
  proof
- Input suppliers (Session 14) — KEBS, SKU-based
- Fish processing (smoked, dried) — KeFS + County Health, like butcher

**Status:** `fisherman` role registered in `kycRoles.js`. Service
(`fisheries.js`), facility model (`LandingSite`), and marketplace
filter chip TBD in a future session.

### New routes added this session

POST   /api/shamba/livestock/:id/transfer            (Session 5A)
POST   /api/slaughterhouse/slaughter/request
POST   /api/slaughterhouse/slaughter/:id/exemption   (Session 6.2)
GET    /api/slaughterhouse/slaughter/:id/exemption
POST   /api/slaughterhouse/slaughter/:id/complete
GET    /api/slaughterhouse/meat/verify/:token
POST   /api/admin/exemption/queue                    (dev only)
POST   /api/admin/exemption/:id/approve
POST   /api/admin/exemption/:id/reject
GET    /api/kyc/roles
GET    /api/kyc/roles/:role

### Known issues resolved this session

- ✅ `pkill -9 -f 'node src/server.js'` misses processes started with
  `cd backend && node src/server.js`. Always use `pkill -9 -f
  'server.js'` (broader pattern).
- ✅ Missing 5B-10f/5B-11 commits recovered and pushed (`6be518a`).
- ✅ `.pre-*` backup files purged (39 files removed).
- ✅ Donkey O/0 passport ambiguity still open (log for a future
  passport generator fix).

### What's next (post-Session 6)

Immediate (unblocked):
- **Session 6.13** — Health events (two-tier: self-reported + vet-verified)
- **Session 6.14** — Document templates (auto-fill vaccination certs, permits)
- **Session 4B** — Multi-leg shipment tracking (Track nav)
- **Session 6.11** — Real chat (threads scoped to trades)
- **Session 6.7** — Livestock inheritance
- **Session 6.8** — Bulk / share sales
- **Session 6.9** — Land enhancements
- **Session 13** — Crops vertical

Blocked (external):
- **Session 5C** — Real eConfirm escrow (pending reply)
- **Session 9** — USSD *384# (pending Africa's Talking production)
- **Production** — Company registration → Paybill → Daraja

### The two-tier health insight (2026-09-25)

**70% of Kenyan livestock care is self-administered.** Farmers deworm,
spray for ticks, dress wounds, and manage most routine care without
a vet. Only serious illness, difficult births, official certs, and
emergency cases go to a KVB professional.

**Consequence:** if the platform only records vet events, the animal's
health record stays empty because nobody records anything.

**Design (Session 6.13, in progress):** every health event carries a
tier:
- 🩺 **vet_verified** — signed by a KVB-verified professional
- 🧑‍🌾 **self_reported** — owner attests, no vet present
- 👥 **community_attested** — neighbor/extension officer witnessed

Buyers see the tier on each event and can judge trust accordingly.
The animal passport becomes a **complete health diary**, not a
vet-only record.

---

## Design Decision — Chat First for Livestock (2026-09-25)

**Decision:** After unlock, buyers on a livestock listing should reach a
**scoped chat thread**, not a phone call. Chat is the primary interaction
primitive for livestock negotiation; phone is a fallback (via the seller
card's Call link).

### Why chat > call for livestock

1. Livestock deals are negotiated, not decided in one call.
2. Chat creates a paper trail. Evidence for dispute resolution.
3. Async works for farmers — check phone in the evening, reply later.
4. Language flexibility — English + Kiswahili in the same thread.
5. Contact info stays behind the platform — fewer harassment vectors.
6. Scales for the seller — 15 chats in the time of one call.
7. Matches local pattern — replaces WhatsApp with a transaction-scoped
   version.

### Revised flow

Home → tap livestock card → ListingDetailScreen → Unlock Contact (KES 100)
→ [💬 Message Seller] (primary) + [📨 Make Offer] (secondary)
→ chat thread scoped to this listing
→ negotiate → tap [📨 Make Offer] in thread
→ offer + chat history + trade status all in one place

### What this changes

- Bottom-nav Chat tab becomes the inbox.
- ListingDetailScreen after unlock: add Message Seller CTA.
- 6.11 Real Chat is now top-priority next session.

### Scoping

- Thread = a listing OR a trade. Participants = the parties.
- Auto-created when buyer taps Message Seller.
- Auto-archived when trade completes (history preserved).
- Phone numbers withheld until trade completes.
- Notifications: unread badge on Chat tab.
- SMS bridge later (Africa's Talking inbound webhook).

### Next session plan

1. 6.11 Real Chat (~6 hrs)
2. 4B Multi-leg shipment tracking (~6 hrs)
3. 6.14 Document templates (~3 hrs)
4. 6.7-6.9 Inheritance, bulk sales, land

Order rationale: chat is how the deal happens; tracking is what
happens after. Deal > logistics. Docs wait until vets use the platform.
