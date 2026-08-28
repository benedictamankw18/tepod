# Project Plan

# AgriSmart AI
*Implementation Plan — Digital Marketplace and Forecasting Platform to Reduce Post-Harvest Tomato Losses in Ghana*

**Version:** 1.0
**Prepared:** August 2026
**Companion document:** AgriSmart AI — Software Requirements Specification (v1.0)

---

## 1. Objective

Deliver a working pilot of AgriSmart AI in Ghana's Central Region that measurably reduces tomato post-harvest losses and improves farmer income, by connecting farmers, buyers, transporters, and market sellers through SMS/USSD and a low-bandwidth mobile app, backed by an AI forecasting module.

**Success looks like:** a functioning pilot with real farmers, buyers, and market sellers transacting through the platform, a measurable reduction in reported spoilage/loss versus baseline, and a validated case for expansion to other crops and regions.

---

## 2. Scope of This Plan

Covers the work from project kickoff through a completed Central Region tomato pilot and go/no-go decision on expansion. Excludes long-term nationwide rollout planning, which is a follow-on effort once pilot results are in.

---

## 3. Phased Approach

| Phase | Focus | Approx. Duration |
|---|---|---|
| 0. Foundation (complete) | Field research, abstract, SRS | Done |
| 1. Design & Planning | Technical design, partner lineup, data sourcing | 4 weeks |
| 2. MVP Build | Core marketplace + USSD/SMS, no AI yet | 8 weeks |
| 3. Forecasting & Logistics Build | AI module, transport coordination, payments | 6 weeks |
| 4. Internal Testing & Hardening | QA, security, load testing | 3 weeks |
| 5. Pilot Launch | Onboard real users in Central Region | 2 weeks |
| 6. Pilot Operation & Monitoring | Live operation, support, data collection | 12 weeks |
| 7. Evaluation & Go/No-Go | Analyze results, decide on expansion | 3 weeks |

**Total: ~38 weeks (~9 months)** from design kickoff to expansion decision.

---

## 4. Phase Detail

### Phase 1 — Design & Planning (Weeks 1–4)
- Finalize technical architecture (backend, USSD/SMS gateway choice, mobile app stack).
- Select and contract mobile network operator for SMS/USSD gateway access.
- Select and contract a mobile money provider for payment integration.
- Identify and secure weather data and historical price data sources for the pilot region.
- Recruit pilot partners: a farmer group/cooperative, a market association (e.g., contacts through Ashanti Market sellers), and at least one transport provider.
- Define pilot success metrics and baseline data collection plan (current loss rates, current farm-gate prices, current payment delay rates).

**Exit criteria:** architecture approved, all three external integrations (SMS/USSD, mobile money, weather/price data) confirmed feasible, pilot partners committed.

### Phase 2 — MVP Build (Weeks 5–12)
- Build core data model: users, listings, pre-commitments, transactions.
- Build USSD menu flows: register, list produce, check price, check pre-commitment status (FR-1.x, FR-2.x, FR-8.2).
- Build SMS notification service (FR-1.4, FR-8.1).
- Build low-bandwidth mobile app covering the same core flows for smartphone users.
- Build basic admin dashboard (listings, users, transactions).

**Exit criteria:** a farmer can list produce and a buyer can pre-commit, end to end, via both USSD and app, in a test environment.

### Phase 3 — Forecasting & Logistics Build (Weeks 13–18)
- Build AI forecasting module v1: harvest timing and sell-now-vs-wait recommendation using price history + weather data (FR-3.1–FR-3.5).
- Build payment tracking and reminders, mobile money integration (FR-5.1–FR-5.4).
- Build transport request/coordination flow (FR-4.1–FR-4.4).
- Build rating/trust indicators for buyers and farmers (FR-7.3, FR-5.4).

**Exit criteria:** forecasting module produces recommendations validated against held-out historical data; payment and transport flows work end to end in test environment.

