/* ==========================================================================
   ParkPilot — ui.js
   Small shared UI helpers used across every page: navbar, toasts,
   formatting utilities and simple DOM builders.
   ========================================================================== */

function fmtDateTime(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch (e) { return iso; }
}
function fmtDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch (e) { return iso; }
}
function initials(name) {
  return (name || "").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}
function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}
function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ---------- Toasts ---------- */
function ensureToastStack() {
  let stack = document.querySelector(".toast-stack");
  if (!stack) {
    stack = document.createElement("div");
    stack.className = "toast-stack";
    document.body.appendChild(stack);
  }
  return stack;
}
function toast(message, tone) {
  const stack = ensureToastStack();
  const node = el(`
    <div class="toast">
      <span>${tone === "red" ? "❌" : "✅"}</span>
      <span>${escapeHtml(message)}</span>
    </div>
  `);
  stack.appendChild(node);
  setTimeout(() => node.remove(), 3200);
}

/* ---------- Navbar ---------- */
const ROLE_LABELS = {
  staff: "🛡️ Security Guard",
  admin: "📊 Admin",
  itadmin: "🛠️ IT Admin",
  student: "🎓 My Vehicle",
  visitor: "🧑‍💼 Visitor",
};
function renderNav(activeRole) {
  const mount = document.getElementById("nav-root");
  if (!mount) return;
  const role = Store.currentRole();
  const name = Store.currentName();

  let actions = "";
  if (role) {
    const roleLabel = ROLE_LABELS[role] || role;
    actions = `
      <span class="role-chip">${roleLabel} · ${escapeHtml(name)}</span>
      <button class="btn btn-ghost btn-sm danger" id="nav-logout">⎋ Logout</button>
    `;
  } else {
    actions = `
      <a href="register.html" class="btn btn-ghost btn-sm">Register Vehicle</a>
      <a href="visitor.html" class="btn btn-ghost btn-sm">Visitor</a>
      <a href="student.html" class="btn btn-ghost btn-sm">My Status</a>
      <a href="staff-login.html" class="btn btn-ghost btn-sm">Staff Login</a>
      <a href="admin-login.html" class="btn btn-primary btn-sm">Admin Login</a>
    `;
  }

  mount.innerHTML = `
    <div class="nav">
      <div class="nav-inner">
        <a href="index.html" class="brand">
          <div class="brand-mark">📡</div>
          <div>
            <div class="brand-name">ParkPilot</div>
            <div class="brand-sub">SMART CAMPUS PARKING</div>
          </div>
        </a>
        <div class="nav-actions">${actions}</div>
      </div>
    </div>
  `;

  const logoutBtn = document.getElementById("nav-logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      Store.logout();
      toast("Logged out");
      setTimeout(() => (window.location.href = "index.html"), 300);
    });
  }
}

/* ---------- Guards ---------- */
function requireRole(role, loginPage) {
  if (window.Auth) return Auth.requireRole(role, loginPage);
  const current = Store.currentRole();
  const ok = Array.isArray(role) ? role.includes(current) : current === role;
  if (!ok) window.location.href = loginPage;
  return ok;
}

/* ---------- Plate badge (signature component) ---------- */
function plateHtml(number, size) {
  const cls = size === "lg" ? "plate plate-lg" : size === "sm" ? "plate plate-sm" : "plate";
  return `
    <div class="${cls}">
      <div class="plate-strip">CAMPUS</div>
      <div class="plate-body"><span class="mono">${escapeHtml(number)}</span></div>
    </div>
  `;
}

/* ---------- Status badges (report Parts 1, 3, 6, 11, 16) ----------
   One lookup table so every status string in the app (vehicle lifecycle,
   sticker, visitor, pass, incident, update request) always renders with
   the same color/meaning, instead of each page re-deciding it. */
const STATUS_BADGE_MAP = {
  "Pending Verification": "badge-amber", "Verified / Sticker Issued": "badge-blue", "Active": "badge-teal",
  "Suspended": "badge-amber", "Revoked": "badge-red",
  "Not Verified": "badge-grey", "Verified": "badge-teal", "Rejected": "badge-red",
  "Lost": "badge-amber", "Damaged": "badge-amber", "Replaced": "badge-blue",
  "Currently Expected": "badge-blue", "Currently on Campus": "badge-teal", "Exited": "badge-grey",
  "VALID": "badge-teal", "EXPIRED": "badge-grey", "USED": "badge-blue", "INVALID": "badge-red",
  "New": "badge-red", "In Progress": "badge-amber", "Resolved": "badge-teal", "Closed": "badge-grey",
  "Pending": "badge-amber", "Approved": "badge-teal",
  "REGISTERED - STUDENT": "badge-teal", "REGISTERED - FACULTY/STAFF": "badge-teal", "REGISTERED - VISITOR": "badge-blue",
  "UNREGISTERED": "badge-grey", "FLAGGED": "badge-red", "SUSPENDED": "badge-amber", "REVOKED": "badge-red", "ACTIVE": "badge-teal",
};
function statusBadge(status) {
  if (!status) return "";
  const cls = STATUS_BADGE_MAP[status] || "badge-grey";
  return `<span class="badge ${cls}">${escapeHtml(status)}</span>`;
}

