# ParkPilot — Smart Vehicle, Visitor & Parking Management (Extended)

This build extends the existing ParkPilot prototype (HTML + CSS + vanilla JS,
localStorage-backed) to cover the four MIT‑WPU report workflows: **University
Vehicle Registration, Visitor Self‑Service, Guard Verification & Reporting,
and the Centralized Administrative Dashboard.** No framework was introduced;
no existing feature was rebuilt from scratch.

---

## A. Files created

| File | Purpose |
|---|---|
| `js/auth.js` | Central Auth module (login/logout/current user/role/session/protected pages/role check), sessionStorage-backed. |
| `js/incidents.js` | Shared render helpers for the incident list + detail card (used by Guard Portal and Admin). |
| `js/audit.js` | Shared render helpers for the audit log table + filters. |
| `js/notifications.js` | Shared notification list rendering + unread-count helper. |
| `js/student.js` | Logic for the new student/faculty/staff self‑service status page. |
| `js/visitor.js` | Logic for the new visitor self‑registration + digital pass page. |
| `student.html` | "My Registration" — look up status by Registration ID/vehicle number, view the digital pass, submit update requests. |
| `visitor.html` | Mobile‑first visitor self‑registration form → digital visitor pass. |

## B. Files modified

| File | What changed |
|---|---|
| `js/store.js` | Extended with the full data model (registration/sticker/verification/visitor/incident/audit/notification/update‑request entities), sequential ID generators, vehicle lifecycle transitions, RBAC permission table, guard-safe plate lookup. Every original function/seed is still present and untouched. |
| `js/ui.js` | Added `statusBadge`, `emptyState`, `kvGrid/kvTile`, `verificationPassCardHtml`, `confirmDialog`, `demoScanLabelHtml`; nav and `requireRole` made role‑aware (student/visitor/guard/admin/IT admin) and delegate to `Auth` when present. |
| `css/styles.css` | Additive only — new components (digital pass card, checklist, timeline, kv‑grid, sub‑tabs, filter bar) built from the existing color/spacing tokens. Nothing removed. |
| `register.html` / `js/register.js` | Added Category field; registration now generates a Registration ID, starts at *Pending Verification*, and shows the new Temporary Digital Verification Pass with a link to the status page. |
| `staff.html` / `js/staff.js` | Guard Portal rebuilt around: Scan Vehicle (plate lookup, now privacy‑restricted), Verify Vehicle (checklist → sticker issuance), Scan Visitor Pass (validate → Confirm Entry), Visitor Exit, Recent Scans, Incidents (replaces Parking Violations), Notifications. |
| `admin.html` / `js/admin.js` | Dashboard reorganized into Overview (existing charts/CSV export kept, new stat cards added), Vehicle Management (search/filter/detail/lifecycle actions), Visitor Registry, Incident Management, Audit Logs, User & Role Management. |
| `staff-login.html` / `admin-login.html` | Now call `Auth.login()` instead of writing sessionStorage directly. |
| `index.html` | Added `js/auth.js`; nav now also links to Visitor and My Status. |

## C. Features implemented (by report part)

1. Registration ID generation, Pending Verification start state, digital verification pass, status page — **Part 1**
2. Guard physical verification checklist, verify/reject, referral on failure — **Part 2**
3. Sticker records with statuses, issuance flow, verification event logging — **Part 3**
4. Improved plate lookup result states; phone/email removed from guard view — **Part 4**
5–6. Visitor self‑registration, Visitor ID, digital pass with expiring token — **Parts 5–6**
7–9. Guard visitor‑pass scan/validate, entry confirmation (single‑use pass), exit recording — **Parts 7–9**
10. Guard Portal navigation covering all required functions — **Part 10**
11. Vehicle & Security Incidents (issue categories, statuses, admin alert) — **Part 11**
12. Unregistered vehicle workflow (Record Warning / Report to Office) — **Part 12**
13–18. Admin dashboard sections: Overview, Vehicle Management, Visitor Registry, Incident Management, Audit Logs — **Parts 13–18**
19. Centralized RBAC permission table (`Store.can` / `Auth.can`) and role‑aware navigation — **Part 19**
20. Central Auth module — **Part 20**
21. Functional notifications for admin/guard/student — **Part 21**
22. Extended `store.js` data model with consistent ID relationships — **Part 22**
23. Reused existing glass/badge/tab/modal components for all new UI — **Part 23**
24–25. Privacy restrictions, confirmations before suspend/revoke, Demo Scan labeling, manual entry always available — **Parts 24–25**

