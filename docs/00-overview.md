# ESIC Hospital Management System — Project Overview

Source spec: `ESIC_Hospital_Management_System_Complete_Workflow.docx` (Downloads folder).
This `docs/` folder turns that workflow spec into a buildable engineering plan — from *why we're
building it* down to *the exact prompt to hand an AI coding assistant for phase 3*.

---

## 1. What this system does

A digital workflow platform for an ESIC hospital serving Labour Department employees. Every capability
below is described the way a new team member should understand it — not just what it's called, but what
problem it solves and what happens if it's missing.

### 1.1 Identity: one UID for life
On their very first visit, an employee's official Employee ID is verified against the Labour Department,
and the system issues one **Hospital UID** — permanent, unique, printed on a card with a QR code. Every
subsequent visit, admission, prescription and stock transaction hangs off that one identifier. Without
this, every visit becomes a fresh paper trail with no link to the last one — which is the exact problem
the system replaces.

### 1.2 Repeat visits without repeat paperwork
A returning employee scans their QR (or reception types the UID) and the system instantly surfaces their
full profile: past visits, prescriptions, admissions, lab reports, and diagnoses. No re-registration,
no re-explaining who they are.

### 1.3 Out Service (OPD) — consultation without admission
The employee picks a department, gets a queue token, sees a doctor, and leaves with a digital
prescription. If medicine is needed, it routes straight to pharmacy — no paper slip to lose or forge.

### 1.4 In Service (IPD) — admission
When a doctor recommends admission, the system looks up the employee's **post and grade**, resolves
which ward/room category they're entitled to (via a configurable rule engine, not a hard-coded list),
checks real bed availability, and allocates a specific bed. Ward staff log daily care; discharge requires
a doctor's sign-off and automatically generates a discharge summary and frees the bed.

### 1.5 Contractual employee benefit rule
Contractual employees get **free consultation** but must **purchase medicine** — a rule that's easy to
apply inconsistently by hand and is exactly the kind of thing this system enforces automatically, every
time, for every dispense.

### 1.6 Pharmacy tied to real inventory
A signed prescription becomes a pharmacy queue item. Dispensing pulls from the batch closest to expiry
(FEFO — First Expire, First Out), applies the benefit rule (free/covered/paid), deducts stock, and writes
an append-only transaction record. Expired batches are structurally blocked from being dispensed — this
isn't a UI warning a busy pharmacist can miss, it's enforced where the query runs.

### 1.7 Medicine supply chain, fully batch-traceable
Low stock triggers an alert → a requisition → an approval → a purchase order → a supplier delivery → a
verified goods receipt note (GRN) → new stock in the central store → a transfer to pharmacy. Every step
is recorded, so any medicine on a shelf can be traced back to the PO and supplier that brought it in.

### 1.8 Full audit trail
Every critical action — a prescription signed, medicine dispensed, a bed allocated, a rule changed — is
written to an **append-only** audit log: who did it, what it was, and when. Nothing here is soft-deletable
or silently editable.

---

## 2. A day in the life (concrete walkthrough)

To make the above less abstract, here's what actually happens for two employees on one morning:

**Employee A — permanent, returning for a follow-up.** Reception scans their QR. Profile loads in under
5 seconds, showing last visit's prescription. Reception creates an OPD visit, selects Cardiology, gets
token `CARDIO-014`. Doctor calls the token, reviews the last diagnosis on screen, examines, updates the
diagnosis, and adds two prescription items with dose/frequency/duration. The system checks Employee A is
Permanent → medicine is Covered under the seeded benefit rule. Doctor signs. Pharmacist's queue picks it
up instantly; the system auto-selects the batch expiring soonest; pharmacist confirms; stock deducts;
Employee A leaves with medicine, no payment.

**Employee B — contractual, first visit, needs admission.** Reception enters Employee B's official
Employee ID. System verifies against the Labour Department, gets back Name/Department/Post/Grade/
Contractual, generates a new Hospital UID and QR, prints the card. Doctor examines, flags "admission
recommended." System resolves Employee B's post/grade to facility Category C (general ward). Admission
desk sees 2 available general beds, allocates one. Employee B is treated over three days; ward staff log
daily notes. Doctor approves discharge on day 3; system generates a discharge summary and frees the bed
immediately for the next patient. Any medicine dispensed to Employee B during the stay was marked Paid
(contractual rule) and billed via the counter receipt flow.

