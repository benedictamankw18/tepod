# Phase 6: Pilot Operation & Monitoring — Detailed Workplan

*AgriSmart AI: Digital Marketplace and Forecasting Platform*

**Duration:** 12 weeks (Weeks 24–35)  
**Status:** Pending (Phase 5 launch gate required)  
**Dependency:** 75–95 users live; support, monitoring, payment, and data pipelines active  
**Prepared:** August 27, 2026

---

## 1. Executive Summary

Phase 6 is the live operating period for AgriSmart AI in Ghana's Central Region. The team will run the platform through a meaningful tomato harvest and sales period, monitor system health and user behavior, resolve issues against defined service levels, and collect evidence against the baseline metrics established in Phase 1.

The pilot is both an operating service and a learning program. Technical changes must protect user transactions and data quality. Product changes must be supported by observed evidence. Impact claims must distinguish platform activity from outcomes reported by participants.

### Primary Objectives

1. Operate the platform for 12 weeks with high availability.
2. Support farmers, buyers, sellers, and transporters through real transactions.
3. Track listings, offers, payments, transport, forecasts, support, and user engagement.
4. Compare loss, price, payment delay, and usage trends against baseline.
5. Run four structured UX and operations improvement cycles.
6. Produce a complete, auditable evidence package for Phase 7 evaluation.

### Core Exit Targets

| Metric | Phase 6 target |
|---|---:|
| Platform uptime | Above 95% |
| Completed end-to-end transactions | At least 50 |
| Combined daily activity | Above 2 actions per day on average during active weeks |
| Farmers contributing loss data | At least 20 |
| Forecast recommendations with outcomes | At least 20 |
| Repeat usage | Calculated for all eligible users |
| P0/P1 incidents | Resolved within defined SLA |
| Pilot data consolidation | 100% complete for Phase 7 |

### Timeframe Assumption

A tomato cycle may run longer than 12 weeks depending on planting dates, weather, and market conditions. If the pilot does not capture planting, harvest, sale, and payment outcomes within the planned period, the team must record the gap and recommend an extension rather than presenting incomplete outcome data as a full-cycle result.

---

## 2. Operating Model

### Roles and Responsibilities

| Role | Responsibility |
|---|---|
| Project Lead | Overall delivery, scope, budget, steering updates |
| Product Lead | Prioritization, user experience decisions, change approval |
| Field Operations Lead | On-the-ground support, partner coordination, user follow-up |
| On-call Engineer | Incident response, diagnosis, emergency fixes |
| Backend/DevOps Lead | Platform health, database, payment and integration stability |
| Mobile/USSD Leads | Channel defects, crash/session analysis, releases |
| M&E Lead | Measurement plan, survey quality, outcome data |
| Data Analyst | Dashboards, weekly summaries, mid-cycle and final analysis |
| Support Coordinator | Ticket intake, triage, SLA tracking, user communication |
| Partner Liaison | Cooperative, market, buyer, and transporter relationships |

### Daily Operating Rhythm

1. **08:00–09:00:** Automated health checks and overnight job review.
2. **09:30:** Operations standup: incidents, support, payments, onboarding, activity.
3. **Midday:** Field and support follow-up on inactive or blocked users.
4. **16:00:** Payment, notification, and transport reconciliation check.
5. **17:00:** Daily data-quality review and activity report.
6. **End of day:** Incident and decision log updated.

### Weekly Operating Rhythm

| Day | Activity | Owner |
|---|---|---|
| Monday | Review previous week metrics and open risks | Project/M&E Leads |
| Tuesday | Field follow-up with inactive users and partners | Field Operations |
| Wednesday | Product and technical triage; release decision if needed | Product/Engineering |
| Thursday | Manual survey sample and data-quality checks | M&E/Data |
| Friday | Weekly pilot report and steering review | Project Lead |
| Saturday | Support coverage and optional field activity | Support/Field Ops |
| Sunday | Automated monitoring; no planned releases | On-call Engineer |

