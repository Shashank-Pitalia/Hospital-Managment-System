# Software Requirements Specification (SRS)

| | |
|---|---|
| **Product** | ESIC Hospital Management System (HMS) |
| **Companion docs** | `05-prd.md` (why/what for the business), `07-functional-spec.md` (how each module behaves in detail) |
| **Status** | Draft — for stakeholder review |
| **Version** | 1.0 |

Priority key: **Must** = required for v1 go-live · **Should** = strongly expected in v1, can slip one phase ·
**Could** = valuable, acceptable to defer past v1 (MoSCoW method).

---

## 1. Glossary

| Term | Meaning |
|---|---|
| UID | Hospital UID — the permanent unique patient identifier issued once per employee |
| OPD | Out Service / Out-Patient Department — consultation without admission |
| IPD | In Service / In-Patient Department — admission |
| FEFO | First Expire, First Out — batch selection rule for dispensing |
| GRN | Goods Receipt Note — record created when hospital receives a supplier delivery |
| RBAC | Role-Based Access Control |
| PO | Purchase Order |
| Permanent employee | Employment type entitled to configured medicine coverage |
| Contractual employee | Employment type entitled to free consultation but must purchase medicine |

## 2. Overall description

### 2.1 Product perspective
HMS is a new, standalone system for one ESIC hospital. It integrates with one external system in v1: the
Labour Department employee database/API (for identity verification). All other data — patients, visits,
prescriptions, inventory, procurement — is owned and stored by HMS itself.

### 2.2 User classes
The nine roles defined in the PRD persona table, each with a distinct permission set (see FR-SEC group
below and the RBAC matrix produced in build Phase 15).

### 2.3 Operating environment
Web application, desktop/laptop browsers at reception, OPD rooms, admission desk, wards, pharmacy and
admin office. Server-side deployed at the hospital data center or a government-approved cloud (see
`02-tech-stack.md`).

### 2.4 Design & implementation constraints
- Facility eligibility and benefit coverage must be **data-driven** (configurable rules), never hard-coded conditionals — this is a direct requirement from the source spec (§9, §17), not just a design preference.
- Every inventory deduction and every audit-relevant action must be **append-only** logged.
- Expired medicine batches must be **structurally unable** to be dispensed (blocked at the query/service layer, not just flagged in the UI).

---

## 3. Functional requirements

### 3.1 Employee & UID management (FR-EMP)

| ID | Requirement | Priority |
|---|---|---|
| FR-EMP-01 | The system shall accept an Employee ID and verify it against the Labour Department employee source. | Must |
| FR-EMP-02 | If verification fails, the system shall route the case to manual verification/escalation rather than silently rejecting it. | Must |
| FR-EMP-03 | On successful first-time verification, the system shall generate one permanent Hospital UID linked one-to-one with the Employee ID. | Must |
| FR-EMP-04 | The system shall generate a scannable QR code encoding the Hospital UID and support printing a UID card. | Must |
| FR-EMP-05 | The system shall capture and store: Name, Employee ID, Department, Post/Designation, Grade/Pay Level, Employment Type (Permanent/Contractual), contact details, eligibility category, registration date. | Must |
| FR-EMP-06 | The system shall prevent creation of a second Hospital UID for an Employee ID that already has one. | Must |
| FR-EMP-07 | The system shall support looking up an employee by UID or by QR scan and return the linked profile in under 5 seconds under normal load. | Should |

### 3.2 Patient profile & visit management (FR-PAT)

| ID | Requirement | Priority |
|---|---|---|
| FR-PAT-01 | On UID/QR lookup, the system shall display prior visits, prescriptions, admissions, reports and medical history for that employee. | Must |
| FR-PAT-02 | The system shall let staff create a new Visit from a looked-up profile without re-entering employee data. | Must |
| FR-PAT-03 | Each Visit shall be classified as Out Service (OPD) or In Service (IPD) at creation. | Must |
| FR-PAT-04 | The system shall maintain a longitudinal medical history spanning all of an employee's visits. | Must |

