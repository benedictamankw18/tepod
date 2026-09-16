# Phase 2: MVP Build — Detailed Workplan

*AgriSmart AI: Digital Marketplace and Forecasting Platform*

**Duration:** 8 weeks (Weeks 5–12)  
**Status:** Pending (Phase 1 complete)  
**Dependency:** Phase 1 deliverables (contracts, architecture, pilot users)  
**Prepared:** August 27, 2026

---

## Executive Summary

Phase 2 is the **core development phase** where the agrismart.ai platform comes to life. The goal is to build a **minimal viable product (MVP)** that enables end-to-end marketplace flows (farmer lists produce → buyer pre-commits → farmer accepts → dashboard visibility) with USSD for feature phones and a mobile app for smartphones.

**Success = Functional prototype ready for 75–95 pilot users (Phase 5 launch, Week 22)**

### Key Success Factors
- ✅ All 14 REST API endpoints operational and tested
- ✅ USSD menu flows (6+ flows) working via gateway sandbox
- ✅ Mobile app (iOS/Android) < 10 MB, core screens built, APK testable
- ✅ Admin dashboard providing read-only visibility into all platform activity
- ✅ End-to-end flow: Farmer lists → Buyer pre-commits → Farmer accepts → Payment tracked
- ✅ No P0/P1 blockers; known P2 issues logged in backlog
- ✅ Code clean, documented, passed lint checks
- ✅ Team confident in codebase quality (code review sign-off)

### Timeline at a Glance

```
Week 5–6 (Days 1–10)   | Workstream 2.1: Backend architecture + data model
Week 7–8 (Days 11–20)  | Workstream 2.2: USSD menu flows (3+ working)
Week 8–10 (Days 21–40) | Workstream 2.3: Mobile app core screens
Week 10–12 (Days 41–60)| Workstream 2.4: Admin dashboard + integration
Week 12 (Days 51–60)   | Testing, bug fixes, deployment readiness
```

### Ownership Structure

| Workstream | Lead | Team | Deliverables |
|-----------|------|------|---|
| **Backend** | Backend Lead | Backend engineers (2–3) | REST API, data model, in-memory store |
| **USSD/SMS** | USSD Engineer | Backend support | USSD menu flows, SMS notifications, webhook |
| **Mobile App** | Mobile Lead | Mobile engineers (iOS + Android or React Native) | iOS/Android app, core screens, APK |
| **Admin Dashboard** | Frontend Lead | Frontend engineer(s) | Web dashboard, read-only UI, data accuracy |

---

## Workstream 2.1: Backend & Data Model (Weeks 5–8)

**Responsible:** Backend Lead, Backend Engineers (2–3)  
**Duration:** 8 weeks (overlapping with other streams)

### Goal
Build a **scalable, production-ready REST API** with:
- ✅ 14 endpoints supporting core marketplace flows
- ✅ In-memory data store (Phase 2–3), swappable to Postgres (Phase 4+)
- ✅ Clean error handling, rate limiting, input validation
- ✅ Authentication strategy (phone-based for USSD)
- ✅ API documentation (README + curl examples)

---

### Week 5: Project Setup & Data Model

#### Monday (Day 1): Development Environment Setup

**Tasks:**
1. Create Git repository (GitHub/GitLab)
2. Set up Node.js project structure (Express.js)
3. Install dependencies: express, body-parser, cors, helmet, dotenv, etc.
4. Create .env template (database URL, API keys, port, etc.)
5. Set up linting (ESLint) and formatting (Prettier)
6. Create README with development setup instructions

**Deliverable:** GitHub repo ready; `npm install` and `npm start` works locally  
**Owner:** Backend Lead  
**Duration:** 1 day

**Example Project Structure:**
```
agrismart-mvp/
├── server.js              # Main Express app
├── store.js               # In-memory data store
├── routes/
│   ├── users.js           # User registration, profile
│   ├── listings.js        # Create/search listings
│   ├── precommitments.js  # Submit/accept pre-commitments
│   ├── transactions.js    # Payment tracking
│   ├── transport.js       # Transport requests
│   ├── prices.js          # Price data
│   ├── notifications.js   # SMS/notification log
│   └── summary.js         # Admin dashboard data
├── middleware/
│   ├── auth.js            # Phone-based auth
│   ├── errorHandler.js    # Error handling
│   └── rateLimit.js       # Rate limiting
├── tests/
│   ├── users.test.js
│   └── listings.test.js
├── .env                   # Environment variables
├── .gitignore
├── package.json
├── README.md
└── docs/
    ├── API.md             # API documentation
    └── ARCHITECTURE.md    # System design notes
```

#### Tuesday–Thursday (Days 2–4): Data Model Design

**Task:** Design core data entities and relationships

**Entities to Model:**

**1. User Entity**
```javascript
{
  id: "u_001",
  phone: "+233241234567",  // Unique identifier
  role: "farmer|buyer|seller|transporter",
  name: "John Mensah",
  location: "Kasoa",
  crop_types: ["tomato", "maize"],  // For farmers
  created_at: "2026-09-01T10:00:00Z",
  ratings: []  // Array of rating IDs
}
```

**2. Listing Entity**
```javascript
{
  id: "l_001",
  farmer_id: "u_001",
  crop_type: "tomato",
  quantity: "10",  // String: "10 bags", "500 kg", etc.
  unit: "bag",
  price: 450,  // GHS per unit
  harvest_date: "2026-09-15",
  location: "Kasoa Market",
  description: "Fresh tomato, good quality",
  status: "pending|active|sold|expired",
  created_at: "2026-09-01T10:00:00Z",
  updated_at: "2026-09-05T14:30:00Z"
}
```

**3. PreCommitment Entity**
```javascript
{
  id: "pc_001",
  listing_id: "l_001",
  buyer_id: "u_002",
  quantity_offered: "5",
  price_offered: 450,
  status: "pending|accepted|rejected|countered",
  buyer_message: "Can you deliver to Accra?",
  created_at: "2026-09-02T09:00:00Z",
  updated_at: "2026-09-02T10:30:00Z",
  response_at: "2026-09-02T10:30:00Z"
}
```

**4. Transaction Entity**
```javascript
{
  id: "t_001",
  precommitment_id: "pc_001",
  amount: 2250,  // GHS (quantity * price)
  currency: "GHS",
  payment_status: "pending|in_progress|completed|overdue|disputed",
  due_date: "2026-09-20",
  paid_date: null,
  buyer_id: "u_002",
  farmer_id: "u_001",
  created_at: "2026-09-02T10:30:00Z"
}
```

**5. Price Entity** (seeded data)
```javascript
{
  id: "p_001",
  crop_type: "tomato",
  market: "Kasoa Central",
  price: 450,
  date: "2026-09-01",
  source: "manual|api|market_survey"
}
```

**6. Notification Entity** (log)
```javascript
{
  id: "n_001",
  user_id: "u_001",
  type: "sms|ussd|app",
  message: "Buyer offered GHS 450 for 5 bags",
  sent_at: "2026-09-02T09:30:00Z",
  status: "sent|failed|pending"
}
```

**Activities:**
1. Create data model ER diagram (draw.io or similar)
2. Define relationships (User → Listings, Listings → PreCommitments, etc.)
3. Define constraints (e.g., phone must be unique, quantity must be > 0)
4. Design in-memory store interface (CRUD functions)
5. Plan for Postgres migration (schema DDL in `/docs` folder)

**Deliverable:** Data Model Document (ER diagram, entity definitions, in-memory interface design)  
**Owner:** Backend Lead + Database Architect  
**Duration:** 3 days

#### Friday (Day 5): In-Memory Store Implementation