---

## 3. Safety and Data Governance Rules

- Never request or store mobile-money PINs or other secret credentials.
- Use masked phone numbers in reports and shared documents.
- Obtain consent before surveys, recordings, or photographs.
- Separate operational identifiers from analysis exports where practical.
- Do not delete or overwrite transaction history to correct a mistake.
- Record corrections as auditable adjustments with reason and approver.
- Use test accounts for troubleshooting whenever possible.
- Inform users when a feature is temporarily unavailable.
- Treat forecast output as guidance, not a guaranteed price or harvest result.
- Escalate suspected fraud, payment disputes, privacy issues, or security incidents immediately.

---

## 4. Workstream 6.1: Platform Monitoring and Maintenance

**Duration:** Weeks 24–35  
**Owner:** Backend/DevOps Lead  
**Goal:** Maintain a stable service and resolve operational issues before they affect many users.

### Health Checks

Monitor at least every five minutes:

- Application uptime and health endpoint.
- API error rate and p95 response time.
- PostgreSQL connectivity, connection pool, storage, and backup status.
- USSD gateway reachability and session completion rate.
- SMS queue depth, failures, retries, and delivery status.
- Payment provider availability, callback backlog, and unmatched references.
- Forecast service response time and stale-data status.
- Mobile crash reports and release adoption.

### Alert Thresholds

| Signal | Alert threshold | Initial action |
|---|---:|---|
| Uptime | Any unplanned outage | Page on-call engineer |
| API errors | Above 5% for 5 minutes | Inspect logs and dependencies |
| API p95 latency | Above 500 ms for 10 minutes | Check database and load |
| USSD errors | Above 5% daily | Inspect gateway/session failures |
| Payment callback backlog | Any unresolved critical callback | Reconcile and escalate provider |
| Backup failure | One missed scheduled backup | Retry and verify storage |
| App crash rate | Above 1% of sessions | Freeze app rollout and triage |
| SMS failure | Above 5% in an hour | Check provider and queue |

### Incident Severity and SLA

| Severity | Example | Response | Target resolution |
|---|---|---:|---:|
| P0 | Platform down, data loss, payment corruption | 1 hour | 4 hours or controlled pause |
| P1 | Core listing, offer, payment, or login flow blocked | 4 hours | 24 hours |
| P2 | Confusing UX, intermittent issue, slow form | 24 hours | 1 week |
| P3 | Enhancement or cosmetic issue | Next review | Backlog |

### Incident Procedure

1. Support or monitoring opens an incident record.
2. On-call engineer confirms impact, scope, and severity.
3. Technical lead identifies whether to pause an affected feature.
4. Support lead communicates a clear status and workaround.
5. Engineers preserve logs and transaction state before changing data.
6. Fix is tested in staging when the incident allows.
7. Release is deployed with approval and smoke-tested.
8. Incident is closed only after user impact is confirmed resolved.
9. P0/P1 incidents receive a root-cause and prevention note within five working days.

### Maintenance Rules

- Planned releases occur mid-week after a backup and rollback check.
- No planned production changes during peak onboarding or payment windows.
- Emergency changes require a ticket, approver, test evidence, and rollback note.
- Database changes require migration scripts; no untracked manual schema edits.
- Feature flags or controlled cohorts are preferred for risky changes.

---

## 5. Workstream 6.2: User Support and Field Operations

**Duration:** Weeks 24–35  
**Owner:** Field Operations Lead  
**Goal:** Keep participants active, supported, and able to recover from common failures.

### Support Categories

- Registration and account access.
- USSD navigation and session timeout.
- App installation, updates, and offline behavior.
- Listing, search, and pre-commitment questions.
- Payment pending, failed, overdue, or disputed.
- Transport request and delivery coordination.
- Forecast interpretation and data freshness.
- Complaint, safeguarding, privacy, or fraud concern.

### Weekly Support Review

Every Friday, review:

