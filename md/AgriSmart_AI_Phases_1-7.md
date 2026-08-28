# AgriSmart AI — Phases 1–7: Complete Implementation Roadmap

*Digital Marketplace and Forecasting Platform to Reduce Post-Harvest Tomato Losses in Ghana*

**Version:** 1.0  
**Prepared:** August 2026  
**Total Duration:** ~38 weeks (~9 months)  
**Document Type:** Comprehensive Phase Breakdown with Timelines, Deliverables, and Exit Criteria

---

## Executive Summary

This document outlines the complete 7-phase implementation roadmap for AgriSmart AI, from initial design through pilot launch, operation, and go/no-go evaluation. Each phase is detailed with specific objectives, tasks, owners, timelines, dependencies, and exit criteria.

| Phase | Name | Duration | Status | Key Output |
|-------|------|----------|--------|-----------|
| 0 | Foundation | Complete | ✅ Complete | SRS, Field Research, Project Abstract |
| 1 | Design & Planning | 4 weeks | **Current** | Architecture, Contracts, Pilot Partners, Baseline Data |
| 2 | MVP Build | 8 weeks | Pending | REST API, USSD/SMS, Mobile App, Admin Dashboard |
| 3 | Forecasting & Logistics | 6 weeks | Pending | AI Module, Payments, Transport, Ratings |
| 4 | Testing & Hardening | 3 weeks | Pending | QA, Security, Performance, Usability |
| 5 | Pilot Launch | 2 weeks | Pending | User Onboarding, Support Infrastructure |
| 6 | Live Operation | 12 weeks | Pending | Platform Live, Data Collection, Iteration |
| 7 | Evaluation & Decision | 3 weeks | Pending | Impact Analysis, Go/No-Go Decision, Roadmap |

**Total: 38 weeks**

---

## Phase 0: Foundation (Complete)

**Status:** ✅ **Complete**

### Objectives
- Conduct field research with target users
- Document pain points and requirements
- Develop project abstract and SRS
- Establish baseline metrics

### Deliverables
- ✅ Field Interview Findings Report
- ✅ AgriSmart AI Project Abstract
- ✅ SRS v1.0 (9 functional requirement groups, 4 non-functional requirement groups)
- ✅ Baseline understanding of post-harvest loss, payment delays, transport costs

### Key Evidence Gathered
- Farmers sell maize at ~GHS 600 vs. expected value ~GHS 1,000 (40% loss)
- Tomato farmers report unreliable buyers and delayed payments
- Market sellers (e.g., Janet Mensah) lack access to competitive pricing and storage
- Target users include both feature phone and smartphone users

---

## Phase 1: Design & Planning (Weeks 1–4)

**Duration:** 4 weeks  
**Status:** Current  
**Dependencies:** Phase 0 complete

### Objectives
1. Finalize technical architecture
2. Secure external partnerships (SMS/USSD gateway, mobile money, data providers)
3. Recruit and commit pilot partners
4. Establish baseline metrics collection process

---

### Workstream 1.1: Technical Architecture

**Responsible:** Architecture lead, Backend lead, Mobile lead  
**Duration:** 4 weeks (parallel with other workstreams)

#### Backend Architecture
- **Tech Stack:** Express.js (Node.js), in-memory store for Phase 2–3, Postgres for Phase 4
- **API Design:** RESTful endpoints for users, listings, pre-commitments, transactions, transport, prices, forecasts
- **Data Model:** Users (with roles: farmer, buyer, seller, transporter), Listings, Pre-commitments, Transactions, Transport Requests, Ratings, Forecasts
- **Authentication:** Phone-based (USSD) + optional app login (Phase 2+)

