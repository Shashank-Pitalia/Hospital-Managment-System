# Functional Specification

| | |
|---|---|
| **Product** | ESIC Hospital Management System (HMS) |
| **Purpose of this doc** | Defines exactly how each module behaves — screens, fields, validation, business rules, and API shape — so a developer can build a phase without re-reading the source spec. |
| **Companion docs** | `05-prd.md` (why), `06-requirements.md` (numbered requirements this spec satisfies) |
| **Version** | 1.0 |

Each module below follows the same shape: **Purpose → Actors → Preconditions → Main flow → Alternate/exception
flows → Data fields → Business rules → Sample API → Edge cases.** Requirement IDs (`FR-xxx`) link back to
`06-requirements.md`.

---

## Module 1 — Employee Verification & UID Registration
*Satisfies: FR-EMP-01 to FR-EMP-07*

**Purpose:** turn a Labour Department Employee ID into a permanent, scannable Hospital identity.

**Actors:** Reception clerk (operator), System (verification + generation), Labour Department (external source of truth).

**Preconditions:** employee has a valid Labour Department Employee ID and has not previously registered.

**Main flow**
1. Reception selects "New Registration" and enters the Employee ID.
2. System calls the Labour Department verification interface with the Employee ID.
3. On success, system receives: Name, Department, Post/Designation, Grade/Pay Level, Employment Type, contact details.
4. System checks no Hospital UID already exists for this Employee ID (FR-EMP-06).
5. System generates a new Hospital UID (format: see Data fields) and creates the Employee + PatientProfile records.
6. System generates a QR code encoding the UID.
7. Reception prints or displays the UID card.
8. Employee is now ready for OPD/IPD service.

**Alternate / exception flows**
- **3a. Verification fails or times out:** system creates a "Pending Manual Verification" case instead of rejecting outright (FR-EMP-02). Reception can escalate to Administrator, who can manually confirm identity from supporting documents and unblock registration.
- **4a. UID already exists:** system stops registration and redirects reception to the repeat-visit flow (Module 2) with the existing profile.

**Data fields**

| Field | Type | Required | Notes |
|---|---|---|---|
| Employee ID | string | yes | External identifier from Labour Dept; unique |
| Hospital UID | string | system-generated | Permanent, unique, immutable once issued |
| Name | string | yes | From Labour Dept response |
| Department | string | yes | From Labour Dept response |
| Post / Designation | string | yes | Drives facility eligibility (Module 5) |
| Grade / Pay Level | string | yes | Drives facility eligibility (Module 5) |
| Employment Type | enum: Permanent, Contractual | yes | Drives benefit rules (Module 6) |
| Contact details | string (phone/email) | yes | For notifications |
| Eligibility category | string | system-derived | Resolved via Facility Eligibility Rule Engine |
| Registration date | date | system-generated | |

**Business rules**
- One Employee ID ⇒ exactly one Hospital UID, forever (FR-EMP-03, FR-EMP-06).
- A UID is never reissued, even if the QR/card is lost — a lost card is a "reprint," not a new UID.
- Registration failure never silently drops the employee — it always resolves to either success or an escalation case, never a dead end (FR-EMP-02).
- Post-registration corrections to Name/Department/Contact details may be made by Reception, Data Entry Operator, Administrator, or Super Admin; a Data Entry Operator may **only** touch these demographic fields — not Post/Grade/Employment Type, which drive facility eligibility and benefit rules (FR-SEC-13).

**Sample API**

| Method | Path | Purpose |
|---|---|---|
| POST | `/employees/verify` | Verify Employee ID against Labour Dept adapter |
| POST | `/employees/register` | Create Employee + PatientProfile + HospitalUID after verification |
| GET | `/employees/:uid/card` | Fetch printable UID card (QR + details) |
| POST | `/employees/:employeeId/escalate` | Raise a manual-verification case |

**Edge cases**
- Duplicate Employee ID submitted twice in quick succession (double-click) — must not create two UIDs; enforce a unique constraint at the database level, not just a UI debounce.
- Labour Department returns partial data (e.g., missing contact) — registration should still succeed with the missing field flagged for later completion, not blocked entirely, unless Name/Post/Employment Type (the fields the rule engines depend on) are missing.

---

