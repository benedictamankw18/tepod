# Phase 7: Evaluation & Go/No-Go Decision — Detailed Workplan

*AgriSmart AI: Digital Marketplace and Forecasting Platform*

**Duration:** 3 weeks (Weeks 36–38)  
**Status:** Pending (Phase 6 complete)  
**Dependency:** Twelve weeks of pilot data, final reports, and exit sign-off available  
**Prepared:** August 27, 2026

---

## 1. Executive Summary

Phase 7 closes the initial AgriSmart AI delivery cycle. The team will determine whether the pilot reduced post-harvest losses, improved price realization, reduced payment delays, and created a service that users and partners are willing to continue. The decision must be evidence-based and must distinguish measured outcomes from self-reported experience, technical readiness, and future assumptions.

The final decision will be one of three outcomes:

- **GO:** Proceed to controlled expansion.
- **GO-WITH-CONDITIONS:** Continue only after named issues, owners, and acceptance tests are completed.
- **NO-GO:** Pause expansion and test a defined pivot or corrective intervention.

### Required Outputs

1. Quantitative Impact Summary.
2. Qualitative Findings and Lessons Learned Report.
3. Technical Readiness Assessment.
4. Business Model and Sustainability Summary.
5. Weighted Go/No-Go Recommendation Memo.
6. Expansion, conditional, or pivot roadmap.
7. Archived and reproducible pilot dataset.
8. Stakeholder decision record.

---

## 2. Evaluation Principles

- Use the Phase 1 baseline definitions and document any changes.
- Report sample size, missingness, data source, and collection method for every metric.
- Separate verified platform records from self-reported survey responses.
- Do not claim causation from before-and-after comparisons alone.
- Report weather, seasonality, market conditions, and harvest-cycle limitations.
- Preserve raw data and analysis scripts so results can be reproduced.
- Protect participant privacy in reports, quotes, photographs, and exports.
- Include negative findings and operational failures, not only success stories.
- Use actual pilot results in decision tables; do not fill gaps with assumptions.

---

## 3. Governance and Ownership

| Workstream | Lead | Supporting roles |
|---|---|---|
| Impact analysis | M&E Lead | Data Analyst, Field Operations |
| Qualitative research | Product Lead | UX Researcher, partner liaison |
| Technical readiness | CTO | Backend, Mobile, DevOps, Security leads |
| Business model | Finance Lead | Product, Operations, Sponsor |
| Decision process | Sponsor/Product Lead | CTO, Finance, Field Operations |
| Data archive | Data Analyst | M&E, DevOps, Project Lead |

### Decision Rules

- The evaluation team prepares evidence; it does not pre-select the outcome.
- Conflicting records are investigated and retained in the limitations log.
- Any metric without adequate data is marked **not assessable**, not automatically passed.
- A GO decision cannot override unresolved critical safety, payment, privacy, or data-integrity risks.
- The decision memo must record dissenting views and conditions, if any.

---

## 4. Three-Week Schedule

| Week | Focus | Main deliverables |
|---|---|---|
| Week 36 | Evidence freeze, quantitative analysis, interviews | Clean dataset, metric tables, interview notes |
| Week 37 | Qualitative synthesis, technical and business review | Findings, readiness assessment, sustainability model |
| Week 38 | Scoring, decision meeting, roadmap and archive | Decision memo, next-phase roadmap, final archive |

### Daily Working Rhythm

- Morning: analysis or interview workstream check-in.
- Midday: source verification and issue resolution.
- Afternoon: draft review, evidence linking, and decision log updates.
- Friday: steering review of progress, gaps, and risks.

---

## 5. Workstream 7.1: Evidence Freeze and Data Preparation

**Duration:** Week 36  
**Owner:** M&E Lead + Data Analyst

### Monday (Day 1): Data Inventory

Tasks:

1. Collect the final user registry and consent status.
2. Collect all 12 weeks of platform events, transactions, payments, forecasts, transport records, and support tickets.
3. Collect weekly and end-of-cycle surveys.
4. Confirm Phase 6 reports and metric definitions.
5. Record source owner, date range, format, and completeness for each dataset.

**Deliverable:** Evaluation data inventory and source register

### Tuesday (Day 2): Quality and Reconciliation

Tasks:

1. Check duplicate users, events, surveys, and transactions.
2. Reconcile transaction totals with payment provider records.
3. Verify accepted pre-commitments link to transactions.
4. Verify loss and price survey records link to eligible participants where possible.
5. Document missing, corrected, excluded, and disputed records.
6. Create a data-quality scorecard.

**Deliverable:** Data-quality and reconciliation report

### Wednesday (Day 3): Analysis Dataset and Freeze

Tasks:

1. Create a versioned clean analysis dataset.
2. Normalize dates, markets, crop names, units, and currencies.
3. Assign stable analysis identifiers and mask personal information.
4. Save the transformation script or documented procedure.
5. Freeze the dataset for primary analysis.

**Deliverable:** Versioned evaluation dataset and data dictionary

### Thursday (Day 4): Metric Calculations

Calculate each metric using the approved definition, denominator, and source. Produce both summary statistics and participant-level or transaction-level supporting tables where privacy permits.

**Deliverable:** Draft metric workbook and evidence index

### Friday (Day 5): Analysis Review

1. M&E Lead reviews calculations.
2. Data Analyst verifies charts and denominators.
3. Product and Field Operations review interpretability.
4. Resolve calculation disputes before qualitative and decision work proceeds.

**Deliverable:** Approved primary analysis tables

---

## 6. Workstream 7.2: Quantitative Impact Analysis

**Duration:** Weeks 36–37  
**Owner:** M&E Lead + Data Analyst

### Metric Assessment Table

| Metric | Baseline | Target | Required evidence | Assessment |
|---|---|---|---|---|
| Post-harvest loss | 30–40% typical baseline | Below 25% | At least 20 farmer records; definition and period | Pass/marginal/fail/not assessable |
| Farm-gate price | GHS 400–600 per unit baseline | At least 10% improvement | Verified or clearly labeled self-reported prices | Pass/marginal/fail/not assessable |
| Payment delays | 25–30% baseline | Below 10% | Payment states, dates, and support records | Pass/marginal/fail/not assessable |
| Repeat usage | No prior baseline | At least 60% at four weeks | Defined eligible-user denominator | Pass/marginal/fail/not assessable |
| Completed transactions | 0 | At least 50 | Reconciled transaction records | Pass/marginal/fail/not assessable |
| Forecast accuracy | No prior baseline | At least 60% profitable recommendations | At least 20 outcome-linked recommendations | Pass/marginal/fail/not assessable |
| Transport adoption/savings | GHS 50–80 estimated baseline | 20% pooled savings | Requests, costs, and delivery outcomes | Pass/marginal/fail/not assessable |
| User satisfaction | No prior baseline | NPS at least 50 or approved CSAT equivalent | Survey instrument and response count | Pass/marginal/fail/not assessable |

### Analysis Tasks

1. Compare weekly and full-period results to baseline.
2. Calculate mean, median, range, and sample size where meaningful.
3. Segment by role, channel, location, device, and language when safe and useful.
4. Examine whether repeated platform activity is associated with improved outcomes.
5. Treat associations as exploratory unless the evaluation design supports stronger inference.
6. Identify outliers and retain the rule used to handle them.
7. Create charts that show uncertainty, sample size, and missing data.
8. Write a plain-language interpretation for each metric.

### Suggested Exploratory Comparisons

- Farmers with one versus multiple listings.
- Users who received a pre-commitment versus those who did not.
- USSD-only, app-only, and mixed-channel users.
- Pooled versus non-pooled transport requests.
- Recommendations followed versus recommendations not followed.
- Early-cohort versus later-cohort activation and retention.