### 3.3 OPD / Out Service (FR-OPD)

| ID | Requirement | Priority |
|---|---|---|
| FR-OPD-01 | The system shall let reception select a department/specialty when creating an OPD visit. | Must |
| FR-OPD-02 | The system shall generate a queue token per department per day. | Must |
| FR-OPD-03 | The system shall provide a queue display so doctors/reception can call the next token. | Should |
| FR-OPD-04 | The system shall allow a doctor to record examination, diagnosis, prescription, lab test orders and a follow-up flag against an OPD visit. | Must |
| FR-OPD-05 | The system shall determine medicine benefit (free/covered/paid) from the employee's Employment Type before dispensing. | Must |
| FR-OPD-06 | The system shall mark an OPD visit closed once dispensing (or the "no medicine needed" case) is complete. | Should |

### 3.4 Doctor & digital prescription (FR-DOC)

| ID | Requirement | Priority |
|---|---|---|
| FR-DOC-01 | The system shall show the assigned doctor a queue of active visits (OPD tokens and ward rounds). | Must |
| FR-DOC-02 | The system shall show medical history for the selected patient before/during consultation. | Must |
| FR-DOC-03 | The system shall let a doctor record symptoms, examination findings and diagnosis. | Must |
| FR-DOC-04 | The system shall let a doctor add one or more prescription items, each with medicine, dose, frequency and duration. | Must |
| FR-DOC-05 | The system shall let a doctor flag admission as recommended, generating an admission request. | Must |
| FR-DOC-06 | The system shall require a doctor to sign/submit a prescription before it becomes visible to pharmacy. | Must |
| FR-DOC-07 | Only users with the Doctor role shall be able to finalize a prescription or recommend admission. | Must |

### 3.5 Facility eligibility (FR-FAC)

| ID | Requirement | Priority |
|---|---|---|
| FR-FAC-01 | The system shall store a configurable mapping from Post/Grade to a facility Category (e.g., A/B/C/D/Contractual). | Must |
| FR-FAC-02 | The system shall resolve an employee's eligible ward/room category from their Post/Grade at the time of admission request. | Must |
| FR-FAC-03 | The system shall let an Administrator view and edit facility eligibility rules without requiring a code deployment. | Must |
| FR-FAC-04 | The system shall record which rule (and rule version) was used for each admission's eligibility decision. | Should |

### 3.6 IPD / admission (FR-ADM)

| ID | Requirement | Priority |
|---|---|---|
| FR-ADM-01 | The system shall create an Admission request when a doctor recommends admission. | Must |
| FR-ADM-02 | The system shall evaluate facility eligibility and present eligible ward/room/bed options filtered by real-time availability. | Must |
| FR-ADM-03 | The system shall allocate exactly one bed to one active admission at a time (no double allocation), enforced transactionally. | Must |
| FR-ADM-04 | The system shall let ward staff record daily observations and treatment against an active admission. | Must |
| FR-ADM-05 | The system shall require a doctor's discharge approval before an admission can be closed. | Must |
| FR-ADM-06 | On discharge, the system shall generate a discharge summary and free the allocated bed. | Must |
| FR-ADM-07 | The system shall update the employee's longitudinal medical history on discharge. | Should |

### 3.7 Pharmacy & dispensing (FR-PHM)

| ID | Requirement | Priority |
|---|---|---|
| FR-PHM-01 | The system shall present pharmacists a queue of signed, undispensed prescriptions. | Must |
| FR-PHM-02 | The system shall verify patient identity and employment-type medicine eligibility before allowing dispensing. | Must |
| FR-PHM-03 | The system shall select the batch with the earliest usable expiry date first (FEFO) for each dispensed item. | Must |
| FR-PHM-04 | If the preferred batch has insufficient stock, the system shall support an alternative batch or partial issue, and raise a procurement alert on shortfall. | Should |
| FR-PHM-05 | The system shall apply the free/covered/paid rule per item at the point of dispensing. | Must |
| FR-PHM-06 | Every dispensing action shall deduct inventory and write an append-only stock transaction record. | Must |
| FR-PHM-07 | The system shall prevent dispensing of any batch past its expiry date. | Must |
| FR-PHM-08 | Only users with the Pharmacist role shall be able to dispense medicine. | Must |

