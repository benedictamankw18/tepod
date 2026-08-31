# Phase 4: Internal Testing & Hardening — Detailed Workplan

*AgriSmart AI: Digital Marketplace and Forecasting Platform*

**Duration:** 3 weeks (Weeks 19–21)  
**Status:** Pending (Phase 3 release candidate complete)  
**Dependency:** Phase 3 complete; payment, forecasting, transport, and security workstreams available in staging  
**Prepared:** August 27, 2026

---

## 1. Executive Summary

Phase 4 is the quality gate before the Central Region pilot. The team will verify the release candidate against the SRS, migrate the development data layer from the in-memory store to PostgreSQL, harden security and operational controls, validate performance, and test the core workflows with low-literacy users.

This phase is deliberately focused on confidence rather than new features. Once the code-freeze gate is passed, only release-blocking fixes may be merged before Phase 5.

### Required Outcomes

- All SRS functional requirements have a documented pass/fail result.
- PostgreSQL migration is complete, repeatable, and reversible.
- No unresolved P0 defects remain; P1 defects are fixed or formally accepted.
- Security review has no open high or critical findings.
- Performance targets are demonstrated under representative load.
- Farmers and buyers can complete core USSD and mobile workflows without facilitator help.
- Production deployment, rollback, monitoring, backup, and support procedures are ready.
- The release is frozen and approved for pilot onboarding in Weeks 22–23.

### Exit Authority

**QA Lead + Security Lead + Product Lead + CTO**

---

## 2. Entry Criteria

The Phase 4 kickoff may proceed when:

- [ ] Phase 3 payment sandbox flow passes.
- [ ] Forecasting and transport features are deployed to staging.
- [ ] Phase 2 regression tests are available and passing.
- [ ] Phase 3 security and operations runbooks are available.
- [ ] PostgreSQL schema and migration draft exist.
- [ ] Test users, listings, pre-commitments, transactions, and prices are seeded.
- [ ] The usability participant pool is identified through pilot partners.
- [ ] A stable release candidate branch is tagged.

Any missing entry item must have an owner, due date, and documented workaround before Day 1.

---

## 3. Phase Schedule at a Glance

| Week | Primary focus | Main gate |
|---|---|---|
| Week 19 | Database migration, functional test execution, security review start | Data migration and core feature baseline |
| Week 20 | Performance, usability, defect repair, regression | Performance and usability evidence |
| Week 21 | Final remediation, deployment rehearsal, code freeze, sign-off | Go/no-go for Phase 5 |

### Workstream Ownership

| Workstream | Lead | Supporting roles |
|---|---|---|
| Functional QA | QA Lead | QA Engineers, Product Lead, developers |
| PostgreSQL migration | Backend Lead | DevOps, Data Engineer, QA |
| Security review | Security Lead | Backend, Mobile, DevOps, USSD engineers |
| Performance testing | Performance Engineer | Backend Lead, DevOps |
| Usability testing | UX Researcher | Field Operations, Product Manager, pilot partners |
| Release management | CTO/Project Lead | All workstream leads |

---

## 4. Workstream 4.1: PostgreSQL Migration and Data Integrity

**Duration:** Weeks 19–20  
**Owner:** Backend Lead  
**Goal:** Replace the in-memory production path with PostgreSQL without changing public API behavior.

### Migration Principles

- The store interface remains the application boundary.
- Route handlers must not contain database-specific queries.
- Migrations are versioned and repeatable.
- Seed data is separate from schema migrations.
- A rollback path is tested before pilot deployment.
- Sensitive data is not copied into shared test environments without approval.

### Week 19: Schema, Adapter, and Migration

#### Monday (Day 1): Migration Kickoff and Inventory

Tasks:

1. Compare the Phase 3 entity model with the current store implementation.
2. Inventory all fields used by routes, USSD, mobile, dashboard, jobs, and forecasts.
3. Identify inconsistent names, types, optional fields, and relationship assumptions.
4. Confirm PostgreSQL version, hosting arrangement, connection limits, and backup policy.
5. Create a migration checklist and data-integrity risk register.

**Deliverable:** Approved migration inventory and risk register  
**Owner:** Backend Lead

