# Product Requirements Document (PRD)

| | |
|---|---|
| **Product** | ESIC Hospital Management System (HMS) |
| **Prepared for** | ESIC hospital serving Labour Department employees |
| **Source spec** | `ESIC_Hospital_Management_System_Complete_Workflow.docx` |
| **Status** | Draft — for stakeholder review |
| **Version** | 1.0 |

> Metrics and timelines in this PRD marked **(proposed)** are placeholders for the product owner /
> hospital administration to validate — the source spec defines *workflow*, not numeric targets.

---

## 1. Purpose

Labour Department employees currently rely on manual/paper-based processes to register, get treated,
get admitted, and receive medicines at the ESIC hospital. This creates repeat data entry on every visit,
inconsistent application of post-based admission entitlements, no real-time visibility into medicine
stock or expiry, and no reliable audit trail. The HMS digitizes this entire journey behind one identity:
a permanent **Hospital UID** per employee.

## 2. Problem statement

- **Registration friction:** employees re-explain who they are on every visit; no single source of truth links an employee to their hospital history.
- **Inconsistent entitlements:** admission facility (ward/room) depends on post and grade, but without a system, this is applied inconsistently or manually looked up.
- **Benefit confusion:** contractual employees are entitled to free consultation but not free medicine — a rule that's easy to apply incorrectly without system enforcement.
- **Pharmacy/stock blind spots:** no systematic FEFO enforcement, no automatic expiry alerts, so expired stock risk and stock-outs both happen.
- **No audit trail:** critical actions (who prescribed what, who dispensed what, who allocated which bed) aren't reliably recorded.

## 3. Goals

### Business goals
1. Reduce repeat-visit registration time to near-zero via UID/QR lookup.
2. Guarantee post/grade-based facility eligibility is applied consistently, without manual judgment calls.
3. Enforce the contractual-vs-permanent medicine benefit rule automatically, every time.
4. Eliminate dispensing of expired medicine through system-level blocking.
5. Give hospital administration real-time visibility into OPD load, bed occupancy, stock health and procurement pipeline.
6. Produce a complete, tamper-evident audit trail for every clinical and inventory transaction.

### Product goals
- One employee, one permanent Hospital UID, usable for life.
- A single digital thread connecting registration → OPD/IPD visit → prescription → dispensing → inventory → billing.
- A facility-eligibility and benefit rule engine administrators can update without a code change.

## 4. Success metrics (proposed)

| Metric | Target (proposed) | Why it matters |
|---|---|---|
| Repeat-visit lookup time (UID scan to profile loaded) | < 5 seconds | Directly reflects the "fast repeat services" objective (spec §1) |
| First-time registration time (Employee ID entry to UID card printed) | < 3 minutes | Registration is the first impression of the system |
| Facility-eligibility rule accuracy | 100% (0 manual overrides needed for standard cases) | Core policy-compliance requirement |
| Dispensing of expired batches | 0 incidents | Hard business rule (spec §17) |
| Stock-out incidents on tracked medicines | Reduced by 50% within 2 quarters of go-live | Supply chain module's core value |
| Critical actions with an audit log entry | 100% | Governance requirement (spec §17, §20) |
| Admin dashboard data freshness | < 5 minutes | Needed for operational decisions (bed allocation, reorder) |

## 5. Target users / personas

| Persona | Role | Primary need from the system |
|---|---|---|
| **Reception Clerk** | Reception / Registration Desk | Register new employees fast, look up returning employees instantly |
| **Dr. Consulting Physician** | Doctor | See patient history at a glance, prescribe digitally, flag admission when needed |
| **Admission Coordinator** | Admission Desk | Know instantly which ward/room an employee is entitled to, and which beds are free |
| **Ward Nurse** | Nurse / Ward Staff | Log observations and treatment without re-entering patient identity |
| **Hospital Pharmacist** | Pharmacist | See prescriptions, dispense against the correct batch, know when someone must pay |
| **Store Manager** | Store Manager | Track batches, get expiry warnings before they become write-offs |
| **Procurement Officer** | Procurement Officer | Turn low-stock alerts into approved purchase orders quickly |
| **Hospital Administrator** | Administrator | Configure facility/benefit rules, watch operational dashboards |
| **Super Admin** | Super Admin | Control system-wide access, integrations, and audit oversight |
| **Labour Dept Employee** | End beneficiary (not a system user, but the subject of every record) | Fast, correct, dignified care without repeat paperwork |

## 6. User stories (representative, not exhaustive — see `07-functional-spec.md` for full flows)

