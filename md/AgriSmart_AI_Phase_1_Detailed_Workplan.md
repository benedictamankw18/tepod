# Phase 1: Design & Planning — Detailed Workplan

*AgriSmart AI: Digital Marketplace and Forecasting Platform*

**Duration:** 4 weeks (Weeks 1–4)  
**Status:** Current  
**Dependency:** Phase 0 (Foundation) complete  
**Prepared:** August 27, 2026

---

## Executive Summary

Phase 1 is the critical foundation for the entire 38-week project. Success in this phase directly determines whether subsequent phases (MVP build, forecasting, pilot, expansion) proceed on schedule or face delays. This document provides a week-by-week, day-by-day action plan for all four workstreams:

1. **Technical Architecture** — Finalize backend, USSD/SMS, mobile app, and database strategy
2. **External Integration Contracting** — Secure SMS/USSD gateway, mobile money provider, price data, weather data
3. **Pilot Partner Recruitment** — Recruit farmer cooperatives, market seller associations, transport providers
4. **Baseline Metrics & Data Collection** — Establish baseline measurements for impact evaluation

**Key Success Factors:**
- ✅ All external contracts signed by Week 4 (no delays in Phase 2 start)
- ✅ Pilot partners committed and baseline data collected
- ✅ Technical architecture approved by CTO before design kickoff
- ✅ Data sources (prices, weather) secured and validated

---

## Phase 1 Overview

### Objectives
1. **Architecture:** Define technology stack, system design, and integration points
2. **Partnerships:** Establish relationships with MNO, mobile money provider, data sources
3. **Pilot Users:** Recruit 75–95 farmers, sellers, buyers, transporters with signed MOUs
4. **Baseline:** Measure current conditions (loss rates, prices, delays) for Phase 7 impact assessment

### Timeline at a Glance

```
Week 1 (Days 1–5)     | Workstream kickoff + Architecture decisions
Week 2 (Days 6–10)    | MNO/MoMo vendor selection; Partner outreach begins
Week 3 (Days 11–15)   | Contract negotiations; Baseline interviews begin
Week 4 (Days 16–20)   | Contract signatures; Final baseline; Exit criteria review
```

### Ownership Structure

| Workstream | Lead | Key Team | Deliverables |
|-----------|------|----------|---|
| **Architecture** | CTO / Backend Lead | Engineers, Mobile lead | Architecture doc, tech stack decisions |
| **Integrations** | Business Development | Finance, Engineering | Signed contracts, API docs, credentials |
| **Pilot Recruitment** | Field Operations Lead | Field ops staff | MOUs, user registry, baseline interviews |
| **Baseline Metrics** | M&E Lead | Data analyst, Field ops | Baseline report with 7 metrics |

### Weekly Standups
- **Daily:** Team leads (15 min) — blockers, daily progress
- **Tuesday:** All-hands (1 hour) — cross-workstream updates, escalations
- **Friday:** Steering committee (1.5 hours) — risk review, Week N+1 plan

---

## Workstream 1: Technical Architecture (Weeks 1–4)

**Responsible:** CTO, Backend Lead, Mobile Lead, Data Lead  
**Duration:** 4 weeks (parallel with other workstreams)

### Goal
Define a scalable, maintainable technical foundation that:
- ✅ Scales from 95 pilot users (Phase 2) to 50,000+ users (Phase 5)
- ✅ Integrates with external partners (MNO, mobile money, weather APIs)
- ✅ Supports USSD (feature phones) and mobile app (smartphones)
- ✅ Can migrate from in-memory to Postgres without major refactoring

---

### Week 1: Technology Stack Selection & Decisions

#### Monday (Day 1): Kickoff + Vendor Options Review

**Morning (9 AM–12 PM):**
- Stakeholder kickoff meeting (Product Lead, CTO, Finance, Field Ops Lead)
- Review Phase 0 findings and SRS requirements
- Confirm timeline: 38 weeks, must exit Phase 1 by Week 4

**Afternoon (1 PM–5 PM):**
- CTO leads architecture workshop: backend stack, mobile app framework, database strategy
- Decision: Select backend tech (Express.js vs. Django vs. Go?)
- Decision: Select mobile app framework (React Native vs. Flutter vs. native Android/iOS?)
- Document assumptions and dependencies

**Deliverable:** Architecture Kickoff Memo (2 pages)
- Technology stack options
- Decision matrix (scalability, time-to-market, maintainability)
- Recommended selections

#### Tuesday (Day 2): USSD/SMS Gateway Research

