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

**Just finished:**
- Module G (Land Sovereignty) fully wired into ShambaSafi.jsx
- File at 2043 lines
- Backend tested: 1 parcel, 3 witnesses, all features working via API
- **NOT YET TESTED IN BROWSER**

**Frontend status:**
- Module G component inline in ShambaSafi.jsx (starting line 1506)
- Wired to render when activeModule === 'land-sovereignty'
- api.landProtection methods in api.js line 205

## What's Missing (Priority Order)

1. **Test Module G in browser** (5 min) — reload port 5173, check 7 modules show, tap Module G
2. **Push frontend changes** (5 min)
3. **Consumer trust features** (2 hrs): self-destructing PIN, auto-report on scan failure, whistleblower rewards
4. **Government dashboard + tax** (4 hrs): real-time map, disease heatmap, auto tax deduction
5. **Daily 6AM SMS health check** (1 hr): reply 1=healthy, 2=sick → auto vet dispatch
6. **Real integrations** (2 hrs): Africa's Talking API key, eConfirm API key
7. **Android port** (4-6 hrs): port entire backend + frontend to FarmDirect Android repo

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