## Module 2 — Repeat Visit / UID-QR Lookup
*Satisfies: FR-EMP-07, FR-PAT-01 to FR-PAT-04*

**Purpose:** get a returning employee's full context in front of staff in seconds.

**Actors:** Reception, Doctor, Nurse, Pharmacist (anyone who needs to pull up a known patient).

**Main flow**
1. Staff scans the QR or types the UID.
2. System fetches PatientProfile, and summarizes: last visit date, active admission (if any), open prescriptions, medical history timeline.
3. Staff creates a new Visit and chooses Out Service (OPD) or In Service (IPD).

**Data fields (Visit)**

| Field | Type | Required | Notes |
|---|---|---|---|
| Visit ID | uuid | system | |
| Employee / UID | reference | yes | |
| Visit type | enum: OPD, IPD | yes | Set at creation |
| Status | enum: Open, Closed | yes | |
| Created at | datetime | system | |

**Business rules**
- A lookup never mutates data — it's read-only until a new Visit is explicitly created.
- If an employee already has an *open* Visit, staff should be warned before creating a duplicate (avoids fragmenting one hospital stop into two visit records).

**Sample API**

| Method | Path | Purpose |
|---|---|---|
| GET | `/patients/lookup?uid=` | Fetch profile + history summary |
| POST | `/visits` | Create a new Visit against a UID |

---

## Module 3 — OPD (Out Service)
*Satisfies: FR-OPD-01 to FR-OPD-06*

**Purpose:** run a consultation from arrival to medicine handoff without paper.

**Actors:** Reception, Doctor, Pharmacist.

**Main flow**
1. Reception creates an OPD Visit and selects a department/specialty.
2. System issues a queue token, scoped per department per calendar day (e.g., `CARDIO-014`).
3. Doctor's queue screen shows tokens in order; doctor calls next.
4. Doctor consults (Module 4), submits diagnosis + prescription.
5. Prescription routes to pharmacy (Module 6).
6. Once dispensing (or "no medicine required") completes, the OPD visit is marked closed.

**Data fields (OPDVisit)**

| Field | Type | Required | Notes |
|---|---|---|---|
| OPDVisit ID | uuid | system | |
| Visit | reference | yes | Parent Visit record |
| Department | string | yes | |
| Token number | string | system | Unique per department per day |
| Called at | datetime | nullable | Set when doctor calls the token |
| Closed at | datetime | nullable | Set when visit fully resolves |

**Business rules**
- Token numbering resets daily per department; never reused within the same day.
- Token generation must be safe under concurrent requests (two reception desks creating visits simultaneously must not collide) — use an atomic counter (e.g., Redis `INCR`), not a read-then-write in application code.

**Sample API**

| Method | Path | Purpose |
|---|---|---|
| POST | `/opd-visits` | Create OPD visit + issue token |
| GET | `/opd-visits/queue?department=` | Current queue for a department |
| POST | `/opd-visits/:id/call` | Mark token called |
| POST | `/opd-visits/:id/close` | Close the visit |

---

## Module 4 — Doctor Console & Digital Prescription
*Satisfies: FR-DOC-01 to FR-DOC-07*

**Purpose:** give the doctor everything needed to consult and prescribe in one screen, with a hard
sign-off step before pharmacy sees anything.

**Main flow**
1. Doctor opens a visit from their queue (OPD token or ward round).
2. Doctor reviews medical history (prior diagnoses, prescriptions, admissions).
3. Doctor records symptoms, examination notes, diagnosis.
4. Doctor adds prescription items (one row per medicine): medicine, dose, frequency, duration.
5. Doctor optionally adds lab test orders, a follow-up flag, and/or an "admission recommended" flag.
6. Doctor signs and submits — this locks the prescription (no further edits) and publishes it to pharmacy.

**Data fields (Prescription / PrescriptionItem)**

| Field | Type | Required | Notes |
|---|---|---|---|
| Prescription ID | uuid | system | |
| Visit | reference | yes | |
| Doctor | reference | yes | Must hold Doctor role (FR-DOC-07) |
| Diagnosis notes | text | yes | |
| Follow-up flag | boolean | no | |
| Admission recommended | boolean | no | Triggers Module 5 (Admission Request) |
| Status | enum: Draft, Signed, PartiallyDispensed, Closed | yes | |
| — PrescriptionItem: medicine | reference | yes | |
| — PrescriptionItem: dose | string | yes | e.g., "500mg" |
| — PrescriptionItem: frequency | string | yes | e.g., "twice daily" |
| — PrescriptionItem: duration | string | yes | e.g., "5 days" |

