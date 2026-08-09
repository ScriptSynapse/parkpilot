/* ==========================================================================
   ParkPilot — store.js
   Simulates the "central database" shared by all three modules using
   localStorage (so Registration, Staff, and Admin all read/write the same
   data even across browser tabs). In a real deployment this file would be
   replaced by calls to the Express/MongoDB backend described in README.md.
   ========================================================================== */

const DEPARTMENTS = ["Computer Science", "Mechanical Engg.", "Electronics", "Civil Engg.", "Business Admin", "Design"];
const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
const VEHICLE_TYPES = ["Bike", "Scooter", "Car"];
const VIOLATION_REASONS = ["Wrong Parking", "Blocking Road", "Emergency", "Unauthorized Parking", "Vehicle Damage"];
const COLORS_LIST = ["Black", "White", "Red", "Blue", "Silver", "Grey"];

const KEYS = { vehicles: "parkpilot:vehicles", violations: "parkpilot:violations", scans: "parkpilot:scans" };

const seedVehicles = [
  { id: "v1", studentName: "Arjun Mehta", studentId: "CS21B045", department: "Computer Science", year: "3rd Year", className: "CSE-B", mobile: "9876543210", altMobile: "9123456780", email: "arjun.mehta@campus.edu", vehicleNumber: "MH12AB1234", vehicleType: "Bike", brand: "Honda", model: "Shine", color: "Black", idCardFile: "arjun_id.jpg", rcFile: "arjun_rc.pdf", registeredAt: "2026-07-12T09:20:00Z", parkingStatus: "Parked - Block A" },
  { id: "v2", studentName: "Priya Nair", studentId: "EC22B091", department: "Electronics", year: "2nd Year", className: "ECE-A", mobile: "9988776655", altMobile: "", email: "priya.nair@campus.edu", vehicleNumber: "KA05CD5678", vehicleType: "Scooter", brand: "TVS", model: "Jupiter", color: "White", idCardFile: "priya_id.jpg", rcFile: "", registeredAt: "2026-07-15T11:05:00Z", parkingStatus: "Not Parked" },
  { id: "v3", studentName: "Rohan Sharma", studentId: "ME20B012", department: "Mechanical Engg.", year: "4th Year", className: "MECH-C", mobile: "9765432109", altMobile: "9012345678", email: "rohan.sharma@campus.edu", vehicleNumber: "DL8CAF9012", vehicleType: "Car", brand: "Maruti", model: "Swift", color: "Red", idCardFile: "rohan_id.jpg", rcFile: "rohan_rc.pdf", registeredAt: "2026-06-30T08:40:00Z", parkingStatus: "Parked - Block C" },
  { id: "v4", studentName: "Sneha Iyer", studentId: "BA23B003", department: "Business Admin", year: "1st Year", className: "BBA-A", mobile: "9654321098", altMobile: "", email: "sneha.iyer@campus.edu", vehicleNumber: "TN09EF3456", vehicleType: "Bike", brand: "Yamaha", model: "FZ", color: "Blue", idCardFile: "sneha_id.jpg", rcFile: "", registeredAt: "2026-08-01T14:15:00Z", parkingStatus: "Parked - Block A" },
  { id: "v5", studentName: "Karan Verma", studentId: "CV21B067", department: "Civil Engg.", year: "3rd Year", className: "CIVIL-B", mobile: "9543210987", altMobile: "9234567891", email: "karan.verma@campus.edu", vehicleNumber: "RJ14GH7890", vehicleType: "Car", brand: "Hyundai", model: "i20", color: "Silver", idCardFile: "karan_id.jpg", rcFile: "karan_rc.pdf", registeredAt: "2026-07-22T10:30:00Z", parkingStatus: "Not Parked" },
  { id: "v6", studentName: "Ananya Das", studentId: "DS22B028", department: "Design", year: "2nd Year", className: "DES-A", mobile: "9432109876", altMobile: "", email: "ananya.das@campus.edu", vehicleNumber: "WB20IJ2345", vehicleType: "Scooter", brand: "Honda", model: "Activa", color: "Grey", idCardFile: "ananya_id.jpg", rcFile: "", registeredAt: "2026-08-03T16:50:00Z", parkingStatus: "Parked - Block B" },
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

const Store = {
  KEYS, DEPARTMENTS, YEARS, VEHICLE_TYPES, VIOLATION_REASONS, COLORS_LIST,

  getVehicles() { return readKey(KEYS.vehicles, seedVehicles); },
  getViolations() { return readKey(KEYS.violations, seedViolations); },
  getScans() { return readKey(KEYS.scans, seedScans); },

  findVehicleByPlate(plate) {
    const clean = (plate || "").trim().toUpperCase().replace(/\s+/g, "");
    return this.getVehicles().find((v) => v.vehicleNumber.toUpperCase() === clean) || null;
  },

  addVehicle(record) {
    const vehicles = this.getVehicles();
    const plate = record.vehicleNumber.trim().toUpperCase().replace(/\s+/g, "");
    if (vehicles.some((v) => v.vehicleNumber.toUpperCase() === plate)) {
      throw new Error(`Vehicle number ${plate} is already registered.`);
    }
    const full = { ...record, vehicleNumber: plate, id: genId("v"), registeredAt: new Date().toISOString(), parkingStatus: "Not Parked" };
    vehicles.push(full);
    writeKey(KEYS.vehicles, vehicles);
    return full;
  },

  addScan(scan) {
    const scans = this.getScans();
    const full = { id: genId("s"), timestamp: new Date().toISOString(), ...scan };
    scans.push(full);
    writeKey(KEYS.scans, scans);
    return full;
  },

  addViolation(violation) {
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

  // Auth is mocked: any name/password combination succeeds and is stored per-tab.
  login(role, name) { sessionStorage.setItem("parkpilot:role", role); sessionStorage.setItem("parkpilot:name", name); },
  logout() { sessionStorage.removeItem("parkpilot:role"); sessionStorage.removeItem("parkpilot:name"); },
  currentRole() { return sessionStorage.getItem("parkpilot:role"); },
  currentName() { return sessionStorage.getItem("parkpilot:name") || "Staff"; },
};

window.Store = Store;