#### Tuesday (Day 2): Schema and Constraints

Tasks:

1. Create tables for users, listings, pre-commitments, transactions, payments, prices, notifications, transport requests, ratings, forecasts, and audit records.
2. Add primary keys, foreign keys, unique constraints, check constraints, and timestamps.
3. Add indexes for phone, status, crop type, market, dates, and relationship lookups.
4. Define transaction boundaries for acceptance, payment state changes, and assignments.
5. Review schema against the SRS and API response contracts.

**Deliverable:** Reviewed PostgreSQL schema and ERD update  
**Owner:** Database Engineer + Backend Lead

#### Wednesday (Day 3): Migration Scripts and Store Adapter

Tasks:

1. Implement versioned up and down migrations.
2. Implement the PostgreSQL store adapter behind the existing store interface.
3. Add environment-based connection configuration.
4. Add connection error handling and graceful startup failure.
5. Add a development command for creating, migrating, and seeding a local database.

**Deliverable:** Repeatable schema migration and adapter in staging branch  
**Owner:** Backend Engineers

#### Thursday (Day 4): Data Transfer and Reconciliation

Tasks:

1. Export representative in-memory fixtures.
2. Transform records to PostgreSQL-compatible types and relationships.
3. Load the dataset into a clean staging database.
4. Compare record counts and relationship references.
5. Verify totals for listings, commitments, transactions, payments, and notifications.
6. Record any rejected or transformed records.

**Deliverable:** Migration reconciliation report  
**Owner:** Data Engineer + QA

#### Friday (Day 5): Database Baseline Gate

Tasks:

1. Run all backend tests against PostgreSQL.
2. Test restart, reconnect, constraint violation, and transaction rollback behavior.
3. Confirm the in-memory adapter still works for local unit tests.
4. Test backup and restore of the staging database.
5. Obtain Backend Lead approval to use PostgreSQL for remaining Phase 4 tests.

**Deliverable:** PostgreSQL baseline gate passed  
**Owner:** Backend Lead + DevOps

### Week 20: Database Hardening

#### Monday–Tuesday (Days 6–7)

Tasks:

1. Profile slow queries under representative data volume.
2. Verify pagination uses indexed queries.
3. Confirm payment callbacks and reminder jobs are idempotent with database constraints.
4. Test concurrent pre-commitment and payment updates.
5. Confirm timestamps and currency values are stored consistently.
6. Add database health checks and connection pool monitoring.

**Deliverable:** Database performance and concurrency report  
**Owner:** Backend Lead

#### Wednesday–Thursday (Days 8–9)

Tasks:

1. Run restore test from the latest backup.
2. Test migration from a clean database and from a previous release version.
3. Test rollback in a disposable environment.
4. Document production database initialization and emergency recovery.
5. Verify access permissions for application, migration, and reporting accounts.

**Deliverable:** Migration and recovery runbook  
**Owner:** DevOps Lead

#### Friday (Day 10): Data Sign-Off

- [ ] No orphaned records.
- [ ] Required foreign keys and constraints are active.
- [ ] Counts match the source dataset.
- [ ] Core API responses match the in-memory implementation.
- [ ] Restore and rollback procedures have evidence.

**Deliverable:** Data Integrity Sign-Off  
**Owner:** Backend Lead + QA Lead

---

## 5. Workstream 4.2: Functional QA Against the SRS

**Duration:** Weeks 19–21  
**Owner:** QA Lead  
**Goal:** Produce traceable evidence for every in-scope functional requirement.

### Test Management Rules

- Every test case has an ID, requirement reference, setup, steps, expected result, actual result, and status.
- Every failed test creates or links to a defect.
- Retesting a fixed defect must include a regression check.
- Test data is reset through scripts, not manual database edits.
- Payment tests use sandbox or mock money only.

### Feature Coverage Plan

