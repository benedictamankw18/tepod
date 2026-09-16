# Phase 1 — Design & Planning

# AgriSmart AI
*Design & Planning Package (Weeks 1–4)*

**Version:** 1.0
**Prepared:** August 2026
**Companion documents:** SRS v1.0, Project Plan v1.0

---

## 1. Purpose of This Phase

Turn the SRS into a concrete, buildable architecture, lock in the three external integrations the whole system depends on (USSD/SMS gateway, mobile money, weather/price data), and line up the human partners (farmer group, market association, transport provider) needed to run a real pilot. Nothing in Phase 2 should start until the exit criteria below are met.

---

## 2. Technical Architecture

### 2.1 Architecture Overview

A thin client layer over a shared backend, so the same business logic serves USSD, SMS, and the mobile app:

```
                        ┌─────────────────────────┐
                        │      Farmers / Buyers /   │
                        │  Market Sellers / Transport│
                        └───────────┬───────────────┘
              ┌─────────────────────┼─────────────────────┐
              ▼                     ▼                     ▼
        USSD Session          SMS In/Out             Mobile App
        (menu-driven)         (notifications,         (Android,
                               keyword commands)        low-bandwidth)
              │                     │                     │
              └─────────────────────┼─────────────────────┘
                                    ▼
                    ┌───────────────────────────────┐
                    │     API Gateway / Backend      │
                    │  (listings, users, matching,    │
                    │   payments, transport, admin)   │
                    └───────────────┬────────────────┘
              ┌─────────────────────┼─────────────────────┐
              ▼                     ▼                     ▼
      Forecasting Module    Payment Service        Notification Service
      (price + weather      (mobile money           (SMS/USSD dispatch)
       history → recs)       integration)
              │                     │
              ▼                     ▼
      Weather/Price Data     Mobile Money Provider
      Source(s)               API
```

### 2.2 Component Decisions to Lock in This Phase

| Component | Decision Needed | Leading Options to Evaluate |
|---|---|---|
| USSD/SMS gateway | Which aggregator/telco route to contract | Hubtel (Ghana-based, payments + messaging heritage); mNotify (Ghana-based, USSD applications); Africa's Talking (pan-African, well-documented API) as fallback |
| Mobile money integration | Which provider(s) at pilot launch | MTN MoMo (Collections + Disbursements as separate subscribed products via the MoMo Developer Portal) as primary, given MTN's market position in Ghana |
| Weather data | API source for the forecasting module | Ghana Meteorological Agency (official, may require a data-sharing agreement); a commercial weather API as a faster-to-integrate fallback |
| Price data | Historical + ongoing price feed | Esoko (Accra-based agricultural marketing/price service); MoFA/SRID production and price data as a public-sector supplement |
| Backend hosting | Cloud region and provider | Any major cloud provider with a West Africa-adjacent region; confirm data residency requirements early |
| Mobile app stack | Low-bandwidth Android framework | To be confirmed by engineering lead based on team skillset; must support offline-first/low-data operation |

**Owner:** Engineering lead + Product lead. **Target:** decisions locked by end of Week 2, contracting/API access by end of Week 4.

### 2.3 Core Data Model (First Pass)

- **User** — id, name, phone number, role (Farmer / Buyer / Market Seller / Transport Provider / Admin), location, verification status, rating.
- **Listing** — id, farmer_id, crop type, quantity, expected harvest date, asking price, status (open / pre-committed / sold / expired / spoiled-withdrawn).
- **Pre-commitment** — id, listing_id, buyer_id, quantity, offered price, status (pending / accepted / rejected / countered).
- **Transaction** — id, listing_id, buyer_id, farmer_id, agreed price, payment status, payment due date.
- **Transport Request** — id, farmer_id(s), pickup location(s), requested date, status, assigned transporter_id.
- **Forecast Recommendation** — id, crop type, location, recommended window, sell-now-vs-wait guidance, confidence level, data sources used, generated_at.

This maps directly onto FR-1.x through FR-9.x in the SRS; engineering should treat the SRS requirement IDs as the source of truth when designing tables/endpoints.

