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
function renderNav(activeRole) {
  const mount = document.getElementById("nav-root");
  if (!mount) return;
  const role = Store.currentRole();
  const name = Store.currentName();

  let actions = "";
  if (role) {
    const roleLabel = role === "staff" ? "🛡️ Security Desk" : "📊 Admin";
    actions = `
      <span class="role-chip">${roleLabel} · ${escapeHtml(name)}</span>
      <button class="btn btn-ghost btn-sm danger" id="nav-logout">⎋ Logout</button>
    `;
  } else {
    actions = `
      <a href="register.html" class="btn btn-ghost btn-sm">Register Vehicle</a>
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
  if (Store.currentRole() !== role) {
    window.location.href = loginPage;
  }
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