- Ticket count by category and role.
- Median and maximum time to first response.
- Median and maximum time to resolution.
- Reopened tickets and repeat users.
- Top three recurring issues.
- Users inactive after registration.
- Issues requiring product or partner action.

### User Follow-Up Rules

- Contact a new user within 72 hours if no first action is recorded.
- Contact farmers with listings but no offers after the agreed follow-up window.
- Contact buyers/sellers after an incomplete pre-commitment.
- Escalate payment issues without asking for secret credentials.
- Offer voice support or in-person help when literacy or connectivity is the barrier.
- Record the outcome without labeling a user negatively for a technical failure.

### Partner Coordination

Maintain a weekly contact with each cooperative, market association, buyer group, and transport provider. Review activity, support needs, upcoming harvest/sales dates, and participant changes. Any replacement user must be recorded with consent and role verification.

---

## 6. Workstream 6.3: Data Collection and Measurement

**Duration:** Weeks 24–35  
**Owner:** M&E Lead  
**Goal:** Produce credible operational and outcome evidence linked to the Phase 1 baseline.

### Measurement Categories

| Category | Examples | Source |
|---|---|---|
| Adoption | Registered, activated, retained users | Platform events and registry |
| Marketplace activity | Listings, searches, offers, acceptance | API and database |
| Financial | Payments, delays, disputes, value | Payment records and support |
| Logistics | Requests, matches, delivery, cost | Transport records and surveys |
| Forecasting | Recommendations, confidence, outcomes | Forecast logs and follow-up |
| Outcomes | Spoilage, price received, delays | Weekly and end-cycle surveys |
| Experience | Satisfaction, confusion, support burden | CSAT and interviews |

### Automated Event Requirements

Every event must include a timestamp, event type, anonymized or approved user identifier, channel, and related record ID when applicable. Do not log payment secrets, raw credentials, or unnecessary personal data.

Track:

- Registration started/completed.
- Login/session success and failure.
- Listing created/updated/expired/sold.
- Listing viewed and search performed.
- Pre-commitment submitted/accepted/rejected/countered.
- Payment initiated/completed/failed/overdue/disputed.
- Transport requested/matched/assigned/delivered.
- Forecast viewed/generated/unavailable.
- Notification queued/sent/failed/retried.
- Support ticket opened/escalated/resolved.

### Weekly Farmer Survey

Sample 5–10 farmers each week, rotating where possible. Ask:

1. How much produce did you list or sell this week?
2. What price did you receive and where was the sale completed?
3. How much produce spoiled or was rejected?
4. Were there payment or transport delays?
5. Did you use USSD, the app, or facilitator support?
6. What was confusing or difficult?
7. Did the price or harvest guidance influence your decision?
8. What should be improved before the next sale?

Record the survey date, participant ID, crop/transaction reference where consented, response channel, and interviewer. Keep estimates separate from verified transaction records.

### Weekly Seller and Transporter Checks

Sellers: source quantity, price, pre-commitment usefulness, delivery quality, repeat intention.  
Transporters: requests received, accepted jobs, route/capacity issues, pooling usefulness, payment timing, and support needs.

### Data Quality Routine

1. Reconcile active user registry with platform users.
2. Check duplicate events and duplicate survey responses.
3. Verify all completed transactions link to accepted commitments.
4. Compare payment records to provider references.
5. Check price units and convert only using documented rules.
6. Flag missing harvest, sale, loss, or payment outcome fields.
7. Sample raw records against dashboard totals.
8. Lock weekly extracts after M&E review; record later corrections separately.

---

## 7. Workstream 6.4: UX Iteration and Product Learning

**Duration:** Four cycles of three weeks  
**Owner:** Product Lead  
**Goal:** Make evidence-based improvements without destabilizing the live pilot.

### Change Prioritization

Prioritize an issue when it:

- Blocks a core action or causes financial/data risk.
- Affects multiple roles or partner groups.
- Appears repeatedly in support and session data.
- Has a measurable relationship with drop-off or inactivity.
- Can be fixed without expanding the approved pilot scope.