**Task:** Implement `store.js` with CRUD operations for all entities

**Requirements:**
- Initialize data structures (arrays/objects for users, listings, etc.)
- Implement CRUD functions: `create()`, `read()`, `update()`, `delete()`, `list()`
- Handle relationships (farmer can have multiple listings)
- Support filtering/searching (by crop type, location, status)
- Validate data (phone format, positive quantities, etc.)
- Keep data in memory (no persistence on restart)

**Example Functions in store.js:**
```javascript
// Users
store.createUser({ phone, role, name, location })
store.getUserByPhone(phone)
store.getUserById(userId)
store.listUsers({ role: 'farmer' })

// Listings
store.createListing({ farmerId, cropType, quantity, price, harvestDate })
store.getListingById(listingId)
store.searchListings({ cropType, location, status })
store.updateListing(listingId, { status })

// Pre-Commitments
store.createPreCommitment({ listingId, buyerId, quantityOffered, priceOffered })
store.getPreCommitmentsByListing(listingId)
store.updatePreCommitmentStatus(preCommitmentId, 'accepted')

// Transactions
store.createTransaction({ preCommitmentId, amount, dueDate })
store.getTransactionsByFarmer(farmerId)
store.updateTransactionStatus(transactionId, 'completed')

// Prices
store.getPriceByDate({ cropType, market, date })
store.getPriceHistory({ cropType, weeks: 4 })

// Notifications
store.createNotification({ userId, type, message })
store.getNotificationsByUser(userId)
```

**Deliverable:** `store.js` implemented, unit tests passing (50+ test cases)  
**Owner:** Backend Engineer  
**Duration:** 1 day

---

### Week 6: REST API Endpoints (Part 1 — Core Flows)

#### Monday–Wednesday (Days 6–8): User Registration & Listings API

**Endpoints to build:**

**1. User Registration**
```
POST /api/users
Body: { phone, role, name, location, crop_types }
Response: { success, data: { id, phone, role, ... }, message }
Error: 400 (invalid phone), 409 (user already exists)
```

**2. Search Listings**
```
GET /api/listings?cropType=tomato&location=kasoa&status=active
Query params: cropType, location, status, sortBy, limit, offset
Response: { success, data: [ { id, farmer_id, crop_type, ... } ], total }
```

**3. Create Listing**
```
POST /api/listings
Body: { farmerId, cropType, quantity, unit, price, harvestDate, location }
Response: { success, data: { id, ... }, message }
Validation: quantity > 0, price > 0, harvestDate in future, farmerId exists
```

**4. Get Listing Detail**
```
GET /api/listings/:id
Response: { success, data: { id, farmer_id, crop_type, ... }, message }
Error: 404 (not found)
```

**Activities:**
1. Create route handlers in `routes/users.js` and `routes/listings.js`
2. Add input validation middleware
3. Implement error handling
4. Test with Postman/curl

**Deliverable:** 4 endpoints tested, API working locally  
**Owner:** Backend Engineers (2)  
**Duration:** 3 days

#### Thursday–Friday (Days 9–10): Pre-Commitments & Transactions API

**Endpoints to build:**

**5. Submit Pre-Commitment**
```
POST /api/precommitments
Body: { listingId, buyerId, quantityOffered, priceOffered }
Response: { success, data: { id, ... }, message }
Validation: listing exists, buyer exists, quantity ≤ listing.quantity
```

**6. Respond to Pre-Commitment**
```
POST /api/precommitments/:id/respond
Body: { status: "accepted|rejected|countered", counterPrice?, counterQuantity? }
Response: { success, data: {...}, message }
Note: If accepted, create Transaction
```

**7. Create Transaction**
```
POST /api/transactions
Body: { preCommitmentId, amount, dueDate }
Response: { success, data: { id, status: "pending", ... } }
Auto-triggered: On pre-commitment acceptance
```

**8. Get Transaction Status**
```
GET /api/transactions/:id
Response: { success, data: { id, amount, status, due_date, ... } }
```

**Activities:**
1. Implement route handlers
2. Add business logic (state transitions, validation)
3. Implement notification trigger (create notification record on state change)
4. Test all flows

**Deliverable:** Pre-commitment and transaction endpoints working  
**Owner:** Backend Engineers (2)  
**Duration:** 2 days

---

### Week 7: REST API Endpoints (Part 2 — Prices, Notifications, Summary)

#### Monday–Tuesday (Days 11–12): Prices & Forecasts API

**Endpoints to build:**

**9. Current Price**
```
GET /api/prices/current?cropType=tomato&market=kasoa
Response: { success, data: { cropType, market, price, date, ... } }
```

**10. Price History**
```
GET /api/prices/history?cropType=tomato&market=kasoa&weeks=4
Response: { success, data: [ { date, price }, { date, price }, ... ] }
Chart-ready: Array of points for line chart
```

**Activities:**
1. Seed database with sample prices (Phase 1 baseline data)
2. Implement query logic (filter by crop type, market, date range)
3. Calculate trends (average, direction ↑/→/↓)
4. Document expected format for frontend charts

**Deliverable:** Prices API endpoints operational with seeded data  
**Owner:** Backend Engineer  
**Duration:** 2 days

#### Wednesday–Thursday (Days 13–14): Notifications & Admin Summary API

**Endpoints to build:**

**11. Notification Log**
```
GET /api/notifications?userId=&limit=50&offset=0
Response: { success, data: [ { id, type, message, sent_at }, ... ], total }
```

**12. Admin Summary** (dashboard data)
```
GET /api/summary?startDate=2026-09-01&endDate=2026-09-30
Response: {
  success,
  data: {
    totalUsers: 95,
    totalListings: 120,
    activeListings: 45,
    totalTransactions: 30,
    completedTransactions: 20,
    overduePayme23nts: 3,
    lastUpdated: "2026-09-05T14:30:00Z"
  }
}
```

**Activities:**
1. Implement notification query and logging
2. Implement dashboard summary aggregation
3. Add timestamp tracking
4. Plan for more complex analytics (Phase 3)

**Deliverable:** Notification and summary endpoints working  
**Owner:** Backend Engineer  
**Duration:** 2 days

#### Friday (Day 15): API Documentation & Testing

**Activities:**
1. Create comprehensive API documentation (`docs/API.md`)
   - List all 12 endpoints
   - Show request/response examples for each
   - Document error codes and messages
   - Include curl examples (easy for testing)
2. Write unit tests (Jest or similar)
   - Test each endpoint (happy path + error cases)
   - Test data validation
   - Test business logic (state transitions)
3. Conduct manual testing
   - Use Postman to test all endpoints
   - Verify data consistency
   - Test edge cases

**Deliverable:** API Documentation + 50+ passing unit tests  
**Owner:** Backend Lead + QA  
**Duration:** 1 day

---

### Week 8: API Refinement, Rate Limiting & Deployment Readiness

#### Monday–Tuesday (Days 16–17): Advanced Features

**Tasks:**

**Rate Limiting**
- Limit registrations: 10 per minute per IP
- Limit API calls: 100 per minute per user
- Implement using express-rate-limit middleware

**Error Handling**
- Standardize error response format
- Log all errors with stack traces (dev mode only)
- Return user-friendly messages

**Input Validation**
- Validate all inputs (phone format, quantities, prices, dates)
- Reject invalid data with 400 errors
- Document validation rules

**Activities:**
1. Add rate limiting middleware
2. Create custom error handler
3. Add input validation for all endpoints
4. Test with invalid inputs

**Deliverable:** Rate limiting, error handling, validation complete  
**Owner:** Backend Engineers  
**Duration:** 2 days

