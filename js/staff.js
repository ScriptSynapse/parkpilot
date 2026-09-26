/* js/staff.js — Guard Portal (report Part 10 and the GUARD workflow) */
document.addEventListener("DOMContentLoaded", () => {
  requireRole("staff", "staff-login.html");
  renderNav();

  const staffName = Store.currentName();
  document.getElementById("staff-name").textContent = staffName;
  document.getElementById("scan-demo-label").innerHTML = demoScanLabelHtml();

  /* ---------- Tabs ---------- */
  const tabButtons = document.querySelectorAll(".tab-btn");
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => activateTab(btn.dataset.tab));
  });
  function activateTab(tab) {
    tabButtons.forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.add("hidden"));
    document.getElementById(`panel-${tab}`).classList.remove("hidden");
    if (tab === "recent") renderScans();
    if (tab === "incidents") renderIncidentsTab();
    if (tab === "notifications") renderNotificationsTab();
    if (tab === "visitorexit") renderOnCampusList();
  }

  refreshBadges();
  function refreshBadges() {
    const newIncidents = Store.getIncidents().filter((i) => i.status === Store.INCIDENT_STATUS.NEW).length;
    const incBadge = document.getElementById("incident-count");
    incBadge.textContent = newIncidents;
    incBadge.classList.toggle("hidden", newIncidents === 0);

    const unread = unreadNotificationCount("staff", null);
    const notifBadge = document.getElementById("notif-count");
    notifBadge.textContent = unread;
    notifBadge.classList.toggle("hidden", unread === 0);
  }

  /* ---------- Quick plate chips ---------- */
  const quickPlates = document.getElementById("quick-plates");
  Store.getVehicles().slice(0, 3).forEach((v) => {
    const chip = el(`<button type="button" class="badge badge-grey mono" style="cursor:pointer;">${escapeHtml(v.vehicleNumber)}</button>`);
    chip.addEventListener("click", () => { document.getElementById("manual-plate").value = v.vehicleNumber; doSearch(v.vehicleNumber); });
    quickPlates.appendChild(chip);
  });

  /* ---------- Manual search ---------- */
  document.getElementById("manual-form").addEventListener("submit", (e) => {
    e.preventDefault();
    doSearch(document.getElementById("manual-plate").value);
  });

  /* ---------- Camera / upload simulation (Demo Scan — report Part 25) ---------- */
  document.getElementById("webcam-btn").addEventListener("click", simulateScan);
  document.getElementById("upload-input").addEventListener("change", simulateScan);

  function simulateScan() {
    const box = document.getElementById("camera-box");
    box.innerHTML = `<div class="flex-col items-center gap-2"><span class="spin" style="font-size:20px;">⏳</span><span class="text-faint" style="font-size:12px;">Detecting plate (Demo Scan)...</span></div><div class="scan-line" style="animation-duration:1.2s;"></div>`;
    setTimeout(() => {
      const vehicles = Store.getVehicles();
      const useReal = Math.random() > 0.15 && vehicles.length > 0;
      const plate = useReal ? vehicles[Math.floor(Math.random() * vehicles.length)].vehicleNumber : "XX99ZZ0000";
      document.getElementById("manual-plate").value = plate;
      box.innerHTML = `<span class="text-faint" style="font-size:12px;" id="camera-placeholder">Live feed placeholder</span>`;
      doSearch(plate);
    }, 1400);
  }

  /* ---------- Search + result card (Part 4: operational info only, no phone/email) ---------- */
  function doSearch(plateRaw) {
    const plate = (plateRaw || "").trim().toUpperCase().replace(/\s+/g, "");
    if (!plate) return;
    const lookup = Store.lookupPlate(plate);
    Store.addScan({ vehicleNumber: plate, result: lookup.found ? "found" : "not_found", staffName });

    const resultArea = document.getElementById("result-area");
    if (lookup.kind === "vehicle") {
      const op = lookup.operational;
      toast(`${lookup.resultType} — ${plate}`);
      resultArea.innerHTML = `
        <div class="glass p-5">
          <div class="flex justify-between items-start mb-3">
            <div class="flex items-center gap-3">
              <div class="avatar" style="width:52px;height:52px;font-size:17px;">${initials(op.studentName)}</div>
              <div>
                <div style="font-weight:800;">${escapeHtml(op.category)}</div>
                <div class="text-faint" style="font-size:12px;">${escapeHtml(op.department)} · ${escapeHtml(op.className || "")}</div>
              </div>
            </div>
            ${statusBadge(lookup.resultType)}
          </div>
          <div class="mb-3">${plateHtml(op.vehicleNumber)}</div>
          <div class="grid grid-2 mb-3">
            ${infoTile("Current Status", statusBadge(op.status))}
            ${infoTile("Verification", statusBadge(op.verificationStatus))}
            ${infoTile("Vehicle", `${escapeHtml(op.brand)} ${escapeHtml(op.model)} · ${escapeHtml(op.color)}`)}
            ${infoTile("Registration ID", `<span class="mono">${escapeHtml(op.registrationId)}</span>`)}
            ${infoTile("Sticker", op.stickerId ? `<span class="mono">${escapeHtml(op.stickerId)}</span> ${statusBadge(op.stickerStatus)}` : `<span class="text-faint">Not Issued</span>`)}
            ${infoTile("Parking Status", escapeHtml(op.parkingStatus))}
          </div>
          <div class="sim-note mb-2">🔒 Personal contact details are restricted from the guard view.</div>
          <div class="flex gap-2 wrap">
            <button class="btn btn-primary" style="flex:1; min-width:140px;" id="goto-verify-btn">✅ Verify</button>
            <button class="btn btn-ghost amber" style="flex:1; min-width:140px;" id="report-incident-from-scan">🚨 Report Incident</button>
          </div>
        </div>`;
      document.getElementById("goto-verify-btn").addEventListener("click", () => {
        activateTab("verify");
        document.querySelector('#verify-lookup-form [name="query"]').value = op.vehicleNumber;
        runVerifyLookup(op.vehicleNumber);
      });
      document.getElementById("report-incident-from-scan").addEventListener("click", () => openIncidentModal(op.vehicleNumber));
    } else if (lookup.kind === "visitor") {
      const op = lookup.operational;
      toast(`${lookup.resultType} — ${plate}`);
      resultArea.innerHTML = `
        <div class="glass p-5">
          <div class="flex justify-between items-start mb-3">
            <div><div style="font-weight:800;">${escapeHtml(op.visitorName)}</div><div class="text-faint" style="font-size:12px;">Visiting ${escapeHtml(op.host)} · ${escapeHtml(op.department)}</div></div>
            ${statusBadge(lookup.resultType)}
          </div>
          <div class="mb-3">${plateHtml(op.vehicleNumber)}</div>
          <div class="grid grid-2 mb-3">
            ${infoTile("Visitor ID", `<span class="mono">${escapeHtml(op.visitorId)}</span>`)}
            ${infoTile("Status", statusBadge(op.status))}
          </div>
          <button class="btn btn-ghost btn-block" id="goto-visitorpass-btn">🪪 Open Visitor Pass Check</button>
        </div>`;
      document.getElementById("goto-visitorpass-btn").addEventListener("click", () => {
        activateTab("visitorpass");
        document.getElementById("visitor-query").value = op.visitorId;
      });
    } else {
      toast("Unregistered vehicle", "red");
      resultArea.innerHTML = `
        <div class="glass p-6 text-center">
          <div style="font-size:30px; margin-bottom:8px;">❓</div>
          <div style="font-weight:700;">UNREGISTERED VEHICLE</div>
          <div class="mono text-faint mt-1" style="font-size:16px;">${escapeHtml(plate)}</div>
          <p class="text-muted mt-2" style="font-size:14px;">This plate isn't in the central registry. It's not automatically treated as unauthorized — record an action for the office.</p>
          <button class="btn btn-ghost mt-3" id="unreg-action-btn">❓ Record Warning / Report to Office</button>
        </div>`;
      document.getElementById("unreg-action-btn").addEventListener("click", () => openUnregModal(plate));
    }
  }

  function infoTile(label, value) {
    return `<div class="p-4" style="background:var(--tint); border:1px solid var(--border); border-radius:12px;">
      <div class="text-faint" style="font-size:11px;">${label}</div>
      <div style="font-size:14px; font-weight:600;">${value || "—"}</div>
    </div>`;
  }

  /* ===================== Verify Vehicle tab (Part 2) ===================== */
  const CHECKLIST_ITEMS = [
    ["passVerified", "Digital verification pass verified"],
    ["numberMatches", "Vehicle number matches physical plate"],
    ["typeMatches", "Vehicle type matches"],
    ["detailsMatch", "Vehicle details match"],
    ["correspondsToRecord", "Vehicle corresponds to submitted record"],
  ];
  let verifyVehicleId = null;

  document.getElementById("verify-lookup-form").addEventListener("submit", (e) => {
    e.preventDefault();
    runVerifyLookup(new FormData(e.target).get("query"));
  });

  function runVerifyLookup(query) {
    const area = document.getElementById("verify-area");
    const vehicle = Store.getVehicleByRegistrationId(query) || Store.findVehicleByPlate(query);
    if (!vehicle) {
      area.innerHTML = emptyState("❌", "No matching registration", "Check the Registration ID or vehicle number and try again.");
      verifyVehicleId = null;
      return;
    }
    verifyVehicleId = vehicle.id;
    renderVerifyArea(vehicle);
  }

  function renderVerifyArea(vehicle) {
    const area = document.getElementById("verify-area");
    if (vehicle.status !== Store.VEHICLE_STATUS.PENDING) {
      area.innerHTML = `
        <div class="glass p-5">
          <div class="flex justify-between items-start mb-3">
            <div><div style="font-weight:800;">${escapeHtml(vehicle.category)} · ${escapeHtml(vehicle.department)}</div><div class="mono text-faint" style="font-size:12px;">${escapeHtml(vehicle.registrationId)}</div></div>
            ${statusBadge(vehicle.status)}
          </div>
          <div class="mb-3">${plateHtml(vehicle.vehicleNumber)}</div>
          <p class="text-muted" style="font-size:13.5px;">This vehicle isn't Pending Verification, so there's nothing to verify right now.</p>
          ${vehicle.status === Store.VEHICLE_STATUS.VERIFIED ? `<button class="btn btn-primary mt-3" id="open-sticker-from-verify">🏷️ Issue Sticker</button>` : ""}
        </div>`;
      const stickerBtn = document.getElementById("open-sticker-from-verify");
      if (stickerBtn) stickerBtn.addEventListener("click", () => openStickerModal(vehicle));
      return;
    }

    area.innerHTML = `
      <div class="glass p-5">
        <div class="flex justify-between items-start mb-3">
          <div><div style="font-weight:800;">${escapeHtml(vehicle.category)} · ${escapeHtml(vehicle.department)}</div><div class="mono text-faint" style="font-size:12px;">${escapeHtml(vehicle.registrationId)}</div></div>
          ${statusBadge(vehicle.status)}
        </div>
        <div class="mb-3">${plateHtml(vehicle.vehicleNumber)}</div>
        <div class="grid grid-2 mb-3">
          ${infoTile("Vehicle Type", escapeHtml(vehicle.vehicleType))}
          ${infoTile("Brand / Model", `${escapeHtml(vehicle.brand)} ${escapeHtml(vehicle.model)}`)}
          ${infoTile("Color", escapeHtml(vehicle.color))}
          ${infoTile("Verification Status", statusBadge(vehicle.verificationStatus))}
        </div>
        <div style="font-weight:700; font-size:13px; margin-bottom:8px;">Verification Checklist</div>
        <div class="checklist mb-3" id="checklist">
          ${CHECKLIST_ITEMS.map(([key, label]) => `
            <label class="checklist-item"><input type="checkbox" data-key="${key}" /> ${escapeHtml(label)}</label>`).join("")}
        </div>
        <div class="flex gap-2 wrap">
          <button class="btn btn-primary" id="verify-ok-btn" disabled>✅ Verify Vehicle</button>
          <button class="btn btn-ghost danger" id="verify-reject-btn">🚫 Reject / Refer</button>
        </div>
      </div>`;

    const checklistInputs = area.querySelectorAll('#checklist input[type="checkbox"]');
    const verifyOkBtn = document.getElementById("verify-ok-btn");
    checklistInputs.forEach((cb) => cb.addEventListener("change", () => {
      verifyOkBtn.disabled = ![...checklistInputs].every((c) => c.checked);
    }));

    verifyOkBtn.addEventListener("click", () => {
      const checklist = {};
      checklistInputs.forEach((cb) => (checklist[cb.dataset.key] = cb.checked));
      const record = Store.verifyVehicle({ vehicleId: vehicle.id, guardName: staffName, checklist, result: "verified" });
      toast("Vehicle verified — issue a sticker to activate it");
      const updated = Store.getVehicleById(vehicle.id);
      renderVerifyArea(updated);
      openStickerModal(updated);
    });

    document.getElementById("verify-reject-btn").addEventListener("click", () => {
      const notes = window.prompt("Reason for rejection / referral (shown to admin):", "Vehicle details do not match submitted record.") || "";
      const checklist = {};
      checklistInputs.forEach((cb) => (checklist[cb.dataset.key] = cb.checked));
      Store.verifyVehicle({ vehicleId: vehicle.id, guardName: staffName, checklist, result: "rejected", notes });
      toast("Verification rejected — referred for administrative review", "red");
      renderVerifyArea(Store.getVehicleById(vehicle.id));
    });
  }

  /* ---------- Sticker issuance modal (Part 3) ---------- */
  const stickerModal = document.getElementById("sticker-modal");
  document.getElementById("close-sticker-modal").addEventListener("click", () => stickerModal.classList.add("hidden"));
  stickerModal.addEventListener("click", (e) => { if (e.target === stickerModal) stickerModal.classList.add("hidden"); });

  function openStickerModal(vehicle) {
    document.getElementById("sticker-modal-vehicle").innerHTML = `
      ${plateHtml(vehicle.vehicleNumber)}
      <div class="mt-2 text-muted" style="font-size:13px;">${escapeHtml(vehicle.studentName)} · ${escapeHtml(vehicle.registrationId)}</div>`;
    stickerModal.classList.remove("hidden");
    const btn = document.getElementById("issue-sticker-btn");
    btn.disabled = false;
    btn.textContent = "🏷️ Issue Sticker ID";
    btn.onclick = () => {
      const sticker = Store.issueSticker({ vehicleId: vehicle.id, guardName: staffName });
      toast(`Sticker ${sticker.id} issued — vehicle is now Active`);
      btn.disabled = true;
      btn.textContent = `✅ Issued: ${sticker.id}`;
      renderVerifyArea(Store.getVehicleById(vehicle.id));
      setTimeout(() => stickerModal.classList.add("hidden"), 900);
    };
  }

  /* ===================== Scan Visitor Pass tab (Parts 7–8, QR toggle) ===================== */
  document.getElementById("visitor-lookup-form").addEventListener("submit", (e) => {
    e.preventDefault();
    performVisitorScan(document.getElementById("visitor-query").value);
  });
  document.getElementById("visitor-scan-btn").addEventListener("click", () => {
    const box = document.getElementById("visitor-camera-box");
    box.innerHTML = `<div class="flex-col items-center gap-2"><span class="spin" style="font-size:18px;">⏳</span><span class="text-faint" style="font-size:12px;">Scanning QR (Demo Scan)...</span></div>`;
    setTimeout(() => {
      const visitors = Store.getVisitorRecords().filter((v) => v.status !== Store.VISITOR_STATUS.EXITED);
      const pick = visitors[visitors.length - 1];
      box.innerHTML = `<span class="text-faint" style="font-size:12px;">Point camera at visitor's pass</span>`;
      if (pick) {
        document.getElementById("visitor-query").value = pick.id;
        performVisitorScan(pick.id);
      } else {
        toast("No visitor passes to demo-scan right now", "red");
      }
    }, 1100);
  });

  /** Scanning a visitor's QR is the action itself (as at a real gate):
   *  the first valid scan checks them in, the second checks them out. */
  function performVisitorScan(query) {
    const area = document.getElementById("visitor-pass-area");
    const result = Store.scanVisitorPass({ query, gate: "Main Gate", guardName: staffName });

    if (!result.ok) {
      toast(result.message, "red");
      area.innerHTML = `
        <div class="glass p-6 text-center">
          <div style="font-size:28px; margin-bottom:8px;">🚫</div>
          <div style="font-weight:700;">${result.code === "EXPIRED" ? "EXPIRED" : result.code === "USED" ? "ALREADY USED" : "INVALID / EXPIRED / ALREADY USED"}</div>
          ${result.visitor ? `<div class="text-faint mt-1" style="font-size:13px;">${escapeHtml(result.visitor.fullName)} · ${escapeHtml(result.visitor.id)}</div>` : ""}
          <p class="text-muted mt-2" style="font-size:14px;">${escapeHtml(result.message)} Refer visitor to manual security procedure.</p>
        </div>`;
      return;
    }

    const { visitor, pass, action } = result;
    const isEntry = action === "entry";
    toast(isEntry ? "Visitor Entry Recorded" : "Visitor Exit Recorded");
    area.innerHTML = `
      <div class="glass p-5">
        <div class="text-center mb-3" style="padding:10px; border-radius:12px; background:${isEntry ? "rgba(45,212,191,.1)" : "rgba(79,124,255,.1)"};">
          <div style="font-size:26px;">${isEntry ? "✅" : "🔵"}</div>
          <div style="font-weight:800; font-size:15px; color:${isEntry ? "var(--teal)" : "var(--blue-soft)"};">${isEntry ? "ENTRY RECORDED" : "EXIT RECORDED"}</div>
        </div>
        <div class="flex justify-between items-start mb-3">
          <div><div style="font-weight:800;">${escapeHtml(visitor.fullName)}</div><div class="text-faint" style="font-size:12px;">${escapeHtml(visitor.id)}</div></div>
          ${statusBadge(visitor.status)}
        </div>
        <div class="grid grid-2 mb-3">
          ${infoTile("Vehicle Number", visitor.vehicleNumber ? `<span class="mono">${escapeHtml(visitor.vehicleNumber)}</span>` : "On foot")}
          ${infoTile("Purpose", escapeHtml(visitor.purpose))}
          ${infoTile("Host", escapeHtml(visitor.host))}
          ${infoTile("Department", escapeHtml(visitor.department))}
          ${infoTile("Gate", "Main Gate")}
          ${infoTile("Pass Status", statusBadge(Store.computePassStatus(pass)))}
        </div>
        <p class="text-muted" style="font-size:13px;">${isEntry ? "Scan this same QR again when the visitor leaves to record their exit." : "This pass has now been fully used and cannot be scanned again."}</p>
      </div>`;
  }

  /* ===================== Visitor Exit tab (Part 9) ===================== */
  document.getElementById("exit-lookup-form").addEventListener("submit", (e) => {
    e.preventDefault();
    runExitLookup(new FormData(e.target).get("query"));
  });

  function runExitLookup(query) {
    const area = document.getElementById("exit-area");
    const q = (query || "").trim().toUpperCase();
    const visitor = Store.getVisitorById(q) || Store.getVisitorRecords().find((v) => (v.vehicleNumber || "").toUpperCase().replace(/\s+/g, "") === q.replace(/\s+/g, ""));
    if (!visitor) { area.innerHTML = emptyState("❌", "No matching visitor"); return; }
    renderExitCard(visitor);
  }

  function renderExitCard(visitor) {
    const area = document.getElementById("exit-area");
    area.innerHTML = `
      <div class="glass p-5">
        <div class="flex justify-between items-start mb-3">
          <div><div style="font-weight:800;">${escapeHtml(visitor.fullName)}</div><div class="text-faint" style="font-size:12px;">${escapeHtml(visitor.id)}</div></div>
          ${statusBadge(visitor.status)}
        </div>
        <div class="grid grid-2 mb-3">
          ${infoTile("Vehicle Number", visitor.vehicleNumber ? `<span class="mono">${escapeHtml(visitor.vehicleNumber)}</span>` : "On foot")}
          ${infoTile("Host", escapeHtml(visitor.host))}
        </div>
        ${visitor.status === Store.VISITOR_STATUS.ON_CAMPUS
          ? `<button class="btn btn-primary btn-block" id="record-exit-btn">🚪 Record Exit</button>`
          : `<p class="text-muted" style="font-size:13.5px;">This visitor is not currently on campus.</p>`}
      </div>`;
    const exitBtn = document.getElementById("record-exit-btn");
    if (exitBtn) exitBtn.addEventListener("click", () => {
      try {
        Store.recordVisitorExit({ query: visitor.id, gate: "Main Gate", guardName: staffName });
        toast("Visitor exit recorded");
        renderExitCard(Store.getVisitorById(visitor.id));
        renderOnCampusList();
      } catch (err) { toast(err.message, "red"); }
    });
  }

  function renderOnCampusList() {
    const list = document.getElementById("on-campus-list");
    const onCampus = Store.getVisitorRecords().filter((v) => v.status === Store.VISITOR_STATUS.ON_CAMPUS);
    if (onCampus.length === 0) { list.innerHTML = emptyState("🚪", "No visitors currently on campus"); return; }
    list.innerHTML = onCampus.map((v) => `
      <div class="list-row">
        <div><div style="font-size:14px; font-weight:600;">${escapeHtml(v.fullName)}</div><div class="mono text-faint" style="font-size:12px;">${escapeHtml(v.id)} · ${escapeHtml(v.vehicleNumber || "On foot")}</div></div>
        <button class="btn btn-ghost btn-sm" data-quick-exit="${escapeHtml(v.id)}">Record Exit</button>
      </div>`).join("");
    list.querySelectorAll("[data-quick-exit]").forEach((btn) => {
      btn.addEventListener("click", () => {
        try {
          Store.recordVisitorExit({ query: btn.dataset.quickExit, gate: "Main Gate", guardName: staffName });
          toast("Visitor exit recorded");
          renderOnCampusList();
        } catch (err) { toast(err.message, "red"); }
      });
    });
  }

  /* ===================== Recent scans ===================== */
  function renderScans() {
    const scans = Store.getScans().slice().reverse();
    const list = document.getElementById("scans-list");
    if (scans.length === 0) { list.innerHTML = emptyState("🕒", "No scans yet"); return; }
    list.innerHTML = scans.map((s) => `
      <div class="list-row">
        <div class="flex items-center gap-2"><span>${s.result === "found" ? "✅" : "❌"}</span><span class="mono">${escapeHtml(s.vehicleNumber)}</span></div>
        <div class="flex items-center gap-2 text-faint" style="font-size:12px;">
          <span>${escapeHtml(s.staffName)}</span><span>${fmtDateTime(s.timestamp)}</span>
          <span class="badge ${s.result === "found" ? "badge-teal" : "badge-red"}">${s.result === "found" ? "Matched" : "Not Found"}</span>
        </div>
      </div>`).join("");
  }

  /* ===================== Incidents tab (Part 11) ===================== */
  const incidentModal = document.getElementById("incident-modal");
  const incidentTypeSelect = document.getElementById("incident-type");
  Store.ISSUE_TYPES.forEach((t) => incidentTypeSelect.appendChild(new Option(t, t)));

  function openIncidentModal(plate) {
    document.getElementById("incident-plate").value = plate || "";
    incidentModal.classList.remove("hidden");
  }
  document.getElementById("close-incident-modal").addEventListener("click", () => incidentModal.classList.add("hidden"));
  incidentModal.addEventListener("click", (e) => { if (e.target === incidentModal) incidentModal.classList.add("hidden"); });
  document.getElementById("report-incident-btn").addEventListener("click", () => openIncidentModal(""));

  document.getElementById("incident-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    Store.addIncident({ vehicleNumber: data.vehicleNumber, issueType: data.issueType, location: data.location, remarks: data.remarks, reportingGuard: staffName });
    toast("Report Submitted Successfully");
    incidentModal.classList.add("hidden");
    e.target.reset();
    renderIncidentsTab();
    refreshBadges();
  });

  function renderIncidentsTab() {
    renderIncidentsList("incidents-list", Store.getIncidents());
    refreshBadges();
  }

  /* ===================== Unregistered vehicle workflow (Part 12) ===================== */
  const unregModal = document.getElementById("unreg-modal");
  const unregActionSelect = document.getElementById("unreg-action");
  Store.UNREGISTERED_ACTIONS.forEach((a) => unregActionSelect.appendChild(new Option(a, a)));
  let unregPlate = "";

  function openUnregModal(plate) {
    unregPlate = plate;
    document.getElementById("unreg-plate").textContent = plate;
    unregModal.classList.remove("hidden");
  }
  document.getElementById("close-unreg-modal").addEventListener("click", () => unregModal.classList.add("hidden"));
  unregModal.addEventListener("click", (e) => { if (e.target === unregModal) unregModal.classList.add("hidden"); });

  document.getElementById("unreg-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    Store.addUnregisteredReport({ vehicleNumber: unregPlate, location: data.location, guardName: staffName, action: data.action });
    toast(`${data.action} recorded for ${unregPlate}`);
    unregModal.classList.add("hidden");
    e.target.reset();
  });

  /* ===================== Notifications tab (Part 21) ===================== */
  function renderNotificationsTab() {
    renderNotifications("notifications-list", "staff", null);
    refreshBadges();
  }
});