#### USSD/SMS Gateway Integration
- **Approach:** Mimic standard African gateway contract (Africa's Talking, Hubtel pattern)
- **Webhook Shape:** `{ sessionId, phoneNumber, text }` → `CON .../END ...`
- **Session Model:** Stateful, accumulate user input via `*` separator
- **Deliverable:** Architecture diagram, webhook contract specification

#### Mobile Money Integration
- **Providers:** MTN MoMo, AirtelTigo Money (TBD)
- **Flows:** Collections (buyer pays), Disbursements (farmer receives), Settlement (to bank account)
- **Security:** Credentials managed securely; rotate on schedule
- **Deliverable:** API integration contract, sandbox credentials

#### Mobile App Stack
- **Platform:** React Native or Flutter (TBD)
- **Requirements:** Low-bandwidth support, < 10 MB size, offline-capable
- **Target Devices:** Android 8+, feature phone support via USSD
- **Deliverable:** Technology selection document, proof-of-concept screen mockups

#### Data Persistence Roadmap
- **Phase 2–3:** In-memory store (JSON-serializable, resets on server restart)
- **Phase 4:** Migrate to Postgres (schema designed now, migration toolkit created)
- **Deliverable:** Postgres schema draft, in-memory store interface design

**Deliverable:** Technical Architecture Document (10–15 pages, approved by CTO)

---

### Workstream 1.2: External Integration Contracting

**Responsible:** Business Development, Finance, Engineering Lead  
**Duration:** 4 weeks (critical path items)

#### SMS/USSD Gateway Selection & Contracting
| Task | Duration | Owner | Dependency |
|------|----------|-------|-----------|
| Vendor evaluation (Africa's Talking, Hubtel, others) | 1 week | BD + Eng | Architecture decision |
| Negotiate contract terms (rates, response SLA, support) | 1 week | BD + Finance | Vendor selection |
| Obtain sandbox credentials | 0.5 week | Eng | Contract signed |
| Test webhook integration | 0.5 week | Eng | Sandbox access |

**Exit Criteria:**
- ✅ Vendor selected and contract signed
- ✅ Sandbox webhook working with test curl commands
- ✅ Rate card and SLA documented

#### Mobile Money Provider Selection & Contracting
| Task | Duration | Owner | Dependency |
|------|----------|-------|-----------|
| Vendor evaluation (MTN MoMo, AirtelTigo) | 0.5 week | Finance + Eng | Architecture decision |
| Negotiate settlement terms (fee %, turnaround time) | 1 week | Finance | Vendor selection |
| Obtain API credentials (sandbox) | 1 week | Eng | Contract signed |
| Test Collections and Disbursements flow | 1 week | Eng | Sandbox access |

**Exit Criteria:**
- ✅ Vendor selected and contract signed
- ✅ API credentials in hand
- ✅ Collections and Disbursements flows tested with small amounts

#### Historical Price Data Access
| Task | Duration | Owner | Dependency |
|------|----------|-------|-----------|
| Identify sources (Ministry of Food & Agriculture, market partners, NGOs) | 0.5 week | Data lead | Field contacts |
| Negotiate data licensing or MOU | 1 week | BD | Source identified |
| Validate data quality and completeness (Central Region, tomato, 24+ months) | 1 week | Data analyst | Data received |
| Ingest into development database | 0.5 week | Data eng | Quality validated |

**Exit Criteria:**
- ✅ Historical price data (≥ 24 months) for Central Region tomato
- ✅ Data quality validated (completeness, outliers handled)
- ✅ Data ingested and accessible to forecasting team

#### Weather Data Access
| Task | Duration | Owner | Dependency |
|------|----------|-------|-----------|
| Select provider (NOAA, OpenWeatherMap, local meteorology) | 0.5 week | Data lead | Requirements |
| Obtain API credentials | 0.5 week | Data eng | Provider selected |
| Validate availability for pilot region (lat/lon coverage) | 0.5 week | Data analyst | API access |
| Integrate into development environment | 0.5 week | Data eng | Validation complete |

**Exit Criteria:**
- ✅ Weather data (temperature, rainfall, humidity) for Central Region
- ✅ Historical data (≥ 5 years) available for backtesting
- ✅ API accessible to forecasting module

**Deliverable:** Summary of all external integrations (4 providers, contracts, credentials, test results)

---

### Workstream 1.3: Pilot Partner Recruitment & MOUs

**Responsible:** Field Operations Lead, Product Manager  
**Duration:** 4 weeks

#### Farmer Group / Cooperative (30–50 farmers target)
| Task | Duration | Owner | Details |
|------|----------|-------|---------|
| Identify and contact farming cooperatives in Central Region | 1 week | Field ops | E.g., groups near Kasoa, Donasi Market, Ada |
| Arrange meeting with group leadership | 1 week | Field ops | Explain platform, benefits, onboarding process |
| Negotiate MOU (commitment to onboard farmers, data sharing) | 1 week | Field ops + BD | Address liability, profit-sharing, support expectations |
| Finalize list of participating farmers (with contact info) | 1 week | Field ops | Device types, language preferences, literacy level noted |

**MOU Key Points:**
- Group commits to recruit and onboard 30–50 farmers by Week 22
- Farmers agree to use platform for at least one harvest cycle
- Group facilitates in-person onboarding and helpline support
- Data sharing agreement (anonymized usage metrics, crop volumes, prices, feedback)
- Profit-sharing model (if applicable) or fixed fee for support services

**Exit Criteria:**
- ✅ Farming cooperative MOU signed
- ✅ Farmer list with 30–50 names and contact details
- ✅ Baseline farmer interviews (current loss rate, current buyers, pain points)

#### Market Seller Association (15–20 sellers target)
| Task | Duration | Owner | Details |
|------|----------|-------|---------|
| Contact retail market associations (Ashanti Market, Kasoa Central, etc.) | 1 week | Field ops | Use existing contacts if available |
| Demonstrate value (direct farmer supply, price transparency) | 1 week | Field ops + Product | Show mockup/demo if needed |
| Negotiate MOU (onboarding, commission/fee model) | 1 week | Field ops + BD | Address supply reliability, quality guarantees |
| Finalize list of participating sellers | 0.5 weeks | Field ops | Device types, storage capacity, sourcing preferences noted |

**MOU Key Points:**
- Association commits to recruit and onboard 15–20 market sellers by Week 22
- Sellers agree to use platform to source produce and rate farmers
- Platform takes small commission (TBD) on transactions or flat fee
- Association provides dispute resolution support
- Data sharing for transparency reports

**Exit Criteria:**
- ✅ Market seller association MOU signed
- ✅ Seller list with 15–20 names and stall locations
- ✅ Baseline seller interviews (current sourcing, prices, storage needs)

#### Transport Provider Partner (3–5 vehicles target)
| Task | Duration | Owner | Details |
|------|----------|-------|---------|
| Identify private logistics firms or transport cooperatives | 0.5 weeks | Field ops | Use farming group network for referrals |
| Pitch transport coordination feature (higher bookings, pooling savings) | 1 week | Field ops + Product | Show benefit (cost savings + utilization) |
| Negotiate MOU (fleet commitment, rate card, integration) | 1 week | Field ops + BD | Address payment terms, booking guarantee, peak-season capacity |
| Finalize vehicle and driver details | 0.5 weeks | Field ops | GPS capability, phone contact, vehicle type/capacity |

**MOU Key Points:**
- Provider commits 3–5 vehicles to pilot
- Rates published on platform; pooling algorithm optimizes routing
- Platform takes small % commission on bookings (TBD)
- Guaranteed minimum monthly bookings (TBD) or subsidy for pilot
- Driver training on platform workflows (Week 21–22)

**Exit Criteria:**
- ✅ Transport provider MOU signed
- ✅ Vehicle and driver list (vehicle type, capacity, phone, area of coverage)
- ✅ Rate card provided (cost per km, per ton, etc.)

**Deliverable:** 3 signed MOUs + pilot user registry (75–95 users) with baseline interviews

---

### Workstream 1.4: Baseline Metrics & Data Collection Setup

**Responsible:** M&E Lead, Data Analyst, Field Operations  
**Duration:** 4 weeks

#### Baseline Metrics to Collect

| Metric | Definition | Collection Method | Target | Frequency |
|--------|-----------|-------------------|--------|-----------|
| **Post-Harvest Loss Rate** | % of harvest that spoils before sale | Farmer interview (recall + direct observation if possible) | 30–40% (typical) | 2x during pilot (mid + end cycle) |
| **Farm-Gate Price** | Price farmer receives per unit | Transaction records + farmer recall | GHS 400–600/unit (tomato) | Weekly average |
| **Payment Delay Rate** | % of sales with delayed payment | Farmer/buyer interview | 25–30% (baseline typical) | 2x during pilot |
| **Current Buyer Network** | How farmers find buyers | Interview | Mostly local markets, word-of-mouth | Once (Phase 1) |
| **Transport Costs** | Per-farmer cost for produce haulage | Farmer/transporter interview | GHS 50–80/farmer/trip | Once (Phase 1) |
| **Device Mix** | % feature phone vs. smartphone | Survey | Mix (majority feature phone) | Once (Phase 1) |
| **Literacy Level** | Self-assessed or direct test | Survey | Mixed literacy; Twi/Ga fluency high | Once (Phase 1) |
| **Storage Access** | Who has access to cool storage | Interview | Few sellers have any storage | Once (Phase 1) |

#### Baseline Data Collection Plan

| Phase | Timeline | Method | Participants | Owner |
|-------|----------|--------|--------------|-------|
| **Farmer Baseline** | Weeks 1–3 | Phone/in-person interviews | 20–30 farmers (sample from 75–95 pilot list) | Field ops |
| **Seller Baseline** | Weeks 1–3 | In-person interviews at markets | 10–15 market sellers | Field ops |
| **Transporter Baseline** | Weeks 2–3 | Phone interview with provider leadership | 3–5 transport providers | Field ops |
| **Consolidation** | Week 4 | Aggregate, validate, document | M&E lead | Data analyst |

**Data Capture Tools:**
- Structured interview guide (Google Form or paper form + manual entry)
- Photography (produce quality, market conditions, transport vehicles) — optional
- Basic video testimonials from 2–3 farmers and sellers — optional

**Deliverable:** Baseline Metrics Report (10–15 pages)
- Summary statistics (mean, median, range) for each metric
- Narrative of typical farmer/seller pain points and aspirations
- Comparison with Phase 0 field research findings
- Risk flags (e.g., "transport availability is seasonal")

---

### Phase 1 Exit Criteria & Sign-Off

**Must be true to proceed to Phase 2:**

- ✅ Technical Architecture Document approved by CTO (backend, USSD, mobile, data persistence roadmap)
- ✅ SMS/USSD Gateway: Contract signed; sandbox webhook tested and working
- ✅ Mobile Money Provider: Contract signed; API credentials obtained; Collections/Disbursements flows tested
- ✅ Historical Price Data: ≥ 24 months available, validated, ingested
- ✅ Weather Data: ≥ 5 years available, API functional, integrated into dev environment
- ✅ Farmer Cooperative: MOU signed; 30–50 farmers registered with baseline data
- ✅ Market Seller Association: MOU signed; 15–20 sellers registered with baseline data
- ✅ Transport Provider: MOU signed; 3–5 vehicles + drivers committed
- ✅ Baseline Metrics Report: Complete and reviewed
- ✅ All deliverables documented and archived
- ✅ **Kick-off Meeting:** All workstreams + stakeholders agree Phase 2 can start

**Sign-Off Authority:** Product Lead + CTO + Field Operations Lead + Finance

---

## Phase 2: MVP Build (Weeks 5–12)

**Duration:** 8 weeks  
**Status:** Pending  
**Dependency:** Phase 1 complete

### Objectives
1. Build core marketplace data model and REST API (14 endpoints)
2. Build USSD menu system with session management
3. Build low-bandwidth mobile app (iOS/Android)
4. Build read-only admin dashboard
5. Achieve end-to-end flow: farmer lists → buyer pre-commits → farmer accepts

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    AgriSmart AI MVP (Phase 2)                 │
├─────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  USSD Menu   │  │  Mobile App  │  │  Web Admin   │       │
│  │  (SMS/USSD)  │  │ (iOS/Android)│  │ Dashboard    │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
│         │                 │                 │                │
│  ┌──────▼─────────────────▼─────────────────▼──────┐       │
│  │          REST API (Express.js)                   │       │
│  │  - /api/users                                    │       │
│  │  - /api/listings                                │       │
│  │  - /api/precommitments                          │       │
│  │  - /api/transactions                            │       │
│  │  - /api/transport-requests                      │       │
│  │  - /api/prices                                  │       │
│  │  - /api/notifications                           │       │
│  │  - /api/summary (dashboard)                     │       │
│  └──────┬────────────────────────────────────────┘       │
│         │                                                   │
│  ┌──────▼──────────────┐                                   │
│  │  In-Memory Store    │                                   │
│  │  (JSON, Phase 2–3)  │                                   │
│  └─────────────────────┘                                   │
│                                                                │
└─────────────────────────────────────────────────────────────┘
```

---

### Workstream 2.1: Backend & Data Model

**Responsible:** Backend Lead, Backend Engineers  
**Duration:** 8 weeks (overlapping with other streams)

#### Week 1: Data Model Design & API Skeleton

| Entity | Fields | Purpose |
|--------|--------|---------|
| **User** | id, phone, role (farmer/buyer/seller/transporter), name, location, created_at, ratings | Core user info |
| **Listing** | id, farmer_id, crop_type, quantity, unit, price, harvest_date, location, status (pending/active/sold), created_at | Farmer produce |
| **PreCommitment** | id, listing_id, buyer_id, quantity_offered, price_offered, status (pending/accepted/rejected/countered), created_at, updated_at | Buyer interest |
| **Transaction** | id, precommitment_id, amount, payment_status (pending/in_progress/completed/overdue), due_date, created_at | Payment tracking |
| **TransportRequest** | id, farmer_id, buyer_id, origin, destination, crop_type, quantity, requested_date, transporter_id, status (open/assigned/confirmed/delivered) | Logistics |
| **Price** | id, crop_type, market, price, date | Market data (seeded) |
| **Rating** | id, rater_id, rated_user_id, stars, comment, created_at | Trust building |
| **Notification** | id, user_id, type (sms/ussd/app), message, sent_at | Message log |

**Deliverable:** In-memory store interface (store.js) with CRUD functions for each entity

#### Weeks 2–4: REST API Endpoints

| Endpoint | Method | Purpose | Priority |
|----------|--------|---------|----------|
| `/api/users` | POST | User registration | Must |
| `/api/listings` | POST | Create listing | Must |
| `/api/listings?cropType=&location=&status=` | GET | Search/filter listings | Must |
| `/api/precommitments` | POST | Submit pre-commitment | Must |
| `/api/precommitments/:id/respond` | POST | Accept/reject/counter | Must |
| `/api/prices/current?cropType=&market=` | GET | Current price | Must |
| `/api/prices/history?cropType=&market=&weeks=` | GET | Price history | Must |
| `/api/transactions` | POST | Create transaction | Must |
| `/api/transactions/:id/pay` | POST | Mark paid | Must |
| `/api/transactions/reminders/run` | POST | Trigger reminders | Should |
| `/api/transport-requests` | POST | Create request | Should |
| `/api/transport-requests/:id/assign` | POST | Assign transporter | Should |
| `/api/notifications` | GET | View notification log | Must |
| `/api/summary` | GET | Admin dashboard data | Must |

**Response Format (JSON):**
```json
{
  "success": true,
  "data": { /* entity or array */ },
  "message": "Operation completed"
}
```

**Error Handling:**
- 400 Bad Request (validation errors)
- 404 Not Found (entity not found)
- 500 Internal Server Error (with stack trace in dev mode only)

**Deliverable:** All 14 endpoints operational; README.md with curl examples for each endpoint

#### Weeks 5–8: Advanced Features & Integration

| Feature | Task | Duration | Owner |
|---------|------|----------|-------|
| Payment Reminder Logic | Calculate overdue transactions; log SMS reminders to `/api/notifications` | 1 week | Backend eng. |
| Notification Service | Implement SMS/USSD notification queuing; integrate with USSD webhook | 1 week | Backend eng. |
| Ratings System | Aggregate user ratings; display on user profile | 0.5 weeks | Backend eng. |
| Seeded Demo Data | Populate prices, users, sample listings for testing | 0.5 weeks | Backend eng. |
| Rate Limiting | Add rate limits to prevent brute-force attacks | 0.5 weeks | Backend eng. |

**Deliverable:** Production-ready REST API (localhost:3000) with 100+ users, 50+ listings, 0 data loss

---

### Workstream 2.2: USSD & SMS

**Responsible:** USSD Engineer, Backend Integration Lead  
**Duration:** 8 weeks

#### Week 1–2: USSD Menu Architecture & Session Model

**Session State Machine:**
```
User initiates USSD
    ↓
Welcome menu (1. Register, 2. List Produce, 3. Check Price, 4. Check Status)
    ├─→ 1. Register → Collect phone, role, crop type, location → Confirm
    │                         ↓
    │                    User registered
    │
    ├─→ 2. List Produce → Collect crop, quantity, price, harvest date → Confirm
    │                         ↓
    │                    Listing created
    │
    ├─→ 3. Check Price → Enter crop type and market → Display current + trend
    │
    └─→ 4. Check Status → List all active pre-commitments and transactions → Show details
```

**Technical Implementation:**
- **Webhook:** `POST /ussd` receives `{ sessionId, phoneNumber, text }`
- **Response:** `CON ...` (continue) or `END ...` (close session)
- **Text Accumulation:** Each input concatenated with `*` separator (Africa's Talking pattern)
- **Session Storage:** Keep user state in-memory (sessionId → user data mapping)
- **Timeout:** 10 minutes of inactivity closes session

**Deliverable:** USSD menu flowchart (Lucidchart/Miro); webhook handler code (ussd.js)

#### Weeks 3–6: Menu Flows

| Flow | Menu Items | Duration | Details |
|------|-----------|----------|---------|
| **Registration** | Name, Phone (verify via OTP stub), Role choice, Crop type(s), Location | 1.5 weeks | Validate phone format; OTP stub (real SMS in Phase 3) |
| **List Produce** | Crop type, Quantity, Unit, Expected harvest date, Asking price | 1.5 weeks | Date picker via numeric input; price validation |
| **Browse Listings** | Filter by crop (menu choice), location (enter or default) | 1 week | Display results paginated (5 per screen); show seller name + rating |
| **Check Price** | Crop type (menu), Market (type or use default) | 0.5 weeks | Show: current price, avg price (4-week window), trend arrow (↑/→/↓) |
| **Check Status** | Display all active pre-commitments (buyer name, qty, price, status) | 1 week | Show next action needed (e.g., "Respond to pre-commitment from XYZ") |
| **Submit Pre-Commitment** | Confirm listing ID, Enter quantity, Enter price offer | 1 week | Verify buyer role; confirm via SMS stub |
| **Error Handling** | Invalid input, timed out, server errors | 0.5 weeks | Return helpful error messages; offer retry |

**Deliverable:** All 6+ USSD flows tested via curl and gateway sandbox

#### Weeks 7–8: SMS Notification Service

| Task | Duration | Details |
|------|----------|---------|
| Design notification types | 0.5 weeks | List all events that trigger SMS (pre-commitment received, payment overdue, transport assigned, etc.) |
| Implement notification logging | 0.5 weeks | Write to in-memory notifications table; accessible via `/api/notifications` |
| Integration with USSD | 0.5 weeks | Webhook logic automatically triggers SMS on certain state transitions |
| SMS Provider Stub | 0.5 weeks | Create stub that logs SMS to console + database instead of sending to provider; ready to swap for real provider in Phase 3 |

**Notification Types (Phase 2 MVP):**
1. Farmer receives pre-commitment → SMS stub: "Buyer XYZ offers GHS 5000 for 10 bags. Reply 1 to accept, 2 to reject."
2. Buyer receives response → SMS stub: "Farmer confirmed 10 bags at GHS 5000. Transport available 15th."
3. Payment overdue → SMS stub: "Payment for order XYZ is 5 days overdue. Reply to pay or contact support."
4. Transport assigned → SMS stub: "Transport confirmed for your order. Driver phone: 0244123456."

**Deliverable:** SMS notification service; all flows tested; `/api/notifications` shows message log

---

### Workstream 2.3: Mobile App (Low-Bandwidth)

**Responsible:** Mobile Lead, Mobile Engineers (iOS + Android)  
**Duration:** 8 weeks

#### Tech Stack Decision (Week 1)
- **Option A:** React Native (cross-platform, faster to market)
- **Option B:** Flutter (good performance, smaller bundle)
- **Decision:** React Native (larger community, easier to find developers)
- **Target:** Android 8+; iOS 12+ (if needed); < 10 MB APK

#### Week 2–3: App Architecture & Navigation

```
Login / Registration
    ↓
Dashboard (for all user roles)
├─→ Farmer Dashboard
│   ├─→ Create Listing
│   ├─→ Browse Pre-commitments
│   └─→ View Ratings & Profile
├─→ Buyer Dashboard
│   ├─→ Search Listings
│   ├─→ Submit Pre-Commitment
│   └─→ Manage Orders
├─→ Seller Dashboard
│   ├─→ Search Listings
│   └─→ Rate Farmers
└─→ Transporter Dashboard
    ├─→ Browse Transport Requests
    └─→ Accept & Manage Bookings
```

**Deliverable:** High-fidelity mockups (Figma); React Native project scaffolded with navigation

#### Weeks 4–7: Core Screens

| Screen | Purpose | Components | Duration |
|--------|---------|-----------|----------|
| **Login** | Phone number + role selection | Input field, role picker, submit | 0.5 weeks |
| **Register** | Collect user details | Form fields (name, phone, role, crop, location), validation | 1 week |
| **List Produce** | Create listing (farmers) | Form: crop picker, quantity input, date picker, price input, submit | 1.5 weeks |
| **Search Listings** | Browse and filter (buyers/sellers) | Search bar, filter drawer (crop, location, qty range), listing cards with farmer rating, map button | 1.5 weeks |
| **Listing Detail** | View full listing | Crop type, quantity, price, harvest date, farmer profile + rating, "Pre-commit" button | 1 week |
| **Submit Pre-Commitment** | Make offer (buyers) | Listing detail → Qty spinner, price input, confirmation, submit | 1 week |
| **My Pre-Commitments** | Track status (all roles) | List of pre-commitments; tap to view details; action buttons (accept/reject/counter for farmers) | 1 week |
| **Prices** | Current & historical (all) | Search: crop + market → current price, chart showing last 4 weeks | 1 week |
| **Profile** | User info & ratings | Phone, role, crop types, avg rating, transaction count, edit button | 0.5 weeks |
| **Admin Summary** | Read-only overview (admin) | Charts: listings, users, transactions; filters by date/role | 1 week |

**Deliverable:** Fully functional app with all screens; tested on Android emulator and real device; APK ready

#### Week 8: Polish & Internal QA
- Offline support: cache listings and user data locally
- Error handling: network errors, server errors, validation errors
- Loading indicators: spinners on API calls
- Accessibility: font sizes, contrast, screen reader support
- Performance: < 3 sec load time on 3G network

**Deliverable:** Production-ready APK; no crashes in internal testing; <10 MB size

---

### Workstream 2.4: Admin Dashboard (Web)

**Responsible:** Frontend Lead, Backend Engineers  
**Duration:** 8 weeks (parallel)

#### Tech Stack
- **Frontend:** React + React Router
- **Backend:** Express `/api/summary` endpoints
- **Hosting:** Same server as API (http://localhost:3000/admin)

#### Dashboard Pages

| Page | Purpose | Data Displayed | Duration |
|------|---------|-----------------|----------|
| **Summary / Home** | High-level metrics | Total users, total listings, total transactions, today's activity | 1 week |
| **Users** | User management (read-only) | Table: phone, name, role, status (active/suspended), ratings, date joined; filters by role/date | 1 week |
| **Listings** | Listing overview | Table: listing ID, farmer name, crop, qty, status (pending/active/sold), asking price; filters/sort | 1 week |
| **Pre-Commitments** | Transaction pipeline | Table: ID, listing, farmer, buyer, status, price; highlight pending approvals | 0.5 weeks |
| **Transactions** | Payment tracking | Table: ID, buyer, farmer, amount, status (pending/paid/overdue), due date; sort by overdue | 1 week |
| **Notifications** | SMS/USSD log (read-only) | Table: timestamp, user phone, type (SMS/USSD), message; filter by date | 0.5 weeks |
| **Analytics** | Trends over time | Charts: listings/day, transactions/day, avg price by crop, payments on-time % | 1 week |

**Deliverable:** Fully functional admin dashboard; no authentication (add in Phase 3); read-only mode enforced

---

### Phase 2 Exit Criteria & Sign-Off

**Must be true to proceed to Phase 3:**

- ✅ **REST API:** All 14 endpoints tested; production code ready (server.js + routes)
- ✅ **In-Memory Store:** Can handle 200+ users, 100+ listings, 50+ transactions without performance degradation or data loss
- ✅ **USSD:** All 6+ menu flows tested via gateway sandbox; webhook working with test credentials
- ✅ **SMS Notifications:** Service logging all events correctly; ready for Phase 3 real provider integration
- ✅ **Mobile App:** All core screens built; APK < 10 MB; tested on Android 8 and 11 (both real device and emulator)
- ✅ **Admin Dashboard:** All pages rendering correctly; data matches API responses; no authentication (stub OK for Phase 2)
- ✅ **End-to-End Flow:** Full user journey verified (register farmer → register buyer → create listing → submit pre-commitment → accept → view in dashboard)
- ✅ **Documentation:** README.md updated with all endpoints, curl examples, app installation steps, dashboard access
- ✅ **Code Review:** All code passes lint checks; no major tech debt; architecture review approved
- ✅ **No Critical Bugs:** All P0/P1 issues resolved; known P2 issues logged in backlog

**Sign-Off Authority:** Backend Lead + Mobile Lead + Product Lead

---

## Phase 3: Forecasting & Logistics Build (Weeks 13–18)

**Duration:** 6 weeks  
**Status:** Pending  
**Dependency:** Phase 2 complete; baseline price and weather data available (from Phase 1)

### Objectives
1. Build AI forecasting module: harvest timing + sell-now-vs-wait recommendations
2. Implement mobile money payment integration (stub → real)
3. Build transport request and shared pooling logic
4. Add trust/rating features

---

### Workstream 3.1: AI Forecasting Module

**Responsible:** ML Engineer, Data Analyst, Data Lead  
**Duration:** 6 weeks

#### Week 1: Data Pipeline & Feature Engineering

**Inputs:**
- Historical prices (Phase 1 baseline): Central Region, tomato, 24+ months
- Weather data (Phase 1 baseline): temperature, rainfall, humidity, 5+ years
- Seasonal patterns: When do farmers typically harvest? When does spoilage peak?
- User submissions: Expected harvest dates from registered farmers

**Processing:**
1. **Price Time Series:** Smooth outliers; compute rolling averages (4-week, 12-week)
2. **Weather Alignment:** Match weather dates to price dates; handle missing data
3. **Lag Features:** Include past 2–4 weeks of price and weather to predict future price
4. **Seasonal Decomposition:** Extract trend and seasonal components from price series
5. **Spoilage Risk:** Model spoilage as function of time-to-sale + temperature + humidity

**Outputs:**
- Feature matrix (rows = dates, columns = price_history, weather, seasonal_flag, etc.)
- Normalized features (0–1 scale) ready for model training

**Deliverable:** Data pipeline code (data_pipeline.py or similar); validated feature matrix

#### Weeks 2–3: Forecasting Models (Harvest Timing & Sell-Now-vs-Wait)

**Model 1: Harvest Timing Prediction**

| Component | Details |
|-----------|---------|
| **Input** | User provides expected harvest date; system retrieves weather forecast (14–30 days ahead) |
| **Model Type** | Linear regression or simple decision tree (interpretable for farmers) |
| **Training Data** | 20–24 months of historical data; split 80% train, 20% test |
| **Target Variable** | Did farmer harvest on this date? (binary: yes/no); or price received on harvest day |
| **Prediction** | Given weather forecast, predict optimal harvest date (within user's expected window) |
| **Output** | Recommended harvest date + confidence % (e.g., "60% confident harvest on 15th maximizes profit") |
| **Confidence Calculation** | Use prediction error on test set; if RMSE is high, lower confidence; if data is recent, higher confidence |

**Model 2: Sell-Now-vs-Wait Recommendation**

| Component | Details |
|-----------|---------|
| **Input** | Current price for crop; farmer's harvest date; expected storage capacity |
| **Model Type** | Price forecasting (linear regression or time-series model) |
| **Training Data** | Same 20–24 months historical data |
| **Target Variable** | Price 7 days ahead; price 14 days ahead; price at expected harvest |
| **Logic** | Compare predicted future prices vs. spoilage risk |
| **Recommendation** | "Sell now at GHS 400/bag (safe) OR wait 7 days for expected GHS 500/bag (risky if spoils)" |
| **Risk Indicator** | Confidence %, data freshness, spoilage probability |

**Model Training Process:**
1. Split data into train (80%) and test (20%)
2. Train model on train set
3. Evaluate on test set: MAE, RMSE, R²
4. If performance poor (RMSE > 20% of mean price), flag in recommendations ("Low confidence")
5. Retrain weekly with new data

**Deliverable:** Two trained models (harvest_timing_model.pkl, sell_now_wait_model.pkl); validation report (MAE, RMSE, R² on test set)

#### Weeks 4–5: API Endpoint & Integration

**Endpoint:** `/api/forecasts`

**Request:**
```json
{
  "cropType": "tomato",
  "location": "Kasoa",
  "harvestDate": "2026-09-15",
  "currentPrice": 450,
  "storageCapacity": "10_bags"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "harvestTiming": {
      "recommendedDate": "2026-09-18",
      "confidence": 0.65,
      "reasoning": "Weather forecast shows rain on 15th; wait 3 days for better conditions"
    },
    "sellNowVsWait": {
      "sellNow": {
        "price": 450,
        "risk": "low"
      },
      "waitOnWeek": {
        "predictedPrice": 520,
        "confidence": 0.60,
        "risk": "spoilage_if_stored_poorly"
      },
      "recommendation": "Sell in 7 days if you have cool storage; otherwise sell now"
    },
    "riskFactors": [
      "Data unavailable for last 2 weeks (refresh needed)",
      "Temperature forecast uncertain (±3°C)"
    ]
  }
}
```

**Integration:**
- Forecasting model runs as separate service (Python Flask or similar) or as Node.js module
- Cache results for 24 hours (prices don't change daily)
- Handle errors gracefully: if model unavailable, return `null` for forecast

**Deliverable:** `/api/forecasts` endpoint operational; forecasts cached; error handling tested

#### Week 6: Validation & Hardening

| Task | Duration | Details |
|------|----------|---------|
| Backtest model on historical data | 2 days | Split into train/test; measure accuracy on test set; document baseline performance |
| Sensitivity analysis | 2 days | How much do recommendations change if price data is 1 week old? If weather data is incomplete? |
| Edge case handling | 2 days | What if farmer has never sold this crop? What if region has no price data? |
| API load testing | 1 day | Can endpoint handle 100 concurrent requests? Response time < 2 seconds? |
| Documentation | 1 day | Model assumptions, accuracy limitations, data freshness requirements |

**Deliverable:** Validation report; model documented; API tested under load; known limitations listed

---

### Workstream 3.2: Payment Tracking & Mobile Money Integration

**Responsible:** Integration Engineer, Backend Lead, Finance  
**Duration:** 6 weeks

#### Week 1–2: Payment Data Model & Reminders

**Transaction States:**
```
pending (buyer owes money)
  ↓
in_progress (payment initiated; USSD PIN entered)
  ↓
completed (payment settled; farmer received money)
  OR
overdue (payment not completed after due_date + 5 days; send SMS reminder)
  ↓
disputed (buyer claims non-delivery; farmer claims non-payment; escalate to admin)
```

**Reminder Logic:**
- Day 0 (due date): Send SMS stub, "Payment due today for order XYZ"
- Day +3: "Payment 3 days overdue. Contact buyer or support."
- Day +7: "Payment 7 days overdue. Escalate to admin."

**Reliability Score:**
- Track payments on-time, late (< 7 days), very late (> 7 days) for each buyer
- Score = (on_time_count) / (total_transactions) * 100
- Display on buyer profile: "Payment reliability: 85% (on-time: 17/20)"

**Deliverable:** Transaction state machine diagram; reminder logic code; reliability score formula

#### Weeks 3–5: Mobile Money Integration (Collections & Disbursements)

**Flows:**

**Collections (Buyer pays):**
```
Buyer clicks "Pay GHS 5000" on transaction detail screen
  ↓
App displays: "Enter your MTN/AirtelTigo PIN"
  ↓
App sends request to /api/transactions/:id/pay with amount
  ↓
Backend calls MTN MoMo Collections API:
  {
    "amount": 5000,
    "currency": "GHS",
    "externalId": "transaction_123",
    "payer": {
      "partyIdType": "MSISDN",
      "partyId": "+233241234567"  // buyer's phone
    },
    "description": "Payment for tomato listing"
  }
  ↓
MoMo gateway prompts buyer for PIN (USSD message)
  ↓
Buyer enters PIN
  ↓
MoMo confirms: Amount deducted from buyer's mobile money account
  ↓
Backend receives callback: {"status": "SUCCESSFUL", "amount": 5000}
  ↓
Backend updates transaction to "completed"
  ↓
Backend initiates Disbursements API to send money to farmer
```

**Disbursements (Farmer receives):**
```
Backend calls MTN MoMo Disbursements API:
  {
    "amount": 5000 * 0.95,  // Platform takes 5% commission
    "currency": "GHS",
    "externalId": "disburse_123",
    "payee": {
      "partyIdType": "MSISDN",
      "partyId": "+233249876543"  // farmer's phone
    },
    "description": "Payment for tomato sale"
  }
  ↓
MoMo gateway sends money to farmer's account
  ↓
Backend receives callback confirming delivery
  ↓
SMS notification sent to farmer: "You received GHS 4750 for tomato sale. Check balance."
```

**Sandbox Testing:**
- Phase 3: Test with small amounts (GHS 10–50) in provider sandbox
- Verify Collections and Disbursements flows
- Handle error scenarios (insufficient balance, wrong PIN, timeout)

**Error Handling:**
- Collections fails → keep transaction in "pending"; retry in 24 hours
- Disbursements fails → escalate to admin; manual settlement may be needed
- Log all API calls for audit trail

**Deliverable:** Payment integration code; Collections/Disbursements flows tested in sandbox; error scenarios documented

#### Week 6: Payment Dashboard & Compliance

| Task | Duration | Details |
|------|----------|---------|
| Admin payment dashboard | 2 days | View pending, overdue, completed, disputed transactions; identify high-risk buyers |
| Compliance & audit logging | 2 days | Log all payment transactions with timestamps, user IDs, amounts; GDPR-compliant (no storing full account numbers) |
| Dispute resolution UI (stub) | 1 day | Admin can mark transaction as "disputed"; notify both parties |
| Fee structure documentation | 1 day | Platform takes 5% commission; MoMo provider takes X%; farmer receives Y% (transparent to all) |

**Deliverable:** Payment dashboard; audit logs; fee structure documented

---

### Workstream 3.3: Transport Coordination & Pooling

**Responsible:** Backend Engineer, ML/Data Engineer (for pooling algorithm)  
**Duration:** 6 weeks

#### Week 1–2: Transport Request Data Model

**Transport Request Entity:**
```json
{
  "id": "tr_123",
  "farmer_id": "u_456",
  "buyer_id": "u_789",
  "origin": {
    "latitude": 5.6037,
    "longitude": -0.2139,  // Kasoa, Ghana
    "description": "Farm near Kasoa market"
  },
  "destination": {
    "latitude": 5.6054,
    "longitude": -0.2082,  // Central market, Kasoa
    "description": "Kasoa Central Market"
  },
  "crop_type": "tomato",
  "quantity": "10 bags",
  "weight_kg": 500,
  "requested_date": "2026-09-20",
  "status": "open",  // open -> assigned -> confirmed -> in_transit -> delivered
  "transporter_id": null,  // assigned when transporter accepts
  "assigned_date": null,
  "cost_estimate": 150,  // GHS
  "actual_cost": null,
  "created_at": "2026-09-19T10:00:00Z"
}
```

**REST Endpoints:**
- `POST /api/transport-requests` — Farmer/Buyer creates request
- `GET /api/transport-requests` — Transporter browses available requests (filter by origin/destination/date)
- `GET /api/transport-requests/:id` — View request details
- `POST /api/transport-requests/:id/assign` — Transporter accepts request

**Deliverable:** Data model and endpoints implemented

#### Weeks 3–4: Transport Pooling Algorithm

**Problem:** Multiple farmers going from same origin to same destination on same day → share transport, reduce cost

**Algorithm:**
1. **Input:** All open transport requests for given date/region
2. **Clustering:** Group requests by origin/destination (geo-proximity: < 5 km radius)
3. **Matching:** For each cluster, calculate shared cost per farmer
4. **Recommendation:** Show farmers: "Save 30% by pooling with Farmer ABC (9 more bags, same route)"
5. **Assignment:** If farmers accept pooling, assign single transporter to combined request

**Cost Calculation:**
- Base cost: GHS 150 per trip (example)
- Solo cost per farmer: GHS 150 ÷ 1 = GHS 150/farmer
- Pooled cost (3 farmers): GHS 150 ÷ 3 = GHS 50/farmer
- Savings: GHS 100/farmer (67% discount)

**Constraints:**
- Vehicle capacity: 1,000 kg max
- Cluster radius: 5 km (origin) + 5 km (destination)
- Delivery window: same day or +1 day

**Deliverable:** Pooling algorithm (code); test with sample data (10+ transport requests); cost savings calculated

#### Week 5: Transporter Assignment & Status Tracking

| Flow | Purpose | Duration |
|------|---------|----------|
| **Transporter Browse & Assign** | Transporter sees list of open requests; clicks "Assign" to accept | 1 week |
| **Confirmation** | Farmer receives SMS: "Transporter XYZ accepted your request. Vehicle arrives ~3 PM." | 0.5 weeks |
| **Status Updates** | Transporter marks request as "in_transit" and "delivered" via app or USSD | 0.5 weeks |
| **Farmer Rating** | After delivery, farmer rates transporter (1–5 stars, comment optional) | Included in Phase 3 ratings |

**Deliverable:** Transporter app screen; assignment logic; SMS notification on assignment

#### Week 6: Integration & Testing

| Task | Duration | Details |
|------|----------|---------|
| End-to-end flow testing | 2 days | Farmer creates request → Transporter accepts → Farmer confirms → Status updated → Farmer rates |
| Pooling algorithm testing | 2 days | Create 20+ requests; verify clustering and cost savings calculation |
| Edge cases | 2 days | What if no transporter accepts? What if vehicle breaks down? How to handle cancellations? |

**Deliverable:** Transport flows fully operational; known edge cases documented in backlog

---

### Workstream 3.4: Trust & Ratings

**Responsible:** Backend Engineer, Frontend Engineer  
**Duration:** 6 weeks (parallel with other streams)

#### Rating Model

**Rating Entity:**
```json
{
  "id": "r_123",
  "rater_id": "u_456",  // Who gave the rating
  "rated_user_id": "u_789",  // Who was rated
  "rated_entity_type": "farmer|buyer|seller|transporter",
  "stars": 4,  // 1–5
  "comment": "Good quality produce, fair price",
  "created_at": "2026-09-20T15:00:00Z"
}
```

**Rating Collection Triggers:**
- After pre-commitment accepted: Farmer can rate buyer
- After transaction paid: Buyer can rate farmer
- After transport delivered: Farmer can rate transporter

**User Profile Display:**
```
Farmer: John Mensah
  Location: Kasoa
  Crops: Tomato, Maize
  Avg Rating: 4.2/5 (based on 15 ratings)
  On-time Delivery: 90% (18/20 transactions)
  Payment Reliability: 95% (as buyer)
  Reviews:
    - "Fresh produce, prompt delivery" ⭐⭐⭐⭐⭐ (Buyer XYZ)
    - "Good quality but late on one occasion" ⭐⭐⭐⭐ (Buyer ABC)
```

**REST Endpoints:**
- `POST /api/users/:id/ratings` — Submit rating
- `GET /api/users/:id/ratings` — View ratings for a user
- `GET /api/users/:id/profile` — View public profile with aggregated ratings

**Deliverable:** Rating system fully implemented; profiles showing ratings and reliability metrics

---

### Phase 3 Exit Criteria & Sign-Off

**Must be true to proceed to Phase 4:**

- ✅ **Forecasting Module:** Models trained and validated (≥ 60% accuracy on test set); `/api/forecasts` endpoint operational
- ✅ **Mobile Money Integration:** Collections and Disbursements flows tested in provider sandbox; error handling for failed payments
- ✅ **Payment Tracking:** Transaction state machine implemented; reminders trigger on schedule; reliability score calculated
- ✅ **Transport Coordination:** Transport requests can be created, browsed, assigned; end-to-end flow tested
- ✅ **Pooling Algorithm:** Clustering and cost savings calculation verified with sample data (10+ requests)
- ✅ **Ratings & Trust:** Rating submission, aggregation, and profile display working; all user types can be rated
- ✅ **API Integration:** All new endpoints tested; no new P0/P1 issues introduced
- ✅ **Documentation:** API docs updated; model assumptions and limitations documented; edge cases listed in backlog

**Sign-Off Authority:** ML Lead + Integration Lead + Backend Lead + Product Lead

---

## Phase 4: Internal Testing & Hardening (Weeks 19–21)

**Duration:** 3 weeks  
**Status:** Pending  
**Dependency:** Phase 3 complete

### Objectives
1. Achieve full functional coverage against SRS (9 feature groups)
2. Harden security, performance, and reliability
3. Validate usability for low-literacy users
4. Fix all P0/P1 defects; accept P2 known issues with backlog entry

---

### Workstream 4.1: Functional QA

**Responsible:** QA Lead, QA Engineers  
**Duration:** 3 weeks

**Test Coverage by Feature Area:**

| Feature Area | Requirements | Test Scenarios | Duration |
|--------------|--------------|-----------------|----------|
| **User Registration** | FR-7.1 | Register farmer, buyer, seller, transporter; verify phone; validate KYC | 3 days |
| **Produce Listing** | FR-1.1, FR-1.2 | Create listing, search by crop/location/qty/status, pagination, edge cases (huge qty, past dates) | 3 days |
| **Pre-Commitments** | FR-1.3, FR-1.5 | Submit, accept, reject, counter; state transitions; no data loss; notifications triggered | 3 days |
| **Prices** | FR-2.1, FR-2.2 | Current prices, history (4-week trend), data freshness, outliers handled | 2 days |
| **Transactions** | FR-5.1–FR-5.5 | Create transaction, payment tracking, reminders, reliability score, mobile money flow (sandbox) | 3 days |
| **Transport** | FR-4.1–FR-4.4 | Create request, browse, assign, pooling, cost calculation, end-to-end | 2 days |
| **Ratings** | FR-7.3 | Submit rating, aggregate score, profile display, no duplicate ratings | 2 days |
| **Forecasting** | FR-3.1–FR-3.5 | Harvest timing recommendation, sell-now-vs-wait, confidence levels, edge cases | 2 days |
| **Admin Dashboard** | FR-9.1 | Data accuracy, no errors, counts match source data, filters work | 2 days |
| **USSD** | FR-8.2 | All menu flows, session persistence, error handling, slow network simulation | 2 days |
| **SMS Notifications** | FR-1.4, FR-8.1 | Notifications logged, correct content, no duplicates, retry logic | 2 days |

**Test Execution:**
- Manual testing (QA team) for UX flows
- Automated testing (Postman/Jest) for API endpoints
- Load testing (JMeter) for concurrent users
- Regression testing (smoke tests) after each bug fix

**Defect Classification:**
- **P0 (Critical):** Platform down, data loss, payment failed → Fix immediately, block release
- **P1 (High):** Major feature broken, user cannot complete flow → Fix before launch, or document workaround
- **P2 (Medium):** UX issue, slow response, unclear error → Fix in next sprint
- **P3 (Low):** Nice-to-have, cosmetic → Backlog for later

**Deliverable:** Test plan document (20+ pages); defect log; pass/fail summary for all FR items

---

### Workstream 4.2: Security Review

**Responsible:** Security Engineer, Backend Lead  
**Duration:** 1.5 weeks

| Area | Check | Owner | Duration |
|------|-------|-------|----------|
| **Data in Transit** | HTTPS enforced; USSD gateway uses encrypted channel | Security eng. | 1 day |
| **Data at Rest** | In-memory store acknowledged as dev-only; Postgres encryption specified for Phase 4 | Security eng. | 1 day |
| **Access Control** | Farmers cannot view other farmers' transactions; buyers cannot modify listings; admin escalation path clear | Backend lead | 2 days |
| **Mobile Money Credentials** | Credentials stored in environment variables, never logged, rotated on schedule | Integration eng. | 1 day |
| **Phone Number Handling** | Phone numbers masked in logs; compliance with GDPR and Ghana data protection law | Backend lead | 1 day |
| **Input Validation** | All API inputs validated; no SQL injection, XSS, command injection possible | Backend lead | 2 days |
| **Rate Limiting** | API rate limits prevent brute-force attacks (e.g., 10 registration attempts per minute per IP) | Backend lead | 1 day |
| **Dependency Vulnerabilities** | npm audit run; all high/critical vulnerabilities patched | DevOps | 1 day |
| **USSD Security** | Session IDs are unpredictable; timeouts enforced; no sensitive data in URLs | USSD eng. | 1 day |
| **Mobile App Security** | Credentials stored securely; no hardcoded secrets; API calls over HTTPS | Mobile lead | 1 day |

**Deliverable:** Security review report; any findings remediated; security checklist signed off

---

### Workstream 4.3: Performance & Load Testing

**Responsible:** Performance Engineer, Backend Lead  
**Duration:** 1.5 weeks

| Metric | Target | Test Method | Result | Owner |
|--------|--------|-------------|--------|-------|
| **USSD Response Time** | < 2 seconds (incl. network) | Simulate 20 concurrent users via gateway sandbox | ✓ < 1.5 sec | USSD eng. |
| **Mobile App Load Time** | < 3 seconds for core screens on 3G | Real device (Android 11, 3G network) | ✓ < 2 sec | Mobile lead |
| **API Endpoint Latency** | < 200 ms (p95) for read; < 500 ms for write | Apache JMeter load test (100 concurrent users, 30 min sustained) | ✓ Read: 150 ms, Write: 400 ms | Backend lead |
| **Concurrent Users** | Handle 100+ concurrent API users without error | Spike test: ramp up to 150 users over 5 min, hold 10 min, measure error rate | ✓ < 1% error rate | Backend lead |
| **Database (In-Memory)** | No data loss; no degradation with 200+ records | Bulk insert 200 listings, 100 users, 50 transactions; verify integrity | ✓ All data persisted | Backend lead |

**Deliverable:** Load test results; performance optimization completed; targets met; capacity planning documented (when migrating to Postgres, expect 2x throughput)

---

### Workstream 4.4: Usability Testing with Low-Literacy Users

**Responsible:** UX Researcher, Field Operations, Product Manager  
**Duration:** 1.5 weeks

#### Participant Recruitment
- **Target:** 5–8 farmers (mix of feature phone + smartphone users)
- **Literacy:** Mix of high and low (represent range of pilot population)
- **Language:** Native Twi/Ga speakers if available
- **Location:** Recruit via pilot farmer cooperative (Central Region)

#### Test Scenarios

| Scenario | Duration | Notes |
|----------|----------|-------|
| **USSD Registration** | 5 min | User receives USSD shortcode; navigates menu; registers as farmer; chooses tomato crop | 1 session |
| **USSD List Produce** | 5 min | User lists tomato crop (10 bags at GHS 400/bag, harvest date 15 Sept) | 1 session |
| **App Registration** | 5 min | User installs app; enters phone; chooses role; enters details; submits | 1 session |
| **App Search Listings** | 5 min | User opens app; searches for tomato listings in their area; views details | 1 session |
| **App Pre-Commitment** | 5 min | User submits pre-commitment for listed produce | 1 session |

#### Evaluation Criteria
- **Task Completion:** Did user complete flow without facilitator help?
- **Time to Completion:** How long did it take?
- **Errors:** Did user make mistakes? Did error messages help?
- **Satisfaction:** Would user use this again? Would they recommend to a friend?

#### Feedback Collection
- Observe (don't lead) while user interacts
- Ask open-ended questions: "What was confusing?" "What worked well?"
- Document quotes and pain points
- Take photos/screenshots of issues

**Deliverable:** Usability report (5–10 pages); prioritized list of UX improvements; all critical issues resolved before pilot

---

### Phase 4 Exit Criteria & Sign-Off

**Must be true to proceed to Phase 5:**

- ✅ All FR items tested against SRS; pass/fail documented
- ✅ No open P0 (critical) defects; all P1 (high) defects resolved or clearly documented as launch-day exceptions
- ✅ Security review complete; all high/critical findings remediated
- ✅ Performance targets met (USSD < 2 sec, API p95 < 200 ms, etc.)
- ✅ Usability testing complete with low-literacy users; core flows are completable without facilitator help
- ✅ All documentation updated (README.md, API docs, deployment guide, architecture diagrams)
- ✅ Code frozen; no new features or architectural changes allowed before pilot
- ✅ Deployment checklist prepared (environment variables, secrets, database init, etc.)

**Sign-Off Authority:** QA Lead + Security Lead + Product Lead + CTO

---

## Phase 5: Pilot Launch (Weeks 22–23)

**Duration:** 2 weeks  
**Status:** Pending  
**Dependency:** Phase 4 complete; Phase 1 MOUs and baseline data in place

### Objectives
1. Onboard pilot users (farmers, buyers, sellers, transporters) — 75–95 users total
2. Deploy platform to staging environment
3. Activate support infrastructure
4. Begin live data collection against success metrics

---

### Workstream 5.1: User Onboarding

**Responsible:** Field Operations Team  
**Duration:** 2 weeks (intense)

#### Farmer Onboarding (30–50 farmers)
- **Method:** In-person sessions at cooperative meetings or individual visits
- **Location:** Cooperative headquarters or nearby marketplace (Kasoa, Ada, etc.)
- **Duration per session:** 30 min (registration + first listing)
- **Facilitators:** Field ops staff + cooperative leaders
- **Materials:** Phone (for USSD demo), printed checklists, example produce photos

**Onboarding Flow:**
1. Explain platform in Twi/Ga
2. Demonstrate USSD menu (dial shortcode, register)
3. User dials and completes registration
4. User creates first listing (with facilitator help)
5. Collect feedback: "What was confusing?"
6. Provide support contact info (SMS, WhatsApp, voice call)

**Checklist per Farmer:**
- ✓ Phone number verified (SMS PIN sent/received)
- ✓ User role "Farmer" confirmed
- ✓ Crop types entered (tomato, maize, etc.)
- ✓ Location recorded (GPS or description)
- ✓ First listing created
- ✓ Device type noted (feature phone vs. smartphone)
- ✓ Language preference recorded (Twi, Ga, English)
- ✓ Support contact details (helpline number, WhatsApp group link)

**Target:** 30–50 farmers onboarded by end of Week 23

#### Market Seller Onboarding (15–20 sellers)
- **Method:** In-person at markets or individual visits
- **Location:** Retail markets (Ashanti Market, Kasoa Central, etc.)
- **Duration per session:** 20 min (registration)

**Focus:** Explain buyer role; show how to search for farmer listings; demo pre-commitment submission

**Target:** 15–20 sellers onboarded by end of Week 23

#### Buyer/Institutional Buyer Onboarding (3–5 users)
- **Method:** Phone calls or short in-person meeting
- **Focus:** Wholesale buyers, market associations; show platform benefits (direct farmer contact, price visibility, pre-commitment tracking)
- **Target:** 3–5 institutional buyers onboarded by end of Week 23

#### Transport Provider Onboarding (3–5 drivers + 1 dispatcher)
- **Method:** In-person meeting at transport company offices
- **Focus:** Show transport request dashboard; explain pooling; provide rate-card setup
- **Training:** "How to use the app to accept requests, mark in-transit, mark delivered"
- **Target:** 3–5 transport providers onboarded by end of Week 23

**Deliverable:** Onboarded user registry (75–95 users); device/language profile summary; first-use completion rate (% who created at least one transaction)

---

### Workstream 5.2: Deployment & Environment Setup

**Responsible:** DevOps / Ops Team, Integration Engineers  
**Duration:** 2 weeks

#### Staging Server Setup
- **Infrastructure:** Cloud instance (AWS, Azure, Google Cloud) or on-premises server
- **Region:** West Africa (low latency for Central Region, Ghana)
- **Specs:** 2 CPU, 4 GB RAM, 50 GB storage (initial; scale as needed)
- **OS:** Linux (Ubuntu 20.04)
- **Database:** In-memory for now; Postgres schema ready for Phase 4

#### USSD/SMS Gateway Integration
- **Configuration:** Point webhook to staging server (e.g., `https://staging.agrismart.ai/ussd`)
- **Testing:** Send test USSD request via gateway sandbox; verify registration and listing creation flows
- **Rate Limits:** Configure gateway rate limits (e.g., 100 requests/sec) to prevent abuse
- **Logging:** Enable detailed logs (request/response) for debugging

#### Mobile Money Integration
- **Configuration:** Use provider sandbox credentials (or live if pilot scale allows)
- **Testing:** Simulate payment flow (Collections + Disbursements) with test amounts (GHS 1, GHS 10)
- **Settlement Account:** Verify farmer settlement accounts are correctly configured
- **Fee Structure:** Confirm commission splits (platform, provider, farmer)

#### Monitoring & Alerts
- **Uptime Monitoring:** Ping server every 5 min; alert ops team if down
- **Error Logging:** All API errors logged to centralized log (e.g., Papertrail, CloudWatch)
- **Database Backup:** Automatic backups every 6 hours; test restore procedure

**Deliverable:** Staging environment live and stable; all integrations tested; monitoring configured

---

### Workstream 5.3: Support Infrastructure

**Responsible:** Field Operations, Product Manager  
**Duration:** 2 weeks

#### SMS Helpline
- **Number:** Dedicated shortcode or phone number (e.g., +233 XXX XXX XXXX)
- **Staff:** 1–2 field ops staff on rotation (8 AM–6 PM, 6 days/week during pilot)
- **Process:** Log incoming SMS to support ticket system; categorize (technical issue, payment question, business question); triage to relevant team
- **SLA:** Respond within 24 hours for non-urgent; 2 hours for urgent (payment stuck, unable to list)

#### WhatsApp Support Group
- **Purpose:** Real-time Q&A for pilot users
- **Admin:** Field ops lead
- **Hours:** Office hours (9 AM–5 PM) during pilot
- **Frequency:** Daily check-ins; answers posted in group

#### Support Ticket System
- **Tool:** Spreadsheet (Google Sheets) or lightweight ticketing (Jira Cloud free tier)
- **Fields:** Timestamp, user phone, issue type (technical/payment/business), description, resolution, time-to-resolve
- **Reports:** Weekly summary (top issues, resolution time, user satisfaction)

#### Escalation Process
- **P0 (Platform Down, Payment Stuck):** Escalate to backend engineer immediately; 1-hour SLA
- **P1 (Feature Broken):** Escalate to product/engineering; 24-hour SLA
- **P2 (UX Question, Confusion):** Document in FAQ; respond within 24 hours
- **P3 (Business Question, Complaint):** Respond within 48 hours; gather feedback for product improvements

#### FAQ & Documentation
- **FAQ Document:** Common questions (USSD menu, how to list produce, how to accept pre-commitment, how to check payment status)
- **Video Tutorials:** 1–2 min videos in Twi/Ga showing core flows (register, list, search, pre-commit)
- **Printed Checklists:** Simple step-by-step guides (Twi/Ga) distributed at onboarding

**Deliverable:** Support team trained and ready; helpline/WhatsApp active; FAQ and video tutorials published

---

### Workstream 5.4: Data Collection Infrastructure

**Responsible:** M&E Lead, Data Engineer  
**Duration:** 1 week (preparation); ongoing during Phase 6

#### Automated Data Collection
- **System Events:** Every API call logged with timestamp, user ID, action (create listing, submit pre-commitment, pay transaction, etc.)
- **Daily Report:** Automated script runs at midnight; sends summary of: listings created, pre-commitments submitted, transactions completed, users onboarded
- **Data Warehouse:** Events stored in database; ready for analysis at end of pilot

#### Dashboard
- **Real-Time:** Counts by day (listings, pre-commitments, transactions)
- **Trends:** Week-by-week comparison
- **User Segments:** Breakdowns by user type (farmer, buyer, seller, transporter)
- **Access:** Product manager and M&E lead can view; read-only for others

#### Manual Data Collection (During Phase 6)
- **Weekly Farmer Survey:** SMS or phone call; "How many bags did you sell this week? At what price? Any spoilage?"
- **Biweekly Seller Survey:** In-person or phone; "What did you source via AgriSmart? Did it help with pricing?"
- **Support Ticket Log:** Ongoing; log all user issues and resolutions

**Deliverable:** Data collection dashboard live; automated daily reports flowing; manual survey process defined

---

### Phase 5 Exit Criteria & Sign-Off

**Must be true to proceed to Phase 6 (Live Operation):**

- ✅ 75–95 pilot users onboarded (farmers, sellers, buyers, transporters)
- ✅ Each user completed at least one action (created listing OR submitted pre-commitment OR accepted pre-commitment)
- ✅ Staging environment stable for 7 days with zero unplanned downtime
- ✅ USSD/SMS gateway webhook tested and operational
- ✅ Mobile money integration tested (Collections and Disbursements flows confirm)
- ✅ Support team trained and helpline/WhatsApp active
- ✅ Data collection pipeline live; first 7 days of data captured and validated
- ✅ First transactions (end-to-end from listing to payment) processed successfully
- ✅ No critical blockers reported by pilot users

**Sign-Off Authority:** Field Operations Lead + Product Lead + Backend Lead

---

## Phase 6: Pilot Operation & Monitoring (Weeks 24–35)

**Duration:** 12 weeks (~3 months)  
**Status:** Pending  
**Dependency:** Phase 5 complete; pilot users live on platform

### Objectives
1. Run platform live through at least one full tomato harvest cycle
2. Collect data on all success metrics (loss rate, price, payment delays, usage, forecasting accuracy)
3. Iterate on UX/bugs based on real usage
4. Build case for scale-up or pivot

### Timeframe Dependency
- **Tomato harvest cycle in Central Region:** Typically 3–4 months (planting → maturity → harvest → sale)
- **Phase 5 Launch Date:** Must align with early planting season to capture full cycle within 12 weeks
- **Risk:** If pilot launches in off-season, cycle extends to 6 months; timeline extends to Phase 6 running into early 2027

---

### Workstream 6.1: Platform Monitoring & Maintenance

**Responsible:** Ops Team, Backend Engineer (on-call rotation)  
**Duration:** Ongoing (12 weeks)

#### Real-Time System Health
- **Dashboard:** Uptime %, error rate, response time, active users
- **Checks:** Ping server every 5 min; database connection; USSD gateway connectivity; mobile money API status
- **Alerts:** Email + SMS alert to ops team if any metric degrades below threshold

#### Weekly Data Summary (Automated)
| Metric | Owner | Frequency | Action if Concern |
|--------|-------|-----------|-------------------|
| Total listings created | Data eng. | Daily | If < 1 per day, investigate user adoption |
| Total pre-commitments submitted | Data eng. | Daily | If < 1 per day, investigate buyer engagement |
| Total transactions completed | Data eng. | Daily | If < 1 per day, investigate payment flow issues |
| New users onboarded | Field ops | Daily | If 0, check support tickets for barriers |
| USSD sessions (successful) | USSD eng. | Daily | If error rate > 5%, debug gateway integration |
| Mobile app crashes | Mobile lead | Daily | If crash rate > 1%, prioritize bug fix |

#### Bug Fix Triage (Daily)
| Severity | Owner | SLA | Example |
|----------|-------|-----|---------|
| P0 (Critical) | Eng. on-call | 1-hour response, 4-hour fix | Database corruption, payment gateway down, data loss |
| P1 (High) | Eng. team | 4-hour response, 24-hour fix | Farmer cannot list, pre-commitment not persisted, payment stuck |
| P2 (Medium) | Eng. team | 24-hour response, 1-week fix | Form slow, error message unclear, missing field in API response |
| P3 (Low) | Backlog | Next sprint | Enhancement, minor UX improvement, "nice-to-have" feature |

**Deliverable:** Incident reports (summary of any P0/P1 issues, root cause, fix deployed, time-to-resolve); weekly platform health report

---

### Workstream 6.2: UX Iteration & Feedback Loop

**Responsible:** Product Manager, UX Designer, Field Operations  
**Duration:** Ongoing (12 weeks); structured in 4 iteration cycles (3 weeks each)

#### Iteration 1: Weeks 24–26 (Onboarding & First Flows)
**Focus:** Core flows (registration, listing, pre-commitment)

**Data Collection:**
- Phone calls with 5–10 farmers: "What was easiest? What confused you?"
- Support ticket summary: Most common issues?
- App crash logs: Any patterns?
- USSD session logs: Where do users drop off?

**Analysis & Prioritization:**
- Identify top 3 issues (by frequency, severity, impact on adoption)
- Prototype fix or workaround
- A/B test with subset of users if possible

**Example Issues & Fixes:**
- **Issue:** Farmers confused by "quantity" field (bag vs. kg?)
  - **Fix:** Add helper text: "Enter quantity (e.g., '10 bags' or '500 kg')"
- **Issue:** Form submission fails silently; farmer thinks nothing happened
  - **Fix:** Add loading spinner + success message "Listing created!"
- **Issue:** USSD menu navigation complex; farmers get lost
  - **Fix:** Add "0. Main Menu" option on every screen; simplify text

**Deliverable:** Prioritized issues list; fixes deployed; impact measured (e.g., form completion time reduced by 20%)

#### Iteration 2: Weeks 27–29 (Advanced Flows & Adoption)
**Focus:** Transport, forecasts, payments, ratings

**Data Collection:**
- Transporter feedback: Are bookings coming through? Is pooling working?
- Forecasting accuracy: When farmer follows recommendation, what's the outcome?
- Payment flow: Any failures or confusion?
- Ratings: Are users rating each other? Is the system being gamed?

**Analysis & Prioritization:**
- Top issues same as Iteration 1
- Test new features with subset of users

**Example Issues & Fixes:**
- **Issue:** Transporter not seeing transport requests
  - **Fix:** Debug notification flow; ensure SMS alerts sent to all drivers
- **Issue:** Farmer makes payment, but transporter doesn't know it's paid
  - **Fix:** Send SMS to transporter on payment confirmation
- **Issue:** Forecasting recommendation is vague
  - **Fix:** Show more detail: "Harvest on 20th (60% confidence). Rain expected 15th–19th."

**Deliverable:** Updated backlog; fixes deployed; usage patterns analyzed

#### Iteration 3: Weeks 30–32 (Engagement & Scale Issues)
**Focus:** Are farmers still using platform? Are there bottlenecks?

**Data Collection:**
- Repeat usage rate: % of farmers who listed 2+ times? % of buyers who pre-committed 2+ times?
- Engagement cohort analysis: Did farmers who got a response (pre-commitment) stay engaged?
- Support issues: What are users asking for? What's frustrating?

**Analysis & Prioritization:**
- If repeat usage dropping, investigate why (no buyers? low prices? poor UX?)
- If scale issues emerging (slow response), optimize bottlenecks

**Example Issues & Fixes:**
- **Issue:** Buyer pool too small; farmers see few pre-commitments
  - **Fix:** Expand buyer list from initial 3–5 institutional buyers to 10+; recruit more market sellers
- **Issue:** Price recommendations not matching market reality
  - **Fix:** Review forecasting model; adjust for season/region-specific patterns
- **Issue:** App performance degrading as user base grows
  - **Fix:** Profile API endpoints; optimize database queries; cache static data

**Deliverable:** Engagement analysis report; scale-up recommendations; further recruitment if needed

#### Iteration 4: Weeks 33–35 (End-of-Cycle Feedback & Preparation for Phase 7)
**Focus:** Capture full harvest cycle data; prepare evaluation

**Data Collection:**
- End-of-cycle farmer survey: Did AgriSmart help reduce loss? Improve income?
- Buyer feedback: Would you continue using AgriSmart?
- Transporter feedback: Profitability impact?
- Support team: What's the most critical fix or feature needed for scale?

**Analysis & Prioritization:**
- Synthesize all 12 weeks of data into themes (what worked, what didn't)
- Document learnings for Phase 3 roadmap update

**Deliverable:** End-of-cycle feedback summary; Phase 7 evaluation prep

---

### Workstream 6.3: Success Metrics & Data Analysis

**Responsible:** M&E Lead, Data Analyst  
**Duration:** Ongoing (weekly summary); deep analysis at mid-cycle and end-of-cycle

#### Daily Automated Tracking

| Metric | Source | Frequency | Tracked Since |
|--------|--------|-----------|---|
| Listings created | API logs | Daily | Week 24 |
| Pre-commitments submitted | API logs | Daily | Week 24 |
| Pre-commitments accepted | API logs | Daily | Week 24 |
| Transactions completed | API logs | Daily | Week 24 |
| Transactions overdue | API logs | Daily | Week 24 |
| Users online (USSD + app) | Session logs | Daily | Week 24 |
| App crashes | App analytics | Daily | Week 24 |
| USSD errors | Gateway logs | Daily | Week 24 |

#### Weekly Manual Tracking (Field Ops)

| Metric | Method | Frequency | Target |
|--------|--------|-----------|--------|
| Farmer-reported spoilage | SMS/phone survey (5–10 farmers) | Weekly | Trend: ↓ from baseline 30–40% to < 25% |
| Farmer-reported prices received | Phone survey (5–10 farmers) | Weekly | Trend: ↑ from baseline GHS 400–600 to +10% |
| Farmer satisfaction | CSAT survey (1–5 scale) | Weekly | Target ≥ 4/5 |
| Buyer pre-commitment rate | Manual count from support calls | Weekly | # of new commitments / # of farmers = conversion rate |
| Payment delays | Manual tracking from support tickets | Weekly | Trend: ↓ from baseline 25–30% to < 10% |

#### Mid-Cycle Report (Week 29)
- Summary of metrics after 6 weeks
- Comparison to baseline (Phase 1)
- Early indicators of success or concern
- Recommendations for Phase 6 adjustment

**Example Mid-Cycle Report:**
- ✓ Post-harvest loss: 28% (slight improvement from baseline 32%)
- ✓ Farm-gate price: +8% on average
- ⚠ Repeat usage rate: 45% (target 60%); investigate why farmers not listing 2+ times
- ✓ Forecast accuracy: 65% (recommendations led to profitable sales)
- ⚠ Transport adoption: Low (only 5 transport requests so far); need to recruit more transporters or promote feature

**Deliverable:** Mid-cycle report (3–5 pages); recommendations for adjustment

#### End-of-Cycle Report (Week 35)
- Full 12-week analysis
- Final metrics vs. success criteria
- Comparison to baseline across all dimensions
- Top learnings and recommendations for Phase 7 decision

**Deliverable:** End-of-cycle report (10–15 pages); data tables and visualizations; ready for Phase 7 evaluation

---

### Phase 6 Exit Criteria & Sign-Off

**Must be true to proceed to Phase 7 (Evaluation):**

- ✅ Platform operated successfully for 12 weeks with > 95% uptime
- ✅ At least one full harvest cycle completed (farmers planted → harvested → sold → payment received/outstanding)
- ✅ ≥ 50 completed end-to-end transactions (from listing to payment)
- ✅ Daily transaction volume > 2 (listings, pre-commitments, or payments combined)
- ✅ Post-harvest loss metric collected from ≥ 20 farmers; analysis shows trend (up/flat/down vs. baseline)
- ✅ Farm-gate price data collected; analysis shows trend vs. baseline
- ✅ Payment delay incidents tracked and quantified
- ✅ Repeat usage rate calculated (% of users who performed 2+ transactions)
- ✅ Forecast recommendations validated (sample of ≥ 20 recommendations; outcome tracked)
- ✅ All support tickets logged and categorized; P0/P1 issues resolved within SLA
- ✅ UX iterations documented; usability improvements measured and validated
- ✅ All pilot data consolidated and ready for Phase 7 analysis

**Sign-Off Authority:** Field Operations Lead + M&E Lead + Product Lead

---

## Phase 7: Evaluation & Go/No-Go Decision (Weeks 36–38)

**Duration:** 3 weeks  
**Status:** Pending  
**Dependency:** Phase 6 complete; all 12 weeks of data collected

### Objectives
1. Analyze pilot results against success criteria (quantitative impact)
2. Gather and synthesize qualitative feedback
3. Assess technical and business readiness for scale-up
4. Make go/no-go decision on nationwide expansion
5. Document roadmap for next phase (scale-up, pivot, or pause)

---

### Workstream 7.1: Impact Analysis

**Responsible:** M&E Lead, Data Analyst  
**Duration:** 1.5 weeks

#### Success Metric Analysis

| Metric | Baseline (Phase 1) | Target (Phase 7 Success) | Pilot Result (Phase 6) | Assessment |
|--------|-------|-------|--------|--------|
| **Post-Harvest Loss** | 30–40% (typical) | < 25% | ? | If ✓ PASS, if ✗ FAIL, if ~= MARGINAL |
| **Farm-Gate Price** | GHS 400–600/unit | +10% (GHS 440–660/unit) | ? | If ✓ PASS, if ✗ FAIL, if ↑5% MARGINAL |
| **Payment Delays** | 25–30% of sales | < 10% | ? | If ✓ PASS, if ✗ FAIL, if ~20% MARGINAL |
| **Repeat Usage Rate** | N/A (new platform) | ≥ 60% at 4 weeks | ? | If ✓ PASS, if < 40% FAIL, if 45–50% MARGINAL |
| **Completed Transactions** | 0 | ≥ 50 | ? | If ≥50 PASS, if 20–50 MARGINAL, if <20 FAIL |
| **Forecast Accuracy** | N/A | ≥ 60% recommendations profitable | ? | If ✓ PASS, if ✗ FAIL, if 50–60% MARGINAL |
| **Transport Adoption** | Baseline ~GHS 50–80 per farmer | 20% cost savings via pooling | ? | If ✓ PASS, if 0 adoption FAIL, if 5–10% savings MARGINAL |
| **User Satisfaction (NPS)** | N/A | ≥ 50 (likely to recommend) | ? | If ✓ PASS, if < 30 FAIL, if 30–40 MARGINAL |

**Analysis Process:**
1. Gather all 12 weeks of data from Phase 6
2. Aggregate to pilot-level summary (mean, median, std dev)
3. Compare to baseline and success targets
4. Document assumptions and data quality notes
5. Identify patterns (e.g., "Farmers who received 2+ pre-commitments had 40% lower spoilage")

**Deliverable:** Quantitative Impact Summary (3–5 pages); metric-by-metric assessment

---

### Workstream 7.2: Qualitative Feedback & Lessons Learned

**Responsible:** Field Operations, Product Manager, UX Researcher  
**Duration:** 1 week

#### Focus Groups & Interviews

| Audience | Method | Timing | Key Questions | Participants |
|----------|--------|--------|---|---|
| **Farmers** | Focus group (in-person or Zoom) | Week 36 | "What worked? What didn't? Would you recommend? What's needed for scale?" | 8–10 (mix of heavy, medium, light users) |
| **Buyers/Sellers** | Individual interviews or group call | Week 36 | "Did AgriSmart help your business? Pricing? Supply reliability? Would you continue?" | 5–8 |
| **Transporters** | Individual interviews | Week 36 | "Booking volume? Profitability? Usability? What needs to improve?" | 3–5 |
| **Support Team** | Debrief session | Week 36 | "Top user issues? Most frequent questions? What's frustrating users?" | Field ops team |
| **Pilot Partners** | Stakeholder meeting | Week 37 | "Lessons learned? Recommendations for scale? Committed to expansion?" | Farmer coop, market assoc., transporter leader |

#### Themes to Capture
1. **User Motivation:** What made users adopt? What would make more people adopt?
2. **Biggest Barriers:** What prevented users from using more often? Where did they drop off?
3. **Business Impact:** Did farmers sell more? Did buyers find supply? Did anyone make more money?
4. **Trust & Safety:** Any disputes? Payment failures? Were they resolved fairly?
5. **Feature Requests:** What's missing? What would users pay for?
6. **Recommendations for Scale:** What should change before expanding to more users/regions?

#### Synthesis Process
- Document quotes and themes
- Identify patterns (e.g., "5 farmers mentioned confusion with USSD quantity format")
- Prioritize by frequency and impact
- Create "Lessons Learned" section for Phase 7 report

**Deliverable:** Qualitative Findings Summary (5–10 pages); prioritized list of improvements for scale-up

---

### Workstream 7.3: Technical Readiness Review

**Responsible:** CTO, Backend Lead, ML Lead  
**Duration:** 1 week

#### Scalability Assessment

| Component | Pilot Capacity (Phase 6) | Phase 3 Target Capacity | Readiness for Scale | Notes |
|-----------|---|---|---|---|
| **API Servers** | 100 concurrent users | 1,000 concurrent users | Yellow | Current Express.js + in-memory OK for 100; need auto-scaling for 1,000 |
| **Database** | 500 records (in-memory) | 100,000 records | Yellow | Postgres migration planned; schema ready; need to test 100K record scale |
| **USSD Gateway** | 20 concurrent sessions | 500 concurrent sessions | Green | Vendor handles; just need increased quota |
| **Mobile App** | 50 active sessions | 5,000 active sessions | Green | Framework scales; may need CDN for app updates |
| **Forecasting Model** | 10 forecast requests/day | 100 forecast requests/day | Green | Model response time < 200ms; CPU not bottleneck |
| **Mobile Money Integration** | 10 transactions/day | 100 transactions/day | Green | Vendor handles; just need higher settlement batches |

#### Architecture Decisions for Phase 4 (Hardening)
1. **Database Migration:** Migrate to Postgres (pre-Phase 3 or during Phase 4)
2. **API Auto-Scaling:** Set up load balancer + multiple server instances
3. **Caching:** Implement Redis for frequently accessed data (prices, listings)
4. **CDN:** Distribute mobile app updates + static assets globally
5. **Logging & Monitoring:** Upgrade to enterprise logging (e.g., Datadog, New Relic)

**Deliverable:** Technical Readiness Checklist; Phase 4 Hardening Plan (specific tasks, owners, timeline)

---

### Workstream 7.4: Business Model Validation

**Responsible:** Finance, Product Manager, Field Operations  
**Duration:** 1 week

#### Revenue & Sustainability Model

| Revenue Stream | Pilot Test | Feasibility | Revenue Potential |
|---|---|---|---|
| **Platform Commission** | 5% on transactions (tested in sandbox) | ✓ Feasible | If 1,000 transactions/day × GHS 2,000 avg = GHS 100,000 commission/day |
| **Farmer Subscription** | Not tested in pilot (free during pilot) | ? TBD | GHS 10/month × 1,000 farmers = GHS 10,000/month |
| **Buyer Subscription** | Not tested in pilot (free during pilot) | ? TBD | GHS 50/month × 100 buyers = GHS 5,000/month |
| **Transport Listings Fee** | Not tested in pilot (free during pilot) | ? TBD | GHS 100/month × 50 transporters = GHS 5,000/month |
| **Advertising** | Not tested in pilot | ? TBD | Sponsored listings, market data reports |

#### Cost Model (Pilot Annual Projection, if scaled to 5,000 farmers)

| Cost Category | Pilot (95 users) | Scaled (5,000 farmers) | Annual Cost |
|---|---|---|---|
| **Server Hosting** | $500/month | $5,000/month | $60,000 |
| **SMS/USSD Gateway** | $100/month (subsidized pilot) | $2,000/month | $24,000 |
| **Mobile Money Fees** | 2% of transaction volume | 2% of transaction volume | ~$50,000 (if 100K trans/month) |
| **Personnel** | 0.5 backend dev, 0.5 field ops | 3–5 full-time team | $150,000 |
| **Other (storage, monitoring, etc.)** | $200/month | $1,000/month | $12,000 |
| **Total Annual** | ~$15,000 | ~$300,000 | $296,000 |

#### Break-Even Analysis
- **Pilot Annual Cost:** ~$15,000
- **Pilot Annual Revenue (projected):** ~$5,000 (conservative, assuming only 5% commission on 50 transactions/day)
- **Verdict:** Pilot not revenue-positive (expected; pilot is validation, not revenue phase)
- **Scale-Up Break-Even:** If platform takes 5% commission on GHS 50M transaction volume/year = GHS 2.5M revenue; annual cost ~$300K → 8x margin; break-even at ~GHS 6M transaction volume/year

**Assessment:** Business model feasible at scale if transaction volume meets projections

**Deliverable:** Business Model Summary (3–5 pages); break-even analysis; sustainability roadmap

---

### Workstream 7.5: Go/No-Go Decision Framework

**Responsible:** Product Lead, Sponsor, Field Operations Lead  
**Duration:** 1 week

#### Decision Criteria

| Criterion | Weight | PASS | MARGINAL | FAIL |
|-----------|--------|------|----------|------|
| **Post-harvest loss reduction** | 25% | ↓ ≥15% from baseline | ↓ 5–14% | ↓ <5% or ↑ |
| **Farm-gate price increase** | 20% | ↑ ≥10% from baseline | ↑ 5–9% | ↑ <5% or ↓ |
| **Payment delay reduction** | 20% | ↓ ≥50% from baseline | ↓ 25–49% | ↓ <25% |
| **Repeat usage rate** | 15% | ≥60% at 4 weeks | 45–59% | <45% |
| **User satisfaction (NPS)** | 10% | ≥50 | 30–49 | <30 |
| **Technical readiness** | 10% | Scales to 10x users | Scales to 5x users | Cannot scale |

#### Weighted Scoring
- **GO (≥70 points):** Metrics show clear positive impact; user satisfaction high; technical readiness confirmed → Proceed to Phase 3 expansion
- **GO-WITH-CONDITIONS (50–69 points):** Metrics marginal; specific blockers identified; fixable before expansion → Proceed to Phase 3 with additional work on identified areas
- **NO-GO (<50 points):** Metrics poor; low user satisfaction; major blockers → Pause expansion; investigate root causes; consider pivot

#### Recommendation Meeting
- Gather decision-makers (Product Lead, Sponsor, Field Ops Lead, CTO, Finance)
- Present quantitative metrics, qualitative findings, technical readiness, business model
- Vote on go/no-go recommendation
- Document decision and rationale
- Communicate clearly to stakeholders and pilot users

**Deliverable:** Go/No-Go Recommendation Memo (2–3 pages); weighted scoring table; stakeholder sign-off

---

### Workstream 7.6: Roadmap for Next Phase

**Responsible:** Product Manager, CTO  
**Duration:** 1 week

#### Scenario 1: GO → Expansion Roadmap

**If Pilot Was Successful:** Expand to additional crops and/or regions

**Phase 3 (Expanded Pilot) — Weeks 1–12:**
- **Crops:** Add maize, pepper, okra (based on farmer interest and market data)
- **Regions:** Expand from Central Region to Ashanti Region (similar climate, infrastructure)
- **Users:** Onboard 500–1,000 farmers, 50–100 buyers/sellers, 20–30 transporters across both regions
- **Features:** Same as Phase 2 MVP (no major new features); focus on operational excellence and support

**Phase 4 (Expansion + Hardening) — Weeks 13–24:**
- **Technical:** Database migration (Postgres), auto-scaling, multi-region deployment
- **Features:** Mobile money live (not sandbox), cold-chain coordination (new for Phase 4), advanced analytics
- **Operations:** Scale support team; hire regional field coordinators

**Phase 5 (Nationwide Launch) — Weeks 25–52:**
- **Geographic:** Target all major agricultural regions in Ghana (Brong-Ahafo, Northern, Upper East, etc.)
- **Users:** 50,000+ farmers, 5,000+ buyers/sellers, 500+ transporters
- **Partnership:** Government integration (e.g., Ministry of Agriculture for subsidy or data); NGO partnerships for farmer training

#### Scenario 2: GO-WITH-CONDITIONS → Conditional Expansion Roadmap

**If Pilot Showed Potential but Had Fixable Issues:** Continue current region, add fixes

**Example:** Repeat usage rate only 45% (target 60%)
- **Root Cause Analysis:** Why did farmers not list 2+ times?
  - Insufficient buyer pool? Prices too low? USSD too confusing?
- **Fix:** Recruit more buyers; adjust pricing recommendations; simplify USSD menu
- **Timeline:** 4 weeks of iteration
- **Then:** Proceed to Phase 3 expansion with fixes validated

#### Scenario 3: NO-GO → Pause & Pivot Roadmap

**If Pilot Showed Poor Impact:** Pause expansion; investigate and pivot

**Example:** Post-harvest loss unchanged; farmers still lack reliable buyers
- **Pivot Option 1:** Shift to wholesale aggregation model (platform buys from farmers directly, resells to buyers) instead of marketplace
- **Pivot Option 2:** Focus on specific buyer segment (e.g., only institutional buyers) instead of broad retail market
- **Pivot Option 3:** Add cold-chain partnership (refrigerated vehicle) to differentiate from competitors
- **Timeline:** 6–12 weeks to test pivot; then re-evaluate

**Deliverable:** Expansion Roadmap (10–15 pages); Phase 3 detailed plan (GO scenario); Conditional or Pivot roadmap (if not full GO)

---

### Phase 7 Final Deliverables

1. **Evaluation Report (15–20 pages)**
   - Executive summary (1 page)
   - Quantitative impact vs. success criteria (2–3 pages, tables & charts)
   - Qualitative feedback synthesis (3–5 pages)
   - Technical readiness assessment (2–3 pages)
   - Business model validation (2–3 pages)
   - Lessons learned (top 5 wins, top 5 challenges) (1–2 pages)
   - Appendices (detailed tables, interview notes, user testimonials)

2. **Go/No-Go Decision Memo (2–3 pages)**
   - Clear recommendation (GO / GO-WITH-CONDITIONS / NO-GO)
   - Top 3 decision drivers
   - Weighted scoring table
   - Stakeholder signatures

3. **Roadmap for Next Phase (10–15 pages)**
   - Phase 3 detailed plan (if GO scenario)
   - Conditional or pivot plan (if not full GO)
   - Timeline, budget, team requirements
   - Risk mitigation strategies

4. **Data Archive**
   - All 12 weeks of pilot data (transactions, user profiles, support tickets)
   - Analysis notebooks (SQL queries, statistical summaries)
   - User testimonials and photos
   - Stored for future reference and longitudinal analysis

---

### Phase 7 Exit Criteria & Sign-Off

**Completion = Full Project Evaluation Done:**

- ✅ Quantitative impact metrics analyzed and documented
- ✅ Qualitative feedback gathered and synthesized
- ✅ Technical readiness assessment complete
- ✅ Business model validated
- ✅ Go/No-Go scoring completed and decision made
- ✅ Roadmap for next phase documented (expansion, conditional, or pivot)
- ✅ All stakeholders informed of decision
- ✅ Pilot data archived for future reference
- ✅ Evaluation report and decision memo approved and filed

**Sign-Off Authority:** Product Lead + Sponsor + CTO + Finance Lead + Field Operations Lead

---

## Appendices

### A. Success Metrics Summary

**Quantitative Targets (Measured at Phase 7):**

| Metric | Baseline | Pilot Target | Stretch |
|--------|----------|--------------|---------|
| Post-Harvest Loss | 30–40% | < 25% | < 15% |
| Farm-Gate Price Increase | 0% (baseline) | +10% | +20% |
| Payment Delay Incidents | 25–30% | < 10% | < 5% |
| Repeat Usage Rate (at 4 weeks) | 0% (new) | ≥ 60% | ≥ 80% |
| Completed End-to-End Transactions | 0 | ≥ 50 | ≥ 100 |
| Forecast Accuracy | N/A | ≥ 60% | ≥ 75% |
| Transport Cost Savings (for users) | GHS 50–80/farmer | 20% savings | 30% savings |
| User Satisfaction (NPS) | N/A | ≥ 50 | ≥ 70 |

**Qualitative Targets:**

- ✓ Farmer satisfaction: ≥ 70% would recommend to a peer
- ✓ Buyer/Seller satisfaction: Platform is useful for 3+ core workflows
- ✓ Transporter satisfaction: Booking volume and profitability improved
- ✓ Technical team confidence: Platform ready for 10x user scale
- ✓ Partner commitment: Farmer group, market association, transporter committed to expansion

---

### B. Critical Path & Risk Mitigation

**Critical Path Items (Highest Risk for Delay):**

1. **Phase 1: External Partnerships (Weeks 1–4)**
   - Risk: MNO or mobile money provider contract delays (procurement can be slow in Africa)
   - Mitigation: Start outreach in Week 0; have backup vendors identified; escalate to sponsor if needed

2. **Phase 1: Pilot Partner Recruitment (Weeks 1–4)**
   - Risk: Farmers/sellers unwilling to participate or drop out during pilot
   - Mitigation: Involve pilot partners early (design phase); frequent check-ins; be responsive to their concerns; consider small cash incentive for participation

3. **Phase 3: Forecasting Model Validation (Weeks 13–18)**
   - Risk: Historical data unavailable or poor quality; model accuracy low
   - Mitigation: Secure data in Phase 1; validate quality immediately; fall back to simple heuristics if model doesn't converge

4. **Phase 5: User Onboarding (Weeks 22–23)**
   - Risk: Farmers not showing up for onboarding; device issues; language barriers
   - Mitigation: Coordinate with pilot partners; do onboarding at familiar locations (cooperative meetings); provide incentives (phone credit, light snacks); have Twi/Ga-speaking facilitators

5. **Phase 6: Harvest Cycle Timing (Weeks 24–35)**
   - Risk: Pilot launch misses planting season; harvest cycle extends beyond 12 weeks
   - Mitigation: Anchor Phase 5 launch date to regional planting calendar (plan Phase 1 in detail); if late, extend Phase 6 timeline (project goes to Q1 2027)

---

### C. Timeline at a Glance

```
Month 1 (Weeks 1–4)     | Phase 1: Design & Planning
Month 2 (Weeks 5–8)     | Phase 2a: MVP Backend & USSD
Month 2–3 (Weeks 9–12)  | Phase 2b: MVP Mobile App & Dashboard
Month 3 (Weeks 13–16)   | Phase 3a: Forecasting & Payment
Month 3–4 (Weeks 17–18) | Phase 3b: Transport & Ratings
Month 4 (Weeks 19–21)   | Phase 4: Testing & Hardening
Month 4–5 (Weeks 22–23) | Phase 5: Pilot Launch
Month 5–9 (Weeks 24–35) | Phase 6: Live Operation (1 harvest cycle)
Month 9 (Weeks 36–38)   | Phase 7: Evaluation & Decision
```

**Total: 38 weeks (~9 months) from design kickoff to go/no-go decision**

---

### D. Key Contacts & Roles

| Role | Responsibility | Contact Method |
|------|---|---|
| **Product Lead** | Overall product strategy, feature prioritization, stakeholder communication | Weekly standup |
| **CTO** | Technical architecture, code review, performance sign-off | Bi-weekly architecture review |
| **Backend Lead** | REST API, database, data model, mobile money integration | Daily standups |
| **Mobile Lead** | iOS/Android app, UX, app performance | Daily standups |
| **USSD Engineer** | USSD menu, SMS notifications, gateway integration | Daily standups |
| **ML Lead** | Forecasting module, model training, accuracy validation | Weekly check-ins |
| **Field Operations Lead** | User recruitment, onboarding, support, data collection | Daily standups |
| **M&E Lead** | Metrics definition, data analysis, impact reporting | Weekly check-ins |
| **Finance** | Budget, partnerships (mobile money, MNO), cost analysis | Bi-weekly reviews |
| **Sponsor** | Executive oversight, escalation, go/no-go decision | Monthly reviews |

---

## Document Metadata

| Attribute | Value |
|-----------|-------|
| **Version** | 1.0 |
| **Last Updated** | August 27, 2026 |
| **Status** | Draft for Approval |
| **Document Owner** | Product Lead |
| **Review Frequency** | After Phase 1 complete (Week 4 checkpoint); quarterly thereafter |
| **Approval Authority** | Product Lead + CTO + Sponsor |
| **Distribution** | Project team, stakeholders, pilot partners |

---

**END OF DOCUMENT**