---

## 3. Documents in this folder

| File | Contents | Read this if you're... |
|---|---|---|
| `00-overview.md` (this file) | What the system is, in plain language | Anyone, first read |
| `05-prd.md` | Why we're building it, personas, success metrics, scope, risks | Product owner, stakeholders |
| `06-requirements.md` | Every requirement, numbered and traceable, with priority | QA, developers checking coverage |
| `07-functional-spec.md` | Exactly how each module behaves — screens, fields, rules, API | Developers building a module |
| `01-architecture.md` | System structure, component responsibilities, workflow diagrams | Engineers, architects |
| `02-tech-stack.md` | Technology choices, versions, rationale, alternatives considered | Engineers, tech leads |
| `03-data-model.md` | Full entity schemas, relationships, constraints | Engineers, DBAs |
| `04-phases-and-prompts.md` | Build order, acceptance criteria, ready-to-paste AI prompts | Whoever is building it |

See `README.md` for the recommended reading order.

---

## 4. User roles at a glance

There are **10 roles** in v1, each scoped to the minimum access it needs (least privilege, NFR-USE-01 /
FR-SEC-04). Roles are **data-driven** (rows in the `Role`/`Permission` tables, see `03-data-model.md` §1),
not hard-coded — Super Admin can compose an additional narrow role later (e.g., "Billing Clerk") without a
code deployment.

| Role | Primary responsibility | Detailed in |
|---|---|---|
| Reception / Registration Desk | Employee verification, UID generation, visit registration, token creation | `07-functional-spec.md` Module 1–3 |
| Doctor | Consultation, diagnosis, prescription, tests, admission recommendation, discharge approval | Module 4 |
| Admission Desk | Admission creation, eligibility validation, ward/room/bed allocation | Module 6 |
| Nurse / Ward Staff | Daily care, observations, treatment administration, inpatient updates | Module 6 |
| Pharmacist | Prescription validation, eligibility check, dispensing, inventory deduction | Module 7 |
| Store Manager | Central stock, batch control, expiry monitoring, pharmacy distribution | Module 9, 10 |
| Procurement Officer | Requisitions, approvals, purchase orders, supplier coordination | Module 10 |
| Data Entry Operator | Restricted, non-clinical CRUD on demographic/master data only (e.g., correcting a name or contact number) — no access to facility/benefit rules, financial config, or audit views | Module 1, 2 |
| Administrator | Master data, facility rules, benefit rules, reports, monitoring | Module 5, 8, 12 |
| Super Admin | **Full system control** — everything Administrator can do, plus RBAC/permission-matrix management, integrations, audit oversight, and the backend-driven UI/branding configuration (facility logo, display name, color theme — see Module 14) | Module 13, 14 |

**Administrator vs. Data Entry Operator:** these are deliberately separate roles, not one role with a
toggle. Administrator can edit facility eligibility and benefit rules (money- and policy-impacting
changes); Data Entry Operator exists so hospital staff can fix routine demographic data entry errors
without being handed that authority.

---

## 5. Glossary

| Term | Meaning |
|---|---|
| **UID** | Hospital UID — the permanent unique patient identifier issued once per employee, never reissued |
| **OPD** | Out Service / Out-Patient Department — consultation without admission |
| **IPD** | In Service / In-Patient Department — admission |
| **FEFO** | First Expire, First Out — the batch-selection rule for dispensing; the batch closest to expiry goes out first |
| **GRN** | Goods Receipt Note — the record created when the hospital physically receives and verifies a supplier delivery |
| **RBAC** | Role-Based Access Control — permissions are granted by role, not per individual user |
| **PO** | Purchase Order — the formal order sent to a supplier after a requisition is approved |
| **Facility eligibility** | The rule set mapping an employee's post/grade to which ward/room category they're entitled to on admission |
| **Benefit rule** | The rule set determining whether a medicine is free, covered, or paid, based on employment type |
| **Permanent employee** | Employment type entitled to configured medicine coverage |
| **Contractual employee** | Employment type entitled to free consultation but must purchase medicine |
| **Append-only** | A table design where rows are only ever inserted, never updated or deleted — used for audit logs and stock transactions so history can't be silently altered |
| **Branding config** | The Super-Admin-only, audit-logged settings controlling hospital display name, logo, color theme and footer text shown across the UI and printed documents |
| **Data Entry Operator** | A role scoped to demographic/master-data corrections only — no facility rule, benefit rule, or financial-config access |