**Business rules**
- A prescription in `Draft` status is editable only by its authoring doctor; once `Signed`, it is immutable (pharmacy actions create new records — dispensing transactions — rather than mutating the prescription).
- Only the Doctor role can transition a prescription from Draft to Signed (FR-DOC-07).

**Sample API**

| Method | Path | Purpose |
|---|---|---|
| GET | `/doctor/queue` | Active visits assigned/available to the doctor |
| GET | `/patients/:uid/history` | Medical history for consultation |
| POST | `/prescriptions` | Create draft prescription with items |
| POST | `/prescriptions/:id/sign` | Sign and publish to pharmacy |

---

## Module 5 — Facility Eligibility Rule Engine
*Satisfies: FR-FAC-01 to FR-FAC-04*

**Purpose:** turn "what ward can this employee use" from institutional knowledge into a queryable,
editable rule set.

**Main flow**
1. Administrator configures rows mapping Post/Grade → Category → Ward eligibility → Room → Facility level (the table in `03-data-model.md`).
2. At admission-request time, system resolves the employee's Post/Grade to a Category, then to eligible ward/room types.
3. System records which rule (and its version) produced the decision.

**Data fields (FacilityEligibilityRule)**

| Field | Type | Required | Notes |
|---|---|---|---|
| Rule ID | uuid | system | |
| Post / Grade match | string / range | yes | What this rule applies to |
| Category | enum: A, B, C, D, Contractual | yes | |
| Ward eligibility | string | yes | e.g., "Private Ward" |
| Room | string | yes | e.g., "Single Room" |
| Facility level | string | yes | e.g., "Premium" |
| Active | boolean | yes | Only one active rule per Post/Grade at a time |
| Version | integer | system | Incremented on edit, prior versions retained for audit |

**Business rules**
- This is **data**, not code — no `if (post === 'Clerk')` anywhere in the codebase (spec §9, §17; FR-FAC-03).
- Editing a rule creates a new version rather than overwriting — historical admissions must still show which rule they were decided under (FR-FAC-04).
- Only Administrator/Super Admin roles may edit rules; every edit writes an audit log entry.

**Sample API**

| Method | Path | Purpose |
|---|---|---|
| GET | `/facility-rules` | List current rules |
| PUT | `/facility-rules/:id` | Edit a rule (creates new version) |
| GET | `/facility-rules/resolve?employeeId=` | Resolve eligible category for an employee |

---

## Module 6 — IPD / Admission Management
*Satisfies: FR-ADM-01 to FR-ADM-07*

**Purpose:** move from "doctor recommends admission" to "patient discharged" with a bed never double-booked.

**Main flow**
1. Doctor's "admission recommended" flag (Module 4) creates an Admission in `Requested` status.
2. System resolves facility eligibility (Module 5) → `EligibilityChecked`.
3. Admission desk requests available beds matching the eligible category.
4. If none available → `AwaitingBed` (queued) until one frees up.
5. Admission desk allocates a specific bed → `Allocated`; system assigns a care team (doctor + nurse).
6. Status moves to `UnderTreatment`; ward staff log daily observations/treatment.
7. Doctor approves discharge → `DischargeApproved`; system generates a Discharge Summary.
8. Admission closes → `Discharged`; the bed is freed and immediately becomes available for the next allocation.

**Data fields (Admission)**

| Field | Type | Required | Notes |
|---|---|---|---|
| Admission ID | uuid | system | |
| Visit | reference | yes | |
| Status | enum (see lifecycle diagram in `01-architecture.md`) | yes | |
| Eligible category | string | system | From Module 5 |
| Ward / Room / Bed | reference | set on allocation | |
| Assigned doctor / nurse | reference | set on allocation | |
| Discharge summary | text/reference | set on discharge | |