### 3.8 Inventory & medicine master (FR-INV)

| ID | Requirement | Priority |
|---|---|---|
| FR-INV-01 | The system shall maintain a Medicine master record (generic name, brand name, category, strength, dosage form). | Must |
| FR-INV-02 | The system shall track stock at the batch level (batch number, manufacturer, supplier, manufacturing date, expiry date, purchase price, issue price, current stock, minimum stock level, reorder level, storage location, stock status). | Must |
| FR-INV-03 | The system shall run a scheduled daily scan of batch expiry dates. | Must |
| FR-INV-04 | The system shall flag batches expiring within 90 days as Early Warning and within 30 days as Critical Alert. | Must |
| FR-INV-05 | The system shall automatically move expired batches to Quarantined status and block them from dispensing. | Must |
| FR-INV-06 | The system shall require an approval step before quarantined stock can be recorded as disposed, with an audit trail entry. | Must |

### 3.9 Supply chain & procurement (FR-SCM)

| ID | Requirement | Priority |
|---|---|---|
| FR-SCM-01 | The system shall generate a low-stock alert when current stock falls below the medicine's reorder level. | Must |
| FR-SCM-02 | The system shall let a Store Manager raise a Purchase Requisition from a low-stock alert. | Must |
| FR-SCM-03 | The system shall require an approval workflow before a Purchase Requisition becomes a Purchase Order. | Must |
| FR-SCM-04 | The system shall let a Procurement Officer issue a Purchase Order to a Supplier. | Must |
| FR-SCM-05 | The system shall let a Store Manager record a Goods Receipt Note capturing quality/quantity/batch/expiry verification on delivery. | Must |
| FR-SCM-06 | A confirmed GRN shall create new Medicine Batch records and add stock to the central store. | Must |
| FR-SCM-07 | The system shall support transferring stock from the central store to hospital pharmacy. | Must |

### 3.10 Billing & benefit (FR-BIL)

| ID | Requirement | Priority |
|---|---|---|
| FR-BIL-01 | The system shall record, per dispensed prescription item, whether it was free, covered or paid, and the amount charged for paid items. | Must |
| FR-BIL-02 | The system shall generate a printable receipt for contractual employees purchasing medicine. | Should |
| FR-BIL-03 | The system shall NOT require a payment gateway integration in v1 (counter/cash payment assumed). | Must (as a scope boundary) |

### 3.11 Admin dashboard & analytics (FR-DSH)

| ID | Requirement | Priority |
|---|---|---|
| FR-DSH-01 | The system shall show daily OPD visits and current waiting queue. | Must |
| FR-DSH-02 | The system shall show current admissions and bed occupancy. | Must |
| FR-DSH-03 | The system shall show admissions broken down by employee category/post. | Should |
| FR-DSH-04 | The system shall show low-stock, out-of-stock, and expiring (90/30-day) medicines. | Must |
| FR-DSH-05 | The system shall show expired/quarantined stock. | Must |
| FR-DSH-06 | The system shall show pending purchase requisitions/approvals and open purchase orders with delayed suppliers. | Should |
| FR-DSH-07 | The system shall show medicine consumption by department and period. | Should |
| FR-DSH-08 | The system shall show permanent-vs-contractual utilization and prescription/dispensing audit exceptions. | Could |

### 3.12 Security, RBAC & audit (FR-SEC)

| ID | Requirement | Priority |
|---|---|---|
| FR-SEC-01 | The system shall enforce role-based access control across all 9 defined roles. | Must |
| FR-SEC-02 | The system shall require authentication for every user session; no anonymous access to patient data. | Must |
| FR-SEC-03 | The system shall write an immutable audit log entry (actor, action, entity, timestamp) for every critical action: registration, prescription, dispensing, admission, discharge, rule changes, disposal approvals. | Must |
| FR-SEC-04 | The system shall restrict medical record detail to roles that need it for their function (least privilege). | Must |
| FR-SEC-05 | The system shall enforce session timeout on inactivity. | Should |