- As a **reception clerk**, I want to scan a returning employee's UID/QR so that I can pull up their profile without asking them to re-register.
- As a **reception clerk**, I want to verify a new employee's ID against the Labour Department system so that only eligible employees get a Hospital UID.
- As a **doctor**, I want to see a patient's prior diagnoses and prescriptions before I consult so that I don't repeat tests or miss interactions.
- As a **doctor**, I want to flag "admission recommended" directly from a consultation so that the admission desk gets the request without a manual handoff.
- As an **admission desk officer**, I want the system to tell me the eligible ward/room category for this employee's post/grade so that I don't have to look up policy manually.
- As a **pharmacist**, I want the system to automatically select the batch closest to expiry (FEFO) so that I don't have to manually check every batch's expiry date.
- As a **pharmacist**, I want the system to tell me whether this employee's medicine is free or must be paid so that I apply the benefit rule correctly every time.
- As a **store manager**, I want an alert when a batch is within 90/30 days of expiry so that I can act before it's a write-off.
- As a **procurement officer**, I want low-stock medicines to automatically generate a requisition draft so that I don't miss reorder windows.
- As a **hospital administrator**, I want to edit the post/grade-to-facility mapping in a settings screen so that I never need a developer to apply a policy change.
- As a **super admin**, I want an immutable audit log of every prescription, dispensing and admission action so that the hospital can respond to any compliance inquiry.

## 7. Scope

### In scope (v1)
Everything described in the source workflow spec: UID-based registration and repeat visits, OPD, IPD/admission
with post-based facility eligibility, contractual-employee benefit rules, digital prescriptions, pharmacy
dispensing with FEFO, medicine supply chain (requisition → PO → GRN → distribution), billing ledger for paid
medicines, admin dashboard, RBAC and audit trail.

### Out of scope (v1) — explicitly deferred
- Online/self-service patient portal for employees (system is staff-operated only in v1).
- Insurance claims processing beyond the Labour Department relationship itself.
- Telemedicine / remote consultation.
- Full payment gateway integration (v1 billing is a ledger + printed receipt, not online payment).
- Lab equipment integration (LabOrder/LabResult are recorded manually in v1, not device-fed).
- Multi-hospital / multi-facility rollout (v1 targets a single hospital).
- Mobile native apps (v1 is responsive web only).

## 8. Assumptions & dependencies

- The Labour Department exposes (or will expose) a verifiable Employee ID lookup — API or a data extract the hospital can query. **Until that integration is confirmed, v1 ships with a mockable adapter (see tech stack doc) so development isn't blocked.**
- Facility eligibility policy (spec §9 table) is provisional and subject to ESIC/Labour Department approval before go-live.
- The hospital has (or will provision) network infrastructure sufficient for a web application at each service point (reception, OPD rooms, wards, pharmacy).
- Medicine benefit coverage rules for permanent employees are configurable but need an initial approved rule set from hospital administration before go-live.

## 9. Constraints

- **Data sensitivity:** patient medical records require restricted, role-based access and encrypted storage/transport — this is a hard constraint, not a nice-to-have (spec §20).
- **Government/public-sector context:** procurement, hosting and integration choices may need to fit existing ESIC/government IT policy — see the tech-stack doc's note on framework substitution.
- **Auditability:** every critical action must be logged immutably — this constrains the data layer design (append-only tables) from day one.

## 10. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Labour Department API not ready at launch | Blocks registration | Ship with a mock adapter; fall back to manual verification/escalation path (already in spec §4.1) |
| Facility eligibility policy not finalized | Blocks IPD go-live | Keep the rule engine data-driven so policy can be loaded/edited without a release |
| Low digital literacy among some staff roles | Slower adoption, workarounds | Keep UI minimal per role, pilot with reception + pharmacy first (highest transaction volume) |
| Network/power reliability at hospital | Data entry loss, downtime | Offline-tolerant UX for token queue, local caching, backup power at minimum for server room |
| Incorrect benefit-rule configuration | Wrong billing, compliance risk | Require Administrator role + audit log entry for any BenefitRule/FacilityEligibilityRule change |

## 11. Open questions (need stakeholder decision before or during build)

1. Is a real Labour Department API available, and what's its authentication/rate-limit model?
2. What is the approved (not provisional) post/grade-to-facility mapping table?
3. What exactly counts as "covered" medicine for permanent employees — a fixed list, a percentage, or a formulary?
4. Is a payment gateway required for contractual-employee medicine purchase, or is counter-cash sufficient for v1?
5. Does the hospital require Hindi (or another regional language) UI localization for v1 or a later phase?
6. What's the target go-live date and any hard external deadlines (budget cycle, policy mandate)?