Each change record must state the problem, evidence, affected users, proposed change, risk, owner, release date, and measurement plan.

### Cycle 1: Weeks 24–26 — Onboarding and First Actions

Focus on registration, listing, search, and pre-commitment.

Tasks:

1. Review registration drop-off by channel and role.
2. Review USSD session exits by menu state.
3. Review app installation and first-action completion.
4. Interview 5–10 farmers and summarize recurring confusion.
5. Select the top three issues by frequency and impact.
6. Apply small fixes, facilitator workarounds, or FAQ updates.
7. Measure first-action completion and task time after the change.

**Deliverable:** Cycle 1 learning report and validated fixes

### Cycle 2: Weeks 27–29 — Payments, Forecasts, and Transport

Focus on advanced workflows and trust.

Tasks:

1. Review pending and failed payments with Finance/Operations.
2. Check whether users understand payment status and due dates.
3. Review forecast views, confidence labels, and follow-up outcomes.
4. Analyze transport requests, match rate, pooling, and notification delivery.
5. Interview transporters and buyers about operational friction.
6. Fix only high-value, low-risk issues during the cycle.
7. Publish the Week 29 mid-cycle report.

**Deliverable:** Cycle 2 report, payment/transport/forecast findings, mid-cycle recommendations

### Cycle 3: Weeks 30–32 — Engagement and Scale Signals

Focus on retention, repeated use, and bottlenecks.

Tasks:

1. Compare first-action, second-action, and repeat-transaction rates.
2. Segment usage by role, location, device, language, and channel.
3. Investigate users who became inactive after a failed or unanswered action.
4. Check API, database, USSD, and app performance as activity grows.
5. Test targeted partner recruitment only if buyer or transporter supply is limiting activity.
6. Update training and support based on recurring questions.

**Deliverable:** Engagement and scale-readiness report

### Cycle 4: Weeks 33–35 — End-of-Cycle Evidence

Focus on outcome completeness and Phase 7 preparation.

Tasks:

1. Complete end-of-cycle farmer, buyer, seller, and transporter interviews.
2. Confirm harvest, sale, payment, and loss outcomes where the cycle is complete.
3. Reconcile all transaction and support records.
4. Freeze the final analysis dataset after M&E review.
5. Document lessons, limitations, and unresolved P2/P3 items.
6. Prepare the Phase 7 evaluation agenda and evidence index.

**Deliverable:** End-of-cycle feedback summary and Phase 7 handoff package

---

## 8. Twelve-Week Execution Calendar

| Week | Operating priority | Evidence/output |
|---:|---|---|
| 24 | Stabilize post-launch operations; confirm monitoring | Week 1 health and activity report |
| 25 | Follow up inactive users; validate first transactions | Activation and support analysis |
| 26 | Complete Cycle 1 improvements | Cycle 1 learning report |
| 27 | Monitor payment, transport, and forecast adoption | Advanced-feature report |
| 28 | Run mid-cycle surveys and outcome checks | Clean interim dataset |
| 29 | Complete Cycle 2 and compare against baseline | Mid-cycle report |
| 30 | Analyze repeat usage and channel retention | Engagement dashboard |
| 31 | Address scale bottlenecks and support burden | Scale issue log |
| 32 | Validate targeted interventions | Cycle 3 report |
| 33 | Start end-of-cycle interviews and outcome reconciliation | Outcome completeness report |
| 34 | Close remaining data gaps and run final support review | Draft final dataset |
| 35 | Final analysis preparation and Phase 7 handoff | End-of-cycle report and exit gate |

---

## 9. Mid-Cycle Review: Week 29

The mid-cycle review must compare pilot evidence with the Phase 1 baseline, while clearly identifying sample size and missing data.

### Required Sections