#### Wednesday (Day 18): Load Testing & Optimization

**Activities:**
1. Use Apache JMeter to load test API
   - Simulate 50 concurrent users
   - Run for 10 minutes
   - Measure response times and error rates
2. Identify bottlenecks (slow queries, CPU, memory)
3. Optimize if needed (caching, query optimization)
4. Document performance targets met

**Targets:**
- p95 latency < 500 ms for write endpoints
- p95 latency < 200 ms for read endpoints
- Error rate < 0.5%
- Memory usage stable (no memory leaks)

**Deliverable:** Load test report, performance targets confirmed  
**Owner:** Performance Engineer  
**Duration:** 1 day

#### Thursday (Day 19): Code Review & Cleanup

**Activities:**
1. Code review (Backend Lead reviews all code)
   - Check for bugs, security issues, code quality
   - Verify adherence to style guide
   - Assess maintainability
2. Run ESLint and fix warnings
3. Refactor as needed
4. Add missing comments/documentation

**Deliverable:** Code review approved, lint errors fixed  
**Owner:** Backend Lead  
**Duration:** 1 day

#### Friday (Day 20): Deployment Preparation

**Activities:**
1. Create deployment checklist
   - Environment variables configured (.env.example provided)
   - Secrets stored securely (not in code)
   - Database backup procedure documented
   - Monitoring and alerts configured
2. Test deployment to staging server (if available)
3. Document deployment steps in README
4. Prepare for Phase 5 production deployment

**Deliverable:** Deployment checklist completed, ready for Phase 5  
**Owner:** Backend Lead + DevOps  
**Duration:** 1 day

---

## Workstream 2.2: USSD & SMS (Weeks 5–8)

**Responsible:** USSD Engineer, Backend Lead  
**Duration:** 8 weeks

### Goal
Build a **fully functional USSD menu system** supporting:
- ✅ User registration via USSD
- ✅ Listing produce via USSD
- ✅ Browsing and pre-committing via USSD
- ✅ Checking status (listings, pre-commitments, prices)
- ✅ SMS notifications on key events
- ✅ Session management and error handling

---

### Week 5: USSD Architecture & Webhook Setup

#### Monday–Wednesday (Days 1–3): USSD Webhook Implementation

**Task:** Build `/ussd` webhook endpoint to receive and respond to USSD requests

**Webhook Specification (from Phase 1 architecture):**

**Incoming Request (from USSD Gateway):**
```json
{
  "sessionId": "sess_12345",
  "phoneNumber": "+233241234567",
  "text": "1",  // User input (keypresses accumulated)
  "type": "Initiation|Continuation|Termination"
}
```

**Response to Gateway:**
```json
{
  "message": "CON Welcome to AgriSmart AI\n1. Register\n2. List Produce\n3. Check Price\n4. Check Status",
  "continueSession": true
}
```

**Session State Model:**
```javascript
// Session stored in memory during USSD flow
sessions = {
  "sess_12345": {
    phoneNumber: "+233241234567",
    state: "main_menu",  // Current screen
    data: {
      name: null,
      role: null,
      cropType: null,
      quantity: null,
      price: null
    },
    timestamp: 1693920000000,
    ttl: 600000  // 10 minute timeout
  }
}
```

**Activities:**
1. Create `/ussd` POST endpoint in `routes/ussd.js`
2. Implement session manager (create, update, retrieve, cleanup)
3. Connect to store.js for data persistence
4. Implement state machine (transition between menus)
5. Test webhook with curl commands

**Example curl test:**
```bash
curl -X POST http://localhost:3000/ussd \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test_001",
    "phoneNumber": "+233241234567",
    "text": "1",
    "type": "Initiation"
  }'
```

**Deliverable:** USSD webhook endpoint working, basic menu structure responding  
**Owner:** USSD Engineer  
**Duration:** 3 days

#### Thursday–Friday (Days 4–5): USSD Gateway Sandbox Integration

**Task:** Connect to actual USSD gateway sandbox (from Phase 1 contract)

**Activities:**
1. Configure gateway credentials (API key, short code) in `.env`
2. Set up webhook URL in gateway dashboard (e.g., `https://agrismart.ai/ussd`)
3. Send test USSD requests via gateway sandbox
4. Verify requests reach server and responses return to user
5. Test error scenarios (timeout, network error)

**Deliverable:** USSD gateway sandbox integration complete, test messages flowing  
**Owner:** USSD Engineer + Integration Engineer  
**Duration:** 2 days

---

### Week 6: USSD Menu Flows — Registration & Listing

#### Monday–Thursday (Days 6–9): User Registration Flow

**Flow Structure:**
```
User initiates USSD by dialing shortcode
  ↓
Welcome menu: "1. Register  2. List Produce  3. Check Price  4. Check Status"
  ↓
User presses "1"
  ↓
System asks: "Enter your name:"
  ↓
User enters: "John Mensah"
  ↓
System asks: "Choose your role: 1. Farmer  2. Buyer  3. Seller  4. Transporter"
  ↓
User selects: "1" (Farmer)
  ↓
System asks: "What crops do you grow? (Enter number): 1. Tomato  2. Maize  3. Other"
  ↓
User enters: "1" (Tomato)
  ↓
System asks: "Where are you located?"
  ↓
User enters: "Kasoa"
  ↓
System confirms: "Registration successful. Your account ID is U123."
  ↓
Session ends (END instead of CON)
```

**Technical Implementation:**
1. State machine with states:
   - `welcome` → `register_menu` → `get_name` → `get_role` → `get_crops` → `get_location` → `confirm`
2. For each state, parse user input and transition to next state
3. Validate input (e.g., role must be 1-4)
4. Call `store.createUser()` to save data
5. Generate user ID and confirm

**Activities:**
1. Design registration state machine diagram
2. Implement each state handler function
3. Add input validation (name not empty, role is 1-4, etc.)
4. Test registration flow end-to-end (5+ times with different users)
5. Handle error cases (invalid input, timeout)

**Deliverable:** Registration flow working end-to-end, users can register via USSD  
**Owner:** USSD Engineer  
**Duration:** 4 days

#### Friday (Day 10): List Produce Flow

**Flow Structure:**
```
User initiates USSD
  ↓
Menu: "1. Register  2. List Produce  3. Check Price  4. Check Status"
  ↓
User presses "2" (List Produce)
  ↓
System checks: Is this user registered as farmer?
  ↓ Yes
System asks: "Enter crop type: 1. Tomato  2. Maize  3. Other"
  ↓
User enters: "1" (Tomato)
  ↓
System asks: "How many bags?"
  ↓
User enters: "10"
  ↓
System asks: "What price per bag (GHS)?"
  ↓
User enters: "450"
  ↓
System asks: "Harvest date? (DDMM format, e.g., 1509 = 15 Sept)"
  ↓
User enters: "1509"
  ↓
System confirms: "Listing created! ID: L456. You listed 10 bags of tomato at GHS 450/bag."
  ↓
Session ends
```

**Implementation:**
1. Add `list_produce_menu` state
2. Implement state handlers for crop, quantity, price, harvest date
3. Validate inputs (quantity > 0, price > 0, date format valid)
4. Call `store.createListing()`
5. Return listing ID to user

**Deliverable:** List produce flow working, farmers can create listings via USSD  
**Owner:** USSD Engineer  
**Duration:** 1 day

---

### Week 7: USSD Menu Flows — Browsing, Pre-Commitment, Status Check

#### Monday–Wednesday (Days 11–13): Browse Listings & Pre-Commitment Flow

