# Phase 5: Pilot Launch — Detailed Workplan

*AgriSmart AI: Digital Marketplace and Forecasting Platform*

**Duration:** 2 weeks (Weeks 22–23)  
**Status:** Pending (Phase 4 exit approval required)  
**Dependency:** Phase 4 complete; pilot MOUs, baseline data, release candidate, and support resources ready  
**Prepared:** August 27, 2026

---

## 1. Executive Summary

Phase 5 moves AgriSmart AI from a tested release candidate into controlled use with pilot participants in Ghana's Central Region. The objective is not simply to register users. Each participant must understand the service, complete at least one meaningful action, and have access to support when the network, payment provider, or workflow fails.

The launch will use a staged cohort approach:

1. **Cohort A:** 10–15 trusted users and staff representatives.
2. **Cohort B:** 25–35 additional farmers, sellers, and buyers after the first cohort check.
3. **Cohort C:** Remaining users, including transporters and institutional buyers.

### Phase 5 Outcomes

- 75–95 pilot users onboarded and verified.
- Farmers create first listings; buyers and sellers search and pre-commit.
- Transport providers can receive and update requests.
- First end-to-end transactions are processed and reconciled.
- USSD, app, SMS, payment, dashboard, and support channels are live.
- Daily activity and baseline comparison data are captured.
- No critical blocker prevents the Phase 6 operating period.

### Target User Mix

| User group | Target |
|---|---:|
| Farmers | 30–50 |
| Market sellers | 15–20 |
| Institutional buyers | 3–5 |
| Transporters/drivers | 3–5 |
| Dispatchers/support/admin users | 3–5 |
| **Total** | **75–95** |

---

## 2. Entry Criteria and Launch Rules

### Entry Criteria

- [ ] Phase 4 sign-off is complete.
- [ ] PostgreSQL production or pilot database is initialized and restorable.
- [ ] Payment provider mode is explicitly documented as sandbox or live pilot mode.
- [ ] USSD and SMS callback URLs are configured and tested.
- [ ] Mobile release APK is distributed through the approved channel.
- [ ] User registry contains consent, role, location, language, and device information.
- [ ] Field staff have support scripts, escalation contacts, and test accounts.
- [ ] Monitoring, daily reports, and support ticket tracking are active.
- [ ] Pilot partners confirm onboarding dates and meeting locations.

### Launch Rules

- Use test or low-value transactions until the Product and Finance leads approve live-value payments.
- Never collect a user's PIN, password, or mobile-money secret.
- Record consent and explain what data is collected and why.
- Pause onboarding if a critical payment, data-loss, or account-access issue is found.
- Do not silently alter pilot records; corrections require an audit note.
- Every launch-day issue receives a ticket, owner, severity, and next update time.

---

## 3. Workstream 5.1: User Onboarding

**Duration:** Weeks 22–23  
**Owner:** Field Operations Lead  
**Goal:** Register the target cohort and ensure each participant can complete a role-appropriate first action.

### Standard Onboarding Flow

1. Explain the purpose and limits of the pilot in the user's preferred language.
2. Explain consent, support channels, and what information is recorded.
3. Confirm phone number ownership and role.
4. Demonstrate USSD and/or mobile app workflow.
5. User completes registration personally, with facilitator assistance only when needed.
6. User completes a first action.
7. Facilitator records completion, device type, language, and feedback.
8. Provide the printed or SMS quick guide and support contact.

### Farmer Checklist

- [ ] Phone verified.
- [ ] Role set to farmer.
- [ ] Name, location, language, and crop type recorded.
- [ ] Device type recorded.
- [ ] Farmer understands listing price and quantity units.
- [ ] First listing created through USSD or app.
- [ ] User knows how to check pre-commitment and payment status.
- [ ] Support contact saved.

### Buyer and Seller Checklist

- [ ] Phone verified.
- [ ] Role and market/location recorded.
- [ ] User can search by crop and location.
- [ ] User can view listing details.
- [ ] First pre-commitment submitted or a supervised test completed.
- [ ] User understands offer status and payment steps.

### Transporter Checklist

- [ ] Phone verified.
- [ ] Vehicle capacity and operating area recorded.
- [ ] Rate card or agreed pricing basis recorded.
- [ ] Transporter can view and accept a request.
- [ ] Driver or dispatcher can mark assigned, in transit, and delivered.
- [ ] Escalation contact confirmed.

### Week 22: Controlled Launch

#### Monday (Day 1): Staff and Environment Readiness

Tasks:

1. Hold a launch briefing with technical, field, support, and partner leads.
2. Verify production/staging URLs, monitoring, callbacks, and database health.
3. Run a live smoke test using staff accounts.
4. Confirm support roster and escalation coverage.
5. Prepare onboarding packs and attendance/consent forms.
6. Freeze the launch configuration for Cohort A.