1. Executive status: on track, at risk, or paused.
2. User and transaction activity.
3. Loss, price, delay, and transport trends.
4. Forecast recommendation volume and early outcome evidence.
5. Support burden and incident performance.
6. UX findings and changes already deployed.
7. Data-quality limitations.
8. Decisions for Weeks 30–35.

### Decision Questions

- Are farmers completing repeat listings or sales?
- Are buyers producing enough demand for active farmers?
- Are payment failures or delays suppressing trust?
- Is transport pooling being used and understood?
- Are forecasts sufficiently accurate and explainable for continued pilot use?
- Is the pilot on track to obtain at least 50 completed transactions and 20 farmer outcome records?

If a target is at risk, choose a documented intervention, such as partner recruitment, additional facilitator sessions, improved support, or a schedule extension.

---

## 10. Impact and Success Metrics

### Operational Metrics

| Metric | Definition | Frequency |
|---|---|---|
| Active user | User with at least one meaningful event in period | Daily/weekly |
| First-action rate | Users completing a first action divided by registered users | Weekly |
| Repeat usage | Eligible users completing two or more transactions/actions | Weekly/end cycle |
| Listing conversion | Listings receiving at least one offer | Weekly |
| Offer acceptance | Accepted offers divided by submitted offers | Weekly |
| Payment completion | Completed payments divided by initiated payments | Daily/weekly |
| Support resolution | Tickets closed within SLA divided by all resolved tickets | Weekly |

### Outcome Metrics

| Metric | Collection method | Phase 6 expectation |
|---|---|---|
| Post-harvest loss | Farmer survey plus transaction follow-up | Trend compared with 30–40% baseline |
| Farm-gate price | Verified record or farmer survey | Trend compared with GHS 400–600 baseline |
| Payment delays | Payment status and support records | Quantified trend vs. 25–30% baseline |
| Transport cost | Request record and user follow-up | Compare pooled vs. unpooled estimates |
| Forecast accuracy | Recommendation linked to subsequent outcome | At least 20 evaluated recommendations |
| Satisfaction | 1–5 CSAT and interviews | Target at or above 4/5 where sampled |

Do not attribute a change to AgriSmart solely because it occurred after launch. Report sample, comparison method, seasonality, weather, market conditions, and self-report limitations.

---

## 11. Data Analysis Plan

### Preparation

1. Lock the event, transaction, survey, support, and registry extracts.
2. Assign stable analysis IDs and remove duplicate records.
3. Document missing, corrected, and excluded observations.
4. Normalize dates, markets, currencies, units, and crop names.
5. Join records only where the relationship is supported by an ID or documented match rule.

### Analysis

- Summarize weekly activity and trends.
- Compare baseline and pilot observations with sample sizes.
- Segment outcomes by role, channel, location, device, and language where safe.
- Report medians and ranges when distributions are skewed.
- Compare forecast recommendations with observed outcomes.
- Analyze support burden and incidents alongside user activity.
- Separate verified transactions from self-reported outcomes.

### Data Package Contents

- Data dictionary.
- Metric definitions and formulas.
- Clean analysis dataset.
- Raw-to-clean reconciliation log.
- Weekly reports and dashboard exports.
- Survey instruments and response summaries.
- Transaction and payment reconciliation.
- Forecast evaluation table.
- Limitations and assumptions register.

---

## 12. Risk Register

| Risk | Impact | Mitigation | Owner |
|---|---|---|---|
| Pilot does not cover a full harvest cycle | High | Track planting dates early; document limitation or request extension | M&E/Product |
| Activity is too low for meaningful analysis | High | Investigate demand, run partner follow-up, recruit within approved range | Field Ops |
| Payment incident damages trust | Critical | Fast escalation, transaction preservation, transparent communication | Backend/Finance |
| Poor network limits app usage | High | Promote USSD, offline behavior, venue support, network mapping | Field Ops |
| Survey fatigue or missing responses | Medium | Rotate sample, keep surveys short, schedule calls with partners | M&E |
| Forecasts are misleading in unusual weather/markets | High | Confidence labels, unavailable state, expert review, limitation messaging | Data/ML |
| Support burden exceeds team capacity | High | Triage, FAQ, partner champions, temporary office hours | Support Lead |
| Data joins or units are inconsistent | High | Validation rules, reconciliation, data dictionary, review checkpoints | Data Analyst |
| Frequent fixes destabilize production | High | Change control, staging tests, release windows, rollback | CTO/DevOps |
| User attrition after first transaction | Medium | Follow-up interviews, demand-side recruitment, analyze reasons | Product/Field Ops |