### Phase 4 — Internal Testing & Hardening (Weeks 19–21)
- Functional QA against all FR items in the SRS.
- Security review: encryption at rest/in transit, access control, mobile money credential handling (NFR-4.x).
- Load/performance testing against NFR-1.x targets (USSD response time, app load time).
- Usability testing with a small group of representative farmers and market sellers, including low-literacy users.

**Exit criteria:** no critical/high-severity defects open; usability testing shows core flows completable without facilitator assistance.

### Phase 5 — Pilot Launch (Weeks 22–23)
- Onboard pilot farmers, buyers, market sellers, and transporters (registration, verification).
- Conduct in-person or phone-based orientation, given mixed literacy and phone types.
- Activate support channel (helpline/SMS) for pilot users.

**Exit criteria:** target number of pilot users onboarded and able to complete a first transaction.

### Phase 6 — Pilot Operation & Monitoring (Weeks 24–35)
- Run the platform live through at least one tomato harvest cycle.
- Monitor: listings created, pre-commitment rate, transaction completion rate, payment delay incidents, spoilage/loss reports, transport bookings, forecast accuracy.
- Weekly check-ins with pilot partners; biweekly dispute/issue review.
- Iterate on UX and bug fixes based on real usage.

**Exit criteria:** at least one full harvest cycle completed with data captured against all defined success metrics.

### Phase 7 — Evaluation & Go/No-Go (Weeks 36–38)
- Compare pilot metrics against baseline (loss rate, farmer income, payment delay rate, transport cost).
- Document lessons learned and required changes for scale-up.
- Prepare recommendation: expand to additional crops/regions, iterate further, or pause.

**Exit criteria:** evaluation report delivered; go/no-go decision made with stakeholders.

---

## 5. Workstreams and Ownership

| Workstream | Responsible | Key Dependencies |
|---|---|---|
| Product/Requirements | Product lead | SRS (complete) |
| Backend & Marketplace Engineering | Engineering team | Architecture sign-off |
| USSD/SMS Integration | Engineering + MNO partner | MNO contract |
| AI Forecasting Module | Data/ML lead | Historical price + weather data access |
| Mobile Money/Payments Integration | Engineering + payment provider | Provider contract |
| Field Operations (onboarding, support) | Field ops lead | Pilot partner recruitment |
| Monitoring & Evaluation | M&E lead | Baseline data collection (Phase 1) |

---

## 6. Key Risks

| Risk | Mitigation |
|---|---|
| Weak or unavailable historical price/weather data for the pilot region | Begin data sourcing in Phase 1; fall back to manual/partner-collected data if needed |
| Low user trust/adoption among farmers and market sellers | Involve pilot partners (farmer group, market association) early; run in-person onboarding |
| Mobile money provider or MNO integration delays | Start contracting in Phase 1, in parallel with design |
| USSD/SMS usability issues for low-literacy users | Usability testing in Phase 4 before pilot launch, with iteration built into the timeline |
| Forecasting recommendations perceived as unreliable | Present confidence/risk indicators (FR-3.5) rather than bare predictions; validate against historical data before launch |
| Seasonal timing mismatch (pilot launch missing the harvest window) | Anchor Phase 5 launch date to the regional tomato planting/harvest calendar during Phase 1 planning |

---

## 7. Success Metrics for the Pilot

- Reduction in self-reported post-harvest tomato loss versus baseline.
- Increase in average farm-gate price received by participating farmers versus baseline.
- Reduction in payment delay incidents/disputes versus baseline.
- Number of completed transactions and repeat usage rate.
- Forecast recommendation accuracy (predicted vs. actual price/spoilage outcomes).

---

## 8. Immediate Next Steps

1. Approve technical architecture and finalize the SRS as the baseline for build.
2. Begin MNO and mobile money provider outreach.
3. Confirm pilot partners (farmer group, market association, transport provider).
4. Define and start collecting baseline metrics ahead of pilot launch.
