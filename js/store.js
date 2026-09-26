/* ==========================================================================
   ParkPilot — store.js
   Simulates the "central database" shared by every module using
   localStorage (so Registration, Visitor, Guard and Admin all read/write
   the same data even across browser tabs). In a real deployment this file
   would be replaced by calls to a REST API backed by MySQL — every method
   below is written as a self-contained function with a plain-object
   in/out shape specifically so that swap can happen without touching any
   page's HTML/JS. Roles/permissions/statuses/ID formats are centralized
   here (or in auth.js for role checks) rather than scattered per page.
   ========================================================================== */

/* ---------- Reference data (existing) ---------- */
const DEPARTMENTS = ["Computer Science", "Mechanical Engg.", "Electronics", "Civil Engg.", "Business Admin", "Design"];
const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
const VEHICLE_TYPES = ["Bike", "Scooter", "Car"];
const VIOLATION_REASONS = ["Wrong Parking", "Blocking Road", "Emergency", "Unauthorized Parking", "Vehicle Damage"];
const COLORS_LIST = ["Black", "White", "Red", "Blue", "Silver", "Grey"];

/* ---------- Reference data (new, report-driven) ---------- */
const CATEGORY_LIST = ["Student", "Faculty", "Staff"];
const ISSUE_TYPES = ["Improper Parking", "Blocking Access / Traffic", "Restricted Area", "Suspected Unauthorized Vehicle", "Visitor-Related Issue", "Other Security Concern"];
const REQUEST_TYPES = ["Update Vehicle Details", "Update Contact Information", "Replace Vehicle", "Report Sticker Issue"];
const UNREGISTERED_ACTIONS = ["Record Warning", "Report to Office"];

const VEHICLE_STATUS = { PENDING: "Pending Verification", VERIFIED: "Verified / Sticker Issued", ACTIVE: "Active", SUSPENDED: "Suspended", REVOKED: "Revoked" };
const VERIFICATION_STATUS = { NOT_VERIFIED: "Not Verified", VERIFIED: "Verified", REJECTED: "Rejected" };
const STICKER_STATUS = { ACTIVE: "Active", LOST: "Lost", DAMAGED: "Damaged", REPLACED: "Replaced", REVOKED: "Revoked" };
const VISITOR_STATUS = { EXPECTED: "Currently Expected", ON_CAMPUS: "Currently on Campus", EXITED: "Exited" };
const PASS_STATUS = { VALID: "VALID", EXPIRED: "EXPIRED", USED: "USED", INVALID: "INVALID" };
const INCIDENT_STATUS = { NEW: "New", IN_PROGRESS: "In Progress", RESOLVED: "Resolved", CLOSED: "Closed" };
const REQUEST_STATUS = { PENDING: "Pending", APPROVED: "Approved", REJECTED: "Rejected" };
const LOOKUP_RESULT = { STUDENT: "REGISTERED - STUDENT", FACULTY: "REGISTERED - FACULTY/STAFF", VISITOR: "REGISTERED - VISITOR", UNREGISTERED: "UNREGISTERED", FLAGGED: "FLAGGED", SUSPENDED: "SUSPENDED", REVOKED: "REVOKED", ACTIVE: "ACTIVE" };

/* Centralized RBAC permission matrix (report Part 19). Frontend-only for
   this prototype, but every page checks Store.can()/Auth.can() instead of
   hard-coding role checks, so this table is the one place to change when a
   real backend takes over authorization. */
const PERMISSIONS = {
  student: ["view_own_vehicle", "view_own_pass", "request_update"],
  visitor: ["view_own_pass"],
  staff: ["lookup_vehicle", "verify_vehicle", "issue_sticker", "scan_visitor_pass", "record_visitor_entry", "record_visitor_exit", "report_incident", "report_unregistered"],
  admin: ["manage_vehicles", "suspend_vehicle", "revoke_vehicle", "manage_visitors", "manage_incidents", "resolve_update_request", "view_audit_logs"],
  itadmin: ["manage_users", "manage_roles", "technical_config", "view_audit_logs"],
};

const KEYS = {
  vehicles: "parkpilot:vehicles",
  violations: "parkpilot:violations",   // legacy, preserved untouched — see js/incidents.js
  scans: "parkpilot:scans",
  counters: "parkpilot:counters",
  vehicleVerifications: "parkpilot:vehicleVerifications",
  stickers: "parkpilot:stickers",
  visitorRecords: "parkpilot:visitorRecords",
  visitorPasses: "parkpilot:visitorPasses",
  entryExitLogs: "parkpilot:entryExitLogs",
  incidents: "parkpilot:incidents",
  notifications: "parkpilot:notifications",
  auditLogs: "parkpilot:auditLogs",
  updateRequests: "parkpilot:updateRequests",
  unregisteredReports: "parkpilot:unregisteredReports",
};