**Flow Structure:**
```
User presses "2" (List Produce) BUT user is buyer/seller (not farmer)
  ↓
System shows: "Browse listings near you"
  ↓
System asks: "Search by crop? 1. Tomato  2. Maize  3. All"
  ↓
User enters: "1" (Tomato)
  ↓
System displays: (paginated)
  "1. Tomato (10 bags, GHS 450) - Farmer: John M., Kasoa
   2. Tomato (5 bags, GHS 400) - Farmer: Betty O., Ada"
  ↓
User presses: "1" (Select first listing)
  ↓
System shows detail: "Farmer: John M., 10 bags, GHS 450/bag"
  ↓
System asks: "Pre-commit? 1. Yes  2. No"
  ↓
If Yes:
  System asks: "How many bags?"
  ↓
  User enters: "5"
  ↓
  System confirms: "Pre-commitment created for 5 bags. Farmer will respond."
  ↓
Session ends
```

**Implementation:**
1. Add `browse_listings` state
2. Implement search by crop type
3. Paginate results (show 5 per screen, allow "0. More")
4. Show listing detail
5. Collect pre-commitment details (quantity, optional price counter-offer)
6. Call `store.createPreCommitment()`
7. Return confirmation

**Deliverable:** Browse and pre-commit flows working via USSD  
**Owner:** USSD Engineer  
**Duration:** 3 days

#### Thursday–Friday (Days 14–15): Check Price & Status Flows

**Flow 1: Check Price**
```
User presses "3" (Check Price)
  ↓
System asks: "Crop? 1. Tomato  2. Maize  3. Other"
  ↓
User enters: "1" (Tomato)
  ↓
System shows: "Current price: GHS 450/bag
   4-week trend: ↑ (rising)"
  ↓
Option to end or return to menu
```

**Flow 2: Check Status**
```
User presses "4" (Check Status)
  ↓
System shows user's active:
  1. Listings (if farmer): "2 active, 1 sold"
  2. Pre-commitments: "3 pending response, 1 accepted"
  3. Transactions: "1 due soon, 0 overdue"
  ↓
User can drill down to see details
```

**Implementation:**
1. Fetch current price from `store.getPriceByDate()`
2. Fetch user's listings/pre-commitments/transactions
3. Format data for USSD (brief, mobile-friendly)
4. Display with pagination

**Deliverable:** Check price and status flows working  
**Owner:** USSD Engineer  
**Duration:** 2 days

---

### Week 8: SMS Notifications & Testing

#### Monday–Wednesday (Days 16–18): SMS Notification Service

**Notification Types to Implement:**

| Event | Message Template | Recipient |
|-------|---|---|
| Farmer receives pre-commitment | "Buyer {name} offered GHS {price} for {qty} bags. Reply 1 to accept, 2 to reject." | Farmer |
| Farmer pre-commitment accepted | "Your pre-commitment accepted. Delivery date: {date}" | Buyer |
| Payment due | "Payment of GHS {amount} due today for order {id}. Reply to pay or contact support." | Buyer |
| Payment overdue | "Payment {days} days overdue. Please resolve to avoid listing suspension." | Buyer |
| Payment received | "You received GHS {amount} for {crop} sale. Check balance." | Farmer |
| Transport assigned | "Transport assigned! Driver: {name}, Phone: {phone}, ETA: {time}" | Farmer/Buyer |