**Business rules**
- **A bed can have at most one active admission at a time.** Enforce with a database-level uniqueness/transaction — a race between two admission-desk clicks must not double-book (FR-ADM-03).
- Discharge requires explicit doctor approval; ward staff or admin cannot self-discharge a patient (FR-ADM-05).
- Discharging a patient must, in the same transaction, free the bed — never leave a bed "occupied" with no active admission.

**Sample API**

| Method | Path | Purpose |
|---|---|---|
| POST | `/admissions` | Create admission request (from doctor flag) |
| GET | `/admissions/:id/eligible-beds` | Beds matching resolved category, available now |
| POST | `/admissions/:id/allocate` | Allocate a specific bed (transactional) |
| POST | `/admissions/:id/notes` | Add daily observation/treatment note |
| POST | `/admissions/:id/discharge` | Doctor-approved discharge, generates summary, frees bed |

---

## Module 7 — Pharmacy & Dispensing
*Satisfies: FR-PHM-01 to FR-PHM-08*

**Purpose:** turn a signed prescription into dispensed medicine with the correct batch and the correct
benefit rule, every time.

**Main flow**
1. Pharmacist opens a signed prescription from the dispensing queue.
2. System shows, per item: patient, employment type, live stock by batch.
3. System selects the batch with the earliest usable expiry (FEFO).
4. System applies the benefit rule (Module 8) to mark the item free/covered/paid.
5. Pharmacist confirms dispensing; system deducts inventory and writes a StockTransaction.
6. Prescription (or the specific item) is marked Closed or PartiallyClosed.