### Deliverable

**Quantitative Impact Summary, 3–5 pages**, containing methodology, metric table, charts, limitations, and a clear assessment for every success measure.

---

## 7. Workstream 7.3: Qualitative Feedback and Lessons Learned

**Duration:** Weeks 36–37  
**Owner:** Product Lead + UX Researcher

### Participant Plan

| Audience | Method | Target |
|---|---|---:|
| Farmers | Focus group and individual follow-ups | 8–10, mixed usage levels |
| Buyers/sellers | Interviews or group call | 5–8 |
| Transporters | Individual interviews | 3–5 |
| Support team | Structured debrief | All available staff |
| Pilot partners | Stakeholder meeting | One representative per partner type |

### Interview Topics

1. What problem did the platform help with, if any?
2. Which workflow was easiest and which was most difficult?
3. Did users trust listings, prices, forecasts, and payment status?
4. What caused users to stop or reduce usage?
5. Were payment or transport issues resolved fairly?
6. Did the service affect loss, price, timing, or buyer access?
7. What would make the user recommend or continue using the service?
8. What must change before expansion?
9. What support, language, device, or connectivity needs remain?

### Analysis Process

1. Transcribe or summarize interviews using participant IDs.
2. Code responses into agreed themes.
3. Identify frequency, severity, role, and evidence strength.
4. Compare qualitative findings with platform metrics and support tickets.
5. Select anonymized quotes only with consent.
6. Identify contradictions and explain how they affect interpretation.
7. Prioritize lessons by user impact and effort to address.

### Deliverable

**Qualitative Findings and Lessons Learned Summary, 5–10 pages**, including themes, supporting evidence, anonymized quotes, limitations, and prioritized improvements.

---

## 8. Workstream 7.4: Technical Readiness Review

**Duration:** Week 37  
**Owner:** CTO + Technical Leads

### Readiness Areas

| Area | Pilot evidence | Scale question |
|---|---|---|
| API | Load and incident results | Can capacity grow to 10x with known work? |
| PostgreSQL | Query, backup, restore, and migration results | Can it support 100,000 records and stronger HA? |
| USSD | Session completion, error rate, provider quota | Can quota and menu design support more regions? |
| Mobile app | Crash rate, device tests, release process | Can updates and support reach larger cohorts? |
| Forecasting | Latency, accuracy, data freshness | Is data volume and model governance sufficient? |
| Payments | Success, reconciliation, disputes | Can settlement and compliance scale? |
| Operations | Support SLA and incident load | What staffing and tools are required? |
| Security | Findings and remediation | What independent testing or compliance is needed? |

### Review Tasks

1. Compare pilot traffic and resource use with projected expansion traffic.
2. Test database performance with a scaled synthetic dataset.
3. Review outstanding P2/P3 technical backlog.
4. Estimate infrastructure, monitoring, security, and support changes.
5. Identify architecture decisions required before expansion.
6. Classify each component green, yellow, or red for scale readiness.
7. Assign owners and time estimates to all yellow/red actions.

### Deliverable

**Technical Readiness Assessment and Hardening Roadmap**, including capacity assumptions, cost ranges, risks, dependencies, and required pre-expansion gates.

---

## 9. Workstream 7.5: Business Model and Sustainability Review

**Duration:** Week 37  
**Owner:** Finance Lead + Product Lead

### Financial Analysis

1. Summarize actual pilot costs by hosting, USSD/SMS, payment fees, staff, field activity, and support.
2. Separate one-time build costs from recurring operating costs.
3. Estimate unit economics per active farmer, transaction, and region.
4. Test commission, subscription, transport fee, and data-service assumptions.
5. Model conservative, expected, and optimistic scale scenarios.
6. Identify funding needs and operational break-even assumptions.
7. Validate willingness to pay with users and institutional partners.

### Business Questions