/* ---------- Empty state ---------- */
function emptyState(icon, title, subtitle) {
  return `
    <div class="empty-state">
      <div class="icon">${icon}</div>
      <div style="font-weight:600;">${escapeHtml(title)}</div>
      ${subtitle ? `<div class="text-faint mt-1" style="font-size:14px;">${escapeHtml(subtitle)}</div>` : ""}
    </div>`;
}

/* ---------- Key/value tile grid (status pages, verification detail) ---------- */
function kvTile(label, value) {
  return `<div class="kv-tile"><div class="kv-label">${escapeHtml(label)}</div><div class="kv-value">${value}</div></div>`;
}
function kvGrid(rows) {
  return `<div class="kv-grid">${rows.map(([l, v]) => kvTile(l, v)).join("")}</div>`;
}

/* ---------- Real QR code rendering (uses the QRCode library — see
   js/vendor script tag on pages that show a pass). Falls back to a plain
   token box if the library didn't load (e.g. offline demo), so the pass is
   still usable via manual entry. ---------- */
function renderQrInto(elementId, text, size) {
  const mount = document.getElementById(elementId);
  if (!mount) return;
  mount.innerHTML = "";
  if (window.QRCode) {
    new QRCode(mount, { text, width: size || 84, height: size || 84, correctLevel: QRCode.CorrectLevel.M });
  } else {
    mount.innerHTML = `<span style="font-family:monospace; font-size:8px; word-break:break-all; text-align:center; color:#0f172a;">${escapeHtml(text)}</span>`;
  }
}

/* ---------- Digital Verification Pass (report Part 1.3) ----------
   Shown right after registration and on the student's status page. This is
   explicitly a *temporary* pass, never permanent entry authorization —
   physical sticker verification is always the final authorization step. */
function verificationPassCardHtml(vehicle) {
  const token = `PPTKN-${vehicle.id.replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase()}`;
  return `
    <div class="pass-card">
      <div class="pass-head"><span>🪪 TEMPORARY VERIFICATION PASS</span><span>${escapeHtml(vehicle.registrationId)}</span></div>
      <div class="pass-body">
        <div class="flex gap-3 items-center mb-3">
          <div class="qr-box" id="qr-${escapeHtml(vehicle.id)}" data-qr-token="${escapeHtml(token)}"></div>
          <div>
            <div style="font-weight:800; font-size:16px;">${escapeHtml(vehicle.studentName)}</div>
            <div class="text-faint" style="font-size:12px;">${escapeHtml(vehicle.category)} · ${escapeHtml(vehicle.department)}</div>
          </div>
        </div>
        <div class="pass-row"><span>Vehicle Number</span><span class="mono">${escapeHtml(vehicle.vehicleNumber)}</span></div>
        <div class="pass-row"><span>Vehicle Type</span><span>${escapeHtml(vehicle.vehicleType)}</span></div>
        <div class="pass-row"><span>Brand / Model</span><span>${escapeHtml(vehicle.brand)} ${escapeHtml(vehicle.model)}</span></div>
        <div class="pass-row"><span>Registration Date</span><span>${fmtDate(vehicle.registeredAt)}</span></div>
        <div class="pass-row"><span>Verification Status</span><span>${statusBadge(vehicle.verificationStatus)}</span></div>
        <div class="pass-warning">⚠ Temporary Verification Pass — <b>not permanent entry authorization</b>. Present this at the gate for physical vehicle verification and sticker issuance.</div>
      </div>
    </div>`;
}
/** Call right after inserting verificationPassCardHtml() into the DOM. */
function mountVerificationPassQr(vehicle) {
  const token = `PPTKN-${vehicle.id.replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase()}`;
  renderQrInto(`qr-${vehicle.id}`, token);
}

/* ---------- Confirmation dialog (report Part 23: "confirmation before
   suspend/revoke actions"). Reuses the existing .modal-overlay component. */
function confirmDialog(message, onConfirm) {
  let overlay = document.getElementById("confirm-overlay");
  if (overlay) overlay.remove();
  overlay = el(`
    <div class="modal-overlay" id="confirm-overlay">
      <div class="glass modal-box p-6">
        <div style="font-weight:700; margin-bottom:10px;">⚠ Please confirm</div>
        <p class="text-muted mb-4" style="font-size:14px;">${escapeHtml(message)}</p>
        <div class="flex gap-2 justify-end">
          <button class="btn btn-ghost btn-sm" id="confirm-cancel">Cancel</button>
          <button class="btn btn-primary btn-sm" id="confirm-ok">Confirm</button>
        </div>
      </div>
    </div>`);
  document.body.appendChild(overlay);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
  document.getElementById("confirm-cancel").addEventListener("click", () => overlay.remove());
  document.getElementById("confirm-ok").addEventListener("click", () => { overlay.remove(); onConfirm(); });
}

/* ---------- Demo-scan disclaimer (report Part 25) ---------- */
function demoScanLabelHtml() {
  return `<span class="badge badge-grey" title="This simulates plate recognition — it is not a real ANPR engine.">🎬 Demo Scan</span>`;
}