**Deliverable:** Launch readiness checklist signed by Field Operations and Product Leads

#### Tuesday (Day 2): Cohort A Onboarding

Target: 10–15 participants, including farmers, sellers/buyers, and one transporter representative.

Tasks:

1. Conduct in-person onboarding.
2. Observe registration and first action completion.
3. Process only approved test or low-value transactions.
4. Record all questions and defects immediately.
5. Hold an end-of-day review before expanding the cohort.

**Deliverable:** Cohort A registry, completion report, and issue triage

#### Wednesday (Day 3): Cohort A Stabilization

Tasks:

1. Resolve launch-blocking issues from Cohort A.
2. Retest USSD, app, payment, SMS, and dashboard flows.
3. Review support ticket response times.
4. Confirm database records and payment reconciliation.
5. Approve or delay Cohort B expansion.

**Deliverable:** Cohort expansion decision

#### Thursday (Day 4): Cohort B Onboarding

Target: 25–35 additional farmers, sellers, and buyers.

Tasks:

1. Run sessions through cooperative and market partners.
2. Keep separate queues for USSD and smartphone onboarding.
3. Ensure at least one first listing and one first pre-commitment are completed during sessions.
4. Capture language, device, and connectivity constraints.
5. Monitor registration and action completion in real time.

**Deliverable:** Updated registry and daily onboarding report

#### Friday (Day 5): Week 22 Review

Tasks:

1. Reconcile registered users against attendance and consent records.
2. Review activation rate, first-action rate, and support issues.
3. Verify at least one listing-to-offer flow.
4. Review payment and notification logs.
5. Confirm Week 23 schedule and remaining user targets.

**Deliverable:** Week 22 pilot status report and corrective action list

### Week 23: Full Cohort Activation

#### Monday (Day 6): Remaining Farmer Onboarding

Tasks:

1. Onboard remaining farmers to reach 30–50 total.
2. Help each farmer create or update a valid listing.
3. Verify crop, quantity, price, harvest date, and location.
4. Explain how farmers respond to offers.
5. Identify users needing one-to-one follow-up.

**Deliverable:** Farmer target achieved or gap plan approved

#### Tuesday (Day 7): Seller and Buyer Onboarding

Tasks:

1. Onboard remaining market sellers and institutional buyers.
2. Demonstrate search, price guidance, pre-commitment, and payment status.
3. Facilitate matching offers to active farmer listings.
4. Record buyer constraints and desired delivery locations.

**Deliverable:** Buyer/seller target achieved and first offers submitted

#### Wednesday (Day 8): Transporter and Dispatcher Onboarding

Tasks:

1. Onboard drivers and dispatcher.
2. Configure vehicle capacity, route, availability, and rate information.
3. Demonstrate request acceptance, pooling, status updates, and delivery confirmation.
4. Run one supervised transport request with test data.

**Deliverable:** Transport network active and dispatcher trained

#### Thursday (Day 9): Activation Follow-Up

Tasks:

1. Contact users who registered but did not complete a first action.
2. Resolve account, device, language, or connectivity barriers.
3. Reconcile user registry with platform activity.
4. Review support tickets and unresolved payment cases.
5. Confirm every active partner knows the escalation process.

**Deliverable:** Activation follow-up report and unresolved-user list

#### Friday (Day 10): Pilot Launch Gate

Tasks:

1. Demonstrate end-to-end listing, pre-commitment, acceptance, payment, notification, and dashboard visibility.
2. Verify user counts, consent records, and role distribution.
3. Validate first seven days of activity data where available.
4. Review critical incidents and response times.
5. Obtain Field Operations, Product, and Backend sign-off for Phase 6.

**Deliverable:** Phase 5 launch report and Phase 6 operating handoff

---

## 4. Workstream 5.2: Deployment and Environment Operations

**Duration:** Weeks 22–23  
**Owner:** DevOps Lead  
**Goal:** Keep the pilot environment stable, observable, and recoverable.

### Environment Checklist

- [ ] Application deployed from tagged release source.
- [ ] PostgreSQL schema migrated successfully.
- [ ] Seed/reference prices loaded and verified.
- [ ] Provider callback URLs point to the correct environment.
- [ ] HTTPS certificate is valid.
- [ ] Environment variables are present and secrets are not exposed.
- [ ] Health and readiness checks return expected results.
- [ ] Logs, alerts, and uptime monitoring are receiving data.
- [ ] Backups run on schedule and a restore has been verified.
- [ ] Rollback version is available.

### Daily Operations

1. Check uptime, API error rate, response latency, database connections, and job status.
2. Check payment callback failures and unmatched provider references.
3. Check USSD and SMS delivery logs.
4. Review support tickets and known incidents.
5. Export or verify daily activity totals.
6. Record operational status in the launch log.