| Feature area | Minimum scenarios | Planned effort |
|---|---|---:|
| User registration | Four roles, duplicate phone, invalid input, profile visibility | 1.5 days |
| Produce listings | Create, search, filters, pagination, status, invalid dates and quantities | 1.5 days |
| Pre-commitments | Submit, accept, reject, counter, quantity limits, duplicate actions | 1.5 days |
| Prices | Current price, four-week history, stale data, outliers, missing market | 1 day |
| Transactions and payments | Create, initiate, callback, reminders, overdue, dispute, reconciliation | 2 days |
| Transport | Request, match, capacity, assignment, cancellation, notifications | 1 day |
| Ratings | Valid rating, duplicate rating, aggregate, unauthorized rating | 0.5 day |
| Forecasting | Trend, sell/wait, confidence, insufficient data, stale input | 1 day |
| Admin dashboard | Counts, filters, refresh, pagination, role protection | 1 day |
| USSD | All menus, session persistence, timeout, invalid input, pagination | 1 day |
| SMS notifications | Content, recipient, status, retry, duplicate prevention | 0.5 day |

### Week 19: Functional Baseline

**Monday–Tuesday (Days 1–2): Test Preparation**

Tasks:

1. Convert SRS requirements into a traceability matrix.
2. Prepare clean test datasets for each user role.
3. Verify API, mobile, USSD, dashboard, and payment test environments.
4. Confirm defect severity rules and communication channels.
5. Run smoke tests and record the starting baseline.

**Deliverable:** Approved test plan, traceability matrix, and test data pack  
**Owner:** QA Lead

**Wednesday–Friday (Days 3–5): Core Marketplace Tests**

Execute registration, listings, search, pre-commitment, and transaction tests across API and mobile app. Include USSD listing and status checks where relevant.

**Deliverable:** Core marketplace pass/fail report and initial defect log  
**Owner:** QA Engineers

### Week 20: Extended Functional Tests

**Monday–Wednesday (Days 6–8): Feature Group Execution**

Execute prices, payments, transport, ratings, forecasting, notifications, and dashboard tests. Cross-check records across PostgreSQL, API, app, USSD, and dashboard.

**Deliverable:** Full feature-area test results  
**Owner:** QA Lead

**Thursday (Day 9): Negative and Boundary Testing**

Test invalid phone numbers, missing fields, excessive quantities, past harvest dates, unauthorized access, stale prices, provider timeouts, duplicate callbacks, full vehicle capacity, and expired sessions.

**Deliverable:** Negative-test report  
**Owner:** QA Engineers + Security Lead

**Friday (Day 10): Functional Defect Triage**

1. Classify all failures as P0–P3.
2. Assign owners and target fixes.
3. Identify test blockers and temporary workarounds.
4. Confirm which P2/P3 items may enter the pilot backlog.

**Deliverable:** Prioritized defect register  
**Owner:** QA Lead + Product Lead

### Week 21: Regression and Traceability Closure

**Monday–Tuesday (Days 11–12): Fix Verification**

Retest resolved P0/P1 defects and run nearby regression tests. Verify that database migration and payment fixes did not change API behavior.

**Wednesday (Day 13): Full Regression Suite**

Run API, USSD, mobile, dashboard, jobs, payment, forecast, and transport smoke suites from a clean release candidate.

**Thursday (Day 14): Traceability Review**

1. Confirm every in-scope SRS requirement has evidence.
2. Record justified exclusions or deferred requirements.
3. Confirm test report includes environment, build, data, dates, and results.

**Friday (Day 15): QA Gate**

**Pass criteria:**

- [ ] All planned requirements tested.
- [ ] No unresolved P0 defects.
- [ ] No unresolved P1 defects unless formally accepted by Product Lead and CTO.
- [ ] Regression suite passes on the release candidate.
- [ ] Defect log and test report are complete.

**Deliverable:** QA Sign-Off Package  
**Owner:** QA Lead

---

## 6. Workstream 4.3: Security Review

**Duration:** Weeks 19–21  
**Owner:** Security Lead  
**Goal:** Validate that the pilot release protects user, payment, and operational data.

### Security Checklist