/* ---------- Seed data ---------- */
const seedVehicles = [
  { id: "v1", registrationId: "PP-2026-000101", category: "Student", studentName: "Arjun Mehta", studentId: "CS21B045", department: "Computer Science", year: "3rd Year", className: "CSE-B", mobile: "9876543210", altMobile: "9123456780", email: "arjun.mehta@campus.edu", vehicleNumber: "MH12AB1234", vehicleType: "Bike", brand: "Honda", model: "Shine", color: "Black", idCardFile: "arjun_id.jpg", rcFile: "arjun_rc.pdf", registeredAt: "2026-07-12T09:20:00Z", lastUpdated: "2026-07-13T10:00:00Z", parkingStatus: "Parked - Block A", status: "Active", verificationStatus: "Verified", stickerId: "MITWPU-ST-000101" },
  { id: "v2", registrationId: "PP-2026-000102", category: "Student", studentName: "Priya Nair", studentId: "EC22B091", department: "Electronics", year: "2nd Year", className: "ECE-A", mobile: "9988776655", altMobile: "", email: "priya.nair@campus.edu", vehicleNumber: "KA05CD5678", vehicleType: "Scooter", brand: "TVS", model: "Jupiter", color: "White", idCardFile: "priya_id.jpg", rcFile: "", registeredAt: "2026-07-15T11:05:00Z", lastUpdated: "2026-07-15T11:05:00Z", parkingStatus: "Not Parked", status: "Pending Verification", verificationStatus: "Not Verified", stickerId: null },
  { id: "v3", registrationId: "PP-2026-000103", category: "Faculty", studentName: "Rohan Sharma", studentId: "ME20B012", department: "Mechanical Engg.", year: "4th Year", className: "MECH-C", mobile: "9765432109", altMobile: "9012345678", email: "rohan.sharma@campus.edu", vehicleNumber: "DL8CAF9012", vehicleType: "Car", brand: "Maruti", model: "Swift", color: "Red", idCardFile: "rohan_id.jpg", rcFile: "rohan_rc.pdf", registeredAt: "2026-06-30T08:40:00Z", lastUpdated: "2026-07-02T09:00:00Z", parkingStatus: "Parked - Block C", status: "Active", verificationStatus: "Verified", stickerId: "MITWPU-ST-000103" },
  { id: "v4", registrationId: "PP-2026-000104", category: "Student", studentName: "Sneha Iyer", studentId: "BA23B003", department: "Business Admin", year: "1st Year", className: "BBA-A", mobile: "9654321098", altMobile: "", email: "sneha.iyer@campus.edu", vehicleNumber: "TN09EF3456", vehicleType: "Bike", brand: "Yamaha", model: "FZ", color: "Blue", idCardFile: "sneha_id.jpg", rcFile: "", registeredAt: "2026-08-01T14:15:00Z", lastUpdated: "2026-08-20T09:30:00Z", parkingStatus: "Parked - Block A", status: "Suspended", verificationStatus: "Verified", stickerId: "MITWPU-ST-000104" },
  { id: "v5", registrationId: "PP-2026-000105", category: "Student", studentName: "Karan Verma", studentId: "CV21B067", department: "Civil Engg.", year: "3rd Year", className: "CIVIL-B", mobile: "9543210987", altMobile: "9234567891", email: "karan.verma@campus.edu", vehicleNumber: "RJ14GH7890", vehicleType: "Car", brand: "Hyundai", model: "i20", color: "Silver", idCardFile: "karan_id.jpg", rcFile: "karan_rc.pdf", registeredAt: "2026-07-22T10:30:00Z", lastUpdated: "2026-07-22T10:30:00Z", parkingStatus: "Not Parked", status: "Pending Verification", verificationStatus: "Not Verified", stickerId: null },
  { id: "v6", registrationId: "PP-2026-000106", category: "Staff", studentName: "Ananya Das", studentId: "DS22B028", department: "Design", year: "2nd Year", className: "DES-A", mobile: "9432109876", altMobile: "", email: "ananya.das@campus.edu", vehicleNumber: "WB20IJ2345", vehicleType: "Scooter", brand: "Honda", model: "Activa", color: "Grey", idCardFile: "ananya_id.jpg", rcFile: "", registeredAt: "2026-08-03T16:50:00Z", lastUpdated: "2026-09-01T12:00:00Z", parkingStatus: "Parked - Block B", status: "Revoked", verificationStatus: "Verified", stickerId: "MITWPU-ST-000106" },
];
const seedViolations = [
  { id: "vi1", vehicleNumber: "DL8CAF9012", date: "2026-08-06", time: "10:22 AM", staffName: "Security Kumar", location: "Block C Entrance", reason: "Blocking Road", status: "Resolved" },
  { id: "vi2", vehicleNumber: "MH12AB1234", date: "2026-08-07", time: "08:41 AM", staffName: "Security Iqbal", location: "Main Gate", reason: "Wrong Parking", status: "Pending" },
];
const seedScans = [
  { id: "s1", vehicleNumber: "MH12AB1234", timestamp: "2026-08-07T08:40:00Z", result: "found", staffName: "Security Iqbal" },
  { id: "s2", vehicleNumber: "DL8CAF9012", timestamp: "2026-08-06T10:20:00Z", result: "found", staffName: "Security Kumar" },
  { id: "s3", vehicleNumber: "UP32ZZ0000", timestamp: "2026-08-05T13:10:00Z", result: "not_found", staffName: "Security Kumar" },
];
const seedCounters = { registration: 106, visitor: 1, sticker: 106, incident: 2, audit: 4 };
const seedStickers = [
  { id: "MITWPU-ST-000101", vehicleId: "v1", registrationId: "PP-2026-000101", issuedDate: "2026-07-13T10:00:00Z", issuedBy: "Security Iqbal", status: "Active" },
  { id: "MITWPU-ST-000103", vehicleId: "v3", registrationId: "PP-2026-000103", issuedDate: "2026-07-02T09:00:00Z", issuedBy: "Security Kumar", status: "Active" },
  { id: "MITWPU-ST-000104", vehicleId: "v4", registrationId: "PP-2026-000104", issuedDate: "2026-08-02T09:00:00Z", issuedBy: "Security Iqbal", status: "Active" },
  { id: "MITWPU-ST-000106", vehicleId: "v6", registrationId: "PP-2026-000106", issuedDate: "2026-08-04T09:00:00Z", issuedBy: "Security Kumar", status: "Revoked" },
];
const seedVerifications = [
  { id: "vv1", vehicleId: "v1", registrationId: "PP-2026-000101", guardName: "Security Iqbal", timestamp: "2026-07-13T09:55:00Z", result: "verified", checklist: { passVerified: true, numberMatches: true, typeMatches: true, detailsMatch: true, correspondsToRecord: true }, notes: "" },
];
const seedVisitorRecords = [
  { id: "VIS-2026-00001", fullName: "Meera Kulkarni", mobile: "9811122233", vehicleNumber: "MH14XY5566", purpose: "Guest lecture", host: "Dr. Kavita Rao", department: "Computer Science", status: "Exited", createdAt: "2026-09-20T09:00:00Z" },
];
const seedVisitorPasses = [
  { id: "vp1", visitorId: "VIS-2026-00001", token: "VTKN-DEMO0001", validFrom: "2026-09-20T09:00:00Z", validUntil: "2026-09-20T18:00:00Z", status: "USED" },
];
const seedEntryExitLogs = [
  { id: "eel1", type: "visitor", refId: "VIS-2026-00001", vehicleNumber: "MH14XY5566", entryTime: "2026-09-20T09:10:00Z", exitTime: "2026-09-20T15:40:00Z", gate: "Main Gate", guard: "Security Iqbal", recordedBy: "Security Iqbal" },
];
const seedIncidents = [
  { id: "INC-2026-000001", vehicleNumber: "DL8CAF9012", issueType: "Blocking Access / Traffic", location: "Block C Entrance", timestamp: "2026-08-06T10:22:00Z", reportingGuard: "Security Kumar", remarks: "Blocked emergency exit lane.", status: "Resolved", assignedAdmin: "Dean of Students", resolution: "Vehicle owner contacted and vehicle moved.", history: [
    { by: "Security Kumar", note: "Incident reported", at: "2026-08-06T10:22:00Z" },
    { by: "Dean of Students", note: "Resolved — owner moved vehicle", at: "2026-08-06T11:05:00Z" },
  ] },
  { id: "INC-2026-000002", vehicleNumber: "MH12AB1234", issueType: "Improper Parking", location: "Main Gate", timestamp: "2026-08-07T08:41:00Z", reportingGuard: "Security Iqbal", remarks: "Parked across two bays.", status: "New", assignedAdmin: "", resolution: "", history: [
    { by: "Security Iqbal", note: "Incident reported", at: "2026-08-07T08:41:00Z" },
  ] },
];
const seedNotifications = [
  { id: "n1", audience: "admin", targetId: null, text: "New incident reported for MH12AB1234", tone: "🚨", createdAt: "2026-08-07T08:41:00Z", read: false },
  { id: "n2", audience: "admin", targetId: null, text: "2 vehicles pending verification", tone: "⏳", createdAt: "2026-09-24T09:00:00Z", read: false },
];
const seedAuditLogs = [
  { id: "AUD-000001", timestamp: "2026-07-13T09:55:00Z", actor: "Security Iqbal", actorRole: "staff", action: "Vehicle Verification", recordType: "Vehicle", recordId: "MH12AB1234", previousStatus: "Pending Verification", newStatus: "Verified / Sticker Issued", description: "Physical verification checklist passed." },
  { id: "AUD-000002", timestamp: "2026-07-13T10:00:00Z", actor: "Security Iqbal", actorRole: "staff", action: "Sticker Issuance", recordType: "Vehicle", recordId: "MH12AB1234", previousStatus: "Verified / Sticker Issued", newStatus: "Active", description: "Sticker MITWPU-ST-000101 issued." },
  { id: "AUD-000003", timestamp: "2026-08-20T09:30:00Z", actor: "Dean of Students", actorRole: "admin", action: "Vehicle Suspension", recordType: "Vehicle", recordId: "TN09EF3456", previousStatus: "Active", newStatus: "Suspended", description: "Repeated parking violations." },
  { id: "AUD-000004", timestamp: "2026-09-01T12:00:00Z", actor: "Dean of Students", actorRole: "admin", action: "Vehicle Revocation", recordType: "Vehicle", recordId: "WB20IJ2345", previousStatus: "Active", newStatus: "Revoked", description: "Vehicle sold; registration revoked at owner's request." },
];