## D. Existing features preserved

- Landing page stats/hero, existing registration form fields and file inputs
- Existing plate scan simulation UI (webcam/upload), now explicitly labeled "Demo Scan"
- Existing Chart.js overview charts and CSV export on the admin dashboard
- Existing glass-card/badge/tab/modal design system and all CSS tokens
- `Store.getViolations()` / `Store.addViolation()` and the original violation seed data are still defined in `store.js` (unused by the UI now that Part 11 explicitly expands this feature into Incident Management, but not deleted)
- All original navigation entry points (Register, Staff Login, Admin Login)

## E. Limitations of a frontend‑only architecture

- **No real backend / database** — everything lives in `localStorage`/`sessionStorage` in one browser; nothing syncs across devices, and clearing browser storage clears all data. `store.js` is written as a set of plain functions specifically so each one can be swapped for a `fetch()` call later without touching any page.
- **No real authentication** — `staff-login.html`/`admin-login.html` accept any name; there's no password check or backend session. A real deployment would replace `js/auth.js`'s internals with real API calls behind the same function names.
- **No student account system** — rather than inventing a full login for every student, "My Registration" is a status lookup by Registration ID/vehicle number, matching the file plan (`student.html`) without over‑building an auth system the report didn't specify.
- **No real ANPR / QR camera** — plate and visitor-pass "scans" are simulated (`Demo Scan` label shown wherever this happens); Manual Entry is always available and is the authoritative path.
- **No file storage** — ID card/RC "uploads" store only the filename, as in the original prototype.
- **Single-guard / single-gate simulation** — gate is hardcoded to "Main Gate"; a real system would let the guard pick a gate.
- **FLAGGED lookup result** — the constant exists in `Store.LOOKUP_RESULT` for forward compatibility, but no workflow currently sets it, since the report's Part 12 only specifies Record Warning / Report to Office for unregistered vehicles.

## F. How to test end‑to‑end

Open `index.html` in a browser (no build step needed).

1. **University vehicle (TEST 1 & 2):** Register a vehicle → note the Registration ID and Pending Verification status → log in as guard (`staff-login.html`, any name) → *Verify Vehicle* tab → look up by Registration ID → check all 5 boxes → *Verify Vehicle* → issue the sticker in the popup → vehicle is now Active. Try again with an unchecked box combination and *Reject/Refer* to see it stay Pending.
2. **Visitor (TEST 3 & 4):** Open `visitor.html` → fill the form → *Register Visitor* → note the Visitor ID/pass. As guard → *Scan Visitor Pass* tab → enter the Visitor ID → *Confirm Entry*. Then *Visitor Exit* tab → find the same visitor → *Record Exit*.
3. **Vehicle lookup (TEST 5):** As guard, *Scan Vehicle* tab, manually search `TN09EF3456` (Suspended), `WB20IJ2345` (Revoked), `MH12AB1234` (Active), and any made‑up plate (Unregistered).
4. **Incident (TEST 6):** As guard, *Incidents* tab → *Report Incident* → submit. Log in as admin (`admin-login.html`) → *Incident Management* → open it → *Add Action* → *Mark Resolved* → *Close Incident*.
5. **Privacy (TEST 7):** Compare the guard's *Scan Vehicle* result (no phone/email) against the admin's Vehicle Management detail view (shows contact info).
6. **Audit (TEST 8):** After the steps above, open Admin → *Audit Logs* and confirm entries for verification, sticker issuance, incident creation/resolution, visitor entry/exit.