**Alternate / exception flows**
- **3a. Preferred batch has insufficient quantity:** system offers an alternative batch (next-earliest expiry with sufficient stock) or a partial issue; if no batch has any stock, system raises a procurement alert (feeds Module 9's low-stock trigger) (FR-PHM-04).
- **3b. All available batches are expired:** system blocks dispensing entirely for that item and surfaces it as an inventory exception, never silently substitutes an expired batch (FR-PHM-07).

**Data fields (StockTransaction)**

| Field | Type | Required | Notes |
|---|---|---|---|
| Transaction ID | uuid | system | |
| Type | enum: Dispense, Receipt, Transfer, Disposal | yes | |
| Medicine Batch | reference | yes | |
| Quantity | integer | yes | Signed (negative for dispense) |
| Prescription Item | reference | for dispense type | |
| Performed by | reference (user) | yes | Must hold Pharmacist role for Dispense type (FR-PHM-08) |
| Timestamp | datetime | system | |

**Business rules**
- FEFO is not optional per-pharmacist judgment — it's a system-enforced selection order (FR-PHM-03).
- Every dispense writes exactly one StockTransaction row; this table is append-only, forming the audit trail for all inventory movement.

**Sample API**

| Method | Path | Purpose |
|---|---|---|
| GET | `/pharmacy/queue` | Signed, undispensed prescriptions |
| GET | `/pharmacy/prescriptions/:id/batches` | FEFO-ordered batch options per item |
| POST | `/pharmacy/dispense` | Dispense item(s), deduct stock, write transaction |

---

## Module 8 — Employment-Type Benefit Rules
*Satisfies: FR-OPD-05, FR-PHM-05*

**Purpose:** apply "contractual = free consult, paid medicine; permanent = configured coverage" consistently,
and make it editable when policy changes.

**Data fields (BenefitRule)**

| Field | Type | Required | Notes |
|---|---|---|---|
| Rule ID | uuid | system | |
| Employment Type | enum: Permanent, Contractual | yes | |
| Medicine category (optional scope) | string | no | Blank = applies to all medicines |
| Outcome | enum: Free, Covered, Paid | yes | |
| Active | boolean | yes | |

**Business rules**
- Seeded default: Contractual → Paid for all medicine categories (spec §7). This is a *default row*, editable like any other rule — not a hard-coded branch.
- `BenefitRuleService.evaluate(employmentType, medicine)` is the single call site both the prescription screen (to show projected cost) and pharmacy dispensing (to decide free/paid) must use — no duplicate logic in two places.

**Sample API**

| Method | Path | Purpose |
|---|---|---|
| GET | `/benefit-rules` | List rules |
| PUT | `/benefit-rules/:id` | Edit a rule |
| GET | `/benefit-rules/evaluate?employmentType=&medicineId=` | Resolve outcome |

---

## Module 9 — Inventory, Expiry & FEFO Automation
*Satisfies: FR-INV-01 to FR-INV-06*

**Main flow (daily scheduled job)**
1. Job scans all active MedicineBatch rows.
2. Batch expiring ≤ 90 days and not yet flagged → mark Early Warning, notify Store Manager.
3. Batch expiring ≤ 30 days → mark Critical Alert.
4. Batch past expiry date → mark Expired, move to Quarantined, block from FEFO selection immediately.
5. Quarantined batch pending disposal requires an approval action before being marked Disposed, with an audit log entry.

**Data fields (Medicine / MedicineBatch)** — see `03-data-model.md` for the full field list (spec §13).

**Business rules**
- Expiry blocking is enforced at the query layer (batches excluded from any "available for dispensing" query once Expired), not left to UI-only warnings.
- Disposal always requires a human approval step — the job flags and quarantines automatically, but never disposes automatically.

**Sample API**

| Method | Path | Purpose |
|---|---|---|
| GET | `/inventory/medicines` | Medicine list with stock/status |
| GET | `/inventory/expiring?within=90` | Batches nearing expiry |
| POST | `/inventory/batches/:id/quarantine` | (system-triggered, also manually callable) |
| POST | `/inventory/batches/:id/dispose` | Requires approval; writes audit log |

---

## Module 10 — Supply Chain & Procurement
*Satisfies: FR-SCM-01 to FR-SCM-07*

**Main flow**
1. System detects stock below reorder level → low-stock alert to Store Manager.
2. Store Manager raises a Purchase Requisition.
3. Requisition goes through an Approval workflow (role/threshold-based).
4. Procurement Officer issues a Purchase Order to a Supplier.
5. Supplier dispatches; Store Manager verifies quality/quantity/batch/expiry on arrival.
6. Store Manager records a Goods Receipt Note (GRN) — this creates new MedicineBatch rows and adds stock centrally.
7. Store Manager (or system) transfers stock from central store to hospital pharmacy.

**Data fields (PurchaseRequisition / PurchaseOrder / GoodsReceiptNote)**

| Field | Type | Required | Notes |
|---|---|---|---|
| Requisition ID | uuid | system | |
| Requested items | list (medicine, quantity) | yes | |
| Approval status | enum: Pending, Approved, Rejected | yes | |
| Purchase Order ID | uuid | system | Created after approval |
| Supplier | reference | yes | |
| GRN ID | uuid | system | |
| Verified quantity / batch / expiry | per line item | yes | Captured at receipt |

**Business rules**
- No Purchase Order without an Approval record referencing an Approved Requisition (FR-SCM-03).
- A GRN is the only path by which new stock enters the system (besides manual admin correction, which must itself be audit-logged) — this keeps the batch-traceability promise in spec §12 intact.

**Sample API**

| Method | Path | Purpose |
|---|---|---|
| POST | `/procurement/requisitions` | Raise requisition (manual or from low-stock alert) |
| POST | `/procurement/requisitions/:id/approve` | Approval workflow step |
| POST | `/procurement/orders` | Issue PO from an approved requisition |
| POST | `/procurement/grn` | Record goods receipt, create batches |
| POST | `/procurement/transfer` | Central store → pharmacy transfer |

---

## Module 11 — Billing & Benefit Ledger
*Satisfies: FR-BIL-01 to FR-BIL-03*

**Main flow**
1. On dispensing (Module 7), system writes a BillingTransaction per item: free / covered / paid, and amount if paid.
2. For paid items, system generates a printable receipt.

**Data fields (BillingTransaction)**

| Field | Type | Required | Notes |
|---|---|---|---|
| Transaction ID | uuid | system | |
| Prescription Item | reference | yes | |
| Outcome | enum: Free, Covered, Paid | yes | From BenefitRuleService |
| Amount | decimal | for Paid | Uses MedicineBatch issue price |
| Receipt reference | string | for Paid | |

**Business rules**
- v1 is a ledger + printed receipt — no online payment gateway (explicit scope boundary, see PRD §7).

---

## Module 12 — Admin Dashboard & Analytics
*Satisfies: FR-DSH-01 to FR-DSH-08*

Each widget is a read-only aggregate query over the modules above; no new write paths. Widget list is
the exact enumeration from spec §19 — see `06-requirements.md` FR-DSH group for the full list and
priority per widget.

---

## Module 13 — Security, RBAC & Audit
*Satisfies: FR-SEC-01 to FR-SEC-13*

**Cross-cutting, not a screen** — this module is enforced on every request via:
- An auth guard requiring a valid session (FR-SEC-02).
- A permission check per route, keyed to the acting user's role and resolved against the data-driven Role/Permission tables, not a hard-coded switch statement (FR-SEC-01, FR-SEC-04, FR-SEC-06).
- An audit interceptor that writes an AuditLog row for any request that mutates a critical entity: Employee, HospitalUID, Prescription, Admission, StockTransaction, FacilityEligibilityRule, BenefitRule, BrandingConfig, disposal actions (FR-SEC-03).

**AuditLog fields:** actor (user + role), action, entity type, entity ID, before/after snapshot (where
applicable), timestamp, IP/session reference. Append-only — no update or delete endpoint exists for this
table, by design (NFR-AUDIT-01).

**Application security hardening (FR-SEC-07 to FR-SEC-12):**
- **Input/output:** every mutating endpoint validates input server-side against a schema (e.g., `class-validator` DTOs); templates encode output by default — no raw HTML interpolation of user-supplied data (FR-SEC-07).
- **CSRF:** state-changing requests require a synchronizer/double-submit CSRF token in addition to the session cookie (FR-SEC-08).
- **Security headers:** every response sets `Strict-Transport-Security`, `Content-Security-Policy` (no `unsafe-inline`), `X-Content-Type-Options: nosniff`, and `X-Frame-Options: DENY` (FR-SEC-09).
- **Password policy:** minimum length/complexity enforced at signup and reset; new passwords are checked against a breached-password list (k-anonymity API); an account locks after a configurable count of consecutive failed logins (FR-SEC-10).
- **MFA:** Super Admin and Administrator accounts, and any account with facility-rule or benefit-rule edit permission, must enroll TOTP-based MFA before those permissions become active (FR-SEC-11).
- **Session hardening:** a configurable maximum of concurrent active sessions per user; changing a password immediately invalidates all other active sessions (FR-SEC-12).
- **Data Entry Operator scope:** the permission check above denies this role at the route level for any facility-rule, benefit-rule, prescription, billing, or audit-log endpoint — enforced the same way as every other role, not via UI hiding alone (FR-SEC-13).

**Sample API (security)**

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/login` | Password check, MFA challenge if enrolled, issues access + refresh token |
| POST | `/auth/mfa/enroll` | Begin TOTP enrollment for a privileged role |
| POST | `/auth/logout-all-sessions` | Invalidate all sessions for the current user |
| GET | `/security/role-permission-matrix` | Super Admin view of the full Role → Permission → Resource matrix |

---

## Module 14 — System Configuration & Branding (Super Admin)
*Satisfies: FR-CFG-01 to FR-CFG-03*

**Purpose:** give Super Admin a single backend-driven configuration surface for hospital-wide UI branding,
instead of requiring a code change/redeploy to update the logo, display name, or theme.

**Actors:** Super Admin only.

**Main flow**
1. Super Admin opens the System Configuration screen.
2. Super Admin uploads/replaces the hospital logo, edits the display name, color theme and footer text.
3. System validates the upload (image type/size), saves a new `BrandingConfig` row, and writes an audit log entry with the before/after values.
4. Every screen and printed template (UID card, receipt, discharge summary) reads branding from this single source, live — no separate deploy needed per surface.

**Data fields (BrandingConfig)** — see `03-data-model.md` for the full schema.

**Business rules**
- Only Super Admin may write `BrandingConfig`; Administrator and all other roles have read-only access, matching FR-CFG-02.
- If no `BrandingConfig` row exists yet, the system renders a default ESIC logo/name rather than a blank header (FR-CFG-03).
- Logo uploads are validated server-side (file type, size limit) before storage — never trust the client-supplied MIME type.

**Sample API**

| Method | Path | Purpose |
|---|---|---|
| GET | `/config/branding` | Fetch current branding config (any authenticated role) |
| PUT | `/config/branding` | Update branding config (Super Admin only, audit-logged) |