### 2.4 Non-Functional Design Notes

- USSD session logic must be stateless-friendly (store session state server-side, keyed by session ID, per typical USSD gateway constraints) — informs NFR-1.1.
- All endpoints touching personal data or payment status must sit behind the same auth/encryption layer from day one — informs NFR-4.1–4.3.
- Design the data model now so it is crop-agnostic (crop type as a field, not a schema assumption) — informs NFR-5.1 (multi-crop scaling) even though the pilot is tomato-only.

---

## 3. External Integration Workstreams

| Integration | This Phase's Task | Exit Criteria |
|---|---|---|
| USSD/SMS gateway | Request pricing/terms from 2–3 vendors (e.g., Hubtel, mNotify, Africa's Talking); confirm USSD short-code availability and SMS delivery rates in Central Region | Vendor selected, sandbox/test credentials obtained |
| Mobile money | Register on MTN MoMo Developer Portal; subscribe to Collections and Disbursements products separately; obtain sandbox API user/key | Sandbox request-to-pay flow tested successfully |
| Weather data | Contact Ghana Meteorological Agency re: data access/API; identify a commercial fallback API | At least one weather data source with confirmed API access |
| Price data | Contact Esoko re: partnership/data licensing for tomato prices in Central Region; identify MoFA/SRID as public-sector supplement | At least one price data source with confirmed access, covering the pilot region |

**Owner:** Engineering lead (technical integration) + Product lead (vendor relationships/contracting).

---

## 4. Pilot Partner Recruitment

Recruit three categories of ground partners in parallel with the technical work, since onboarding (Phase 5) depends on relationships being in place well before launch.

| Partner Type | Role in Pilot | Recruitment Approach |
|---|---|---|
| Farmer group / cooperative (tomato growers, Central Region) | Source of pilot farmer users; trusted intermediary for onboarding and training | Work through existing agricultural extension contacts or district agriculture offices; build on relationships established during the field interview stage |
| Market association / market sellers | Source of pilot buyer-side users (e.g., sellers similar to those interviewed at Ashanti Market) | Direct outreach to market associations in target markets (e.g., Kasoa, Donasi Market, Ashanti Market) |
| Transport provider(s) | Fulfill shared-transport requests (FR-4.x) | Identify 1–2 local transport operators willing to pilot pooled-route bookings |

**Owner:** Field operations lead. **Target:** at least one committed partner per category by end of Week 4.

---

## 5. Baseline Metrics & Data Collection Plan

Before pilot launch, capture a "before" snapshot so Phase 7 evaluation has something to measure against. This should be collected via structured follow-up with the same or similar farmers/sellers interviewed during the field research stage.

| Metric | How to Capture | Target Coverage |
|---|---|---|
| Current post-harvest tomato loss rate (self-reported %) | Structured survey with pilot farmers | All onboarding farmers |
| Current average farm-gate tomato price received | Structured survey / recent sales records | All onboarding farmers |
| Current average payment delay (days) from buyers | Structured survey with farmers and market sellers | All onboarding farmers and sellers |
| Current average transport cost per trip/load | Structured survey with farmers and sellers | Representative sample |
| Current reliance on price information (none / informal / other) | Structured survey | All onboarding farmers and sellers |

**Owner:** M&E lead, supported by field operations during partner recruitment visits.

---

## 6. Phase 1 Task Checklist

- [ ] Architecture decisions (Section 2.2) reviewed and signed off by engineering + product leads.
- [ ] USSD/SMS gateway vendor selected; sandbox access obtained.
- [ ] MTN MoMo (or alternate) sandbox integration confirmed working.
- [ ] Weather data source identified and access confirmed.
- [ ] Price data source (Esoko and/or MoFA/SRID) identified and access confirmed.
- [ ] Farmer group/cooperative partner committed.
- [ ] Market association/seller partner committed.
- [ ] Transport provider partner committed.
- [ ] Baseline survey instrument drafted and pilot success metrics finalized.
- [ ] Baseline data collection started with committed partners.

**Phase exit:** all items above checked before Phase 2 (MVP Build) begins.