| Area | Required evidence |
|---|---|
| Transport security | HTTPS enforced; secure provider channels configured |
| Access control | Role matrix tested for API, dashboard, payment, and records |
| Secrets | No keys or passwords in source, logs, or app bundle |
| Payment security | Callback authentication, replay protection, credential rotation |
| Personal data | Phone masking, minimization, retention, lawful handling |
| Input validation | Boundary and injection tests for API and USSD inputs |
| Rate limiting | Registration, login, webhook, and sensitive endpoint limits |
| Dependencies | High and critical vulnerabilities addressed or accepted |
| USSD security | Unpredictable sessions, timeout, no sensitive URL data |
| Mobile security | Secure local storage, HTTPS, no debug credentials |
| Database | Least-privilege accounts, backups, encrypted connection |
| Logging | Correlation without exposing personal or payment secrets |

### Week 19: Review and Scanning

Tasks:

1. Run dependency, secret, and static-analysis scans.
2. Review authentication and authorization routes.
3. Verify HTTPS, CORS, headers, and environment configuration.
4. Inspect payment and USSD webhook validation.
5. Review database permissions and backup access.

**Deliverable:** Initial security findings report  
**Owner:** Security Lead

### Week 20: Verification and Remediation

Tasks:

1. Test broken-access-control scenarios across all roles.
2. Test injection, malformed payload, replay, brute-force, and rate-limit scenarios.
3. Verify logs mask phone numbers and provider credentials.
4. Verify mobile credentials are not embedded in the bundle.
5. Fix high and critical findings and rerun scans.

**Deliverable:** Remediation evidence and updated security register  
**Owner:** Security Lead + Technical Leads

### Week 21: Security Gate

- [ ] All high and critical findings are closed or formally accepted.
- [ ] Secrets scan is clean.
- [ ] Protected endpoints have passing authorization tests.
- [ ] Payment and USSD webhooks reject invalid requests.
- [ ] Data protection and retention decisions are documented.
- [ ] Security Lead signs the release checklist.

---

## 7. Workstream 4.4: Performance and Load Testing

**Duration:** Weeks 20–21  
**Owner:** Performance Engineer  
**Goal:** Demonstrate that the release candidate remains responsive for the pilot population and expected bursts.

### Targets

| Metric | Target |
|---|---:|
| USSD response time | Less than 2 seconds including application processing |
| API read latency | p95 below 200 ms |
| API write latency | p95 below 500 ms |
| Concurrent API users | 100 sustained; spike to 150 |
| Error rate under load | Below 1% |
| Mobile core-screen load | Below 3 seconds on representative 3G device |
| Database integrity | No lost or duplicated records under test load |

### Week 20: Test Preparation and Baseline

Tasks:

1. Prepare JMeter or equivalent scripts for read and write endpoints.
2. Include realistic listing, price, dashboard, payment, and forecast traffic.
3. Establish baseline latency on an idle staging environment.
4. Test 20 concurrent USSD sessions through the gateway sandbox or simulator.
5. Record server CPU, memory, database connections, and error rates.

**Deliverable:** Performance test scripts and baseline report  
**Owner:** Performance Engineer

### Week 21: Load, Spike, and Resilience Tests

Tasks:

1. Run 100 concurrent users for 30 minutes.
2. Ramp to 150 users and hold for 10 minutes.
3. Test concurrent listing, pre-commitment, payment callback, and dashboard requests.
4. Simulate provider timeout, database reconnect, and notification failure.
5. Repeat mobile app tests on Android 8/11 or equivalent low-end devices and 3G conditions.
6. Optimize only defects that threaten exit criteria; defer enhancements after code freeze.

**Deliverable:** Load test report, capacity recommendation, and performance defect list  
**Owner:** Performance Engineer + DevOps

### Performance Gate

The gate passes when targets are met or any exception is documented with an owner, user impact, workaround, and CTO acceptance.

---

## 8. Workstream 4.5: Usability Testing with Low-Literacy Users

**Duration:** Weeks 20–21  
**Owner:** UX Researcher  
**Goal:** Confirm that representative users can complete the core workflows with minimal assistance.

### Participants

- 5–8 farmers recruited through the Central Region cooperative.
- Mix of feature-phone and smartphone users.
- Mix of literacy levels and genders where practical.
- Twi/Ga speakers included where available.
- At least one buyer and one transporter included for role-specific feedback.

### Test Scenarios