- Which user group receives enough value to continue?
- Who pays, for what service, and when?
- Can fees be collected without reducing farmer adoption?
- What partner subsidies are temporary versus sustainable?
- What support staffing is required per 1,000 active farmers?
- Are provider costs and settlement timelines viable?
- What regulatory, contractual, or market dependencies could prevent scale?

### Deliverable

**Business Model Summary, 3–5 pages**, with actual pilot costs, tested assumptions, scale scenarios, risks, and sustainability recommendations.

---

## 10. Go/No-Go Scoring Framework

### Weighted Criteria

| Criterion | Weight | PASS | MARGINAL | FAIL |
|---|---:|---|---|---|
| Post-harvest loss reduction | 25% | Reduction of at least 15% from baseline | Reduction of 5–14% | Less than 5% reduction or increase |
| Farm-gate price increase | 20% | Increase of at least 10% | Increase of 5–9% | Less than 5% increase or decrease |
| Payment delay reduction | 20% | Reduction of at least 50% | Reduction of 25–49% | Reduction below 25% |
| Repeat usage | 15% | At least 60% at four weeks | 45–59% | Below 45% |
| User satisfaction | 10% | NPS at least 50 or approved equivalent | NPS 30–49 | NPS below 30 |
| Technical readiness | 10% | Evidence supports 10x scale | Evidence supports 5x scale | Scale is unsafe or unplanned |

### Scoring Method

For each criterion, record:

- Actual result.
- Denominator and sample size.
- Data source and evidence link.
- Pass/marginal/fail/not assessable rating.
- Weighted points.
- Limitation or condition.

Do not award full points for a metric that is not assessable. A missing metric must trigger an explicit decision condition or extension recommendation.

### Decision Bands

- **GO, 70–100 points:** Proceed to controlled expansion with the approved roadmap.
- **GO-WITH-CONDITIONS, 50–69 points:** Continue only after named conditions, owners, tests, and dates are approved.
- **NO-GO, below 50 points:** Pause expansion, investigate root causes, and test a defined pivot or corrective plan.

A low score is not a project failure by itself. It is a decision to protect users and focus the next learning cycle.

---

## 11. Week 38 Decision and Roadmap Tasks

### Monday (Day 11): Draft Evaluation Package

1. Complete quantitative and qualitative sections.
2. Add technical and business readiness findings.
3. Link claims to evidence IDs.
4. Record unresolved limitations and disagreements.

**Output:** Draft Evaluation Report and scoring table

### Tuesday (Day 12): Internal Challenge Review

1. Ask a reviewer who was not responsible for the metric calculation to challenge assumptions.
2. Check denominators, charts, dates, and comparison groups.
3. Confirm no participant-identifying information is exposed.
4. Correct errors and record material changes.

**Output:** Reviewed evaluation package and change log

### Wednesday (Day 13): Roadmap Options

Prepare three short options:

- Expansion roadmap if GO.
- Corrective expansion roadmap if GO-WITH-CONDITIONS.
- Pause and pivot roadmap if NO-GO.

Each option must include objectives, users/regions, features, team, budget assumptions, timeline, risks, and success gates.

**Output:** Decision-ready roadmap options

### Thursday (Day 14): Stakeholder Decision Meeting

Agenda:

1. Pilot overview and limitations.
2. Quantitative impact results.
3. Qualitative findings.
4. Technical readiness.
5. Business model.
6. Weighted scoring.
7. Roadmap options.
8. Stakeholder questions and dissent.
9. Decision and conditions.
10. Owners, dates, and communication plan.

**Output:** Recorded decision and signed recommendation

### Friday (Day 15): Archive and Communication

1. Finalize Evaluation Report.
2. Finalize Go/No-Go Memo.
3. Archive approved datasets and analysis scripts.
4. Notify pilot partners, team, funders, and users in appropriate language.
5. Convert approved actions into the next project backlog.
6. Schedule the first follow-up review for the selected path.