---

## 13. Phase 6 Exit Criteria

### Platform Operation

- [ ] Platform operated for 12 weeks with uptime above 95% or documented exception.
- [ ] P0/P1 issues were resolved within SLA and root causes recorded.
- [ ] Payment, USSD, app, dashboard, database, and notification logs are complete.
- [ ] All operational changes and releases are documented.

### Marketplace and Transactions

- [ ] At least 50 completed end-to-end transactions are recorded.
- [ ] Average combined daily activity exceeds two during the active pilot period, or the reason for shortfall is documented.
- [ ] Payment delays, failures, disputes, and reconciliation outcomes are quantified.
- [ ] Transport requests and pooling outcomes are analyzed.

### Outcomes and Forecasting

- [ ] Loss data is collected from at least 20 farmers.
- [ ] Farm-gate price data is collected and compared with baseline.
- [ ] At least 20 forecast recommendations have an outcome record or an explicit unresolved status.
- [ ] Repeat usage rate is calculated with a documented denominator.
- [ ] Seasonality, weather, sample, and self-report limitations are recorded.

### User Experience and Support

- [ ] Four UX iteration cycles are documented.
- [ ] Critical usability issues are resolved or have an approved workaround.
- [ ] All support tickets are categorized, resolved, or carried into the Phase 7 backlog.
- [ ] User, partner, and facilitator feedback is summarized.

### Phase 7 Readiness

- [ ] Final data extracts are locked and reconciled.
- [ ] End-of-cycle report is complete.
- [ ] Baseline comparison tables and charts are ready.
- [ ] Evidence index links every major claim to its source.
- [ ] Field Operations Lead, M&E Lead, and Product Lead sign off.

---

## 14. Phase 7 Handoff Package

The Phase 7 evaluation team receives:

- Final pilot registry with consent and eligibility status.
- Weekly operational and platform health reports.
- Complete transaction and payment reconciliation.
- Loss, price, delay, transport, and satisfaction datasets.
- Forecast recommendation and outcome evaluation table.
- Support ticket and incident summary with SLA performance.
- UX iteration reports and release history.
- Data dictionary, analysis plan, cleaned dataset, and limitations register.
- End-of-cycle farmer, buyer, seller, and transporter feedback.
- Open risks, unresolved backlog, and scale/pivot questions.

---

## 15. Phase 6 Sign-Off Meeting Agenda

1. Confirm pilot dates, user count, and operating coverage.
2. Review uptime, incidents, and support SLA performance.
3. Review transaction volume, payment outcomes, and transport activity.
4. Review loss, price, delay, forecast, and repeat-use evidence.
5. Review data quality, missingness, and limitations.
6. Review user and partner feedback.
7. Confirm final dataset and report ownership.
8. Decide whether Phase 7 can begin without an extension.
9. Record actions, owners, and due dates in the decision log.

---

## Document Metadata

| Attribute | Value |
|---|---|
| **Version** | 1.0 |
| **Document** | Phase 6 Detailed Workplan |
| **Created** | August 27, 2026 |
| **Status** | Draft — Awaiting Steering Committee Approval |
| **Owner** | Project Lead |
| **Approval Authority** | Field Operations Lead, M&E Lead, Product Lead |
| **Next Review** | End of Week 35 Phase 6 Exit Review |
| **Distribution** | Project team, steering committee, pilot partners, evaluation team |

---

**END OF PHASE 6 WORKPLAN**
