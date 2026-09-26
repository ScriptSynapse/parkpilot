/* js/admin.js — Centralized Administrative Dashboard (report Part 13) */
document.addEventListener("DOMContentLoaded", () => {
  requireRole(["admin", "itadmin"], "admin-login.html");
  renderNav();

  const adminName = Store.currentName();
  const adminRole = Store.currentRole();

  /* ---------- Sub-tabs ---------- */
  const subButtons = document.querySelectorAll(".subtab-btn");
  subButtons.forEach((btn) => {
    btn.addEventListener("click", () => activateSub(btn.dataset.sub));
  });
  function activateSub(sub) {
    subButtons.forEach((b) => b.classList.toggle("active", b.dataset.sub === sub));
    document.querySelectorAll(".sub-panel").forEach((p) => p.classList.add("hidden"));
    document.getElementById(`sub-${sub}`).classList.remove("hidden");
    if (sub === "vehicles") renderVehicleTable();
    if (sub === "visitors") renderVisitorTable();
    if (sub === "incidents") renderIncidentsPanel();
    if (sub === "audit") renderAuditPanel();
    if (sub === "users") renderUsersPanel();
  }

  /* ===================== OVERVIEW (Part 14) ===================== */
  function renderOverview() {
    const vehicles = Store.getVehicles();
    const scans = Store.getScans();
    const incidents = Store.getIncidents();
    const visitors = Store.getVisitorRecords();
    const today = new Date().toISOString().slice(0, 10);

    document.getElementById("stat-total").textContent = vehicles.length;
    document.getElementById("stat-active").textContent = vehicles.filter((v) => v.status === Store.VEHICLE_STATUS.ACTIVE).length;
    document.getElementById("stat-pending").textContent = vehicles.filter((v) => v.status === Store.VEHICLE_STATUS.PENDING).length;
    document.getElementById("stat-suspended").textContent = vehicles.filter((v) => v.status === Store.VEHICLE_STATUS.SUSPENDED).length;
    document.getElementById("stat-revoked").textContent = vehicles.filter((v) => v.status === Store.VEHICLE_STATUS.REVOKED).length;
    document.getElementById("stat-visitors-oncampus").textContent = visitors.filter((v) => v.status === Store.VISITOR_STATUS.ON_CAMPUS).length;
    document.getElementById("stat-incidents-new").textContent = incidents.filter((i) => i.status === Store.INCIDENT_STATUS.NEW).length;
    document.getElementById("stat-incidents-resolved").textContent = incidents.filter((i) => i.status === Store.INCIDENT_STATUS.RESOLVED || i.status === Store.INCIDENT_STATUS.CLOSED).length;

    const chartColors = { blue: "#1d4ed8", purple: "#0f172a", teal: "#0d9488", amber: "#d97706", grid: "rgba(15,23,42,.08)", text: "#475569" };
    Chart.defaults.color = chartColors.text;
    Chart.defaults.font.size = 12;

    const trendDays = [], trendCounts = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      trendDays.push(d.toLocaleDateString("en-IN", { weekday: "short" }));
      trendCounts.push(scans.filter((s) => s.timestamp.slice(0, 10) === key).length);
    }
    new Chart(document.getElementById("trendChart"), {
      type: "line",
      data: { labels: trendDays, datasets: [{ label: "Scans", data: trendCounts, borderColor: chartColors.blue, backgroundColor: "rgba(79,124,255,.25)", fill: true, tension: 0.35, pointRadius: 3 }] },
      options: { plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: chartColors.grid }, beginAtZero: true, ticks: { precision: 0 } } } },
    });

    const typeMap = {};
    vehicles.forEach((v) => (typeMap[v.vehicleType] = (typeMap[v.vehicleType] || 0) + 1));
    new Chart(document.getElementById("typeChart"), {
      type: "doughnut",
      data: { labels: Object.keys(typeMap), datasets: [{ data: Object.values(typeMap), backgroundColor: [chartColors.blue, chartColors.purple, chartColors.teal, chartColors.amber] }] },
      options: { plugins: { legend: { position: "bottom" } } },
    });

    const deptMap = {};
    vehicles.forEach((v) => (deptMap[v.department] = (deptMap[v.department] || 0) + 1));
    new Chart(document.getElementById("deptChart"), {
      type: "bar",
      data: { labels: Object.keys(deptMap).map((d) => d.split(" ")[0]), datasets: [{ label: "Vehicles", data: Object.values(deptMap), backgroundColor: chartColors.purple, borderRadius: 6 }] },
      options: { plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: chartColors.grid }, beginAtZero: true, ticks: { precision: 0 } } } },
    });

    document.getElementById("recent-vehicle-events").innerHTML = Store.getAuditLogs().filter((l) => l.recordType === "Vehicle").slice().reverse().slice(0, 6).map((l) => `
      <div class="list-row">
        <div><div style="font-size:13px; font-weight:600;">${escapeHtml(l.action)}</div><div class="mono text-faint" style="font-size:12px;">${escapeHtml(l.recordId)}</div></div>
        <span class="text-faint" style="font-size:12px;">${fmtDateTime(l.timestamp)}</span>
      </div>`).join("") || emptyState("🚗", "No vehicle events yet");

    document.getElementById("recent-visitor-events").innerHTML = Store.getAuditLogs().filter((l) => l.recordType === "Visitor").slice().reverse().slice(0, 6).map((l) => `
      <div class="list-row">
        <div><div style="font-size:13px; font-weight:600;">${escapeHtml(l.action)}</div><div class="mono text-faint" style="font-size:12px;">${escapeHtml(l.recordId)}</div></div>
        <span class="text-faint" style="font-size:12px;">${fmtDateTime(l.timestamp)}</span>
      </div>`).join("") || emptyState("🧑‍💼", "No visitor events yet");

    document.getElementById("recent-incidents").innerHTML = incidents.slice().reverse().slice(0, 6).map((i) => `
      <div class="list-row">
        <div><div class="mono" style="font-size:13px; font-weight:600;">${escapeHtml(i.vehicleNumber || "—")}</div><div class="text-faint" style="font-size:12px;">${escapeHtml(i.issueType)}</div></div>
        ${statusBadge(i.status)}
      </div>`).join("") || emptyState("🚨", "No incidents yet");

    document.getElementById("pending-verifications").innerHTML = vehicles.filter((v) => v.status === Store.VEHICLE_STATUS.PENDING).slice(0, 6).map((v) => `
      <div class="list-row">
        <div><div style="font-size:13px; font-weight:600;">${escapeHtml(v.studentName)}</div><div class="mono text-faint" style="font-size:12px;">${escapeHtml(v.registrationId)} · ${escapeHtml(v.vehicleNumber)}</div></div>
        ${statusBadge(v.status)}
      </div>`).join("") || emptyState("⏳", "No pending verifications");
  }
  renderOverview();

  /* ===================== VEHICLE MANAGEMENT (Part 15) ===================== */
  const statusFilter = document.getElementById("vehicle-status-filter");
  Object.values(Store.VEHICLE_STATUS).forEach((s) => statusFilter.appendChild(new Option(s, s)));
  const categoryFilter = document.getElementById("vehicle-category-filter");
  Store.CATEGORY_LIST.forEach((c) => categoryFilter.appendChild(new Option(c, c)));
  document.getElementById("vehicle-search").addEventListener("input", renderVehicleTable);
  statusFilter.addEventListener("change", renderVehicleTable);
  categoryFilter.addEventListener("change", renderVehicleTable);

  function renderVehicleTable() {
    const q = document.getElementById("vehicle-search").value.trim().toLowerCase();
    const statusQ = statusFilter.value;
    const catQ = categoryFilter.value;
    let list = Store.getVehicles();
    if (q) list = list.filter((v) => [v.vehicleNumber, v.studentId, v.studentName, v.registrationId, v.stickerId].join(" ").toLowerCase().includes(q));
    if (statusQ) list = list.filter((v) => v.status === statusQ);
    if (catQ) list = list.filter((v) => v.category === catQ);

    const tbody = document.getElementById("vehicle-table-body");
    if (list.length === 0) { tbody.innerHTML = `<tr><td colspan="7" class="text-faint text-center" style="padding:24px;">No vehicles match your search.</td></tr>`; return; }
    tbody.innerHTML = list.slice().reverse().map((v) => `
      <tr>
        <td>${escapeHtml(v.studentName)}</td>
        <td class="text-muted">${escapeHtml(v.category)}</td>
        <td class="mono text-muted">${escapeHtml(v.registrationId)}</td>
        <td class="mono" style="color:var(--blue-soft);">${escapeHtml(v.vehicleNumber)}</td>
        <td>${statusBadge(v.status)}</td>
        <td class="mono text-muted" style="font-size:12px;">${escapeHtml(v.stickerId || "—")}</td>
        <td><button class="btn btn-ghost btn-sm" data-open-vehicle="${v.id}">Open</button></td>
      </tr>`).join("");
    tbody.querySelectorAll("[data-open-vehicle]").forEach((btn) => btn.addEventListener("click", () => openVehicleDetail(btn.dataset.openVehicle)));
  }
  renderVehicleTable();

  function openVehicleDetail(vehicleId) {
    const vehicle = Store.getVehicleById(vehicleId);
    const mount = document.getElementById("vehicle-detail-mount");
    if (!vehicle) { mount.innerHTML = ""; return; }
    const sticker = Store.getStickerForVehicle(vehicle.id);
    const verifications = Store.getVerificationsForVehicle(vehicle.id).slice().reverse();
    const incidents = Store.getIncidents().filter((i) => i.vehicleNumber === vehicle.vehicleNumber);
    const requests = Store.getUpdateRequestsForVehicle(vehicle.id).slice().reverse();

    mount.innerHTML = `
      <div class="glass p-6">
        <div class="flex justify-between items-start wrap mb-3 gap-2">
          <div>
            <div style="font-weight:800; font-size:17px;">${escapeHtml(vehicle.studentName)} <span class="text-faint" style="font-weight:400; font-size:13px;">· ${escapeHtml(vehicle.category)}</span></div>
            <div class="mono text-faint" style="font-size:12px;">${escapeHtml(vehicle.registrationId)} · ${escapeHtml(vehicle.studentId)} · ${escapeHtml(vehicle.department)}</div>
          </div>
          ${statusBadge(vehicle.status)}
        </div>

        <div class="kv-grid mb-3">
          ${kvTile("Vehicle", `${escapeHtml(vehicle.vehicleNumber)} · ${escapeHtml(vehicle.vehicleType)}`)}
          ${kvTile("Brand / Model / Color", `${escapeHtml(vehicle.brand)} ${escapeHtml(vehicle.model)} · ${escapeHtml(vehicle.color)}`)}
          ${kvTile("Verification Status", statusBadge(vehicle.verificationStatus))}
          ${kvTile("Sticker", sticker ? `<span class="mono">${escapeHtml(sticker.id)}</span> ${statusBadge(sticker.status)}` : "Not Issued")}
          ${kvTile("Contact (authorized)", `${escapeHtml(vehicle.mobile)}${vehicle.altMobile ? " / " + escapeHtml(vehicle.altMobile) : ""} · ${escapeHtml(vehicle.email)}`)}
          ${kvTile("Registered", `${fmtDateTime(vehicle.registeredAt)} · Last updated ${fmtDateTime(vehicle.lastUpdated)}`)}
        </div>

        <div class="flex gap-2 wrap mb-4">
          ${vehicle.status === Store.VEHICLE_STATUS.PENDING ? `<button class="btn btn-primary btn-sm" data-action="approve">✅ Approve / Verify</button>` : ""}
          ${vehicle.status === Store.VEHICLE_STATUS.ACTIVE ? `<button class="btn btn-ghost btn-sm" data-action="suspend">⏸ Suspend</button><button class="btn btn-ghost danger btn-sm" data-action="revoke">⛔ Revoke</button>` : ""}
          ${vehicle.status === Store.VEHICLE_STATUS.SUSPENDED ? `<button class="btn btn-ghost btn-sm" data-action="reactivate">▶ Reactivate</button><button class="btn btn-ghost danger btn-sm" data-action="revoke">⛔ Revoke</button>` : ""}
          <button class="btn btn-ghost btn-sm" data-action="update">✏ Update Record</button>
        </div>

        <div class="grid grid-2 gap-3">
          <div>
            <div style="font-weight:700; font-size:13px; margin-bottom:8px;">Verification History</div>
            <div class="timeline mb-3">${verifications.map((v) => `<div class="timeline-item"><b>${v.result === "verified" ? "✅ Verified" : "⚠️ Rejected"}</b> by ${escapeHtml(v.guardName)}<div class="text-faint">${fmtDateTime(v.timestamp)}</div></div>`).join("") || `<div class="text-faint" style="font-size:13px;">No verification attempts yet.</div>`}</div>
            <div style="font-weight:700; font-size:13px; margin-bottom:8px;">Update Requests</div>
            <div class="flex-col gap-2">${requests.map((r) => `
              <div class="list-row" style="padding:10px 0;">
                <div><div style="font-size:13px; font-weight:600;">${escapeHtml(r.type)}</div><div class="text-faint" style="font-size:12px;">${escapeHtml(r.details?.note || "")}</div></div>
                <div class="flex items-center gap-2">
                  ${statusBadge(r.status)}
                  ${r.status === Store.REQUEST_STATUS.PENDING ? `<button class="btn btn-ghost btn-sm" data-request-approve="${r.id}">Approve</button><button class="btn btn-ghost danger btn-sm" data-request-reject="${r.id}">Reject</button>` : ""}
                </div>
              </div>`).join("") || `<div class="text-faint" style="font-size:13px;">No update requests.</div>`}</div>
          </div>
          <div>
            <div style="font-weight:700; font-size:13px; margin-bottom:8px;">Incident History</div>
            <div class="flex-col gap-2">${incidents.map((i) => `
              <div class="list-row" style="padding:10px 0;">
                <div><div style="font-size:13px; font-weight:600;">${escapeHtml(i.issueType)}</div><div class="text-faint" style="font-size:12px;">${escapeHtml(i.location)} · ${fmtDateTime(i.timestamp)}</div></div>
                ${statusBadge(i.status)}
              </div>`).join("") || `<div class="text-faint" style="font-size:13px;">No incidents for this vehicle.</div>`}</div>
          </div>
        </div>
      </div>`;

    mount.querySelector('[data-action="approve"]')?.addEventListener("click", () => {
      Store.verifyVehicle({ vehicleId: vehicle.id, guardName: adminName, checklist: { adminOverride: true }, result: "verified", notes: "Approved administratively.", actorRole: adminRole });
      Store.issueSticker({ vehicleId: vehicle.id, guardName: adminName, actorRole: adminRole });
      toast("Vehicle approved, verified, and sticker issued");
      openVehicleDetail(vehicle.id); renderVehicleTable(); renderOverview();
    });
    mount.querySelector('[data-action="suspend"]')?.addEventListener("click", () => {
      confirmDialog(`Suspend vehicle ${vehicle.vehicleNumber}? The owner will be notified.`, () => {
        Store.suspendVehicle(vehicle.id, adminName, adminRole, "Suspended by administrator.");
        toast("Vehicle suspended"); openVehicleDetail(vehicle.id); renderVehicleTable(); renderOverview();
      });
    });
    mount.querySelector('[data-action="reactivate"]')?.addEventListener("click", () => {
      confirmDialog(`Reactivate vehicle ${vehicle.vehicleNumber}?`, () => {
        Store.reactivateVehicle(vehicle.id, adminName, adminRole, "Reactivated by administrator.");
        toast("Vehicle reactivated"); openVehicleDetail(vehicle.id); renderVehicleTable(); renderOverview();
      });
    });
    mount.querySelector('[data-action="revoke"]')?.addEventListener("click", () => {
      confirmDialog(`Revoke vehicle ${vehicle.vehicleNumber}? This cannot be easily undone.`, () => {
        Store.revokeVehicle(vehicle.id, adminName, adminRole, "Revoked by administrator.");
        toast("Vehicle revoked", "red"); openVehicleDetail(vehicle.id); renderVehicleTable(); renderOverview();
      });
    });
    mount.querySelector('[data-action="update"]')?.addEventListener("click", () => {
      const parkingStatus = window.prompt("Parking status:", vehicle.parkingStatus) ?? vehicle.parkingStatus;
      const altMobile = window.prompt("Alternate mobile number:", vehicle.altMobile || "") ?? vehicle.altMobile;
      Store.updateVehicleAdmin(vehicle.id, { parkingStatus, altMobile }, adminName, adminRole);
      toast("Vehicle record updated"); openVehicleDetail(vehicle.id); renderVehicleTable();
    });
    mount.querySelectorAll("[data-request-approve]").forEach((btn) => btn.addEventListener("click", () => {
      Store.resolveUpdateRequest(btn.dataset.requestApprove, Store.REQUEST_STATUS.APPROVED, adminName, adminRole, "");
      toast("Update request approved"); openVehicleDetail(vehicle.id);
    }));
    mount.querySelectorAll("[data-request-reject]").forEach((btn) => btn.addEventListener("click", () => {
      Store.resolveUpdateRequest(btn.dataset.requestReject, Store.REQUEST_STATUS.REJECTED, adminName, adminRole, "");
      toast("Update request rejected"); openVehicleDetail(vehicle.id);
    }));
  }

  /* ---------- CSV export (existing, preserved) ---------- */
  document.getElementById("export-csv").addEventListener("click", () => {
    const vehicles = Store.getVehicles();
    const headers = ["Registration ID", "Student Name", "Category", "Student ID", "Department", "Vehicle Number", "Vehicle Type", "Brand", "Model", "Status", "Sticker ID", "Registered At"];
    const rows = vehicles.map((v) => [v.registrationId, v.studentName, v.category, v.studentId, v.department, v.vehicleNumber, v.vehicleType, v.brand, v.model, v.status, v.stickerId || "", v.registeredAt]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "vehicle-registrations.csv"; a.click();
    URL.revokeObjectURL(url);
    toast("CSV exported");
  });

  /* ===================== VISITOR REGISTRY (Part 16) ===================== */
  const visitorStatusFilter = document.getElementById("visitor-status-filter");
  Object.values(Store.VISITOR_STATUS).forEach((s) => visitorStatusFilter.appendChild(new Option(s, s)));
  const visitorDeptFilter = document.getElementById("visitor-dept-filter");
  Store.DEPARTMENTS.forEach((d) => visitorDeptFilter.appendChild(new Option(d, d)));
  document.getElementById("visitor-search").addEventListener("input", renderVisitorTable);
  visitorStatusFilter.addEventListener("change", renderVisitorTable);
  visitorDeptFilter.addEventListener("change", renderVisitorTable);

  function renderVisitorTable() {
    const q = document.getElementById("visitor-search").value.trim().toLowerCase();
    const statusQ = visitorStatusFilter.value;
    const deptQ = visitorDeptFilter.value;
    let list = Store.getVisitorRecords();
    if (q) list = list.filter((v) => [v.fullName, v.host, v.vehicleNumber, v.id].join(" ").toLowerCase().includes(q));
    if (statusQ) list = list.filter((v) => v.status === statusQ);
    if (deptQ) list = list.filter((v) => v.department === deptQ);

    const tbody = document.getElementById("visitor-table-body");
    if (list.length === 0) { tbody.innerHTML = `<tr><td colspan="9" class="text-faint text-center" style="padding:24px;">No visitors match your search.</td></tr>`; return; }
    tbody.innerHTML = list.slice().reverse().map((v) => {
      const log = Store.getEntryExitLogs().filter((l) => l.refId === v.id).sort((a, b) => new Date(b.entryTime) - new Date(a.entryTime))[0];
      return `
      <tr>
        <td class="mono text-muted">${escapeHtml(v.id)}</td>
        <td>${escapeHtml(v.fullName)}</td>
        <td class="mono text-muted">${escapeHtml(v.vehicleNumber || "—")}</td>
        <td class="text-muted">${escapeHtml(v.host)}</td>
        <td class="text-muted">${escapeHtml(v.department)}</td>
        <td class="text-muted">${escapeHtml(v.purpose)}</td>
        <td class="text-faint" style="font-size:12px;">${log ? fmtDateTime(log.entryTime) : "—"}</td>
        <td class="text-faint" style="font-size:12px;">${log && log.exitTime ? fmtDateTime(log.exitTime) : "—"}</td>
        <td>${statusBadge(v.status)}</td>
      </tr>`;
    }).join("");
  }

  /* ===================== INCIDENT MANAGEMENT (Part 17) ===================== */
  function renderIncidentsPanel() {
    renderIncidentsList("admin-incidents-list", Store.getIncidents(), { adminActions: true });
    document.querySelectorAll("[data-incident-open]").forEach((btn) => btn.addEventListener("click", () => openIncidentDetail(btn.dataset.incidentOpen)));
  }

  function openIncidentDetail(id) {
    const inc = Store.getIncidentById(id);
    const mount = document.getElementById("incident-detail-mount");
    if (!inc) return;
    mount.innerHTML = `
      <div class="glass p-6">
        ${incidentDetailHtml(inc)}
        <div class="flex-col gap-2 mt-3">
          <label class="field"><span class="field-label">Assign To</span>
            <input type="text" id="assign-input" placeholder="e.g. Dean of Students" value="${escapeHtml(inc.assignedAdmin || "")}" /></label>
          <label class="field"><span class="field-label">Action / Resolution Note</span>
            <input type="text" id="action-input" placeholder="Describe the action or resolution" /></label>
          <div class="flex gap-2 wrap">
            <button class="btn btn-ghost btn-sm" id="assign-btn">👤 Assign</button>
            <button class="btn btn-ghost btn-sm" id="action-btn">📝 Add Action</button>
            <button class="btn btn-primary btn-sm" id="resolve-btn">✅ Mark Resolved</button>
            <button class="btn btn-ghost danger btn-sm" id="close-btn">🗄️ Close Incident</button>
          </div>
        </div>
      </div>`;

    document.getElementById("assign-btn").addEventListener("click", () => {
      const admin = document.getElementById("assign-input").value.trim();
      if (!admin) return;
      Store.updateIncident(inc.id, { assignedAdmin: admin }, adminName, adminRole, `Assigned to ${admin}`);
      toast("Incident assigned"); openIncidentDetail(inc.id); renderIncidentsPanel();
    });
    document.getElementById("action-btn").addEventListener("click", () => {
      const note = document.getElementById("action-input").value.trim();
      if (!note) return toast("Enter an action note first", "red");
      Store.updateIncident(inc.id, { status: Store.INCIDENT_STATUS.IN_PROGRESS }, adminName, adminRole, note);
      toast("Action recorded"); openIncidentDetail(inc.id); renderIncidentsPanel();
    });
    document.getElementById("resolve-btn").addEventListener("click", () => {
      const note = document.getElementById("action-input").value.trim() || "Marked resolved.";
      Store.updateIncident(inc.id, { status: Store.INCIDENT_STATUS.RESOLVED, resolution: note }, adminName, adminRole, note);
      toast("Incident marked Resolved"); openIncidentDetail(inc.id); renderIncidentsPanel(); renderOverview();
    });
    document.getElementById("close-btn").addEventListener("click", () => {
      confirmDialog(`Close incident ${inc.id}? This archives it.`, () => {
        Store.updateIncident(inc.id, { status: Store.INCIDENT_STATUS.CLOSED }, adminName, adminRole, "Closed.");
        toast("Incident closed"); openIncidentDetail(inc.id); renderIncidentsPanel(); renderOverview();
      });
    });
  }

  /* ===================== AUDIT LOGS (Part 18) ===================== */
  function renderAuditPanel() {
    renderAuditLogs("audit-log-list", {});
    document.getElementById("audit-search").oninput = applyAuditFilters;
    document.getElementById("audit-type-filter").onchange = applyAuditFilters;
  }
  function applyAuditFilters() {
    renderAuditLogs("audit-log-list", {
      query: document.getElementById("audit-search").value,
      recordType: document.getElementById("audit-type-filter").value,
    });
  }

  /* ===================== USER & ROLE MANAGEMENT (Part 19) ===================== */
  function renderUsersPanel() {
    const roles = [
      ["Student / Faculty / Staff", "student", ["view_own_vehicle", "view_own_pass", "request_update"]],
      ["Visitor", "visitor", ["view_own_pass"]],
      ["Security Guard", "staff", ["lookup_vehicle", "verify_vehicle", "issue_sticker", "scan_visitor_pass", "record_visitor_entry", "record_visitor_exit", "report_incident"]],
      ["Authorized Administrator", "admin", ["manage_vehicles", "suspend_vehicle", "revoke_vehicle", "manage_visitors", "manage_incidents", "resolve_update_request", "view_audit_logs"]],
      ["IT / System Administrator", "itadmin", ["manage_users", "manage_roles", "technical_config", "view_audit_logs"]],
    ];
    document.getElementById("roles-table").innerHTML = `
      <table><thead><tr><th>Role</th><th>Key</th><th>Permissions</th></tr></thead>
      <tbody>${roles.map(([label, key, perms]) => `
        <tr><td style="font-weight:600;">${escapeHtml(label)}</td><td class="mono text-muted">${escapeHtml(key)}</td>
        <td class="text-muted" style="font-size:12.5px;">${perms.map((p) => `<span class="badge badge-grey" style="margin:2px;">${escapeHtml(p)}</span>`).join("")}</td></tr>`).join("")}</tbody></table>`;

    const pending = Store.getUpdateRequests().filter((r) => r.status === Store.REQUEST_STATUS.PENDING);
    document.getElementById("pending-requests-list").innerHTML = pending.length === 0 ? emptyState("✏️", "No pending update requests") :
      pending.map((r) => {
        const vehicle = Store.getVehicleById(r.vehicleId);
        return `<div class="list-row">
          <div><div style="font-size:13px; font-weight:600;">${escapeHtml(r.type)}</div><div class="text-faint" style="font-size:12px;">${escapeHtml(vehicle ? vehicle.vehicleNumber : "")} · ${escapeHtml(r.requestedBy)}</div></div>
          <button class="btn btn-ghost btn-sm" data-goto-vehicle="${r.vehicleId}">Open Vehicle</button>
        </div>`;
      }).join("");
    document.querySelectorAll("[data-goto-vehicle]").forEach((btn) => btn.addEventListener("click", () => {
      activateSub("vehicles");
      openVehicleDetail(btn.dataset.gotoVehicle);
    }));
  }
});