| Scenario | Success condition |
|---|---|
| USSD registration | User registers with correct role, crop, and location |
| USSD listing | Farmer lists quantity, price, and harvest date |
| Mobile registration | User installs and creates an account |
| Listing search | Buyer finds a relevant listing and opens details |
| Pre-commitment | Buyer submits an offer with correct quantity |
| Offer response | Farmer accepts, rejects, or counter-offers |
| Payment status | User finds current payment status without assistance |
| Price guidance | User understands current price, trend, and confidence |
| Transport request | User creates or reviews a transport request |

### Evaluation Measures

- Task completion without facilitator intervention.
- Time to complete each task.
- Number and type of errors.
- Whether error messages lead to recovery.
- Understanding of price and forecast explanations.
- Confidence using the product again.
- Accessibility concerns including font size, contrast, language, and network delay.

### Week 20: Preparation and Sessions

Tasks:

1. Finalize scripts, consent language, participant schedule, and test accounts.
2. Train facilitators to observe without leading.
3. Run sessions in a quiet, realistic setting with actual device types.
4. Capture task results, quotes, confusion points, and defects.
5. Avoid collecting unnecessary personal information or payment credentials.

**Deliverable:** Raw usability observation log  
**Owner:** UX Researcher + Field Operations

### Week 21: Analysis and Fixes

Tasks:

1. Group findings by severity and affected role.
2. Fix critical blockers before code freeze.
3. Simplify labels, prompts, error messages, and USSD wording where evidence supports it.
4. Rerun affected tasks with at least one participant or internal proxy.
5. Prepare a concise pilot facilitator guide.

**Deliverable:** Usability report, prioritized UX backlog, and pilot guide  
**Owner:** UX Researcher + Product Lead

### Usability Gate

- [ ] Every participant can complete registration and at least one core marketplace task.
- [ ] No critical usability blocker remains in USSD or the app.
- [ ] Price and forecast explanations are understood at a basic level.
- [ ] Network and device limitations are documented for field support.
- [ ] Product Lead accepts deferred usability improvements.

---

## 9. Release Management and Deployment Rehearsal

**Duration:** Week 21  
**Owner:** CTO/Project Lead + DevOps Lead

### Deployment Rehearsal Tasks

1. Build backend, dashboard, and mobile release artifacts from tagged source.
2. Apply PostgreSQL migrations to a clean environment.
3. Load approved seed and reference data.
4. Configure secrets through the approved environment mechanism.
5. Deploy backend and dashboard to staging.
6. Install the release APK on representative devices.
7. Configure provider callbacks and health checks.
8. Run smoke tests after deployment.
9. Restore from backup and document the result.
10. Practice rollback to the previous release.

### Code Freeze Rules

After the freeze:

- No new features.
- No architectural changes.
- Only P0/P1 fixes, security fixes, release configuration, and evidence-driven usability corrections may be merged.
- Every exception requires approval from the CTO and Product Lead.
- The final build number and source tag must be recorded in the sign-off package.

### Required Release Documents

- Deployment checklist
- Environment variable template
- Database migration and rollback guide
- Backup and restore evidence
- Monitoring and incident runbook
- Support escalation directory
- Release notes and known limitations
- Pilot onboarding and facilitator guide
- Test summary and defect register

---

## 10. Integrated Day-by-Day Plan

| Day | Primary activity | Output |
|---:|---|---|
| 1 | Kickoff, requirement traceability, database inventory | Approved plans and inventory |
| 2 | Schema constraints and test preparation | Schema review; test data pack |
| 3 | Store adapter, migrations, core QA | Adapter; initial test results |
| 4 | Data transfer and security scans | Reconciliation; findings report |
| 5 | PostgreSQL baseline and core marketplace tests | Database gate; defect log |
| 6 | Extended feature testing and query profiling | Feature results; query profile |
| 7 | Database concurrency and security testing | Concurrency and access results |
| 8 | Database recovery; usability preparation | Recovery evidence; session plan |
| 9 | Negative testing and usability sessions | Boundary results; observations |
| 10 | Defect triage and performance baseline | Prioritized defects; baseline |
| 11 | Performance load tests and usability analysis | Load results; usability findings |
| 12 | Resilience tests and P0/P1 fixes | Resilience report; fixes |
| 13 | Full regression and usability corrections | Regression results; updated UX |
| 14 | Traceability, security verification, deployment rehearsal | Evidence package; rehearsal result |
| 15 | Code freeze, final smoke test, go/no-go review | Phase 4 sign-off |