---

## 6. Non-negotiable business rules (spec §17)

Each rule below includes *why* it's non-negotiable, not just the rule itself — this is what "detailed"
means in a spec that will outlive the person who wrote it.

- **One employee = one persistent Hospital UID**, linked to the official Employee ID.
  *Why:* the entire value of the system — instant repeat-visit lookup, longitudinal history — depends on
  this identifier never fragmenting or duplicating.
- **Repeat visits use UID/QR to retrieve the existing profile** — never re-register.
  *Why:* re-registration would silently create duplicate records and break the "one employee, one
  history" guarantee above.
- **Post/designation and grade determine admitted-facility eligibility**, via a **configurable rule
  engine**, not hard-coded logic.
  *Why:* this policy is set by ESIC/Labour Department and will change over time; hard-coding it means
  every policy change requires a code deployment.
- **Facility allocation depends on both eligibility *and* real-time availability.**
  *Why:* being entitled to a private room doesn't create one out of thin air — the system must never
  promise a bed it can't actually allocate.
- **Contractual employees: free consultation, medicines purchased — not free.**
  *Why:* this is the specific benefit-policy distinction the source spec calls out as easy to get wrong
  without system enforcement.
- **Permanent employees: medicine benefit follows configured coverage rules.**
  *Why:* "covered" isn't a single fixed answer — it's policy-driven and must stay editable (see
  `07-functional-spec.md` Module 8).
- **Only authorized doctors finalize prescriptions or recommend admission.**
  *Why:* clinical authority must be enforced by the system, not just by office convention.
- **Only authorized pharmacy staff dispense medicines.**
  *Why:* same reasoning — dispensing is a controlled action tied to a specific role.
- **Only Super Admin can change system-wide UI configuration and branding (including the hospital
  logo), and every change is audit-logged.**
  *Why:* branding/UI configuration is presented hospital-wide and in print templates (UID cards, receipts,
  discharge summaries) — an uncontrolled or unaudited change is both a governance and a trust problem.
- **Data Entry Operator is a distinct, narrower role from Administrator — it cannot touch facility
  eligibility rules, benefit rules, or financial configuration.**
  *Why:* letting routine data-entry staff correct a phone number shouldn't require granting them authority
  over admission-eligibility or billing policy (least privilege, FR-SEC-04).
- **Every medicine issue creates an inventory transaction.**
  *Why:* without this, stock counts silently drift from reality and the audit trail has gaps.
- **FEFO governs batch selection.**
  *Why:* prevents medicine expiring on the shelf while a newer batch is dispensed first.
- **Expired medicines are automatically blocked from dispensing.**
  *Why:* a hard patient-safety rule — it must be structurally enforced, not left to staff vigilance.
- **All critical actions are auditable.**
  *Why:* the hospital must be able to answer "who did what, when" for any compliance or incident review.

---

## 7. How to use this documentation

- **New to the project?** Read this file, then `05-prd.md`.
- **About to design or review the schema?** Read `03-data-model.md` alongside `07-functional-spec.md` —
  the spec explains *why* a field/constraint exists; the data model gives you the exact shape.
- **About to build a phase?** Go straight to `04-phases-and-prompts.md`, find your phase, and use the
  acceptance criteria plus the ready-to-paste prompt.
- **Explaining the system to a non-technical stakeholder?** Use the two published artifacts (see
  `README.md`) — they carry the same content with diagrams and are easier to present than raw markdown.