### Incident Thresholds

| Severity | Example | Response |
|---|---|---|
| P0 | Platform down, data loss, payment corruption | Pause affected flow; page technical lead immediately |
| P1 | Core feature unusable or payment stuck | Assign engineer; update support within 2 hours |
| P2 | Confusing message, intermittent issue, slow response | Log, workaround, resolve within 24–48 hours |
| P3 | Cosmetic or enhancement request | Add to backlog; no launch interruption |

### Service Pause Procedure

1. Support lead reports the issue with user, time, action, and evidence.
2. Technical lead confirms severity and affected surface.
3. Product Lead decides whether to pause registration, payments, or all activity.
4. Field Operations sends a clear user message through approved channels.
5. Engineers preserve logs and transaction state before changes.
6. Resume only after a smoke test and Product Lead approval.

---

## 5. Workstream 5.3: Support Infrastructure

**Duration:** Weeks 22–23 and continuing through Phase 6  
**Owner:** Field Operations Lead  
**Goal:** Give pilot users a reliable human support path for technical, payment, and business questions.

### Support Channels

| Channel | Coverage | Primary use |
|---|---|---|
| SMS/phone helpline | 8 AM–6 PM, six days per week | Urgent user and payment issues |
| WhatsApp group | 9 AM–5 PM on working days | Questions, announcements, peer support |
| Field facilitator | Scheduled visits and calls | Onboarding and recurring usability issues |
| Support tracker | Continuous | Ticket ownership, SLA, trend analysis |

### Ticket Fields

- Ticket ID
- Date and time received
- User ID or masked phone number
- User role and location
- Channel
- Category: technical, payment, marketplace, transport, forecast, account, training
- Description and reproduction steps
- Severity
- Owner and escalation time
- Resolution and user confirmation
- Closed date

### Support SLAs

| Issue | Initial response | Escalation |
|---|---:|---|
| Platform unavailable | 15 minutes | Technical lead immediately |
| Payment stuck or incorrect | 30 minutes | Backend and Finance leads |
| Core feature broken | 2 hours | Product and engineering |
| User cannot complete onboarding | Same working day | Field Operations Lead |
| How-to question | 24 hours | FAQ or facilitator |
| Suggestion/complaint | 48 hours | Product backlog review |

### Support Materials

- One-page USSD registration guide.
- One-page listing and pre-commitment guide.
- Payment-status and dispute guide.
- Transport request guide.
- App installation and offline-use guide.
- Twi/Ga/English FAQ where translation is approved.
- Escalation contact card for facilitators.

---

## 6. Workstream 5.4: Data Collection and Monitoring

**Duration:** Preparation in Week 22; ongoing from launch  
**Owner:** M&E Lead  
**Goal:** Capture reliable adoption, transaction, support, and outcome data from the first day.

### Automated Events

Track at minimum:

- Registration started and completed.
- Listing created, updated, activated, sold, or expired.
- Search performed and listing viewed.
- Pre-commitment submitted, accepted, rejected, or countered.
- Payment initiated, completed, failed, overdue, or disputed.
- Transport request created, matched, assigned, in transit, and delivered.
- Forecast viewed and recommendation returned.
- Notification queued, sent, failed, or retried.
- Support ticket opened and closed.

### Daily Report

The daily report must include:

- New and cumulative users by role.
- Active users and first-action completion rate.
- Listings created and currently active.
- Pre-commitments and acceptance rate.
- Transactions, payment statuses, and total value.
- Transport requests and successful assignments.
- Forecast requests and insufficient-data responses.
- Notification failures and support tickets.
- Incidents, downtime, and unresolved defects.

### Manual Data Collection

During onboarding and pilot operation, collect only approved fields:

- Device type and network constraints.
- Language preference.
- Time to complete first action.
- Weekly quantity listed or sourced.
- Price achieved and market/location.
- Reported spoilage or delay.
- Transport cost and delivery outcome.
- User satisfaction and reason for non-use.

### Data Quality Checks

1. Compare registry totals with platform user totals.
2. Check for duplicate phone numbers and duplicate consent records.
3. Check that each transaction links to an accepted pre-commitment.
4. Check payment totals against provider references.
5. Check dates, units, prices, and locations for invalid values.
6. Flag missing baseline or weekly follow-up data.
7. Lock daily reports after review and record corrections separately.

---

## 7. First-Transaction Playbook

The first successful transactions are a controlled learning activity.

1. Select a farmer listing with clear quantity, price, harvest date, and location.
2. Select a buyer/seller who has completed onboarding.
3. Submit a pre-commitment and confirm the farmer receives notification.
4. Farmer accepts or counters the offer.
5. Create or confirm the transaction amount and due date.
6. Initiate the approved test or live payment flow.
7. Verify provider callback and local transaction status.
8. Confirm buyer, farmer, and dashboard views match.
9. Record transport request if delivery is required.
10. Confirm completion, payment reconciliation, and user understanding.
11. Collect a short feedback response from each party.