---

## 11. Defect Management

### Severity Rules

| Severity | Definition | Required action |
|---|---|---|
| P0 | Platform unavailable, data loss, security breach, or payment corruption | Stop testing; fix immediately |
| P1 | Core user journey cannot complete or serious incorrect data | Fix before pilot or obtain formal exception |
| P2 | Important usability, performance, or edge-case issue | Backlog with workaround and owner |
| P3 | Cosmetic or low-impact improvement | Backlog for a later release |

Every defect must include:

- Requirement or test-case reference
- Environment and build number
- Reproduction steps
- Expected and actual behavior
- Evidence such as logs or screenshots
- Severity, owner, status, and retest result

---

## 12. Phase 4 Exit Checklist

### Functional Quality

- [ ] SRS traceability matrix complete.
- [ ] All in-scope feature groups tested.
- [ ] Marketplace, payment, forecast, transport, dashboard, USSD, and notification flows pass.
- [ ] Regression suite passes on the final release candidate.
- [ ] Defect log is complete and prioritized.

### PostgreSQL and Data

- [ ] PostgreSQL is the staging and pilot production data path.
- [ ] Migrations work from a clean database and the previous release.
- [ ] Foreign keys, indexes, constraints, and transaction boundaries are verified.
- [ ] Data reconciliation is complete.
- [ ] Backup, restore, and rollback are tested.

### Security

- [ ] Security review report is approved.
- [ ] No open high or critical findings.
- [ ] Secrets and dependency scans pass.
- [ ] Authorization, webhook, rate-limit, and input-validation tests pass.
- [ ] Data protection and log-masking procedures are documented.

### Performance and Reliability

- [ ] USSD target is below 2 seconds.
- [ ] API p95 targets are met or exceptions accepted.
- [ ] 100 concurrent-user test passes within error target.
- [ ] Mobile core screens meet the 3G load target.
- [ ] Monitoring, alerting, and incident procedures are ready.

### Usability and Field Readiness

- [ ] Low-literacy usability sessions completed.
- [ ] Critical usability blockers resolved.
- [ ] Pilot facilitator guide is complete.
- [ ] Device, language, connectivity, and support limitations are documented.
- [ ] Pilot partner representatives review the release candidate.

### Release Governance

- [ ] Code freeze is active.
- [ ] Release artifacts are tagged and reproducible.
- [ ] Deployment rehearsal passed.
- [ ] Phase 5 onboarding schedule is confirmed.
- [ ] QA Lead, Security Lead, Product Lead, and CTO have signed off.

---

## 13. Go/No-Go Decision

### Go to Phase 5

Proceed when all blocking exit criteria pass, the deployment rehearsal succeeds, and the team can support pilot users with the documented runbooks.

### Conditional Go

A conditional go may be approved only for documented P2/P3 issues or a P1 issue with a tested workaround, named owner, monitoring, and explicit CTO/Product Lead approval.

### No-Go

Delay Phase 5 when any of the following remains unresolved:

- Data loss, payment corruption, or platform outage risk.
- Open high or critical security finding.
- Core user cannot register, list, pre-commit, respond, or view payment status.
- PostgreSQL migration or restore cannot be demonstrated.
- Performance failure is likely to affect pilot users.
- Low-literacy participants cannot complete core flows.

---

## Document Metadata

| Attribute | Value |
|---|---|
| **Version** | 1.0 |
| **Document** | Phase 4 Detailed Workplan |
| **Created** | August 27, 2026 |
| **Status** | Draft — Awaiting Steering Committee Approval |
| **Owner** | Project Lead |
| **Approval Authority** | QA Lead, Security Lead, Product Lead, CTO |
| **Next Review** | End of Week 21 Phase 4 Exit Review |
| **Distribution** | Project team, steering committee, pilot operations team |

---

**END OF PHASE 4 WORKPLAN**