/* ---------- Low-level storage helpers (existing) ---------- */
function readKey(key, seed) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore corrupt data */ }
  localStorage.setItem(key, JSON.stringify(seed));
  return seed;
}
function writeKey(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
function genId(p) { return `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

/* ---------- Human-facing sequential ID generators ---------- */
function nextSeq(counterName) {
  const counters = readKey(KEYS.counters, seedCounters);
  counters[counterName] = (counters[counterName] || 0) + 1;
  writeKey(KEYS.counters, counters);
  return counters[counterName];
}
function nextRegistrationId() { return `PP-${new Date().getFullYear()}-${String(nextSeq("registration")).padStart(6, "0")}`; }
function nextVisitorId() { return `VIS-${new Date().getFullYear()}-${String(nextSeq("visitor")).padStart(5, "0")}`; }
function nextStickerId() { return `MITWPU-ST-${String(nextSeq("sticker")).padStart(6, "0")}`; }
function nextIncidentId() { return `INC-${new Date().getFullYear()}-${String(nextSeq("incident")).padStart(6, "0")}`; }
function nextAuditId() { return `AUD-${String(nextSeq("audit")).padStart(6, "0")}`; }
function genToken() { return `VTKN-${Math.random().toString(36).slice(2, 10).toUpperCase()}`; }
function normalizePlate(plate) { return (plate || "").trim().toUpperCase().replace(/\s+/g, ""); }

const Store = {
  KEYS, DEPARTMENTS, YEARS, VEHICLE_TYPES, VIOLATION_REASONS, COLORS_LIST,
  CATEGORY_LIST, ISSUE_TYPES, REQUEST_TYPES, UNREGISTERED_ACTIONS,
  VEHICLE_STATUS, VERIFICATION_STATUS, STICKER_STATUS, VISITOR_STATUS, PASS_STATUS, INCIDENT_STATUS, REQUEST_STATUS, LOOKUP_RESULT,

  /* ===================== Vehicles (existing, extended) ===================== */
  getVehicles() { return readKey(KEYS.vehicles, seedVehicles); },
  getViolations() { return readKey(KEYS.violations, seedViolations); }, // legacy — kept, no longer rendered (see incidents)
  getScans() { return readKey(KEYS.scans, seedScans); },

  findVehicleByPlate(plate) {
    const clean = normalizePlate(plate);
    return this.getVehicles().find((v) => v.vehicleNumber.toUpperCase() === clean) || null;
  },
  getVehicleById(id) { return this.getVehicles().find((v) => v.id === id) || null; },
  getVehicleByRegistrationId(regId) {
    const clean = (regId || "").trim().toUpperCase();
    return this.getVehicles().find((v) => (v.registrationId || "").toUpperCase() === clean) || null;
  },
  saveVehicle(vehicle) {
    const vehicles = this.getVehicles();
    const idx = vehicles.findIndex((v) => v.id === vehicle.id);
    if (idx === -1) return null;
    vehicles[idx] = vehicle;
    writeKey(KEYS.vehicles, vehicles);
    return vehicle;
  },

  /** Registers a new vehicle. Report Part 1: generates a Registration ID
   *  and starts the record at "Pending Verification" rather than "Active". */
  addVehicle(record) {
    const vehicles = this.getVehicles();
    const plate = record.vehicleNumber.trim().toUpperCase().replace(/\s+/g, "");
    if (vehicles.some((v) => v.vehicleNumber.toUpperCase() === plate)) {
      throw new Error(`Vehicle number ${plate} is already registered.`);
    }
    const now = new Date().toISOString();
    const full = {
      ...record,
      vehicleNumber: plate,
      id: genId("v"),
      registrationId: nextRegistrationId(),
      category: record.category || "Student",
      registeredAt: now,
      lastUpdated: now,
      parkingStatus: "Not Parked",
      status: VEHICLE_STATUS.PENDING,
      verificationStatus: VERIFICATION_STATUS.NOT_VERIFIED,
      stickerId: null,
    };
    vehicles.push(full);
    writeKey(KEYS.vehicles, vehicles);
    this.addNotification({ audience: "student", targetId: full.id, text: `Vehicle registration ${full.registrationId} submitted — pending verification.`, tone: "📝" });
    this.addNotification({ audience: "admin", targetId: null, text: `New registration ${full.registrationId} awaiting verification (${full.vehicleNumber}).`, tone: "⏳" });
    return full;
  },

  addScan(scan) {
    const scans = this.getScans();
    const full = { id: genId("s"), timestamp: new Date().toISOString(), ...scan };
    scans.push(full);
    writeKey(KEYS.scans, scans);
    return full;
  },

  addViolation(violation) { // legacy — preserved, unused by UI (see js/incidents.js for the report's expanded flow)
    const violations = this.getViolations();
    const now = new Date();
    const full = {
      id: genId("vi"),
      date: now.toISOString().slice(0, 10),
      time: now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      status: "Pending",
      ...violation,
    };
    violations.push(full);
    writeKey(KEYS.violations, violations);
    return full;
  },

  /** Operational-only plate lookup for the Guard Portal (report Part 4).
   *  Deliberately omits phone numbers / email — guards get only what they
   *  need to act, never raw personal contact data. */
  lookupPlate(plateRaw) {
    const plate = normalizePlate(plateRaw);
    if (!plate) return null;
    const vehicle = this.findVehicleByPlate(plate);
    if (vehicle) {
      let resultType;
      if (vehicle.status === VEHICLE_STATUS.SUSPENDED) resultType = LOOKUP_RESULT.SUSPENDED;
      else if (vehicle.status === VEHICLE_STATUS.REVOKED) resultType = LOOKUP_RESULT.REVOKED;
      else if (vehicle.status === VEHICLE_STATUS.ACTIVE) resultType = LOOKUP_RESULT.ACTIVE;
      else resultType = vehicle.category === "Student" ? LOOKUP_RESULT.STUDENT : LOOKUP_RESULT.FACULTY;
      const sticker = this.getStickerForVehicle(vehicle.id);
      return {
        found: true, kind: "vehicle", resultType, vehicle,
        operational: {
          vehicleNumber: vehicle.vehicleNumber, category: vehicle.category, status: vehicle.status,
          verificationStatus: vehicle.verificationStatus, vehicleType: vehicle.vehicleType,
          brand: vehicle.brand, model: vehicle.model, color: vehicle.color,
          registrationId: vehicle.registrationId, stickerId: sticker ? sticker.id : null,
          stickerStatus: sticker ? sticker.status : null, parkingStatus: vehicle.parkingStatus,
          studentName: vehicle.studentName, studentId: vehicle.studentId, department: vehicle.department,
          className: vehicle.className,
        },
      };
    }
    const visitor = this.getVisitorRecords()
      .filter((v) => normalizePlate(v.vehicleNumber) === plate && v.status !== VISITOR_STATUS.EXITED)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    if (visitor) {
      return {
        found: true, kind: "visitor", resultType: LOOKUP_RESULT.VISITOR, visitor,
        operational: { vehicleNumber: visitor.vehicleNumber, visitorId: visitor.id, visitorName: visitor.fullName, status: visitor.status, host: visitor.host, department: visitor.department },
      };
    }
    return { found: false, kind: "none", resultType: LOOKUP_RESULT.UNREGISTERED, operational: { vehicleNumber: plate } };
  },

  /* ===================== Physical verification (Part 2) ===================== */
  getVerifications() { return readKey(KEYS.vehicleVerifications, seedVerifications); },
  getVerificationsForVehicle(vehicleId) { return this.getVerifications().filter((v) => v.vehicleId === vehicleId); },

  /** Records a guard's physical verification attempt. On success the
   *  vehicle moves to "Verified / Sticker Issued" (a sticker is issued
   *  separately via issueSticker). On failure it stays Pending Verification
   *  so an admin can review it (report Part 2 / TEST 2). */
  verifyVehicle({ vehicleId, guardName, checklist, result, notes, actorRole }) {
    const vehicle = this.getVehicleById(vehicleId);
    if (!vehicle) throw new Error("Vehicle not found.");
    const role = actorRole || "staff";
    const record = { id: genId("vv"), vehicleId, registrationId: vehicle.registrationId, guardName, timestamp: new Date().toISOString(), result, checklist, notes: notes || "" };
    const list = this.getVerifications();
    list.push(record);
    writeKey(KEYS.vehicleVerifications, list);

    const prevStatus = vehicle.status;
    if (result === "verified") {
      vehicle.verificationStatus = VERIFICATION_STATUS.VERIFIED;
      vehicle.status = VEHICLE_STATUS.VERIFIED;
      vehicle.lastUpdated = new Date().toISOString();
      this.saveVehicle(vehicle);
      this.addAuditLog({ actor: guardName, actorRole: role, action: "Vehicle Verification", recordType: "Vehicle", recordId: vehicle.vehicleNumber, previousStatus: prevStatus, newStatus: vehicle.status, description: "Physical verification checklist passed." });
      this.addNotification({ audience: "student", targetId: vehicle.id, text: "Your vehicle passed physical verification. Sticker issuance is next.", tone: "✅" });
    } else {
      vehicle.verificationStatus = VERIFICATION_STATUS.REJECTED;
      // Per report: keep as Pending Verification (or refer) rather than failing permanently.
      vehicle.status = VEHICLE_STATUS.PENDING;
      vehicle.lastUpdated = new Date().toISOString();
      this.saveVehicle(vehicle);
      this.addAuditLog({ actor: guardName, actorRole: role, action: "Vehicle Verification", recordType: "Vehicle", recordId: vehicle.vehicleNumber, previousStatus: prevStatus, newStatus: vehicle.status, description: notes ? `Rejected: ${notes}` : "Rejected — details did not match. Referred for administrative review." });
      this.addNotification({ audience: "admin", targetId: null, text: `Verification rejected for ${vehicle.vehicleNumber} — referred for review.`, tone: "⚠️" });
      this.addNotification({ audience: "student", targetId: vehicle.id, text: "Physical verification could not be completed. Your registration remains pending.", tone: "⚠️" });
    }
    return record;
  },

  /* ===================== Stickers (Part 3) ===================== */
  getStickers() { return readKey(KEYS.stickers, seedStickers); },
  getStickerForVehicle(vehicleId) {
    const stickers = this.getStickers().filter((s) => s.vehicleId === vehicleId);
    return stickers.length ? stickers[stickers.length - 1] : null;
  },
  getStickerById(id) { return this.getStickers().find((s) => s.id.toUpperCase() === (id || "").toUpperCase()) || null; },

  issueSticker({ vehicleId, guardName, actorRole }) {
    const vehicle = this.getVehicleById(vehicleId);
    if (!vehicle) throw new Error("Vehicle not found.");
    const role = actorRole || "staff";
    const sticker = { id: nextStickerId(), vehicleId, registrationId: vehicle.registrationId, issuedDate: new Date().toISOString(), issuedBy: guardName, status: STICKER_STATUS.ACTIVE };
    const stickers = this.getStickers();
    stickers.push(sticker);
    writeKey(KEYS.stickers, stickers);

    const prevStatus = vehicle.status;
    vehicle.stickerId = sticker.id;
    vehicle.status = VEHICLE_STATUS.ACTIVE;
    vehicle.lastUpdated = new Date().toISOString();
    this.saveVehicle(vehicle);
    this.addAuditLog({ actor: guardName, actorRole: role, action: "Sticker Issuance", recordType: "Vehicle", recordId: vehicle.vehicleNumber, previousStatus: prevStatus, newStatus: vehicle.status, description: `Sticker ${sticker.id} issued.` });
    this.addNotification({ audience: "student", targetId: vehicle.id, text: `Sticker ${sticker.id} issued. Your vehicle is now Active.`, tone: "🎉" });
    return sticker;
  },

  updateStickerStatus(stickerId, status, actor, actorRole) {
    const stickers = this.getStickers();
    const sticker = stickers.find((s) => s.id === stickerId);
    if (!sticker) throw new Error("Sticker not found.");
    const prev = sticker.status;
    sticker.status = status;
    writeKey(KEYS.stickers, stickers);
    this.addAuditLog({ actor, actorRole, action: "Sticker Status Update", recordType: "Sticker", recordId: sticker.id, previousStatus: prev, newStatus: status, description: "" });
    return sticker;
  },

  /* ===================== Vehicle lifecycle (Part 1) ===================== */
  suspendVehicle(vehicleId, actor, actorRole, reason) {
    const vehicle = this.getVehicleById(vehicleId);
    if (!vehicle) throw new Error("Vehicle not found.");
    const prev = vehicle.status;
    vehicle.status = VEHICLE_STATUS.SUSPENDED;
    vehicle.lastUpdated = new Date().toISOString();
    this.saveVehicle(vehicle);
    this.addAuditLog({ actor, actorRole, action: "Vehicle Suspension", recordType: "Vehicle", recordId: vehicle.vehicleNumber, previousStatus: prev, newStatus: vehicle.status, description: reason || "" });
    this.addNotification({ audience: "student", targetId: vehicle.id, text: "Your vehicle registration has been suspended. Contact campus security for details.", tone: "⚠️" });
    return vehicle;
  },
  reactivateVehicle(vehicleId, actor, actorRole, reason) {
    const vehicle = this.getVehicleById(vehicleId);
    if (!vehicle) throw new Error("Vehicle not found.");
    const prev = vehicle.status;
    vehicle.status = VEHICLE_STATUS.ACTIVE;
    vehicle.lastUpdated = new Date().toISOString();
    this.saveVehicle(vehicle);
    this.addAuditLog({ actor, actorRole, action: "Vehicle Reactivation", recordType: "Vehicle", recordId: vehicle.vehicleNumber, previousStatus: prev, newStatus: vehicle.status, description: reason || "" });
    this.addNotification({ audience: "student", targetId: vehicle.id, text: "Your vehicle registration is Active again.", tone: "✅" });
    return vehicle;
  },
  revokeVehicle(vehicleId, actor, actorRole, reason) {
    const vehicle = this.getVehicleById(vehicleId);
    if (!vehicle) throw new Error("Vehicle not found.");
    const prev = vehicle.status;
    vehicle.status = VEHICLE_STATUS.REVOKED;
    vehicle.lastUpdated = new Date().toISOString();
    this.saveVehicle(vehicle);
    this.addAuditLog({ actor, actorRole, action: "Vehicle Revocation", recordType: "Vehicle", recordId: vehicle.vehicleNumber, previousStatus: prev, newStatus: vehicle.status, description: reason || "" });
    this.addNotification({ audience: "student", targetId: vehicle.id, text: "Your vehicle registration has been revoked.", tone: "⛔" });
    return vehicle;
  },
  updateVehicleAdmin(vehicleId, patch, actor, actorRole) {
    const vehicle = this.getVehicleById(vehicleId);
    if (!vehicle) throw new Error("Vehicle not found.");
    Object.assign(vehicle, patch, { lastUpdated: new Date().toISOString() });
    this.saveVehicle(vehicle);
    this.addAuditLog({ actor, actorRole, action: "Vehicle Update", recordType: "Vehicle", recordId: vehicle.vehicleNumber, previousStatus: "—", newStatus: "—", description: "Administrative update applied to record." });
    return vehicle;
  },

  /* ===================== Update requests (Part 1.7) ===================== */
  getUpdateRequests() { return readKey(KEYS.updateRequests, []); },
  getUpdateRequestsForVehicle(vehicleId) { return this.getUpdateRequests().filter((r) => r.vehicleId === vehicleId); },
  addUpdateRequest({ vehicleId, type, details, requestedBy }) {
    const requests = this.getUpdateRequests();
    const full = { id: genId("ur"), vehicleId, type, details: details || {}, requestedBy, status: REQUEST_STATUS.PENDING, requestedAt: new Date().toISOString() };
    requests.push(full);
    writeKey(KEYS.updateRequests, requests);
    this.addNotification({ audience: "admin", targetId: null, text: `New update request (${type}) from ${requestedBy}.`, tone: "✏️" });
    return full;
  },
  resolveUpdateRequest(id, decision, actor, actorRole, note) {
    const requests = this.getUpdateRequests();
    const req = requests.find((r) => r.id === id);
    if (!req) throw new Error("Request not found.");
    req.status = decision;
    req.resolutionNote = note || "";
    req.resolvedAt = new Date().toISOString();
    writeKey(KEYS.updateRequests, requests);
    this.addAuditLog({ actor, actorRole, action: "Update Request Resolution", recordType: "UpdateRequest", recordId: req.id, previousStatus: "Pending", newStatus: decision, description: req.type });
    this.addNotification({ audience: "student", targetId: req.vehicleId, text: `Your update request (${req.type}) was ${decision.toLowerCase()}.`, tone: decision === REQUEST_STATUS.APPROVED ? "✅" : "❌" });
    return req;
  },

  /* ===================== Visitors (Parts 5–9) ===================== */
  getVisitorRecords() { return readKey(KEYS.visitorRecords, seedVisitorRecords); },
  getVisitorById(id) { return this.getVisitorRecords().find((v) => v.id.toUpperCase() === (id || "").toUpperCase()) || null; },
  saveVisitor(visitor) {
    const list = this.getVisitorRecords();
    const idx = list.findIndex((v) => v.id === visitor.id);
    if (idx === -1) return null;
    list[idx] = visitor;
    writeKey(KEYS.visitorRecords, list);
    return visitor;
  },
  getVisitorPasses() { return readKey(KEYS.visitorPasses, seedVisitorPasses); },
  getPassForVisitor(visitorId) {
    const passes = this.getVisitorPasses().filter((p) => p.visitorId === visitorId);
    return passes.length ? passes[passes.length - 1] : null;
  },
  savePass(pass) {
    const passes = this.getVisitorPasses();
    const idx = passes.findIndex((p) => p.id === pass.id);
    if (idx === -1) return null;
    passes[idx] = pass;
    writeKey(KEYS.visitorPasses, passes);
    return pass;
  },

  /** Report Parts 5–6: create a temporary visitor record + a short-lived
   *  digital pass. The QR token is a random opaque string, not personal
   *  data, and the pass expires automatically. */
  registerVisitor(data) {
    const now = new Date();
    const visitor = {
      id: nextVisitorId(),
      fullName: data.fullName.trim(),
      mobile: data.mobile.trim(),
      vehicleNumber: data.vehicleNumber ? normalizePlate(data.vehicleNumber) : "",
      purpose: data.purpose.trim(),
      host: data.host.trim(),
      department: data.department,
      status: VISITOR_STATUS.EXPECTED,
      createdAt: now.toISOString(),
    };
    const records = this.getVisitorRecords();
    records.push(visitor);
    writeKey(KEYS.visitorRecords, records);

    const validUntil = new Date(now.getTime() + 12 * 60 * 60 * 1000); // 12-hour validity window
    const pass = { id: genId("vp"), visitorId: visitor.id, token: genToken(), validFrom: now.toISOString(), validUntil: validUntil.toISOString(), status: PASS_STATUS.VALID };
    const passes = this.getVisitorPasses();
    passes.push(pass);
    writeKey(KEYS.visitorPasses, passes);

    this.addNotification({ audience: "admin", targetId: null, text: `New visitor expected: ${visitor.fullName} (${visitor.id}) to see ${visitor.host}.`, tone: "🧑‍💼" });
    return { visitor, pass };
  },

  /** Dynamic status: a stored pass is VALID or USED; EXPIRED/INVALID are
   *  computed at read time so a screenshot never outlives its window. */
  computePassStatus(pass) {
    if (!pass) return PASS_STATUS.INVALID;
    if (pass.status === PASS_STATUS.USED) return PASS_STATUS.USED;
    if (new Date() > new Date(pass.validUntil)) return PASS_STATUS.EXPIRED;
    return PASS_STATUS.VALID;
  },

  /** Guard-facing lookup for "Scan Visitor Pass" (report Part 7). Accepts a
   *  Visitor ID or a pass token. */
  findVisitorPass(query) {
    const q = (query || "").trim().toUpperCase();
    if (!q) return null;
    let visitor = this.getVisitorById(q);
    let pass = visitor ? this.getPassForVisitor(visitor.id) : null;
    if (!pass) {
      pass = this.getVisitorPasses().find((p) => p.token.toUpperCase() === q) || null;
      if (pass) visitor = this.getVisitorById(pass.visitorId);
    }
    if (!visitor || !pass) return { found: false, status: PASS_STATUS.INVALID };
    return { found: true, visitor, pass, status: this.computePassStatus(pass) };
  },

  /** Report Part 8: confirm entry, log it, flip status, and burn the pass
   *  so it can't be replayed for a second entry. */
  confirmVisitorEntry({ visitorId, gate, guardName }) {
    const visitor = this.getVisitorById(visitorId);
    if (!visitor) throw new Error("Visitor not found.");
    const pass = this.getPassForVisitor(visitor.id);
    const status = this.computePassStatus(pass);
    if (status !== PASS_STATUS.VALID) throw new Error(`Pass is ${status} — cannot confirm entry.`);

    pass.status = PASS_STATUS.USED;
    this.savePass(pass);
    visitor.status = VISITOR_STATUS.ON_CAMPUS;
    this.saveVisitor(visitor);

    const logs = this.getEntryExitLogs();
    const log = { id: genId("eel"), type: "visitor", refId: visitor.id, vehicleNumber: visitor.vehicleNumber, entryTime: new Date().toISOString(), exitTime: null, gate, guard: guardName, recordedBy: guardName };
    logs.push(log);
    writeKey(KEYS.entryExitLogs, logs);

    this.addAuditLog({ actor: guardName, actorRole: "staff", action: "Visitor Entry", recordType: "Visitor", recordId: visitor.id, previousStatus: VISITOR_STATUS.EXPECTED, newStatus: VISITOR_STATUS.ON_CAMPUS, description: `Entered at ${gate}.` });
    this.addNotification({ audience: "admin", targetId: null, text: `${visitor.fullName} (${visitor.id}) is now on campus.`, tone: "🟢" });
    return { visitor, log };
  },

  getEntryExitLogs() { return readKey(KEYS.entryExitLogs, seedEntryExitLogs); },
  getOpenEntryLog(visitorId) {
    return this.getEntryExitLogs().filter((l) => l.refId === visitorId && l.type === "visitor" && !l.exitTime).sort((a, b) => new Date(b.entryTime) - new Date(a.entryTime))[0] || null;
  },

  /** Report Part 9: exit by Visitor ID or vehicle number. */
  recordVisitorExit({ query, gate, guardName }) {
    const q = (query || "").trim().toUpperCase();
    let visitor = this.getVisitorById(q) || this.getVisitorRecords().find((v) => normalizePlate(v.vehicleNumber) === normalizePlate(q));
    if (!visitor) throw new Error("Visitor not found.");
    if (visitor.status !== VISITOR_STATUS.ON_CAMPUS) throw new Error(`Visitor is not currently on campus (status: ${visitor.status}).`);

    const log = this.getOpenEntryLog(visitor.id);
    const logs = this.getEntryExitLogs();
    if (log) {
      const idx = logs.findIndex((l) => l.id === log.id);
      logs[idx] = { ...log, exitTime: new Date().toISOString(), exitGate: gate, recordedBy: guardName };
      writeKey(KEYS.entryExitLogs, logs);
    }
    visitor.status = VISITOR_STATUS.EXITED;
    this.saveVisitor(visitor);

    this.addAuditLog({ actor: guardName, actorRole: "staff", action: "Visitor Exit", recordType: "Visitor", recordId: visitor.id, previousStatus: VISITOR_STATUS.ON_CAMPUS, newStatus: VISITOR_STATUS.EXITED, description: `Exited via ${gate}.` });
    this.addNotification({ audience: "admin", targetId: null, text: `${visitor.fullName} (${visitor.id}) has exited campus.`, tone: "🔵" });
    return visitor;
  },

  /* ===================== Incidents (Parts 11, 17 — expands "Violations") ===================== */
  getIncidents() { return readKey(KEYS.incidents, seedIncidents); },
  getIncidentById(id) { return this.getIncidents().find((i) => i.id === id) || null; },
  addIncident({ vehicleNumber, issueType, location, remarks, reportingGuard }) {
    const incidents = this.getIncidents();
    const now = new Date().toISOString();
    const full = {
      id: nextIncidentId(), vehicleNumber: vehicleNumber ? normalizePlate(vehicleNumber) : "", issueType, location,
      timestamp: now, reportingGuard, remarks: remarks || "", status: INCIDENT_STATUS.NEW, assignedAdmin: "", resolution: "",
      history: [{ by: reportingGuard, note: "Incident reported", at: now }],
    };
    incidents.push(full);
    writeKey(KEYS.incidents, incidents);
    this.addAuditLog({ actor: reportingGuard, actorRole: "staff", action: "Incident Creation", recordType: "Incident", recordId: full.id, previousStatus: "—", newStatus: INCIDENT_STATUS.NEW, description: `${issueType} at ${location}.` });
    this.addNotification({ audience: "admin", targetId: null, text: `New incident ${full.id}: ${issueType} (${full.vehicleNumber || "no plate"}).`, tone: "🚨" });
    return full;
  },
  updateIncident(id, patch, actor, actorRole, note) {
    const incidents = this.getIncidents();
    const inc = incidents.find((i) => i.id === id);
    if (!inc) throw new Error("Incident not found.");
    const prevStatus = inc.status;
    Object.assign(inc, patch);
    inc.history = inc.history || [];
    inc.history.push({ by: actor, note: note || `Updated (${patch.status || "details changed"})`, at: new Date().toISOString() });
    writeKey(KEYS.incidents, incidents);
    const isResolution = patch.status === INCIDENT_STATUS.RESOLVED || patch.status === INCIDENT_STATUS.CLOSED;
    this.addAuditLog({ actor, actorRole, action: isResolution ? "Incident Resolution" : "Incident Update", recordType: "Incident", recordId: inc.id, previousStatus: prevStatus, newStatus: inc.status, description: note || "" });
    if (patch.status && patch.status !== prevStatus) {
      this.addNotification({ audience: "staff", targetId: null, text: `Incident ${inc.id} is now ${inc.status}.`, tone: "🔔" });
    }
    return inc;
  },

  /* ===================== Unregistered vehicle workflow (Part 12) ===================== */
  getUnregisteredReports() { return readKey(KEYS.unregisteredReports, []); },
  addUnregisteredReport({ vehicleNumber, location, guardName, action }) {
    const reports = this.getUnregisteredReports();
    const full = { id: genId("ur2"), vehicleNumber: normalizePlate(vehicleNumber), location, guardName, action, timestamp: new Date().toISOString() };
    reports.push(full);
    writeKey(KEYS.unregisteredReports, reports);
    this.addAuditLog({ actor: guardName, actorRole: "staff", action: "Unregistered Vehicle Report", recordType: "Vehicle", recordId: full.vehicleNumber, previousStatus: "—", newStatus: "—", description: `${action} at ${location}.` });
    return full;
  },

  /* ===================== Notifications (Part 21) ===================== */
  getNotifications() { return readKey(KEYS.notifications, seedNotifications); },
  addNotification({ audience, targetId, text, tone }) {
    const list = this.getNotifications();
    const full = { id: genId("ntf"), audience, targetId: targetId || null, text, tone: tone || "🔔", createdAt: new Date().toISOString(), read: false };
    list.push(full);
    writeKey(KEYS.notifications, list);
    return full;
  },
  getNotificationsFor(audience, targetId) {
    return this.getNotifications()
      .filter((n) => n.audience === audience && (targetId ? n.targetId === targetId : true))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },
  markNotificationRead(id) {
    const list = this.getNotifications();
    const n = list.find((x) => x.id === id);
    if (n) { n.read = true; writeKey(KEYS.notifications, list); }
  },

  /* ===================== Audit logs (Part 18) ===================== */
  getAuditLogs() { return readKey(KEYS.auditLogs, seedAuditLogs); },
  addAuditLog({ actor, actorRole, action, recordType, recordId, previousStatus, newStatus, description }) {
    const logs = this.getAuditLogs();
    const full = { id: nextAuditId(), timestamp: new Date().toISOString(), actor, actorRole, action, recordType, recordId, previousStatus: previousStatus || "—", newStatus: newStatus || "—", description: description || "" };
    logs.push(full);
    writeKey(KEYS.auditLogs, logs);
    return full;
  },

  /* ===================== RBAC (Part 19) ===================== */
  can(role, permission) { return (PERMISSIONS[role] || []).includes(permission); },

  /* ===================== Auth (Part 20) — legacy passthrough =====================
     Auth.login()/logout()/currentRole()/currentName() in js/auth.js are now the
     single source of truth; these are kept only so any old code path that
     still calls Store.login() directly keeps working. */
  login(role, name) { window.Auth ? Auth.login(role, name) : (sessionStorage.setItem("parkpilot:role", role), sessionStorage.setItem("parkpilot:name", name)); },
  logout() { window.Auth ? Auth.logout() : (sessionStorage.removeItem("parkpilot:role"), sessionStorage.removeItem("parkpilot:name")); },
  currentRole() { return window.Auth ? Auth.currentRole() : sessionStorage.getItem("parkpilot:role"); },
  currentName() { return window.Auth ? Auth.currentName() : (sessionStorage.getItem("parkpilot:name") || "Staff"); },
};

window.Store = Store;