**Morning:**
- Research USSD/SMS providers serving Ghana (Africa's Talking, Hubtel, Yo!, etc.)
- Compare pricing, features, response times, support quality
- Identify 3 finalists for presentations

**Afternoon:**
- Create vendor comparison spreadsheet (rates, SLAs, integration complexity, support)
- Draft communication to vendors: "Request for Proposal (RFP)" for Phase 2–7 partnership

**Deliverable:** USSD/SMS Vendor Shortlist (with pricing, features, integration details)

#### Wednesday (Day 3): Mobile Money Provider Research

**Morning:**
- Research mobile money providers in Ghana (MTN MoMo, AirtelTigo Money, others)
- Understand Collections and Disbursements APIs
- Identify 2–3 finalists

**Afternoon:**
- Create vendor comparison (fees, API maturity, settlement speed, support)
- Draft RFP to mobile money providers

**Deliverable:** Mobile Money Vendor Shortlist (with fee structures, API docs)

#### Thursday (Day 4): Data Providers Research

**Morning:**
- Identify historical price data sources (Ministry of Food & Agriculture, NGOs, market associations, private databases)
- Identify weather data providers (NOAA, OpenWeatherMap, national meteorology, etc.)
- Assess data quality, completeness, licensing

**Afternoon:**
- Create matrix of data sources
- Draft MOUs or licensing agreements (where needed)
- Estimate data acquisition cost and timeline

**Deliverable:** Data Provider Shortlist (sources, cost, timeline, data quality assessment)

#### Friday (Day 5): Architecture Decision Review

**Morning:**
- Backend Lead prepares technical architecture options (3 paths: Express.js, Django, Go)
- Mobile Lead prepares mobile app tech options (React Native vs. Flutter)
- Database strategy: in-memory Phase 2–3, Postgres design Phase 4

**Afternoon:**
- CTO review + sign-off on recommendations
- Steering committee approval
- Communicate decisions to team

**Deliverable:** Technology Stack Memo (signed by CTO)
- Recommended backend: Express.js (Node.js)
- Recommended mobile: React Native
- Recommended database: in-memory (Phase 2–3), Postgres (Phase 4+)
- Rationale and trade-offs

---

### Week 2: System Architecture & Integration Design

#### Monday (Day 6): Backend Architecture Detailed Design

**Task:** Define REST API structure, data model, authentication approach

**Deliverables:**
- API endpoint list (v1.0): all 14 endpoints from README
- Data model ERD (Entity-Relationship Diagram): Users, Listings, PreCommitments, Transactions, etc.
- Authentication strategy (phone-based for USSD, optional app login)
- Error handling and response format standards

**Owner:** Backend Lead  
**Duration:** 2 days (Mon–Tue)

**Example Output:**
```
API Endpoints:
  POST /api/users (register)
  GET /api/listings (search)
  POST /api/listings (create)
  POST /api/precommitments (submit)
  ... (14 total)

Data Model:
  Users: id, phone, role, name, location, created_at
  Listings: id, farmer_id, crop_type, qty, price, harvest_date, status
  PreCommitments: id, listing_id, buyer_id, qty_offered, price_offered, status
  ...
```

#### Tuesday (Day 7): USSD/SMS Integration Design

**Task:** Define webhook contract, session model, message format

**Deliverables:**
- USSD webhook specification (request/response format)
- Session state machine diagram
- SMS notification types and triggers
- Integration points: how USSD connects to REST API

**Owner:** USSD Engineer + Backend Lead  
**Duration:** 2 days (Tue–Wed)

**Example Output:**
```
USSD Webhook Contract:
  POST /ussd
  Body: { sessionId: string, phoneNumber: string, text: string }
  Response: { message: string, continueSession: boolean }
  Example: "CON Welcome to AgriSmart\n1. Register\n2. List Produce"

Session Model:
  sessionId → farmer_id
  Text accumulation: "1*10*450" (menu 1, qty 10, price 450)
  Timeout: 10 minutes
```

#### Wednesday (Day 8): Mobile Money Integration Design

**Task:** Define payment flow, API contract, settlement model

**Deliverables:**
- MTN MoMo Collections flow (buyer pays)
- MTN MoMo Disbursements flow (farmer receives)
- Transaction state machine (pending → in_progress → completed → overdue → disputed)
- Settlement schedule and fee split

**Owner:** Integration Engineer + Backend Lead  
**Duration:** 1.5 days (Wed–Thu AM)

**Example Output:**
```
Collections Flow:
  1. Buyer clicks "Pay GHS 5000"
  2. Backend calls MTN API: { amount: 5000, phone: "+233241234567", ... }
  3. MoMo prompts buyer for PIN
  4. Backend receives callback with status
  5. If success: update transaction to "completed" + trigger Disbursements

Disbursements Flow:
  1. Backend calls MTN API: { amount: 4750 (95% after 5% commission), phone: farmer_phone, ... }
  2. MoMo settles to farmer account
  3. Send SMS to farmer confirming receipt
```

#### Thursday (Day 9): Mobile App Architecture

**Task:** Define app navigation, screen list, offline support strategy

**Deliverables:**
- App navigation hierarchy (Login → Dashboard → [Create Listing / Search / Prices])
- Screen list (10+ screens across all user roles)
- Offline support strategy (cache listings locally, sync on reconnect)
- Data sync approach (polling vs. WebSocket)

**Owner:** Mobile Lead  
**Duration:** 1.5 days (Thu–Fri AM)

#### Friday (Day 10): Database Design & Migration Path

**Task:** Design schema for Postgres (Phase 4), in-memory structure for Phase 2–3

**Deliverables:**
- Postgres schema (DDL): tables, indexes, relationships
- In-memory store interface (store.js): CRUD functions that can be swapped for Postgres queries
- Migration toolkit outline (how to export Phase 3 data → Postgres)
- Scaling considerations (sharding, replication, read replicas for Phase 5)

**Owner:** Backend Lead + Database Architect  
**Duration:** 2 days (Thu–Fri)

**End of Week 2 Deliverable:** Technical Architecture Document (20–30 pages)
- All system diagrams (UML, ERD, sequence diagrams for key flows)
- API specification (OpenAPI/Swagger format or equivalent)
- Technology stack with justification
- Integration contracts (USSD, mobile money, weather API, price API)
- Database design and migration path
- Performance targets and scaling roadmap

**CTO Sign-Off:** Friday EOD, must approve before moving to Week 3

---

### Week 3: Detailed API & Integration Specs

#### Monday (Day 11): API Specification Document

**Task:** Create complete API documentation (ready for Phase 2 development)

**Deliverables:**
- OpenAPI/Swagger spec for all 14 endpoints
- Request/response examples for each endpoint
- Error codes and messages
- Rate limiting policy
- Authentication approach

**Owner:** Backend Lead  
**Duration:** 2 days

#### Tuesday–Wednesday (Days 12–13): Integration Contracts

**Task:** Finalize contracts with external vendors (MNO, mobile money, data providers)

**Activities:**
- Confirm API endpoint URLs and authentication credentials (sandbox)
- Test webhook connectivity (if provider available)
- Document any rate limits or quirks

**Owner:** Integration Engineer  
**Duration:** 2 days

#### Thursday–Friday (Days 14–15): Architecture Review + Approval

**Activities:**
- Internal architecture review (backend, mobile, security leads present)
- Address any concerns or suggestions
- CTO final sign-off

**Deliverable:** Approved Technical Architecture Document (signature page)

---

### Week 4: Final Architecture Lock-Down

#### Monday–Friday (Days 16–20): Documentation & Handoff

**Activities:**
- Finalize all architecture diagrams
- Create developer onboarding guide (how to set up Phase 2 dev environment)
- Prepare Phase 2 kickoff materials (architecture overview for dev team)
- Archive all decisions in shared documentation system

**Deliverable:** Phase 1 Architecture Package (ready for Phase 2 handoff)

---

## Workstream 2: External Integration Contracting (Weeks 1–4)

**Responsible:** Business Development Lead, Finance, Engineering Lead  
**Duration:** 4 weeks (parallel, with overlaps)

### Goal
Secure signed contracts and sandbox access for:
1. SMS/USSD Gateway (MNO partner)
2. Mobile Money Provider
3. Historical Price Data
4. Weather Data

---

### Week 1: Vendor Selection & Outreach

#### Monday–Tuesday (Days 1–2): USSD/SMS Gateway Selection

**Vendors to evaluate:**
- **Africa's Talking** — Most popular in East Africa, good documentation
- **Hubtel** — Ghana-based, strong local support
- **Yo!** — Another Ghana option
- **Others:** Vonage, Twilio (higher cost, less Africa-specific)

**Evaluation Criteria:**
- Price (per message, per session)
- Response time (< 2 sec for USSD)
- Support quality (especially for West Africa)
- API maturity (webhook reliability)
- Settlement terms (when do they pay us? if applicable)

**Activities:**
1. Send RFP to 3 vendors
2. Request demo/proof-of-concept
3. Schedule calls with each vendor's sales team
4. Get pricing quotes

**Owner:** Business Development  
**Duration:** 2 days

**Deliverable:** USSD/SMS Vendor Comparison (table with pricing, SLAs, contact info)

#### Wednesday (Day 3): Mobile Money Provider Selection

**Vendors to evaluate:**
- **MTN MoMo** — Largest market share in Ghana
- **AirtelTigo Money** — Second option
- **Others:** Vodafone Cash, etc.

**Activities:**
1. Identify key contacts at each provider (partnerships/developer relations team)
2. Explain use case: platform for farmers to receive payments, buyers to send payments
3. Request API documentation + sandbox credentials
4. Understand fee structure and settlement timing

**Owner:** Finance + Business Development  
**Duration:** 1 day (Wednesday morning), plus follow-up calls

**Deliverable:** Mobile Money Vendor Comparison (fees, API availability, support contact)

#### Thursday (Day 4): Price Data Provider Selection

**Sources to evaluate:**
- **Ministry of Food & Agriculture (Ghana)** — Official source, may have historical data
- **NGOs working in Central Region** — May have collected baseline data
- **Market associations** — Ashanti Market, Kasoa Central, etc.
- **Private databases** — Agricultural data companies

**Activities:**
1. Contact Ministry of Food & Agriculture: request historical price data (Central Region, tomato, 24+ months)
2. Reach out to NGOs (e.g., Heifer International, CARE) operating in Ghana
3. Contact pilot farmer cooperative (once identified): ask if they track prices
4. Identify backup: if primary source doesn't pan out, use manual collection during pilot

**Owner:** Data Lead  
**Duration:** 1 day (Thursday) + follow-up emails/calls

**Deliverable:** Price Data Source Confirmation (which source, estimated arrival date, format)

#### Friday (Day 5): Weather Data Provider Selection

**Providers to evaluate:**
- **NOAA (US National Weather Service)** — Free, global coverage, but API learning curve
- **OpenWeatherMap** — Simple API, covers Ghana
- **Ghana Meteorological Service** — Official source, may have partnership available
- **World Bank Climate Data** — Historical climate data for research

**Activities:**
1. Test OpenWeatherMap API (free tier) for Central Region Ghana
2. Check data availability and granularity (daily temperatures, rainfall, humidity)
3. Identify 5+ years of historical data for backtesting forecasting models
4. Confirm API rate limits and costs at scale

**Owner:** Data Lead / ML Engineer  
**Duration:** 1 day (Friday) + technical testing

**Deliverable:** Weather Data Source Confirmation (API URL, historical data availability, cost estimate)

---

### Week 2: Vendor Negotiations & Contract Drafting

#### Monday (Day 6): USSD/SMS Gateway Contract Negotiation

**Activities:**
1. Phone calls with top 2 vendors (based on Week 1 evaluation)
2. Discuss:
   - Pricing: per message, per USSD session, monthly minimum?
   - Sandbox access: available immediately?
   - Support SLA: response time for critical issues?
   - Webhook reliability: will they guarantee delivery?
   - Test scenarios: can we test with Ghana numbers?
3. Negotiate pricing if possible (pilot subsidy?)
4. Confirm timeline for sandbox access

**Owner:** Business Development + Engineering  
**Duration:** Full day (multiple calls)

**Deliverable:** Negotiation notes, vendor recommendation (1st choice + backup)

#### Tuesday (Day 7): Mobile Money Provider Contract Negotiation

**Activities:**
1. Calls with MTN MoMo (primary) and AirtelTigo Money (backup)
2. Discuss:
   - Sandbox API availability
   - Collections & Disbursements API documentation
   - Settlement: how often? how long? what fees?
   - Testing: can we send test transactions?
   - KYC: what documentation needed for merchant account?
   - Volumes: do we need to commit to minimum transaction volume?
3. Request API sandbox credentials
4. Confirm expected go-live date for Phase 3

**Owner:** Finance + Engineering  
**Duration:** Full day (multiple calls)

**Deliverable:** Mobile Money Contract Recommendation (primary vendor, key terms)

#### Wednesday (Day 8): Price Data Licensing

**Activities:**
1. Follow up with Ministry of Food & Agriculture (official request for data)
2. Contact NGO partners (formal data request or MOU)
3. Discuss:
   - Data format (CSV, database, API?)
   - Frequency of updates
   - Attribution/citation requirements
   - Cost (free or paid?)
   - Timeline: when available?
4. If delays expected, plan for Phase 2 manual data collection as backup

**Owner:** Data Lead  
**Duration:** 0.5 days (email/calls) + follow-up

**Deliverable:** Data Access MOU or Agreement (signed or in draft)

#### Thursday (Day 9): Weather Data API Setup

**Activities:**
1. Set up OpenWeatherMap developer account (or Ghana Meteorological Service partnership)
2. Test API calls for Central Region, Ghana (Kasoa, Ada, etc.)
3. Verify data availability: temperature, rainfall, humidity for past 5+ years
4. Confirm API rate limits and costs
5. Document API authentication and usage patterns

**Owner:** Data Lead / ML Engineer  
**Duration:** 0.5 days (technical setup)

**Deliverable:** Weather Data API Ready (test calls working, documentation)

#### Friday (Day 10): Contract Review with Legal

**Activities:**
1. Circulate draft contracts with Business Development team
2. Internal legal review (if available) or external counsel:
   - MNO contract: terms, SLAs, liability, exit clauses
   - Mobile money contract: fees, settlement terms, dispute resolution
   - Data licensing: usage rights, attribution, data security
3. Identify any red flags
4. Prepare revisions for Week 3 negotiation

**Owner:** Business Development + Finance  
**Duration:** 0.5 days (internal review) + follow-up

**Deliverable:** Contract Review Summary (risks identified, revision requests)

---

### Week 3: Contract Finalization & Signature

#### Monday (Day 11): USSD/SMS Gateway Contract Signing

**Activities:**
1. Final negotiation round (if needed) on pricing and SLAs
2. Sign contract with selected vendor (Africa's Talking, Hubtel, or other)
3. Confirm sandbox access and API documentation delivery
4. Schedule integration testing call with vendor's technical team
5. Assign vendor account manager/technical contact

**Owner:** Business Development + Finance  
**Duration:** 1 day

**Deliverable:** Signed USSD/SMS Contract + Sandbox Credentials

#### Tuesday (Day 12): Mobile Money Provider Contract Signing

**Activities:**
1. Final terms review with MTN MoMo (or AirtelTigo if backup)
2. Confirm sandbox API credentials
3. Sign contract
4. Schedule technical onboarding (Collections & Disbursements API walkthrough)
5. Confirm merchant account setup timeline

**Owner:** Finance + Engineering  
**Duration:** 1 day

**Deliverable:** Signed Mobile Money Contract + Sandbox API Credentials

#### Wednesday–Thursday (Days 13–14): Data Access Agreements

**Activities:**
1. Finalize Data licensing agreement with Ministry / NGO / other source
2. Get data extract or API access
3. Validate data quality: completeness, outliers, date range
4. Store data in development environment (ready for Phase 3 forecasting model)
5. Document any data caveats or limitations

**Owner:** Data Lead  
**Duration:** 2 days

**Deliverable:** Data Access Agreement Signed + Data Received & Validated

#### Friday (Day 15): Contract Summary & Handoff

**Activities:**
1. Compile all signed contracts and API credentials
2. Create "Vendor Reference Guide" (contact info, SLAs, emergency escalation)
3. Prepare handoff document for Phase 2 team (how to connect to each integration)
4. Schedule vendor kickoff calls if needed

**Owner:** Business Development  
**Duration:** 0.5 days

**Deliverable:** Phase 1 Integration Contract Package (all agreements, credentials, vendor contacts)

---

### Week 4: Integration Testing & Validation

#### Monday–Wednesday (Days 16–18): Sandbox Integration Testing

**Activities:**
1. USSD/SMS Gateway:
   - Test webhook with sample USSD request
   - Verify response format
   - Test error scenarios (timeout, invalid input)
2. Mobile Money Provider:
   - Test Collections API (simulate buyer payment)
   - Test Disbursements API (simulate farmer payout)
   - Test error scenarios (insufficient balance, wrong PIN)
3. Weather API:
   - Query current weather for Central Region
   - Query historical weather data
   - Verify data freshness and accuracy

**Owner:** Integration Engineer  
**Duration:** 3 days

**Deliverable:** Integration Testing Report (results for each vendor, any issues identified)

#### Thursday–Friday (Days 19–20): Readiness Review

**Activities:**
1. Review all contracts and credentials
2. Confirm all integrations tested and working
3. Create "Integration Readiness Checklist" for Phase 2 team
4. Document any known issues or workarounds
5. Steering committee review: all integrations approved for Phase 2 start

**Owner:** Integration Engineer + Business Development  
**Duration:** 1 day

**Deliverable:** Integration Readiness Checklist (✓ all items signed off)

---

## Workstream 3: Pilot Partner Recruitment & MOUs (Weeks 1–4)

**Responsible:** Field Operations Lead  
**Duration:** 4 weeks (intense effort Weeks 1–3, validation Week 4)

### Goal
Recruit and commit 75–95 pilot users across 4 user types:
- 30–50 smallholder farmers (tomato, maize, other crops)
- 15–20 market sellers (retail markets)
- 3–5 institutional buyers (wholesale)
- 3–5 transport providers (vehicles + drivers)

---

### Week 1: Partner Identification & Initial Outreach

#### Monday (Day 1): Stakeholder Mapping

**Task:** Identify key contacts and influential figures in target communities

**Activities:**
1. Map out farming communities in Central Region (Kasoa, Ada, Todi, etc.)
2. Identify existing farmer cooperatives or groups
3. Identify market associations (Ashanti Market, Kasoa Central Market)
4. Identify transport companies or informal transport networks
5. Leverage any existing relationships from Phase 0 field research

**Research Resources:**
- Phase 0 field interview findings (farmers/sellers already contacted)
- Ministry of Food & Agriculture (cooperative registry)
- Market association directories
- NGO working in region (if applicable)

**Owner:** Field Operations Lead + Field Officers  
**Duration:** 1 day

**Deliverable:** Stakeholder Contact List (names, phone numbers, roles, communities)

#### Tuesday–Friday (Days 2–5): Initial Outreach Calls

**Task:** Contact potential pilot partners, explain opportunity, gauge interest

**Activities:**
1. **Farmer Cooperatives:** Call cooperative leaders
   - Explain: "AgriSmart helps farmers sell produce for better prices and reduces spoilage"
   - Ask: "Would 30–50 farmers from your cooperative be interested in testing this?"
   - Listen: concerns, questions, barriers
   - Next step: Schedule in-person meeting

2. **Market Seller Associations:** Call market leaders
   - Explain: "AgriSmart connects you with farmers directly, better pricing, supply visibility"
   - Ask: "Would 15–20 of your sellers be interested?"
   - Schedule in-person meeting

3. **Transport Providers:** Call transport companies
   - Explain: "Booking platform could increase utilization, better matching"
   - Ask: "Would you commit 3–5 vehicles for pilot?"
   - Schedule in-person meeting

4. **Institutional Buyers:** Call wholesale buyers or buyers' associations
   - Explain: "Direct supply from farmers, reduce middlemen"
   - Ask: "Would you participate in pilot?"
   - Schedule phone or in-person meeting

**Owner:** Field Operations Lead + Field Officers  
**Duration:** 4 days (many calls)

**Deliverable:** Outreach Call Log (contact name, date, interest level: High/Medium/Low, next step)

---

### Week 2: In-Person Meetings & Relationship Building

#### Monday–Friday (Days 6–10): Site Visits & Meetings

**Task:** Meet with partners in person, build relationships, present platform

**Activities:**
1. **Farmer Cooperative Visits** (2–3 cooperatives in Central Region)
   - Meet with cooperative leadership and board
   - Explain platform benefits (prices, direct buyers, support)
   - Show mockup/demo if available
   - Discuss: "What are your main concerns about trying this?"
   - Discuss: "What would make your farmers comfortable participating?"
   - Explore: Potential incentives (phone credit? subsidy?)

2. **Market Seller Visits** (visit 1–2 retail markets)
   - Meet with market associations or individual stall owners
   - Explain sourcing directly from farmers via platform
   - Show mockup
   - Discuss concerns and logistics

3. **Transport Provider Meetings** (visit transport company depot)
   - Meet with owner/dispatcher
   - Explain pooling benefits and increased bookings
   - Show mockup or demo
   - Discuss vehicle types, availability, rates

4. **Institutional Buyer Calls/Meetings** (remote or in-person)
   - Explain supply reliability and cost benefits
   - Discuss potential volume and timeline

**Owner:** Field Operations Lead (lead for all 4), with support from field officers  
**Duration:** 5 days (travel to sites)

**Deliverable:** Relationship Building Notes (per partner: key contacts, interests, concerns, recommended terms)

---

### Week 3: MOU Negotiation & Signature

#### Monday–Tuesday (Days 11–12): Draft MOUs

**Task:** Prepare draft Memoranda of Understanding for each partner type

**MOU Key Sections (for each partner type):**

**1. Farmer Cooperative MOU**
- Scope: Coop commits to recruit 30–50 farmers
- Roles: Coop facilitates onboarding, troubleshooting, feedback
- Data sharing: Anonymized usage metrics, crop volumes, prices
- Timeline: Onboarding Week 22–23; pilot Weeks 24–35
- Compensation: [TBD — fixed fee, subsidy, or free?]
- Termination: Either party can exit with 2-week notice (if compelling reason)

**2. Market Seller Association MOU**
- Scope: Association commits to recruit 15–20 sellers
- Roles: Association provides onboarding support, resolves disputes
- Revenue share: [Platform takes X% commission on transactions]
- Timeline: Onboarding Week 22–23; pilot Weeks 24–35
- Termination clause

**3. Transport Provider MOU**
- Scope: Provider commits 3–5 vehicles + drivers
- Rates: Provider publishes rate card; AgriSmart takes [X%] commission
- Minimum booking guarantee: [TBD — e.g., 5 bookings/month minimum?]
- Timeline: Pilot Weeks 24–35
- Termination clause

**4. Institutional Buyer Informal Agreement** (may not be formal MOU)
- Scope: Buyer willing to pre-commit purchases
- No commission charged during pilot (testing phase)
- Timeline: Pilot Weeks 24–35

**Activities:**
1. Draft MOUs in legal-friendly language (or use template)
2. Share drafts with partners for review
3. Incorporate feedback
4. Prepare final MOUs for signature Week 3–4

**Owner:** Field Operations Lead + Legal/Business Development  
**Duration:** 2 days (drafting)

**Deliverable:** Draft MOUs (4 templates, reviewed internally)

#### Wednesday–Thursday (Days 13–14): MOU Review & Negotiation

**Activities:**
1. Share draft MOUs with each partner
2. Phone calls to address questions and concerns
3. Negotiate key terms (timeline, compensation, data sharing)
4. Finalize language
5. Prepare for signature (printing, legal review if needed)

**Owner:** Field Operations Lead + Legal  
**Duration:** 2 days

**Deliverable:** Final MOUs (ready for signature)

#### Friday (Day 15): MOU Signature

**Activities:**
1. In-person signature meetings with major partners (farmer coop, market association)
2. Remote signature with transport provider and buyers (email/WhatsApp signature if needed)
3. Get scanned copies of signed MOUs
4. Thank-you calls/meetings to strengthen relationships

**Owner:** Field Operations Lead  
**Duration:** 1 day (travel + calls)

**Deliverable:** Signed MOUs (all 4 partner types committed)

---

### Week 4: Pilot User Registry & Validation

#### Monday–Tuesday (Days 16–17): Pilot User Registry Creation

**Task:** Compile list of 75–95 committed pilot users

**Registry Template (spreadsheet or database):**

| Name | Phone | Role | Cooperative/Market | Location | Crop Types | Device | Language | Contact Method |
|------|-------|------|---|---|---|---|---|---|
| John Mensah | +233241234567 | Farmer | Kasoa Farmers Coop | Kasoa | Tomato, Maize | Feature phone | Twi | SMS |
| Janet Abbam | +233249876543 | Market Seller | Ashanti Market | Accra | N/A | Smartphone | Twi/English | WhatsApp |
| ... | ... | ... | ... | ... | ... | ... | ... | ... |

**Activities:**
1. Contact each partner (coop leader, market association, transport company)
2. Collect list of 30–50 farmers (for coop) OR 15–20 sellers (for market) OR 3–5 drivers (for transport)
3. Gather key details: name, phone, role, device type, language preference
4. Validate phone numbers (call each person briefly to confirm)
5. Compile into master registry

**Owner:** Field Operations Lead + Field Officers  
**Duration:** 2 days

**Deliverable:** Pilot User Registry (75–95 users, complete contact details)

#### Wednesday (Day 18): Baseline Interview Schedule

**Task:** Schedule baseline interviews for Week 4 (Friday + overflowing to Phase 2 if needed)

**Interviews to conduct:**
- **Farmer interviews (20–30 sample):** Loss rate, current prices, payment delays, current buyers, storage access
- **Seller interviews (10–15 sample):** Sourcing, pricing, storage, buyer relationships
- **Transporter interviews (2–3):** Current rates, utilization, seasonal patterns
- **Buyer interviews (2–3):** Current sourcing, reliability, pricing

**Owner:** Field Operations Lead + M&E Lead  
**Duration:** 0.5 days (scheduling)

**Deliverable:** Interview Schedule (dates, times, interview locations/phone calls)

#### Thursday (Day 19): Baseline Data Collection Training

**Task:** Train field officers on baseline interview process

**Activities:**
1. Walk through baseline interview guide (developed by M&E lead)
2. Role play interviews (practice with field officers)
3. Clarify data quality expectations (precise numbers, not estimates)
4. Discuss how to build rapport with farmers (explain why we're asking)
5. Review recording method (written notes, audio recording if permitted, photos)

**Owner:** M&E Lead + Field Operations Lead  
**Duration:** 0.5 days

**Deliverable:** Baseline Interview Training Completed (field team ready)

#### Friday (Day 20): Baseline Interview Kickoff

**Activities:**
1. Begin baseline interviews with sample of farmers, sellers, transporters
2. Collect data on:
   - Post-harvest loss rate (% of harvest that spoils)
   - Current farm-gate prices (what they received last sale)
   - Payment delay incidents (how many times delayed/never paid?)
   - Current transport costs and availability
   - Storage access and capability
   - Device type and language preference
   - Satisfaction with current system (1–5 scale)

3. Record data in structured form (spreadsheet or data collection app)
4. Note any patterns or concerns

**Owner:** Field Officers (with M&E Lead oversight)  
**Duration:** 1 day (interviews continue into Phase 2 if needed)

**Deliverable:** Baseline Interviews Begun (data collection in progress)

---

## Workstream 4: Baseline Metrics & Data Collection Setup (Weeks 1–4)

**Responsible:** M&E Lead  
**Duration:** 4 weeks (preparation + execution)

### Goal
Establish baseline measurements for 7 key metrics that will be tracked during pilot (Phase 6) and compared at evaluation (Phase 7).

---

### Week 1: Baseline Metrics Definition

#### Monday (Day 1): Metrics Framework Development

**Task:** Define 7 baseline metrics, measurement approach, targets

**Metric 1: Post-Harvest Loss Rate**
- **Definition:** % of harvest that spoils before sale (lost to spoilage, damage, no buyer)
- **Baseline data:** Phase 0 field research (30–40% typical for tomato)
- **Measurement method:** Farmer interview recall + direct observation if possible
- **Sample:** 20–30 farmers (diverse locations, farm sizes)
- **Sample size:** Achievable in 2–3 weeks
- **Phase 7 target:** < 25% (50% reduction)

**Metric 2: Farm-Gate Price**
- **Definition:** Price farmer receives per unit (GHS per bag, kg, or unit sold)
- **Baseline:** Phase 0 + transaction data from pilot partners
- **Measurement:** Last 5 sales prices from each farmer, average
- **Sample:** 20–30 farmers
- **Phase 7 target:** +10% above baseline (e.g., GHS 400 → GHS 440)

**Metric 3: Payment Delay Rate**
- **Definition:** % of sales where payment was delayed or never received
- **Baseline:** Farm/seller interviews
- **Measurement:** # delayed payments / total sales in past season
- **Sample:** 15–20 farmers and sellers
- **Phase 7 target:** < 10% (vs. baseline 25–30%)

**Metric 4: Current Transport Costs**
- **Definition:** GHS per farmer trip (from farm/collection point to market/buyer)
- **Baseline:** Transporter + farmer interviews
- **Measurement:** Average cost per trip for typical load (e.g., 10 bags tomato)
- **Sample:** 3–5 transporters, 10–15 farmers
- **Phase 7 target:** 20% savings via pooling (e.g., GHS 150 → GHS 120)

**Metric 5: Device Mix & Connectivity**
- **Definition:** % feature phones vs. smartphones; Internet access availability
- **Baseline:** Farmer/seller survey
- **Measurement:** "What phone do you have? Do you have internet?"
- **Sample:** All 75–95 pilot users
- **Use:** Understand app vs. USSD adoption

**Metric 6: Literacy Level**
- **Definition:** Self-assessed literacy and local language fluency
- **Baseline:** Survey
- **Measurement:** "Can you read and write Twi/Ga/English? Fluently, somewhat, not?"
- **Sample:** All 75–95 pilot users
- **Use:** Design USSD/app for low-literacy users

**Metric 7: Current Buyer Network**
- **Definition:** How do farmers currently find buyers? How reliable?
- **Baseline:** Farmer interviews
- **Measurement:** Qualitative + quantitative (# buyers, repeat rate, typical price range)
- **Sample:** 20–30 farmers
- **Use:** Baseline understanding of market structure

**Owner:** M&E Lead  
**Duration:** 1 day

**Deliverable:** Baseline Metrics Framework (7 metrics, definitions, measurement methods, targets)

#### Tuesday–Wednesday (Days 2–3): Interview Guide Development

**Task:** Create structured interview guides for baseline data collection

**Interview Guides Needed:**
1. **Farmer Baseline Interview** (30–45 min)
   - Demographics (age, years farming, land size)
   - Crops grown, volumes, seasonality
   - Prices received (last 5 sales)
   - Spoilage experience (% loss, reasons)
   - Buyer relationships (how many buyers? repeat? reliable?)
   - Payment issues (delays? non-payment?)
   - Transport costs and availability
   - Storage/cooling access
   - Device and language preference
   - Satisfaction with current system (1–5)

2. **Market Seller Interview** (20–30 min)
   - Current sourcing (where do you buy from?)
   - Prices paid and prices sold (margins)
   - Buyer base (who buys from you?)
   - Transport costs
   - Storage/cooling capability
   - Quality issues
   - Device and language preference

3. **Transporter Interview** (20 min)
   - Vehicle types and capacity
   - Current utilization (trips per week? seasonal variation?)
   - Costs (fuel, maintenance, driver salary)
   - Rates charged
   - Typical routes and distances
   - Peak and off-seasons

4. **Buyer Interview** (20 min)
   - Current sourcing strategy (how many farmers supply?)
   - Reliability issues
   - Price negotiations
   - Volume needs and seasonality
   - Quality standards

**Owner:** M&E Lead  
**Duration:** 2 days (drafting + review)

**Deliverable:** Interview Guides (4 templates, translated to Twi if possible)

#### Thursday–Friday (Days 4–5): Data Collection Tools

**Task:** Set up data capture systems (spreadsheets, mobile app, or paper forms)

**Tools Needed:**
1. **Farmer Baseline Data Spreadsheet**
   - Columns: Name, Phone, Date interviewed, Loss %, Last 5 prices, # buyers, Payment issues, etc.
   - Data validation (checkboxes for categories, numeric ranges for prices/percentages)

2. **Mobile Data Collection App** (optional)
   - Use Google Forms or Kobo Toolbox for simple data capture
   - Can work offline, auto-sync when connected
   - Generates automatic summaries/charts

3. **Paper Forms** (backup)
   - Printed interview guides + data entry forms
   - For areas with no phone/internet

4. **Data Storage & Security**
   - Secure cloud storage (Google Drive, Dropbox, OneDrive)
   - Backup copies (local + cloud)
   - Data privacy: mask phone numbers, use ID codes for sensitive data

**Owner:** Data Analyst + M&E Lead  
**Duration:** 1 day

**Deliverable:** Data Collection Tools Ready (spreadsheets + forms created, field team trained)

---

### Week 2: Baseline Interview Planning & Scheduling

#### Monday–Tuesday (Days 6–7): Interview Logistics

**Task:** Organize interviews with pilot partners

**Activities:**
1. Contact farmer cooperative leader: "Which 20–30 farmers can we interview?" (diverse sample)
2. Contact market association: "Which 10–15 sellers can we interview?"
3. Contact transport providers: "Can we interview 2–3 drivers?"
4. Schedule interviews:
   - **Time:** Avoid harvest/market times (find when farmers/sellers are available)
   - **Location:** Farmer's field or market stall; transporter's depot
   - **Duration:** 30–45 min per interview
   - **Language:** Conduct in Twi/Ga where possible
   - **Incentive:** Offer light refreshment (water, snacks) or small airtime credit (GHS 2–5) as thanks

5. Create interview schedule (Google Sheets or spreadsheet)
   - Date, time, farmer/seller name, location, language, interviewer name

**Owner:** Field Operations Lead + M&E Lead  
**Duration:** 2 days

**Deliverable:** Interview Schedule (all interviews scheduled, Weeks 2–4)

#### Wednesday–Friday (Days 8–10): Interview Training & Dry Run

**Task:** Train field officers to conduct baseline interviews

**Activities:**
1. Role play interview (M&E lead interviews field officer; observe and feedback)
2. Review data quality expectations (precise numbers, not guesses)
3. Discuss rapport-building ("We're not trying to judge; we want to understand your situation")
4. Practice with 2–3 farmers (dry run, full interview)
5. Collect feedback and refine approach

**Owner:** M&E Lead + Field Operations Lead  
**Duration:** 2 days

**Deliverable:** Field Team Training Complete (ready to conduct baseline interviews)

---

### Week 3: Baseline Data Collection Execution

#### Monday–Friday (Days 11–15): Conduct Interviews

**Task:** Execute baseline interviews with sample of farmers, sellers, transporters, buyers

**Activities:**
1. Field officers conduct 20–30 farmer interviews
2. Field officers conduct 10–15 seller interviews
3. M&E lead conducts 2–3 transporter/buyer interviews
4. Data entered into spreadsheet / mobile app daily
5. Quality check: spot-check 10% of entries for accuracy
6. Backup data daily (cloud + local)

**Challenges to anticipate:**
- Farmers busy during harvest (plan around it)
- Language barriers (use local language interpreters if needed)
- Suspicion ("Why are you asking about my sales?") — explain privacy + benefit
- Recall bias ("How much did you lose?") — triangulate with multiple sources
- Seasonal variations — document year/season for each interview

**Owner:** Field Officers + M&E Lead  
**Duration:** 5 days (interviews continue if needed)

**Deliverable:** Baseline Interviews Complete (80+ interviews conducted, data entered)

---

### Week 4: Baseline Analysis & Report

#### Monday–Tuesday (Days 16–17): Data Cleaning & Validation

**Task:** Clean and validate baseline data

**Activities:**
1. Check for missing values, outliers, data entry errors
2. Remove or flag suspicious entries (e.g., "Loss rate: 200%")
3. Validate data types (prices as numbers, percentages between 0–100)
4. Identify and follow up on any unclear responses
5. Create data audit trail (original data + corrections)

**Owner:** Data Analyst  
**Duration:** 1.5 days

**Deliverable:** Clean Baseline Dataset (ready for analysis)

#### Wednesday (Day 18): Baseline Analysis

**Task:** Analyze baseline data, calculate summary statistics

**Analyses to perform:**
1. **Post-Harvest Loss:**
   - Mean, median, std dev
   - Range (min–max)
   - Distribution by farmer (some lose 10%, others 50%?)
   - Seasonal variations

2. **Farm-Gate Price:**
   - Mean price per farmer
   - Price range (GHS 300–GHS 700?)
   - Compare across locations (Kasoa vs. Ada prices same?)
   - Price trend over past season

3. **Payment Delays:**
   - % of sales with delays
   - Average delay duration
   - Non-payment rate (how many never paid?)

4. **Transport Costs:**
   - Average cost per trip
   - Cost per kg or per bag
   - Seasonal variation

5. **Device & Language:**
   - % feature phone vs. smartphone
   - % with internet access
   - Language preferences (Twi, Ga, English mix)

6. **Buyer Network:**
   - Average # buyers per farmer
   - % farmers with repeat buyers
   - Buyer reliability (% who pay on time)

**Owner:** Data Analyst  
**Duration:** 1 day

**Deliverable:** Baseline Analysis (tables, charts, summary statistics)

#### Thursday (Day 19): Baseline Report Drafting

**Task:** Write 10–15 page baseline metrics report

**Report Sections:**
1. Executive Summary (1 page)
   - Key baseline statistics
   - Main findings

2. Methodology (2 pages)
   - Sample size and selection
   - Interview approach
   - Data quality notes

3. Results by Metric (6–8 pages)
   - Post-harvest loss: distribution, regional variation
   - Farm-gate price: average, range, trends
   - Payment delays: frequency, severity
   - Transport costs: average, seasonal
   - Device mix: feature phone vs. smartphone %
   - Literacy: self-assessed reading ability, language fluency
   - Buyer networks: # buyers, reliability, repeat rates

4. Key Insights (2 pages)
   - "Farmers in Kasoa lose more produce than Ada (possibly different crops/storage)"
   - "Payment delays are seasonal (worse post-harvest, when buyers are scarce)"
   - "Most farmers have only 1–2 buyers (limited choice)"
   - "Transport is expensive and unreliable (biggest complaint)"

5. Appendices
   - Interview guide (Twi version)
   - Raw data summary (anonymized)
   - Photos from field (if available)
   - Farmer testimonials (key quotes)

**Owner:** M&E Lead  
**Duration:** 1 day

**Deliverable:** Baseline Metrics Report Draft (10–15 pages)

#### Friday (Day 20): Baseline Report Review & Finalization

**Activities:**
1. Internal review: Product Lead, Field Operations Lead, Steering Committee
2. Address feedback/revisions
3. Finalize report
4. Archive report (shared drive for Phase 6/7 reference)

**Owner:** M&E Lead  
**Duration:** 0.5 days

**Deliverable:** Baseline Metrics Report (Final, signed off)

---

## Phase 1 Exit Criteria & Success Measures

### Must-Pass Criteria (Blocking Phase 2 Start)

✅ **Architecture Approved**
- Technical Architecture Document signed by CTO
- Technology stack (Express.js backend, React Native app, in-memory store → Postgres roadmap) approved
- All architectural decisions documented and communicated to Phase 2 team

✅ **Contracts Signed**
- SMS/USSD Gateway contract signed; sandbox access confirmed
- Mobile Money Provider contract signed; sandbox API credentials received
- Historical price data access confirmed (format, timeline)
- Weather data API functional and tested

✅ **Pilot Partners Committed**
- Farmer cooperative MOU signed; 30–50 farmers identified and registered
- Market seller association MOU signed; 15–20 sellers identified and registered
- Transport provider(s) MOU signed; 3–5 vehicles/drivers committed
- Institutional buyer(s) willing to pre-commit (informal agreement or MOU)
- **Total pilot users: 75–95** (all with contact details, phone verified)

✅ **Baseline Data Collected**
- ≥ 20 farmers interviewed; loss rate, prices, payment delays documented
- ≥ 10 sellers interviewed; sourcing, pricing documented
- ≥ 2 transporter interviews; costs, utilization documented
- ≥ 2 buyer interviews; sourcing, reliability documented
- Baseline Metrics Report (10+ pages) complete and approved

✅ **Phase 2 Readiness**
- Phase 2 project plan confirmed (MVP, timeline, team assignments)
- Integration Reference Guide prepared for Phase 2 team (vendor contacts, sandbox credentials, API docs)
- Risk register updated with Phase 1 learnings
- Steering committee sign-off on Phase 2 kickoff

### Success Indicators (Beyond Blocking Criteria)

✓ **Strong Relationships:** Partners enthusiastic about pilot; no signs of hesitation or skepticism  
✓ **Data Quality:** Baseline data collected with high quality (validated, no major outliers, complete)  
✓ **Team Alignment:** All workstreams completed on time; no major delays or rework  
✓ **External Partner Confidence:** Vendor kickoff calls scheduled; clear technical contacts assigned  
✓ **Field Readiness:** Field operations team trained and confident in conducting pilot onboarding  

---

## Phase 1 Risk Mitigation Plan

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| **MNO/MoMo Contract Delays** | High | CRITICAL | Start vendor outreach Week 0; have 2 backup vendors; escalate to sponsor if contract drags past Week 3 |
| **Poor Quality Historical Data** | Medium | HIGH | Validate data quality in Week 3; if data is poor, plan for manual data collection during Phase 2 |
| **Pilot Partner Drop-Off** | Medium | HIGH | Build relationships early; address concerns proactively; consider small incentives; maintain weekly check-ins |
| **Baseline Interview Delays** | Medium | MEDIUM | Schedule interviews in advance; have backup farmers/sellers; extend collection into Phase 2 if needed |
| **Harvest Cycle Timing** | Medium | CRITICAL | Anchor Phase 5 launch to planting calendar; confirm dates in Week 1 with farm partners |
| **Language/Communication Barriers** | Low | MEDIUM | Use Twi/Ga-speaking facilitators; print materials in local languages; conduct practice interviews |
| **Weather Data API Issues** | Low | MEDIUM | Test OpenWeatherMap API early; have backup provider (Ghana Met Service) identified |

---

## Phase 1 Deliverables Checklist

### Architecture Workstream
- [ ] Technical Architecture Document (signed by CTO)
- [ ] API Specification (OpenAPI/Swagger)
- [ ] Data Model (ERD)
- [ ] USSD Webhook Contract
- [ ] Mobile Money Payment Flow Spec
- [ ] Mobile App Navigation & Screen List
- [ ] Database Design (Postgres schema + in-memory interface)
- [ ] Phase 2 Kickoff Presentation (architecture overview for dev team)

### Integrations Workstream
- [ ] Signed SMS/USSD Gateway Contract
- [ ] SMS/USSD Sandbox Access & API Credentials
- [ ] Signed Mobile Money Contract
- [ ] Mobile Money Sandbox API Credentials
- [ ] Price Data Access Agreement
- [ ] Weather Data API Setup (tested and working)
- [ ] Vendor Reference Guide (contact info, SLAs, emergency escalation)
- [ ] Integration Testing Report

### Pilot Recruitment Workstream
- [ ] Signed MOU: Farmer Cooperative
- [ ] Signed MOU: Market Seller Association
- [ ] Signed MOU: Transport Provider(s)
- [ ] Pilot User Registry (75–95 users with full contact details)
- [ ] Device Type & Language Preference Summary (% feature phone, % smartphone, language mix)

### Baseline Metrics Workstream
- [ ] Baseline Metrics Framework Document
- [ ] Interview Guides (4 types: farmer, seller, transporter, buyer)
- [ ] Baseline Data Collection Tools (spreadsheets or mobile app)
- [ ] Interview Schedule (all interviews scheduled)
- [ ] Baseline Interviews Conducted (80+ interviews, data entered)
- [ ] Baseline Metrics Report (10–15 pages, with analysis and key insights)

### Cross-Workstream
- [ ] Phase 1 Exit Criteria Checklist (all items ✓)
- [ ] Risk Register (updated with Phase 1 learnings)
- [ ] Phase 2 Readiness Review (steering committee sign-off)
- [ ] Project Artifacts Archive (all documents stored in shared drive)

---

## Week-by-Week Summary

### Week 1: Foundation & Decisions
- **Architecture:** Tech stack selection (Express.js, React Native, Postgres roadmap)
- **Integrations:** Vendor outreach (USSD/SMS, mobile money, data providers)
- **Pilots:** Partner identification and initial outreach
- **Baseline:** Metrics framework and interview guide development
- **Steering Committee Meeting:** Friday EOD — Approve all Week 1 decisions; confirm Week 2 plans

### Week 2: Negotiation & Relationship Building
- **Architecture:** Detailed system design (APIs, database, integrations)
- **Integrations:** Vendor negotiations on pricing and terms
- **Pilots:** In-person meetings with partners; explore MOU terms
- **Baseline:** Data collection tools; interview training
- **Steering Committee Meeting:** Friday EOD — Approve contract terms; confirm partner interest

### Week 3: Finalization & Commitment
- **Architecture:** Architecture review and CTO sign-off
- **Integrations:** Contract signatures; sandbox access received
- **Pilots:** MOU signature; pilot user registry created
- **Baseline:** Baseline interviews kickoff (continue into Week 4)
- **Steering Committee Meeting:** Friday EOD — Confirm all contracts signed; pilot users committed

### Week 4: Validation & Handoff
- **Architecture:** Developer onboarding guide; Phase 2 kickoff materials
- **Integrations:** Integration testing; readiness checklist
- **Pilots:** User registry validation; final outreach calls
- **Baseline:** Complete baseline interviews; analysis and report
- **Steering Committee Meeting:** Friday EOD — Phase 1 exit criteria review; **GO/NO-GO for Phase 2 start**

---

## Daily Standup Template

**Format:** 15 minutes, 9:30 AM every weekday (or async Slack updates)

**Each workstream lead reports:**
1. **Yesterday's Progress:** What was accomplished?
2. **Today's Plan:** What will be done today?
3. **Blockers:** Any obstacles? Escalation needed?
4. **Risks:** Anything that might impact timeline?

**Example Standup (Workstream 2 Lead — Integrations):**
> "Yesterday: Conducted calls with Africa's Talking and Hubtel; both interested, sent formal proposals. Today: Follow-up calls to clarify pricing and sandbox timeline. Risk: MTN MoMo hasn't responded yet — may need to reach out to backup provider (AirtelTigo). No blockers."

---

## Phase 1 Success Stories / Testimonials (Template)

At end of Phase 1, capture brief feedback from key partners:

**Example — Farmer Cooperative Leader:**
> "I'm excited to see AgriSmart help our farmers. The commission seems fair, and I like that we're involved from the start. We've committed 45 farmers."

**Example — Mobile Money Provider:**
> "Your use case makes sense. We've seen farmer payments work well in other platforms. We'll have sandbox API ready by next week."

**Example — Field Operations Lead:**
> "The field teams did great work building relationships in Kasoa and Ada. Farmers are hopeful about this — much better reception than expected."

---

## Phase 1 Lessons Learned (to capture at end)

At Week 4 Friday, conduct brief retrospective:

**What Went Well?**
- [Capture positive patterns, successful relationships, quick decisions]

**What Was Challenging?**
- [Contract negotiations slower than expected? Partner drop-offs? Data delays?]

**What Would We Do Differently?**
- [Process improvements for future pilots]

**Key Insights for Phase 2:**
- [What did we learn about user preferences, market dynamics, technical constraints?]

---

## Document Metadata

| Attribute | Value |
|-----------|-------|
| **Version** | 1.0 |
| **Document** | Phase 1 Detailed Workplan |
| **Created** | August 27, 2026 |
| **Status** | Draft — Awaiting Steering Committee Approval |
| **Owner** | Project Lead |
| **Approval Authority** | CTO, Product Lead, Field Operations Lead, Sponsor |
| **Next Review** | Friday Week 4 (Phase 1 Exit Criteria Review) |
| **Distribution** | Project team, steering committee, pilot partners (selected sections) |

---

**END OF PHASE 1 WORKPLAN**

**Questions? Contact:**
- **Product Lead:** [name/email]
- **CTO:** [name/email]
- **Field Operations Lead:** [name/email]
- **M&E Lead:** [name/email]