**Output:** Complete Phase 7 closure package

---

## 12. Roadmap Options

### Option A: GO — Controlled Expansion

- Expand crops only where market and data quality support it.
- Expand to additional districts or a second region in controlled cohorts.
- Increase users gradually rather than opening nationwide access immediately.
- Complete auto-scaling, monitoring, payment settlement, and support staffing work.
- Keep the pilot marketplace flow stable while measuring expansion effects.

### Option B: GO-WITH-CONDITIONS — Corrective Expansion

- Remain in the current region while fixing named weaknesses.
- Examples: recruit more buyers, simplify USSD, improve payment reconciliation, refine forecasts, or improve transport supply.
- Set a four-to-eight-week validation period.
- Define measurable acceptance criteria before adding regions or users.
- Re-score the conditions before expansion.

### Option C: NO-GO — Pause and Pivot

Potential controlled pivots include:

- Wholesale aggregation instead of an open marketplace.
- Focus on institutional buyers rather than broad buyer participation.
- Cold-chain or transport coordination as the primary service.
- Price intelligence and advisory service before transaction enablement.

A pivot requires a new hypothesis, target user, test design, budget, timeline, and decision criteria. Do not continue the same intervention without addressing the evidence that caused the NO-GO decision.

---

## 13. Final Deliverables Checklist

### Evaluation

- [ ] Quantitative Impact Summary complete.
- [ ] Qualitative Findings and Lessons Learned complete.
- [ ] Technical Readiness Assessment complete.
- [ ] Business Model Summary complete.
- [ ] Metric definitions, denominators, samples, and limitations documented.

### Decision

- [ ] Weighted scoring table complete.
- [ ] GO, GO-WITH-CONDITIONS, or NO-GO recommendation documented.
- [ ] Decision meeting completed.
- [ ] Stakeholder signatures or recorded approvals obtained.
- [ ] Conditions, owners, dates, and follow-up gates recorded.

### Roadmap

- [ ] Expansion roadmap prepared.
- [ ] Conditional expansion roadmap prepared.
- [ ] Pivot roadmap prepared.
- [ ] Selected roadmap includes budget, team, timeline, risks, and success criteria.

### Archive and Communication

- [ ] Raw and cleaned datasets archived.
- [ ] Analysis scripts, queries, and notebooks archived.
- [ ] Survey instruments and consent materials archived securely.
- [ ] Transaction, support, forecast, and incident records reconciled.
- [ ] User and partner communication completed.
- [ ] Next-phase backlog created.

---

## 14. Phase 7 Exit Criteria

Phase 7 is complete when:

- [ ] Quantitative impact metrics are analyzed against Phase 1 baselines.
- [ ] Qualitative feedback is gathered and synthesized.
- [ ] Technical readiness and scale requirements are assessed.
- [ ] Business model and sustainability assumptions are documented.
- [ ] Weighted go/no-go scoring is complete.
- [ ] A decision is made and communicated.
- [ ] Expansion, conditional, or pivot roadmap is approved.
- [ ] Pilot data and analysis artifacts are archived for future reference.
- [ ] Evaluation report and decision memo are approved and filed.

### Sign-Off Authority

**Product Lead + Sponsor + CTO + Finance Lead + Field Operations Lead**

---

## Document Metadata

| Attribute | Value |
|---|---|
| **Version** | 1.0 |
| **Document** | Phase 7 Detailed Workplan |
| **Created** | August 27, 2026 |
| **Status** | Draft — Awaiting Steering Committee Approval |
| **Owner** | Project Lead |
| **Approval Authority** | Product Lead, Sponsor, CTO, Finance Lead, Field Operations Lead |
| **Next Review** | End of Week 38 Final Evaluation Review |
| **Distribution** | Project team, steering committee, pilot partners, funders, evaluation team |

---

**END OF PHASE 7 WORKPLAN**
