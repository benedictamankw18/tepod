# Software Requirements Specification

# AgriSmart AI
*A Digital Marketplace and Forecasting Platform to Reduce Post-Harvest Tomato Losses in Ghana*

**Version:** 1.0
**Prepared:** August 2026
**Status:** Draft for Review

---

## Document Control

| Field | Detail |
|---|---|
| Document Title | Software Requirements Specification — AgriSmart AI |
| Version | 1.0 |
| Status | Draft |
| Pilot Region | Central Region, Ghana (initial focus: tomato value chain) |
| Source Material | Project abstract; field interviews with farmers (maize, tomato, potato) and market sellers, Central Region, Ghana |

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [Functional Requirements](#3-functional-requirements)
4. [Non-Functional Requirements](#4-non-functional-requirements)
5. [External Interface Requirements](#5-external-interface-requirements)
6. [System Models](#6-system-models)
7. [Other Requirements](#7-other-requirements)
- [Appendix A — Traceability: Field Findings to Requirements](#appendix-a--traceability-field-findings-to-requirements)
- [Appendix B — Glossary](#appendix-b--glossary)

---

## 1. Introduction

### 1.1 Purpose

This Software Requirements Specification (SRS) defines the functional and non-functional requirements for AgriSmart AI, a mobile-first digital marketplace and forecasting platform designed to reduce post-harvest losses among smallholder tomato farmers in Ghana. This document is intended for use by the development team, project sponsors, pilot partners (farmer groups, market associations), and evaluators, and serves as the agreed basis for design, implementation, and acceptance testing.

### 1.2 Scope

AgriSmart AI will connect farmers with buyers, transport providers, and processors before and after harvest, using SMS, USSD, and a low-bandwidth mobile application to accommodate users with limited smartphone access or connectivity. The system will:

- Allow farmers to list produce and receive buyer pre-commitments ahead of harvest.
- Provide an AI-powered forecasting module that recommends harvest timing and sale windows using historical price, seasonal production, and weather data.
- Coordinate shared transportation among nearby farmers to reduce per-unit transport cost and delay.
- Provide market sellers and buyers with price transparency and access to verified farmer supply.
- Support secure, trackable payment arrangements to reduce delayed or defaulted payments.

The initial pilot will focus on the tomato value chain in Ghana's Central Region, with the architecture designed to extend to other perishable crops (e.g., maize, pepper, okra) and to nationwide coverage in later phases. Cold-chain hardware, physical warehousing, and last-mile vehicle ownership are outside the scope of this system; AgriSmart AI coordinates and brokers these services rather than owning the physical assets.

### 1.3 Definitions, Acronyms, and Abbreviations

| Term | Definition |
|---|---|
| SRS | Software Requirements Specification |
| USSD | Unstructured Supplementary Service Data — menu-based mobile service usable on any phone without internet |
| SMS | Short Message Service |
| Farm-gate price | The price a farmer receives for produce sold at or near the farm, before transport/market markup |
| Pre-commitment | A buyer's advance agreement to purchase a specified quantity of produce, typically before or at harvest |
| Cold-chain | A temperature-controlled supply chain used to slow spoilage of perishable produce |
| Post-harvest loss (PHL) | Produce that is harvested but never reaches a consumer due to spoilage, damage, or lack of market |
| SDG | United Nations Sustainable Development Goal |
| Admin | AgriSmart AI platform operator / back-office staff |

### 1.4 References

- AgriSmart AI Project Abstract — "AgriSmart AI: A Digital Marketplace and Forecasting Platform to Reduce Post-Harvest Tomato Losses in Ghana."
- Rewritten Field Interview Findings — farmer interviews (maize, tomato, potato) and market seller interviews, Central Region, Ghana.
- UN Sustainable Development Goals 2 (Zero Hunger) and 12.3 (Halving Food Loss and Waste).

### 1.5 Overview

Section 2 describes the product context, users, and constraints. Section 3 specifies functional requirements grouped by feature area. Section 4 specifies non-functional requirements. Section 5 defines external interfaces. Section 6 presents illustrative system models. Section 7 lists other (legal/regulatory) requirements. Appendix A traces each major requirement back to specific evidence gathered in the field interviews, and Appendix B provides a glossary.

---

## 2. Overall Description

### 2.1 Product Perspective

AgriSmart AI is a new, standalone platform composed of a farmer/buyer/seller-facing mobile and USSD/SMS interface, a backend marketplace and logistics engine, and an AI forecasting module. It integrates with mobile network operator SMS/USSD gateways, mobile money payment providers, and third-party weather data services. It does not replace existing physical markets; it augments them by improving information flow, matching, and coordination between farmers, buyers, transporters, and market sellers.

### 2.2 Product Functions

At a high level, the platform provides the following functions, summarized here and detailed in Section 3:

- Produce listing and buyer discovery/pre-commitment.
- AI-driven harvest and sales timing recommendations.
- Shared/coordinated transport booking.
- Market price transparency and historical price trends.
- Payment tracking and delayed-payment mitigation.
- Cold-storage/spoilage-mitigation coordination for market sellers.
- SMS/USSD notifications for users without smartphones or reliable data.
- Administrative oversight, verification, and analytics.

### 2.3 User Classes and Characteristics

| User Class | Characteristics |
|---|---|
| Smallholder Farmer | Grows tomatoes and other crops (maize, okra, cassava, pepper); often on feature phones; limited literacy in some cases; primary interest in fair, timely, predictable sale of produce. |
| Buyer (Wholesale/Institutional) | Purchases produce in bulk, potentially pre-committing before harvest; values reliable supply and quality. |
| Market Seller (Retail) | Buys from farmers or intermediary markets to resell at local markets (e.g., Ashanti Market); values price transparency, product firmness/quality, and storage support. |
| Transport Provider | Offers vehicles/drivers for produce haulage; benefits from pooled, higher-volume bookings. |
| Platform Administrator | AgriSmart AI staff who verify users, monitor transactions, and manage disputes and analytics. |

> **Field evidence:** Farmers described selling maize for roughly GHS 600 against an expected value of about GHS 1,000 per five bags per acre after costs; tomato farmers cited unreliable buyers, delayed payments, and reliance on markets such as Donasi Market and Kasoa. Market sellers such as Janet and Filomena Mensah described sourcing from Todi/Agogroshie or traveling to Ada when local prices were uncompetitive, and lacking refrigeration for perishable stock.

### 2.4 Operating Environment

- Farmer/seller-facing access via basic feature phones (SMS/USSD) and Android smartphones (low-bandwidth mobile app).
- Backend hosted on cloud infrastructure with regional availability suitable for West Africa.
- Integration with at least one mobile network operator's SMS/USSD gateway and at least one mobile money service.
- Initial pilot deployment limited to Ghana's Central Region, with intermittent rural connectivity assumed.

### 2.5 Design and Implementation Constraints

- Interfaces must function over 2G/USSD as well as smartphone data connections, since many target users do not have reliable internet access.
- Local language support is required given mixed literacy levels among farmer users.
- The system must operate where formal addresses and identity documentation may be incomplete or informal.
- Forecasting accuracy is dependent on availability and quality of historical price and weather data for the pilot region.

### 2.6 Assumptions and Dependencies

- Farmers, buyers, and market sellers are willing to adopt a digital or USSD-based tool if it demonstrably improves price and reliability, consistent with the interviewed farmers' and sellers' expressed interest in such a platform.
- Mobile network coverage (voice/SMS at minimum) is available in the pilot region.
- At least one mobile money provider is operational and accepted by the target user base for in-app payment features.
- Third-party weather and price-history data sources are accessible for the forecasting module.

---

## 3. Functional Requirements

Requirements are grouped by feature area. Priority is expressed as **Must** (essential for pilot launch), **Should** (important, may follow shortly after launch), or **Could** (desirable, later phase).

### 3.1 Produce Listing and Buyer Pre-Commitment

> **Field evidence:** Farmers stated they "would be very happy to have a platform that connects us directly with buyers and helps us sell our produce at profitable prices," and market seller Janet said she would use a platform that "connected us with farmers and allowed us to purchase goods at affordable prices."

| ID | Requirement Description | Priority |
|---|---|---|
| FR-1.1 | The system shall allow a registered farmer to create a produce listing including crop type, estimated quantity, expected harvest date, and asking price. | Must |
| FR-1.2 | The system shall allow a registered buyer or market seller to browse or search listings by crop type, location, quantity, and harvest window. | Must |
| FR-1.3 | The system shall allow a buyer to submit a pre-commitment (advance purchase agreement) against a listing, specifying quantity and offered price. | Must |
| FR-1.4 | The system shall notify a farmer via SMS/USSD or app notification when a buyer submits, accepts, or withdraws a pre-commitment. | Must |
| FR-1.5 | The system shall allow a farmer to accept, reject, or counter-offer a buyer's pre-commitment. | Should |
| FR-1.6 | The system shall maintain a status history for each listing (open, pre-committed, sold, expired, spoiled/withdrawn). | Should |

### 3.2 Market Price Information

> **Field evidence:** Market sellers described traveling between markets (e.g., Todi, Agogroshie, Ada) largely because they lacked reliable price information, and farmers reported that "the final price depends largely on the buyer," with no independent reference price available.

| ID | Requirement Description | Priority |
|---|---|---|
| FR-2.1 | The system shall display current and recent average prices for supported crops, by market/location, to all user classes. | Must |
| FR-2.2 | The system shall provide historical price trend data (e.g., trailing 4–12 weeks) for supported crops. | Should |
| FR-2.3 | The system shall allow price information to be retrieved via a USSD menu for users without app/data access. | Must |
| FR-2.4 | The system shall flag listings whose asking price deviates significantly from the recent market average, for both farmer and buyer awareness. | Could |

### 3.3 AI Forecasting and Harvest/Sales Recommendation

> **Field evidence:** Farmers described storing maize after harvest hoping prices would rise, but risking spoilage, and noted that selling immediately after harvest usually meant accepting a low price — a timing trade-off the forecasting module is intended to address.

| ID | Requirement Description | Priority |
|---|---|---|
| FR-3.1 | The system shall generate a recommended harvest window for a given crop and location based on historical price patterns, seasonal production data, and weather forecasts. | Must |
| FR-3.2 | The system shall generate a recommendation on whether to sell immediately after harvest or to delay sale, with an associated estimated spoilage-risk indicator. | Must |
| FR-3.3 | The system shall alert a farmer via SMS/USSD when weather conditions (e.g., heavy rainfall) are forecast to pose a risk to a listed or pending crop. | Should |
| FR-3.4 | The system shall update its recommendations as new price, weather, or production data becomes available. | Should |
| FR-3.5 | The system shall present forecast confidence or a simple risk indicator (e.g., low/medium/high) alongside each recommendation, rather than a bare prediction. | Should |

### 3.4 Transport Coordination

> **Field evidence:** Tomato farmers cited transporting produce to market themselves as a burden, and market sellers cited transport cost (e.g., approximately GHS 100 to bring tomatoes from Ada) as a factor eaten into their margin.

| ID | Requirement Description | Priority |
|---|---|---|
| FR-4.1 | The system shall allow a farmer or group of farmers in the same locality to request shared transport for a scheduled pickup. | Should |
| FR-4.2 | The system shall allow registered transport providers to view and accept transport requests, including multi-farmer pooled routes. | Should |
| FR-4.3 | The system shall provide an estimated transport cost to farmers and buyers prior to booking confirmation. | Should |
| FR-4.4 | The system shall notify relevant parties (farmer, buyer, transporter) of pickup confirmation, delay, or cancellation. | Must |

### 3.5 Payments and Delayed-Payment Mitigation

> **Field evidence:** Tomato farmers reported that buyers "ask to take the produce and pay later" and "sometimes delay or refuse to pay on time," while Janet noted some suppliers pressure her for immediate payment even though her own customers pay her later — a cash-flow mismatch across the chain.

| ID | Requirement Description | Priority |
|---|---|---|
| FR-5.1 | The system shall allow a buyer to record and track a payment obligation (amount, due date) associated with a completed transaction. | Must |
| FR-5.2 | The system shall send automated payment-due reminders to buyers, and payment-status updates to farmers, via SMS/USSD or app notification. | Must |
| FR-5.3 | The system shall support integration with at least one mobile money provider for in-app payment initiation and confirmation. | Should |
| FR-5.4 | The system shall maintain a payment reliability indicator (e.g., on-time payment rate) associated with each buyer's profile, visible to farmers before accepting a pre-commitment. | Should |
| FR-5.5 | The system shall allow a farmer or market seller to report a non-payment or delayed-payment dispute for administrator review. | Should |

### 3.6 Storage and Spoilage Mitigation

> **Field evidence:** Market seller Filomena Mensah noted that tomatoes bought a day earlier may already be spoiled, that sellers lack refrigerators or cold storage, and that sun exposure accelerates spoilage; farmers similarly described giving away or discarding badly spoiled tomatoes.

| ID | Requirement Description | Priority |
|---|---|---|
| FR-6.1 | The system shall allow verified cold-storage or shaded-storage facility operators to list available storage capacity, location, and pricing. | Could |
| FR-6.2 | The system shall allow a market seller or farmer to request short-term storage against a specific listed lot. | Could |
| FR-6.3 | The system shall factor estimated spoilage timelines (e.g., typical shelf life for tomatoes) into the sales-timing recommendations described in FR-3.2. | Should |

### 3.7 User Accounts, Verification, and Trust

| ID | Requirement Description | Priority |
|---|---|---|
| FR-7.1 | The system shall allow a new user to register as a Farmer, Buyer, Market Seller, or Transport Provider, capturing name, phone number, and location at minimum. | Must |
| FR-7.2 | The system shall allow phone-number-based verification suitable for USSD/SMS-only users who lack smartphone-based identity documents. | Must |
| FR-7.3 | The system shall allow users to rate counterparties (buyer, farmer, seller, transporter) after a completed transaction. | Should |
| FR-7.4 | The system shall allow an administrator to suspend or flag a user account associated with repeated disputes. | Should |

### 3.8 Notifications (SMS/USSD/App)

| ID | Requirement Description | Priority |
|---|---|---|
| FR-8.1 | The system shall deliver all critical transactional notifications (pre-commitment status, payment due, transport confirmation, weather alert) via SMS in addition to any in-app notification. | Must |
| FR-8.2 | The system shall provide a USSD menu covering listing creation, price lookup, and pre-commitment status for users without app access. | Must |
| FR-8.3 | The system shall support notification content in at least one major local language in addition to English. | Should |

### 3.9 Administration and Analytics

| ID | Requirement Description | Priority |
|---|---|---|
| FR-9.1 | The system shall provide an administrator dashboard showing active listings, transaction volume, and dispute cases. | Should |
| FR-9.2 | The system shall track and report estimated post-harvest loss reduction and farmer income impact for pilot monitoring and SDG reporting purposes. | Should |
| FR-9.3 | The system shall allow an administrator to onboard and verify new transport providers and storage facility operators. | Could |

---

## 4. Non-Functional Requirements

### 4.1 Performance

- **NFR-1.1** — USSD menu responses shall be returned within 3 seconds under normal network conditions.
- **NFR-1.2** — The mobile application shall remain usable on 2G/3G connections with page loads under 5 seconds for core screens (listings, price lookup).
- **NFR-1.3** — The forecasting module shall generate a recommendation within 10 seconds of a request under normal load.

### 4.2 Usability

- **NFR-2.1** — Core farmer-facing flows (list produce, check price, check pre-commitment status) shall be completable via USSD in 5 steps or fewer.
- **NFR-2.2** — The interface shall accommodate users with limited literacy through icon-based navigation and/or voice/local-language prompts where feasible.

### 4.3 Reliability and Availability

- **NFR-3.1** — The platform's SMS/USSD gateway shall target 99% uptime during the harvest season for the pilot crop and region.
- **NFR-3.2** — Payment-status and pre-commitment data shall not be lost in the event of a single server failure; the system shall use redundant storage.

### 4.4 Security

- **NFR-4.1** — All personal data (names, phone numbers, location, transaction history) shall be encrypted in transit and at rest.
- **NFR-4.2** — Access to administrator functions shall require authenticated, role-based access control.
- **NFR-4.3** — Payment integrations shall not store raw mobile-money credentials on AgriSmart AI servers.

### 4.5 Scalability

- **NFR-5.1** — The system architecture shall support scaling from a single-region tomato pilot to multi-crop, nationwide operation without redesign of the core data model.

### 4.6 Accessibility and Localization

- **NFR-6.1** — All critical flows shall be accessible on basic feature phones via USSD/SMS, not solely via smartphone app.
- **NFR-6.2** — The system shall support at least English and one widely spoken local language in the pilot region at launch.

### 4.7 Environmental and Data Quality

- **NFR-7.1** — The forecasting module shall log data source and confidence for each recommendation to support later accuracy evaluation.
- **NFR-7.2** — The platform shall track metrics needed to estimate avoided post-harvest loss and associated greenhouse-gas impact, in support of the project's SDG 12.3 objective.

---

## 5. External Interface Requirements

### 5.1 User Interfaces

- USSD menu interface for feature phones (no data connection required).
- SMS-based notifications and simple keyword commands.
- Low-bandwidth Android mobile application for smartphone users.
- Web-based administrator dashboard.

### 5.2 Hardware Interfaces

- No dedicated hardware is required for farmers or buyers; standard feature phones or Android smartphones are sufficient.
- Optional integration with temperature-monitoring sensors at partner cold-storage facilities in later phases (out of scope for pilot).

### 5.3 Software Interfaces

- Mobile network operator SMS/USSD gateway API.
- Mobile money payment provider API (e.g., for payment initiation/confirmation).
- Third-party weather data API for the forecasting module.
- Historical agricultural market price data source(s), where available, for the pilot region.

### 5.4 Communication Interfaces

- HTTPS/TLS for all app-to-backend and admin-to-backend communication.
- Standard SMS/USSD signaling via the mobile network operator gateway.

---

## 6. System Models

### 6.1 High-Level Actors and Interactions

The core interaction loop is: (1) a Farmer creates a produce listing, optionally guided by an AI harvest/sales recommendation; (2) Buyers and Market Sellers discover the listing and may submit a pre-commitment; (3) upon acceptance, the system coordinates payment tracking and, where requested, shared transport; (4) both parties may rate the transaction, feeding the trust/reliability indicators used in future matching.

### 6.2 Primary Use Cases

- **UC-1:** Farmer lists produce and receives a harvest/sales recommendation.
- **UC-2:** Buyer discovers a listing and submits a pre-commitment.
- **UC-3:** Farmer and Buyer complete a transaction with tracked payment.
- **UC-4:** Farmer or Market Seller requests shared transport.
- **UC-5:** Market Seller checks current price trends before purchasing stock.
- **UC-6:** Administrator reviews a delayed-payment dispute.

---

## 7. Other Requirements

- The platform shall support monitoring and reporting aligned with SDG 2 (Zero Hunger) and SDG 12.3 (Halving Food Loss and Waste), consistent with the project's stated objectives.
- Data collection and storage shall comply with applicable Ghanaian data protection regulations.
- The pilot shall be deployable and operable within Ghana's Central Region prior to any nationwide expansion.

---

## Appendix A — Traceability: Field Findings to Requirements

| Field Finding | Related Requirement(s) |
|---|---|
| Low farm-gate prices set unilaterally by buyers (maize farmer) | FR-2.1, FR-2.2, FR-1.3 |
| Post-harvest storage vs. spoilage trade-off (maize farmer) | FR-3.1, FR-3.2, FR-6.3 |
| Desire for direct farmer-buyer platform (maize farmer; Janet) | FR-1.1, FR-1.2, FR-1.3 |
| Buyers taking produce and delaying/refusing payment (tomato farmer) | FR-5.1, FR-5.2, FR-5.4, FR-5.5 |
| High cost of imported agrochemicals; irrigation access (tomato farmer) | Noted as out-of-scope input-supply need; recommended for future phase |
| Farmer self-transport to market (tomato farmer) | FR-4.1, FR-4.2, FR-4.3 |
| Spoilage forcing give-away/disposal of tomatoes (tomato farmer) | FR-3.2, FR-3.3, FR-6.1, FR-6.2 |
| Labour shortages, reliance on hometown labour (tomato farmer) | Noted as out of scope; potential future labour-matching feature |
| Rainfall dependency, excess-rain crop damage (potato farmer) | FR-3.1, FR-3.3 |
| Sourcing difficulty / lack of direct farmer contacts (Janet) | FR-1.2, FR-7.1 |
| Local prices higher than Accra despite added farmer effort (Janet) | FR-2.1, FR-2.4 |
| Some buyers pay later; supplier pressure for immediate payment (Janet) | FR-5.1, FR-5.4 |
| Declining local tomato supply due to farmland loss (Filomena Mensah) | Noted as market-context risk; monitored via FR-9.2 analytics |
| Farmers under/over-pricing relative to market, causing lost sales (Filomena Mensah) | FR-2.1, FR-2.4 |
| Rapid tomato spoilage; no refrigeration for sellers (Filomena Mensah) | FR-6.1, FR-6.2, FR-3.2 |
| Sun exposure accelerating spoilage; product firmness differences (Filomena Mensah) | FR-6.3 (informs spoilage-risk modeling) |

---

## Appendix B — Glossary

- **Farm-gate price:** price received by the farmer at or near the point of production, before transport and market markup.
- **Pre-commitment:** an advance agreement by a buyer to purchase a given quantity of produce, typically arranged before or at harvest.
- **Spoilage-risk indicator:** a simple qualitative (low/medium/high) or quantitative estimate of how likely a listed lot is to spoil before sale.
- **Shared transport:** pooled vehicle bookings across multiple nearby farmers' listings to reduce per-farmer transport cost.
- **Payment reliability indicator:** a score or rating reflecting a buyer's historical on-time payment behavior.