**Implementation:**
1. Create notification queue/log system
2. Trigger notifications on state changes (pre-commitment received, payment due, etc.)
3. For Phase 2: Log notifications to database (don't send real SMS yet)
4. Create SMS stub that prints to console or logs file
5. Prepare for Phase 3 real SMS gateway integration

**Activities:**
1. Design notification system architecture
2. Create notification templates (parameterized strings)
3. Implement notification triggers in business logic
4. Build notification logging
5. Test by triggering events and verifying SMS stubs created

**Deliverable:** SMS notification service working (stub), all notifications logged  
**Owner:** USSD Engineer + Backend Engineer  
**Duration:** 3 days

#### Thursday (Day 19): USSD Testing & Hardening

**Activities:**
1. Test all USSD flows end-to-end (10+ test runs)
   - Registration with different inputs
   - List produce with various crops/quantities
   - Browse and pre-commit
   - Check price and status
2. Test error scenarios
   - Invalid input (user enters text instead of number)
   - Timeout (user doesn't respond for 10 minutes)
   - Session conflict (same user opens 2 sessions)
3. Test on actual USSD gateway (if available)
4. Measure response times (target: < 2 sec)
5. Fix any bugs or slow flows

**Deliverable:** USSD testing complete, all flows stable, < 2 sec response time  
**Owner:** USSD Engineer + QA  
**Duration:** 1 day

#### Friday (Day 20): USSD Documentation & Handoff

**Activities:**
1. Create USSD flow documentation
   - Flowchart for each menu
   - Session model documentation
   - Test scenarios and results
2. Document edge cases and known issues
3. Create USSD menu cheat sheet (for testers/users)
4. Prepare handoff to Phase 3 team (payment integration)

**Deliverable:** USSD documentation complete, ready for Phase 3  
**Owner:** USSD Engineer  
**Duration:** 1 day

---

## Workstream 2.3: Mobile App (Weeks 7–12)

**Responsible:** Mobile Lead, Mobile Engineers (iOS + Android or React Native)  
**Duration:** 6 weeks (overlapping with backend)

### Goal
Build a **low-bandwidth mobile app** supporting:
- ✅ User registration and login
- ✅ Create listings (with photo + details)
- ✅ Search and filter listings
- ✅ Submit and manage pre-commitments
- ✅ Check prices and trends
- ✅ View user profile and ratings
- ✅ < 10 MB APK size
- ✅ Works on Android 8+, iOS 12+ (if applicable)
- ✅ Graceful handling of slow networks (offline cache)

---

### Week 7: App Architecture & Navigation

#### Monday–Tuesday (Days 11–12): App Framework Setup & Navigation

**Technology Decision (from Phase 1):** React Native

**Setup Tasks:**
1. Create React Native project (Expo or bare React Native)
2. Set up navigation (React Navigation)
3. Create folder structure:
   ```
   src/
   ├── screens/
   │   ├── auth/
   │   │   ├── LoginScreen.js
   │   │   ├── RegisterScreen.js
   │   ├── marketplace/
   │   │   ├── DashboardScreen.js
   │   │   ├── CreateListingScreen.js
   │   │   ├── SearchListingsScreen.js
   │   │   ├── ListingDetailScreen.js
   │   ├── prices/
   │   │   ├── PricesScreen.js
   │   ├── profile/
   │   │   ├── ProfileScreen.js
   │   ├── precommitments/
   │   │   ├── PreCommitmentsScreen.js
   ├── components/
   │   ├── ListingCard.js
   │   ├── PriceChart.js
   │   ├── RatingDisplay.js
   ├── navigation/
   │   ├── RootNavigator.js
   ├── api/
   │   ├── client.js  // API calls
   │   ├── endpoints.js  // API URLs
   ├── utils/
   │   ├── storage.js  // Local storage
   │   ├── formatting.js  // Date, price formatting
   ├── App.js
   ├── package.json
   ```

4. Set up API client (fetch or axios) pointing to backend
5. Set up local storage (AsyncStorage for caching)
6. Create navigation stack and tab navigation

**Navigation Structure:**
```
Root Navigator
├─ Auth Stack (if not logged in)
│  ├─ Login Screen
│  └─ Register Screen
└─ App Stack (if logged in)
   ├─ Marketplace Tab
   │  ├─ Dashboard
   │  ├─ Create Listing
   │  ├─ Search Listings
   │  ├─ Listing Detail
   ├─ Prices Tab
   │  └─ Prices & Trends
   ├─ Pre-Commitments Tab
   │  └─ My Pre-Commitments
   ├─ Profile Tab
   │  └─ My Profile & Settings
```

**Deliverable:** App skeleton created, navigation working, mock screens  
**Owner:** Mobile Lead  
**Duration:** 2 days

#### Wednesday–Friday (Days 13–15): UI/UX Design & High-Fidelity Mockups

**Activities:**
1. Design app screens in Figma or Adobe XD
   - Login/Register screens (simple, large tap targets)
   - Dashboard (quick action buttons, quick stats)
   - Listing card (photo, crop type, price, farmer rating)
   - Search results (filterable, sortable)
   - Price chart (line chart, 4-week trend)
   - Pre-commitments (list, status indicator, action buttons)
   - Profile (ratings, reliability score, transaction count)

2. Adapt design for low-literacy users
   - Large fonts (16px+)
   - Clear icons and colors (not text-heavy)
   - High contrast (WCAG AA compliant)
   - Twi/Ga language support

3. Create component library (reusable UI components)
   - Button, Input, Card, Modal, etc.

**Deliverable:** High-fidelity mockups (Figma) + component library prototype  
**Owner:** Mobile Lead (designer + engineer)  
**Duration:** 3 days

---

### Week 8: Core Screens Implementation (Part 1 — Auth & Dashboard)

#### Monday–Wednesday (Days 16–18): Login & Registration Screens

**Login Screen:**
- Input field: Phone number
- Input field: Password (optional for MVP, or use OTP stub)
- Button: Sign In
- Link: "New user? Register"
- Error message area (invalid phone, user not found)

**Registration Screen:**
- Input: Phone number
- Input: Name
- Picker: Role (Farmer, Buyer, Seller, Transporter)
- Input/Picker: Crop types (for farmers)
- Input: Location
- Button: Create Account
- Validation: Phone format, name not empty, etc.

**Activities:**
1. Implement Login/Register screens with UI
2. Connect to API endpoints (/api/users POST for registration, GET for login)
3. Add validation (phone format +233..., name length, etc.)
4. Implement error handling (show error messages on screen)
5. Store user token/ID in AsyncStorage
6. Test registration and login flows

**Deliverable:** Login and registration screens working, user can sign up and sign in  
**Owner:** Mobile Engineer  
**Duration:** 3 days

#### Thursday–Friday (Days 19–20): Dashboard & Listing Cards

**Dashboard Screen:**
- User greeting: "Hi {name}, Welcome back!"
- Quick action buttons:
  - "Create Listing" (farmers only)
  - "Search Produce"
  - "Check Prices"
- Recent activity section:
  - "Your listings: {count} active"
  - "Pre-commitments: {count} pending"
  - "Messages: {count}" (if messaging feature)
- Navigation tabs at bottom

**Listing Card Component:**
- Crop icon/image
- Crop type: "Tomato"
- Quantity: "10 bags"
- Price: "GHS 450"
- Farmer name: "John M."
- Farmer rating: ⭐⭐⭐⭐ (4.2/5)
- Tap to view details

**Activities:**
1. Design and implement dashboard screen
2. Create ListingCard component (reusable)
3. Fetch listings from API
4. Display with pagination/scroll
5. Add tap handler (navigate to detail screen)

**Deliverable:** Dashboard and listing cards displaying, can tap to view details  
**Owner:** Mobile Engineer  
**Duration:** 2 days

---

### Week 9: Core Screens Implementation (Part 2 — Search & Prices)

#### Monday–Wednesday (Days 21–23): Search Listings Screen

**Search Screen:**
- Search bar: "Search by crop type..."
- Filters (drawer or expandable):
  - Crop type (checkboxes: Tomato, Maize, Pepper, etc.)
  - Location (text input or dropdown)
  - Price range (slider or min/max inputs)
  - Status (Active only, include Sold, etc.)
- Sort options (dropdown): "Newest, Cheapest, Highest rated"
- Results displayed as card list
- Empty state: "No listings found" with helpful message

**Activities:**
1. Implement search screen UI
2. Build filter UI (collapsible/drawer)
3. Call API endpoint: GET /api/listings with filter params
4. Display results with pagination
5. Add sorting logic (client-side or server-side)
6. Test with various filter combinations

**Deliverable:** Search and filter working, users can find listings  
**Owner:** Mobile Engineer  
**Duration:** 3 days

#### Thursday–Friday (Days 24–25): Prices & Trends Screen

**Prices Screen:**
- Input/Picker: Crop type (Tomato, Maize, etc.)
- Input/Picker: Market (Kasoa, Ada, Accra, etc.)
- Display:
  - "Current price: GHS 450/bag"
  - 4-week trend chart (line chart showing price over time)
  - Trend direction: ↑ (rising 5%), → (stable), ↓ (falling 3%)
- Helpful text: "Prices tend to rise after planting season"

**Activities:**
1. Implement price screen UI
2. Create line chart component (use React Native chart library)
3. Call API endpoint: GET /api/prices/current and /api/prices/history
4. Format data for chart (x: dates, y: prices)
5. Animate chart drawing (optional, if performance allows)
6. Add explanatory tooltips

**Deliverable:** Prices screen with charts displaying, trends visible  
**Owner:** Mobile Engineer  
**Duration:** 2 days

---

### Week 10: Core Screens Implementation (Part 3 — Pre-Commitments & Profile)

#### Monday–Tuesday (Days 26–27): Create Listing Screen (Farmers)

**Create Listing Screen (Farmers only):**
- Input: Crop type (picker)
- Input: Quantity (text + unit picker: bags, kg, etc.)
- Input: Price per unit (GHS)
- Input: Harvest date (date picker)
- Optional: Photo upload (camera or gallery)
- Optional: Description text
- Button: "Post Listing"
- Validation: All required fields filled, positive quantity/price, future harvest date

**Activities:**
1. Design create listing screen
2. Implement form UI with validation
3. Add photo upload capability (if time allows; else defer to Phase 3)
4. Call API endpoint: POST /api/listings
5. Show success message and navigate to listing detail
6. Handle errors (show error messages)

**Deliverable:** Farmers can create listings via app  
**Owner:** Mobile Engineer  
**Duration:** 2 days

#### Wednesday–Thursday (Days 28–29): Pre-Commitments Screen

**Pre-Commitments Screen:**
- Tab 1 (Farmers): "Pending Pre-Commitments" (buyers offering to buy)
  - Card for each pre-commitment: Buyer name, crop, quantity, price offered
  - Buttons: Accept, Reject, Counter-offer
- Tab 2 (Buyers): "My Pre-Commitments" (my offers to farmers)
  - Card for each: Farmer name, crop, quantity, my offer, status
  - Status indicator: Pending, Accepted, Rejected

**Activities:**
1. Implement pre-commitments screen (tab view)
2. Fetch listings (farmers) or pre-commitments (buyers) from API
3. Display in card format with action buttons
4. Implement accept/reject flow
5. Counter-offer: show input for new price
6. Test full flow (create listing → search → pre-commit → accept/reject)

**Deliverable:** Pre-commitments screen working, full marketplace flow testable  
**Owner:** Mobile Engineer  
**Duration:** 2 days

#### Friday (Day 30): Profile Screen

**Profile Screen:**
- User info: Name, phone, role, crop types, location
- Edit button: Navigate to edit profile (defer to Phase 3)
- Ratings section:
  - Average rating: ⭐⭐⭐⭐ (4.2/5 based on 15 ratings)
  - Transaction count: "25 sales, 100% on-time payment"
  - Recent reviews: "Fresh produce, great seller!" ⭐⭐⭐⭐⭐
- Settings: Language preference, notification settings (basic)
- Logout button

**Activities:**
1. Implement profile screen UI
2. Fetch user profile from API
3. Display ratings (aggregate or fetch from API)
4. Display transaction stats
5. Add logout functionality

**Deliverable:** Profile screen showing user info and ratings  
**Owner:** Mobile Engineer  
**Duration:** 1 day

---

### Week 11: Polish, Performance & Testing

#### Monday–Wednesday (Days 31–33): Offline Support & Caching

**Activities:**
1. Implement offline caching
   - Cache listings and prices on first fetch
   - Show cached data if network unavailable
   - Sync when connection restored
2. Add network status indicator (show "Offline" banner if no connection)
3. Implement retry logic (retry API calls if network restored)
4. Test on slow network (simulate 3G with Chrome DevTools)
5. Measure performance (load time, frame rate)

**Targets:**
- App load time: < 3 sec on 3G network
- List scrolling: 60 fps (smooth)
- Cache size: < 2 MB (small, fast load)

**Deliverable:** App works offline, syncs on reconnect, performant on slow networks  
**Owner:** Mobile Engineer  
**Duration:** 3 days

#### Thursday (Day 34): Accessibility & Usability Testing

**Activities:**
1. Accessibility review (WCAG AA compliance)
   - Font sizes ≥ 16px
   - Color contrast ratios ≥ 4.5:1
   - Tap targets ≥ 48x48 dp
   - Screen reader support (if time allows)
2. Usability testing with low-literacy users (2–3 test sessions)
   - Ask test users to complete key flows (register, search, pre-commit)
   - Observe (don't lead)
   - Note confusion points, errors
   - Measure task completion time
3. Make quick fixes (enlarge buttons, simplify language, etc.)

**Deliverable:** Accessibility review passed, usability testing completed, feedback incorporated  
**Owner:** Mobile Lead + UX Researcher  
**Duration:** 1 day

#### Friday (Day 35): Build & Testing

**Activities:**
1. Run linting (ESLint)
2. Fix lint warnings
3. Build APK (Android) and/or IPA (iOS)
4. Test on real devices (Android 8, 11; iOS 12+)
5. Check size (target: < 10 MB APK)
6. Final bug fixes
7. Prepare for Phase 3 deployment

**Deliverable:** APK < 10 MB, tested on real devices, ready for pilot  
**Owner:** Mobile Lead + QA  
**Duration:** 1 day

---

### Week 12: Mobile Documentation & Handoff

#### Monday–Friday (Days 36–40): Documentation & Handoff

**Activities:**
1. Create mobile app README
   - How to build and run locally
   - Dependencies and versions
   - Architecture overview
2. Document key components and navigation
3. Create setup guide for Phase 3 team (payment integration, forecasting)
4. Prepare app for distribution (TestFlight, Google Play internal testing)
5. Create user onboarding guide (screenshots, step-by-step)

**Deliverable:** Mobile app documentation complete, APK ready for distribution  
**Owner:** Mobile Lead  
**Duration:** 5 days (parallelized with other workstreams)

---

## Workstream 2.4: Admin Dashboard (Weeks 10–12)

**Responsible:** Frontend Lead, Frontend Engineer  
**Duration:** 3 weeks

### Goal
Build a **read-only admin dashboard** providing visibility into:
- ✅ Platform activity (users, listings, transactions)
- ✅ Data accuracy (counts match source API)
- ✅ Key metrics (active listings, completed transactions, overdue payments)
- ✅ Real-time updates (auto-refresh every 30 sec)

---

### Week 10: Dashboard Wireframe & Architecture

#### Monday–Wednesday (Days 21–23): Design & Planning

**Dashboard Pages Needed:**

**1. Summary/Home**
- KPIs: Total users, total listings, active listings, completed transactions, revenue
- Charts: Listings/day trend, transactions/day trend, daily active users
- Last updated timestamp

**2. Users**
- Table: Phone, name, role, status, joined date, ratings, transaction count
- Filters: Role (farmer/buyer/seller/transporter), status (active/suspended)
- Sort: By joined date, by transaction count, by rating

**3. Listings**
- Table: Listing ID, farmer name, crop, qty, price, status, created date
- Filters: Crop type, status (pending/active/sold), date range
- Search: By farmer name or listing ID

**4. Pre-Commitments**
- Table: PC ID, listing, farmer, buyer, qty offered, price offered, status, created date
- Filters: Status (pending/accepted/rejected), date range
- Highlight: Pending approvals (action needed)

**5. Transactions**
- Table: Transaction ID, buyer, farmer, amount, payment status, due date, created date
- Filters: Status (pending/completed/overdue/disputed), date range
- Highlight: Overdue payments (red flag)

**6. Notifications**
- Table: Timestamp, user phone, type (SMS/USSD/app), message, status
- Filters: Type, status (sent/failed), date range

**Activities:**
1. Wireframe all 6 pages (simple sketches)
2. Design data tables and filters
3. Choose tech stack: React + Material-UI or Bootstrap
4. Plan component structure (reusable Table, Card, Chart components)
5. Plan data fetch strategy (fetch all data on page load? paginate? real-time updates?)

**Deliverable:** Dashboard wireframes + component architecture  
**Owner:** Frontend Lead  
**Duration:** 3 days

#### Thursday–Friday (Days 24–25): Project Setup

**Activities:**
1. Create React project (Create React App or Vite)
2. Install dependencies: React Router, Material-UI, recharts (for charts)
3. Set up folder structure
4. Create API client (fetch wrapper with error handling)
5. Set up mock data (for development without backend)
6. Create basic layout (header, sidebar navigation, main content area)

**Deliverable:** Dashboard project scaffolded, sidebar navigation working  
**Owner:** Frontend Engineer  
**Duration:** 2 days

---

### Week 11: Dashboard Pages Implementation

#### Monday–Wednesday (Days 26–28): Summary, Users, Listings

**Summary Page:**
1. Fetch data from `/api/summary` endpoint
2. Display KPI cards (total users, listings, transactions, etc.)
3. Create line charts (recharts) for trends
4. Auto-refresh every 30 seconds
5. Add loading spinner and error handling

**Users Page:**
1. Create data table component (Material-UI DataGrid or custom)
2. Fetch users from `/api/users` endpoint
3. Implement filters (by role, status)
4. Implement sort (by joined date, rating, transaction count)
5. Display pagination (50 users per page)

**Listings Page:**
1. Create data table component
2. Fetch listings from `/api/listings` endpoint
3. Implement filters (crop, status, date range)
4. Implement search (by farmer name or listing ID)
5. Display pagination

**Activities:**
1. Implement each page
2. Connect to API endpoints (mock data if API not ready)
3. Test filtering and sorting
4. Handle errors (API down, no data, etc.)

**Deliverable:** Summary, users, and listings pages working  
**Owner:** Frontend Engineer  
**Duration:** 3 days

#### Thursday–Friday (Days 29–30): Pre-Commitments, Transactions, Notifications

**Pre-Commitments Page:**
- Table with status filter
- Highlight pending items (awaiting farmer response)
- Display action needed

**Transactions Page:**
- Table with payment status filter
- Highlight overdue payments (red background)
- Show payment deadline

**Notifications Page:**
- Table with type filter (SMS, USSD, app)
- Show message preview
- Show sent status and timestamp

**Activities:**
1. Implement all 3 pages
2. Add visual indicators (color coding for status)
3. Test data accuracy (counts match API)
4. Add error handling

**Deliverable:** All 6 dashboard pages completed  
**Owner:** Frontend Engineer  
**Duration:** 2 days

---

### Week 12: Dashboard Refinement & Deployment

#### Monday–Wednesday (Days 31–33): Data Accuracy & Refresh

**Activities:**
1. Verify dashboard data accuracy
   - Total users count matches `/api/summary`
   - Listing counts match `/api/listings`
   - Transaction counts match `/api/transactions`
2. Implement auto-refresh (data updates every 30 sec)
3. Add manual refresh button
4. Test with various data sizes (10 users, 100 listings, 1000 transactions)
5. Optimize queries (add pagination/filtering to reduce data transfer)

**Deliverable:** Dashboard data accurate and real-time  
**Owner:** Frontend Engineer  
**Duration:** 3 days

#### Thursday (Day 34): Styling & Polish

**Activities:**
1. Apply consistent styling (colors, fonts, spacing)
2. Add responsive design (works on desktop, tablet)
3. Add loading spinners and skeleton screens
4. Polish data table styling (hover effects, row highlights)
5. Test accessibility (keyboard navigation, screen reader support)

**Deliverable:** Dashboard polished, responsive, accessible  
**Owner:** Frontend Engineer  
**Duration:** 1 day

#### Friday (Day 35): Documentation & Deployment

**Activities:**
1. Create README for admin dashboard
   - How to run locally
   - API endpoints required
   - Known limitations (read-only mode, no real-time WebSocket)
2. Document how to deploy to staging server
3. Prepare for Phase 5 deployment (configure API base URL for production)
4. Create admin user guide (how to interpret dashboard data)

**Deliverable:** Dashboard deployed to staging, documentation complete  
**Owner:** Frontend Lead  
**Duration:** 1 day

---

## Integration, Testing & Deployment (Weeks 11–12)

**Responsible:** QA Lead, Backend Lead, Integration Team  
**Duration:** 2 weeks (overlapping with final workstream tasks)

### Goal
Ensure all **workstreams integrate seamlessly** and **end-to-end flows work** without P0/P1 blockers.

---

### Week 11: Integration Testing

#### Monday–Thursday (Days 26–29): End-to-End Flow Testing

**Flows to Test:**

**Flow 1: User Registration (USSD)**
```
1. Dial USSD shortcode
2. Choose "1. Register"
3. Enter name, role, crop type, location
4. System confirms registration
5. Verify user created in backend (/api/users GET confirms)
```

**Flow 2: Create Listing & Browse (Mobile App)**
```
1. Login to app
2. Click "Create Listing"
3. Enter crop type, quantity, price, harvest date
4. Post listing
5. Other user searches for same crop
6. Verify listing appears in search results
```

**Flow 3: Pre-Commitment & Transaction (Mobile App)**
```
1. Buyer searches for listings
2. Buyer pre-commits on listing
3. Farmer receives SMS notification (stub)
4. Farmer logs into USSD, checks status
5. Farmer accepts pre-commitment
6. Buyer sees acceptance in app
7. Transaction created with due date
```

**Flow 4: Admin Dashboard Visibility**
```
1. Admin opens dashboard
2. Summary shows 3 new listings, 1 pre-commitment
3. Listings page shows new listings
4. Pre-Commitments page highlights pending
5. Numbers all match backend counts
```

**Activities:**
1. Test each flow end-to-end (multiple times)
2. Verify data consistency across channels (app, USSD, API, dashboard)
3. Test error scenarios (invalid input, network error, server error)
4. Measure latency (end-to-end time from action to visible result)
5. Log all issues in bug tracker

**Deliverable:** Integration test report (pass/fail for each flow, issues logged)  
**Owner:** QA Lead  
**Duration:** 4 days

#### Friday (Day 30): Regression & Smoke Testing

**Activities:**
1. Run smoke tests (quick sanity check of all major features)
2. Regression tests (verify no previous fixes broke)
3. Create test checklist for Phase 5 pilot onboarding

**Deliverable:** Smoke test report, regression testing complete  
**Owner:** QA Lead  
**Duration:** 1 day

---

### Week 12: Final Bug Fixes & Deployment Readiness

#### Monday–Wednesday (Days 31–33): Bug Fixes & Performance

**Activities:**
1. Review all logged issues (from Weeks 5–12)
2. Prioritize by severity:
   - **P0 (Critical):** Platform broken, data loss → Fix immediately
   - **P1 (High):** Feature broken, user can't complete flow → Fix before launch
   - **P2 (Medium):** UX issue, slow response → Fix in next sprint (backlog for Phase 3)
   - **P3 (Low):** Nice-to-have, cosmetic → Backlog
3. Fix all P0 and P1 issues
4. Re-test fixes (no regression)
5. Performance tuning (if needed)

**Deliverable:** All P0/P1 issues resolved, P2/P3 issues in backlog with clear description  
**Owner:** Backend/Mobile/Frontend leads + engineers  
**Duration:** 3 days

#### Thursday (Day 34): Code Review & Quality Gate

**Activities:**
1. Code review: Backend Lead reviews all backend code
2. Code review: Mobile Lead reviews mobile code
3. Code review: Frontend Lead reviews dashboard code
4. Check: ESLint passes (no warnings)
5. Check: Unit tests pass (coverage ≥ 70%)
6. Check: No hardcoded secrets (API keys, passwords in code)
7. Check: Documentation up-to-date (README, API docs, code comments)

**Sign-Off Criteria:**
- ✅ Code review approved (no blocker issues)
- ✅ Lint clean (0 errors, ≤ 5 warnings)
- ✅ Tests passing (unit tests + integration tests)
- ✅ No P0 blockers
- ✅ Documentation complete

**Deliverable:** Code review sign-off, quality gate passed  
**Owner:** Tech Leads (Backend, Mobile, Frontend)  
**Duration:** 1 day

#### Friday (Day 35): Deployment Preparation & Handoff

**Activities:**
1. Prepare deployment checklist
   - Environment variables configured (.env files)
   - Database initialized (seed prices, sample users)
   - Secrets secured (not in code, stored in secure vault)
   - Backup procedures documented
   - Monitoring configured (uptime, error rates)
2. Deploy to staging server (if available)
3. Run smoke tests on staging (confirm all flows work)
4. Prepare Phase 2 handoff document
   - All deliverables listed and signed off
   - Known issues documented
   - Phase 3 dependencies and readiness
5. Team celebration + retrospective (lessons learned)

**Deliverable:** Phase 2 Deployment Checklist Complete, Staging Deployment Successful  
**Owner:** Backend Lead + DevOps  
**Duration:** 1 day

---

## Phase 2 Exit Criteria & Success Measures

### Must-Pass Criteria (Blocking Phase 3 Start)

✅ **Backend API**
- All 14 endpoints implemented and tested
- REST API responding correctly for all flows
- Data validation and error handling working
- Rate limiting configured
- No P0/P1 defects

✅ **USSD/SMS**
- All 6+ USSD menu flows working end-to-end
- USSD responses < 2 seconds
- SMS notifications (stub) logging correctly
- Webhook tested with gateway sandbox

✅ **Mobile App**
- Core screens built (login, dashboard, search, pre-commit, prices, profile)
- APK < 10 MB
- Tested on Android 8, 11 (emulator + real device)
- No crashes in testing
- Offline support (cache + sync)

✅ **Admin Dashboard**
- All 6 pages implemented
- Data accuracy verified (counts match API)
- Auto-refresh working
- Deployed to staging

✅ **End-to-End Flows**
- Registration → Listing → Search → Pre-Commit → Accept → Dashboard (verified)
- USSD menu flows all working
- App flows all working
- Dashboard shows accurate data

✅ **Code Quality**
- All code lint-clean (ESLint 0 errors)
- Unit tests passing (≥ 70% coverage)
- Code review approved (no blockers)
- No hardcoded secrets
- Documentation complete (README, API docs, code comments)

✅ **Documentation**
- API README (curl examples for each endpoint)
- USSD Documentation (menu flows, state machine)
- Mobile App README (build & run instructions)
- Admin Dashboard README (data interpretation guide)
- Deployment checklist and procedures
- Known issues and limitations documented

✅ **Team Readiness**
- Phase 2 team confident in codebase quality
- Phase 3 team has clear handoff (architecture, code, deliverables)
- All questions about MVP resolved

### Success Indicators (Beyond Blocking Criteria)

✓ **Performance:** API responses < 200ms (read), < 500ms (write); USSD < 2 sec; app loads < 3 sec  
✓ **Stability:** No data loss, no unexpected restarts, 100% uptime during testing  
✓ **Usability:** Low-literacy users can complete core flows (register, list, search) without facilitator help  
✓ **Cleanliness:** Code is maintainable, well-commented, follows style guide  
✓ **Excitement:** Team is enthusiastic about MVP; pilot partners eager to test  

---

## Phase 2 Risk Mitigation Plan

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| **USSD Gateway Integration Issues** | Medium | HIGH | Early integration testing (Week 5); have backup gateway ready; escalate to vendor early if problems |
| **Mobile App Performance on Old Devices** | Medium | HIGH | Test on Android 8 (oldest target) early; optimize asset sizes; use code splitting |
| **Data Consistency Issues** | Low | CRITICAL | Thorough integration testing (Week 11); verify counts in dashboard match API; add data validation |
| **API Response Slow Under Load** | Medium | MEDIUM | Load testing (Week 8); optimize queries; add caching; scale if needed |
| **USSD Menu Complexity Confuses Users** | Medium | MEDIUM | Usability testing with low-literacy users (Week 4 Phase 2); simplify language; add help text |
| **Feature Creep** | High | HIGH | Strict MVP scope; defer features to Phase 3; use prioritization matrix; track scope changes |
| **Team Capacity Shortage** | Low | HIGH | Hire junior developers or contractors if needed; plan parallel workstreams; communicate early |
| **Phase 1 Deliverables Delayed** | Medium | CRITICAL | Confirm all Phase 1 contracts signed before Phase 2 starts; have contingency plan (e.g., mock data) |

---

## Phase 2 Deliverables Checklist

### Backend Workstream
- [ ] Project scaffolding (Git repo, Node.js setup)
- [ ] Data model (ER diagram, entity definitions)
- [ ] In-memory store (store.js, CRUD functions)
- [ ] REST API (14 endpoints)
  - [ ] Users: register, get, search
  - [ ] Listings: create, search, get, update
  - [ ] Pre-commitments: create, respond
  - [ ] Transactions: create, get, update
  - [ ] Prices: current, history
  - [ ] Notifications: log, get
  - [ ] Summary: admin dashboard data
- [ ] Input validation & error handling
- [ ] Rate limiting middleware
- [ ] API documentation (README + curl examples)
- [ ] Unit tests (≥ 70% coverage)
- [ ] Load testing report
- [ ] Deployment checklist

### USSD/SMS Workstream
- [ ] USSD webhook endpoint (/ussd)
- [ ] Session manager (create, update, retrieve, cleanup)
- [ ] State machine (transition between menus)
- [ ] USSD menu flows:
  - [ ] Registration
  - [ ] List produce
  - [ ] Browse listings
  - [ ] Pre-commitment
  - [ ] Check price
  - [ ] Check status
- [ ] USSD gateway sandbox integration
- [ ] SMS notification service (stub)
- [ ] USSD documentation (flows, state machine)
- [ ] USSD testing report (all flows tested)

### Mobile App Workstream
- [ ] Project scaffolding (React Native, navigation)
- [ ] High-fidelity mockups (Figma)
- [ ] Auth screens (login, registration)
- [ ] Marketplace screens (dashboard, search, detail, create listing)
- [ ] Prices screen (current, history with charts)
- [ ] Pre-commitments screen (list, accept/reject)
- [ ] Profile screen (user info, ratings)
- [ ] Offline support (caching, sync)
- [ ] Accessibility review (WCAG AA)
- [ ] Usability testing report
- [ ] APK < 10 MB, tested on real devices
- [ ] Mobile app README (build & run)

### Admin Dashboard Workstream
- [ ] Project scaffolding (React, Material-UI)
- [ ] Summary page (KPIs, charts, trends)
- [ ] Users page (table, filters, sort)
- [ ] Listings page (table, filters, search)
- [ ] Pre-commitments page (table, status highlight)
- [ ] Transactions page (table, overdue highlight)
- [ ] Notifications page (table, type filter)
- [ ] Data accuracy verification
- [ ] Auto-refresh (every 30 sec)
- [ ] Admin dashboard README
- [ ] Deployed to staging

### Integration & Testing
- [ ] End-to-end flow testing (registration → listing → pre-commit → accept)
- [ ] USSD + Mobile App + API + Dashboard integration verified
- [ ] Regression testing (no previous fixes broke)
- [ ] Bug tracking and P0/P1 resolution
- [ ] Code review sign-off (all leads)
- [ ] Performance testing report (response times, load capacity)

### Documentation & Handoff
- [ ] Technical Architecture Document (updated)
- [ ] API Reference Document (all endpoints)
- [ ] USSD Flow Documentation
- [ ] Mobile App Setup Guide
- [ ] Admin Dashboard Guide
- [ ] Deployment Procedures
- [ ] Known Issues & Limitations List
- [ ] Phase 3 Readiness Review (steering committee)

---

## Weekly Standups & Governance

### Daily Standups (15 min, 9:30 AM)
Each workstream lead reports:
1. **Yesterday:** What was accomplished?
2. **Today:** What will be done?
3. **Blockers:** Any obstacles?
4. **Risks:** Anything concerning?

### Tuesday All-Hands (1 hour)
- Cross-workstream updates
- Dependency management
- Escalations and decisions needed
- Motivation and team building

### Friday Steering Committee (1.5 hours)
- Week summary (progress vs. plan)
- Risk review and mitigation
- Budget/resource check
- Week N+1 plan confirmation
- Go/no-go decision on milestones

---

## Phase 2 Success Stories (Template)

At end of Phase 2, capture team feedback:

**Example — Backend Lead:**
> "The MVP MVP API is solid. We handled a few integration hiccups early, but the team pulled together. Excited to add payments and forecasting in Phase 3."

**Example — Mobile Lead:**
> "The app feels snappy even on slow networks. Our offline caching really helped. Low-literacy testing showed we still need to simplify USSD menus, but the app resonates well."

**Example — Field Operations Lead:**
> "Pilot partners are impressed with what we've built in 8 weeks. They can't wait to test with real farmers starting Week 22."

---

## Document Metadata

| Attribute | Value |
|-----------|-------|
| **Version** | 1.0 |
| **Document** | Phase 2 Detailed Workplan |
| **Created** | August 27, 2026 |
| **Status** | Draft — Awaiting Steering Committee Approval |
| **Owner** | Project Lead |
| **Approval Authority** | Backend Lead, Mobile Lead, Frontend Lead, CTO, Product Lead |
| **Next Review** | Friday Week 12 (Phase 2 Exit Criteria Review) |
| **Distribution** | Project team, steering committee |

---

**END OF PHASE 2 WORKPLAN**

**Questions? Contact:**
- **Backend Lead:** [name/email]
- **Mobile Lead:** [name/email]
- **Frontend Lead:** [name/email]
- **QA Lead:** [name/email]
- **Project Lead:** [name/email]