**Minimum evidence:** transaction ID, provider reference, timestamps, notification log, dashboard record, and support/feedback note.

---

## 8. Launch Metrics and Targets

| Metric | Target by end of Week 23 |
|---|---:|
| Registered pilot users | 75–95 |
| Users with at least one completed action | 90% or more |
| Farmers with first listing | 80% of onboarded farmers |
| Buyers/sellers with first search or offer | 80% of onboarded buyers/sellers |
| Transporters trained | 100% of selected transporters |
| End-to-end transactions | At least 3 successful supervised transactions |
| Unplanned downtime | 0 during final 7-day stability window |
| Critical unresolved incidents | 0 |
| Payment reconciliation | 100% of pilot payment references matched or escalated |
| Daily report completion | 100% of launch days |
| Urgent support response | Within 2 hours |

These are launch-readiness targets, not final impact claims. Impact and loss-reduction analysis continues during Phase 6.

---

## 9. Risks and Mitigations

| Risk | Impact | Mitigation | Owner |
|---|---|---|---|
| Users register but do not activate | High | Require a supervised first action and follow-up list | Field Operations |
| Network coverage is poor at onboarding venue | High | Use USSD, offline guides, alternate venue, and retry schedule | Field Operations |
| Payment provider is unavailable | Critical | Use approved test mode, pause live payments, reconcile manually | Backend/Finance |
| User misunderstands price guidance | Medium | Use confidence labels, facilitator explanation, and feedback checks | Product/M&E |
| Too many support tickets | High | Staged cohorts, FAQ, facilitator rota, daily triage | Support Lead |
| Duplicate or incorrect user records | Medium | Phone uniqueness, registry reconciliation, audit corrections | Data Engineer |
| Transporter fails to respond | Medium | Dispatcher backup and manual assignment procedure | Operations |
| Pilot scope expands during launch | High | Code freeze and change-control approval | CTO/Product |
| A security incident occurs | Critical | Pause affected flow, preserve evidence, follow incident runbook | Security Lead |

---

## 10. Phase 5 Exit Criteria

### User and Activity

- [ ] 75–95 pilot users are onboarded across the agreed role mix.
- [ ] Consent, phone verification, role, location, language, and device records are complete.
- [ ] At least 90% of users complete one meaningful action.
- [ ] Farmers create first listings; buyers/sellers search and submit offers.
- [ ] Transporters and dispatchers can manage requests.

### Platform and Integrations

- [ ] Staging/pilot environment is stable for seven days.
- [ ] USSD and SMS gateway webhook is operational.
- [ ] Mobile app is distributed and usable on representative devices.
- [ ] Payment collection/disbursement test flow succeeds and reconciles.
- [ ] First end-to-end transactions are processed successfully.
- [ ] Dashboard records match API and database totals.

### Support and Data

- [ ] Helpline, WhatsApp support, and ticket tracker are active.
- [ ] Support team follows the severity and escalation process.
- [ ] Daily reports are generated and reviewed.
- [ ] First seven days of activity data are validated.
- [ ] Baseline and launch data can be linked without exposing unnecessary personal data.

### Sign-Off

- [ ] No critical blocker is reported by pilot users.
- [ ] Field Operations Lead approves user readiness.
- [ ] Product Lead approves pilot experience and scope.
- [ ] Backend Lead approves platform and payment stability.
- [ ] Phase 6 operating calendar and monitoring cadence are confirmed.

---

## 11. Handoff to Phase 6: Pilot Operation and Monitoring

The Phase 6 team receives:

- Final onboarded-user registry and role/device/language summary.
- Onboarding attendance, consent, and first-action completion report.
- Release notes, environment status, and current build identifiers.
- First-transaction evidence and payment reconciliation report.
- Support ticket log, open incidents, and escalation ownership.
- Daily data report archive and data-quality exceptions.
- Updated FAQ, facilitator guide, and partner contact list.
- Confirmed weekly survey schedule and impact-monitoring baseline.
- Known limitations and P2/P3 backlog with prioritization.

---

## Document Metadata

| Attribute | Value |
|---|---|
| **Version** | 1.0 |
| **Document** | Phase 5 Detailed Workplan |
| **Created** | August 27, 2026 |
| **Status** | Draft — Awaiting Steering Committee Approval |
| **Owner** | Project Lead |
| **Approval Authority** | Field Operations Lead, Product Lead, Backend Lead |
| **Next Review** | End of Week 23 Pilot Launch Review |
| **Distribution** | Project team, steering committee, pilot partners, support team |

---

**END OF PHASE 5 WORKPLAN**