---

## 4. Non-functional requirements

| Category | ID | Requirement |
|---|---|---|
| Performance | NFR-PERF-01 | UID/QR lookup shall return a patient profile in under 5 seconds under normal load (proposed target, see PRD §4). |
| Performance | NFR-PERF-02 | Queue token generation shall not create duplicate tokens under concurrent reception requests. |
| Scalability | NFR-SCALE-01 | The system shall support the concurrent user load of one hospital's reception, OPD, wards, pharmacy and admin staff simultaneously (size to be confirmed with the hospital's staffing numbers). |
| Availability | NFR-AVAIL-01 | Core clinical flows (registration, OPD, prescription, dispensing) shall degrade gracefully, not fail hard, during partial outages (e.g., Labour Dept API unreachable falls back to manual verification per FR-EMP-02). |
| Reliability | NFR-REL-01 | Inventory deductions and bed allocations shall be atomic — no partial writes that leave stock or bed state inconsistent. |
| Security | NFR-SEC-01 | All data in transit shall be encrypted (TLS). |
| Security | NFR-SEC-02 | All medical records at rest shall be stored with encryption appropriate to the hosting environment's data-protection requirements. |
| Security | NFR-SEC-03 | Passwords/credentials shall never be stored in plaintext; use industry-standard hashing. |
| Auditability | NFR-AUDIT-01 | Audit log records shall be append-only — no update or delete path shall exist for them. |
| Usability | NFR-USE-01 | Each role's primary screen shall expose only the actions relevant to that role — no cross-role UI clutter. |
| Usability | NFR-USE-02 | Registration and dispensing — the two highest-frequency transactions — shall be optimized for minimum clicks/keystrokes. |
| Maintainability | NFR-MAINT-01 | Facility eligibility and benefit coverage rules shall be editable by an Administrator without a code change or redeploy. |
| Data retention | NFR-DATA-01 | Medical history, prescriptions, and stock transactions shall be retained indefinitely (or per applicable government records-retention policy, once confirmed). |
| Backup/recovery | NFR-DATA-02 | The system shall support scheduled database backups and a documented recovery procedure. |
| Compliance | NFR-COMP-01 | The system shall support the audit and access-control obligations described in spec §20 (RBAC, encrypted comms, restricted medical-record access, audit logs, backup/recovery, session controls, least privilege). |

---

## 5. External interface requirements

| Interface | Direction | Purpose | Requirement source |
|---|---|---|---|
| Labour Department Employee API/DB | Inbound (HMS calls out) | Verify Employee ID, fetch post/grade/employment type | Spec §4 |
| Supplier systems | Outbound (PO issued) / Inbound (dispatch confirmation, manual in v1) | Procurement | Spec §12 |
| SMS/Email/Print service | Outbound | UID card, token, discharge summary, receipts | Spec §4, §8, §13 |
| QR/barcode scanner | Inbound (hardware) | UID lookup at point of service | Spec §5 |

---

## 6. Requirements traceability (summary)

Every FR group above maps to one spec section and one build phase for full traceability:

| FR group | Spec section | Build phase |
|---|---|---|
| FR-EMP | §4 | Phase 2 |
| FR-PAT | §5 | Phase 3 |
| FR-OPD | §6 | Phase 4 |
| FR-DOC | §10 | Phase 5 |
| (benefit rule, see FR-OPD-05/FR-PHM-05) | §7 | Phase 6 |
| FR-FAC | §9 | Phase 7 |
| FR-ADM | §8 | Phase 8 |
| FR-PHM | §11 | Phase 9 |
| FR-INV | §13 | Phase 10 |
| (expiry/FEFO automation) | §14 | Phase 11 |
| FR-SCM | §12 | Phase 12 |
| FR-BIL | — (derived from §7 benefit rule) | Phase 13 |
| FR-DSH | §19 | Phase 14 |
| FR-SEC | §20 | Phase 15 |
