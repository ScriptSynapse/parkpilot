/* js/student.js — Ongoing status management for the university user
   (report Part 1.4 / 1.7 and the "Ongoing Status Management" workflow step). */
document.addEventListener("DOMContentLoaded", () => {
  renderNav();

  const lookupView = document.getElementById("lookup-view");
  const dashboardView = document.getElementById("dashboard-view");
  const session = Auth.session();

  if (session && session.role === "student" && session.vehicleId && Store.getVehicleById(session.vehicleId)) {
    showDashboard(session.vehicleId);
  } else {
    showLookup();
  }

  function showLookup() {
    dashboardView.classList.add("hidden");
    lookupView.classList.remove("hidden");
  }

  document.getElementById("lookup-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    const errorBox = document.getElementById("lookup-error");
    errorBox.classList.add("hidden");

    const vehicle = Store.getVehicleByRegistrationId(data.query) || Store.findVehicleByPlate(data.query);
    if (!vehicle || vehicle.mobile !== data.mobile.trim()) {
      errorBox.textContent = "❌ No matching registration found for that ID/plate and mobile number.";
      errorBox.classList.remove("hidden");
      return;
    }
    Auth.login("student", vehicle.studentName, { vehicleId: vehicle.id });
    toast(`Welcome, ${vehicle.studentName.split(" ")[0]}`);
    showDashboard(vehicle.id);
  });

  document.getElementById("switch-vehicle").addEventListener("click", () => {
    Auth.logout();
    showLookup();
  });

  /* ---------- Tabs ---------- */
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.add("hidden"));
      document.getElementById(`panel-${btn.dataset.tab}`).classList.remove("hidden");
    });
  });

  function showDashboard(vehicleId) {
    lookupView.classList.add("hidden");
    dashboardView.classList.remove("hidden");
    const vehicle = Store.getVehicleById(vehicleId);
    document.getElementById("student-name").textContent = vehicle.studentName;

    renderStatus(vehicle);
    renderPass(vehicle);
    renderRequests(vehicle);
    renderNotifications("notifications-list", "student", vehicle.id);
  }

  function renderStatus(vehicle) {
    const sticker = Store.getStickerForVehicle(vehicle.id);
    const rows = [
      ["Registration ID", vehicle.registrationId],
      ["Vehicle Number", vehicle.vehicleNumber],
      ["Registration Date", fmtDate(vehicle.registeredAt)],
      ["Current Status", statusBadge(vehicle.status)],
      ["Verification Status", statusBadge(vehicle.verificationStatus)],
      ["Sticker Status", sticker ? `${statusBadge(sticker.status)} <span class="mono text-faint">${escapeHtml(sticker.stickerId)}</span>` : `<span class="text-faint">Not Issued</span>`],
      ["Last Updated", fmtDateTime(vehicle.lastUpdated)],
    ];
    document.getElementById("status-grid").innerHTML = rows.map(([l, v]) => `
      <div class="kv-tile"><div class="kv-label">${escapeHtml(l)}</div><div class="kv-value">${v}</div></div>`).join("");

    const verifications = Store.getVerificationsForVehicle(vehicle.id).slice().reverse();
    const history = document.getElementById("verification-history");
    if (verifications.length === 0) {
      history.innerHTML = `<div class="text-faint" style="font-size:13px;">No physical verification attempt yet. Visit the campus gate with your temporary pass.</div>`;
    } else {
      history.innerHTML = verifications.map((v) => `
        <div class="timeline-item">
          <b>${v.result === "verified" ? "✅ Verified" : "⚠️ Rejected"}</b> by ${escapeHtml(v.guardName)}
          <div class="text-faint">${fmtDateTime(v.timestamp)}${v.notes ? " — " + escapeHtml(v.notes) : ""}</div>
        </div>`).join("");
    }
  }

  function renderPass(vehicle) {
    document.getElementById("pass-mount").innerHTML = verificationPassCardHtml(vehicle);
    mountVerificationPassQr(vehicle);
  }

  function renderRequests(vehicle) {
    const typeSelect = document.getElementById("request-type");
    if (!typeSelect.dataset.filled) {
      Store.REQUEST_TYPES.forEach((t) => typeSelect.appendChild(new Option(t, t)));
      typeSelect.dataset.filled = "1";
    }
    document.getElementById("request-form").onsubmit = (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target).entries());
      Store.addUpdateRequest({ vehicleId: vehicle.id, type: data.type, details: { note: data.details }, requestedBy: vehicle.studentName });
      toast("Update request submitted for admin review");
      e.target.reset();
      renderRequestsList(vehicle);
    };
    renderRequestsList(vehicle);
  }

  function renderRequestsList(vehicle) {
    const list = document.getElementById("requests-list");
    const requests = Store.getUpdateRequestsForVehicle(vehicle.id).slice().reverse();
    if (requests.length === 0) { list.innerHTML = emptyState("✏️", "No update requests yet"); return; }
    list.innerHTML = requests.map((r) => `
      <div class="list-row">
        <div><div style="font-size:14px; font-weight:600;">${escapeHtml(r.type)}</div><div class="text-faint" style="font-size:12px;">${escapeHtml(r.details?.note || "")}</div></div>
        <div class="flex items-center gap-2 text-faint" style="font-size:12px;">
          <span>${fmtDateTime(r.requestedAt)}</span>${statusBadge(r.status)}
        </div>
      </div>`).join("");
  }
});
