/* ParkPilot — staff.js */
document.addEventListener("DOMContentLoaded", () => {
  requireRole("staff", "staff-login.html");
  renderNav();

  const staffName = Store.currentName();
  document.getElementById("staff-name").textContent = staffName;

  /* ---------- Tabs ---------- */
  const tabButtons = document.querySelectorAll(".tab-btn");
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.add("hidden"));
      document.getElementById(`panel-${btn.dataset.tab}`).classList.remove("hidden");
      if (btn.dataset.tab === "recent") renderScans();
      if (btn.dataset.tab === "violations") renderViolations();
      if (btn.dataset.tab === "notifications") renderNotifications();
    });
  });

  /* ---------- Quick plate chips ---------- */
  const quickPlates = document.getElementById("quick-plates");
  Store.getVehicles().slice(0, 3).forEach((v) => {
    const chip = el(`<button type="button" class="badge badge-grey mono" style="cursor:pointer;">${v.vehicleNumber}</button>`);
    chip.addEventListener("click", () => { document.getElementById("manual-plate").value = v.vehicleNumber; doSearch(v.vehicleNumber); });
    quickPlates.appendChild(chip);
  });

  /* ---------- Manual search ---------- */
  document.getElementById("manual-form").addEventListener("submit", (e) => {
    e.preventDefault();
    doSearch(document.getElementById("manual-plate").value);
  });

  /* ---------- Camera / upload simulation ---------- */
  document.getElementById("webcam-btn").addEventListener("click", simulateScan);
  document.getElementById("upload-input").addEventListener("change", simulateScan);

  function simulateScan() {
    const box = document.getElementById("camera-box");
    box.innerHTML = `<div class="flex-col items-center gap-2"><span class="spin" style="font-size:20px;">⏳</span><span class="text-faint" style="font-size:12px;">Detecting plate...</span></div><div class="scan-line" style="animation-duration:1.2s;"></div>`;
    setTimeout(() => {
      const vehicles = Store.getVehicles();
      const useReal = Math.random() > 0.15 && vehicles.length > 0;
      const plate = useReal ? vehicles[Math.floor(Math.random() * vehicles.length)].vehicleNumber : "XX99ZZ0000";
      document.getElementById("manual-plate").value = plate;
      box.innerHTML = `<span class="text-faint" style="font-size:12px;" id="camera-placeholder">Live feed placeholder</span>`;
      doSearch(plate);
    }, 1400);
  }

  /* ---------- Search + result card ---------- */
  function doSearch(plateRaw) {
    const plate = (plateRaw || "").trim().toUpperCase().replace(/\s+/g, "");
    if (!plate) return;
    const match = Store.findVehicleByPlate(plate);
    Store.addScan({ vehicleNumber: plate, result: match ? "found" : "not_found", staffName });

    const resultArea = document.getElementById("result-area");
    if (match) {
      toast(`Match found for ${plate}`);
      resultArea.innerHTML = `
        <div class="glass p-5">
          <div class="flex justify-between items-start mb-3">
            <div class="flex items-center gap-3">
              <div class="avatar" style="width:52px;height:52px;font-size:17px;">${initials(match.studentName)}</div>
              <div>
                <div style="font-weight:800;">${escapeHtml(match.studentName)}</div>
                <div class="text-faint" style="font-size:12px;">${escapeHtml(match.studentId)} · ${escapeHtml(match.department)}</div>
              </div>
            </div>
            <span class="badge badge-teal">✅ Match Found</span>
          </div>
          <div class="mb-3">${plateHtml(match.vehicleNumber)}</div>
          <div class="grid grid-2 mb-3">
            ${infoTile("Phone Number", match.mobile)}
            ${infoTile("Vehicle", `${match.brand} ${match.model} · ${match.color}`)}
            ${infoTile("Class", match.className)}
            ${infoTile("Parking Status", match.parkingStatus)}
          </div>
          <div class="action-grid">
            <a href="tel:+91${match.mobile}" class="action-btn primary">📞 Call</a>
            <a href="sms:+91${match.mobile}" class="action-btn plain">💬 SMS</a>
            <button class="action-btn amber" id="report-btn">⚠ Report</button>
            <button class="action-btn plain" id="locate-btn">📍 Mark Location</button>
          </div>
        </div>`;
      document.getElementById("report-btn").addEventListener("click", () => openViolationModal(match.vehicleNumber));
      document.getElementById("locate-btn").addEventListener("click", () => toast(`Location marked for ${match.vehicleNumber}`));
    } else {
      toast("No match found in database", "red");
      resultArea.innerHTML = `
        <div class="glass p-6 text-center">
          <div style="font-size:30px; margin-bottom:8px;">❌</div>
          <div style="font-weight:700;">No match found</div>
          <div class="mono text-faint mt-1">${escapeHtml(plate)}</div>
          <p class="text-muted mt-2" style="font-size:14px;">This plate isn't in the central database yet. Consider flagging it as unauthorized parking.</p>
          <button class="btn btn-ghost mt-3" id="report-unauth-btn">⚠ Report Unauthorized Parking</button>
        </div>`;
      document.getElementById("report-unauth-btn").addEventListener("click", () => openViolationModal(plate));
    }
  }

  function infoTile(label, value) {
    return `<div class="p-4" style="background:rgba(255,255,255,.03); border:1px solid var(--border); border-radius:12px;">
      <div class="text-faint" style="font-size:11px;">${label}</div>
      <div style="font-size:14px; font-weight:600;">${escapeHtml(value || "—")}</div>
    </div>`;
  }

  /* ---------- Recent scans ---------- */
  function renderScans() {
    const scans = Store.getScans().slice().reverse();
    const list = document.getElementById("scans-list");
    if (scans.length === 0) { list.innerHTML = `<div class="empty-state text-faint">No scans yet.</div>`; return; }
    list.innerHTML = scans.map((s) => `
      <div class="list-row">
        <div class="flex items-center gap-2"><span>${s.result === "found" ? "✅" : "❌"}</span><span class="mono">${escapeHtml(s.vehicleNumber)}</span></div>
        <div class="flex items-center gap-2 text-faint" style="font-size:12px;">
          <span>${escapeHtml(s.staffName)}</span><span>${fmtDateTime(s.timestamp)}</span>
          <span class="badge ${s.result === "found" ? "badge-teal" : "badge-red"}">${s.result === "found" ? "Matched" : "Not Found"}</span>
        </div>
      </div>`).join("");
  }

  /* ---------- Violations ---------- */
  function renderViolations() {
    const violations = Store.getViolations().slice().reverse();
    const list = document.getElementById("violations-list");
    const pendingCount = Store.getViolations().filter((v) => v.status === "Pending").length;
    const countBadge = document.getElementById("violation-count");
    countBadge.textContent = pendingCount;
    countBadge.classList.toggle("hidden", pendingCount === 0);

    if (violations.length === 0) { list.innerHTML = `<div class="empty-state text-faint">No violations reported yet.</div>`; return; }
    list.innerHTML = violations.map((v) => `
      <div class="list-row">
        <div class="flex items-center gap-2">
          <span>${v.status === "Pending" ? "⚠️" : "✅"}</span>
          <div>
            <div class="mono" style="font-size:14px; font-weight:600;">${escapeHtml(v.vehicleNumber)}</div>
            <div class="text-faint" style="font-size:12px;">${escapeHtml(v.reason)} · ${escapeHtml(v.location)}</div>
          </div>
        </div>
        <div class="flex items-center gap-2 text-faint" style="font-size:12px;">
          <span>${escapeHtml(v.staffName)}</span><span>${escapeHtml(v.date)} ${escapeHtml(v.time)}</span>
          <span class="badge ${v.status === "Pending" ? "badge-amber" : "badge-teal"}">${v.status}</span>
        </div>
      </div>`).join("");
  }

  /* ---------- Notifications ---------- */
  function renderNotifications() {
    const violations = Store.getViolations();
    const scans = Store.getScans();
    const items = [];
    violations.slice(0, 5).forEach((v) => items.push({ text: `${v.reason} reported for ${v.vehicleNumber}`, time: `${v.date} ${v.time}`, tone: v.status === "Pending" ? "⚠️" : "✅" }));
    scans.filter((s) => s.result === "not_found").slice(0, 3).forEach((s) => items.push({ text: `No match found for ${s.vehicleNumber}`, time: fmtDateTime(s.timestamp), tone: "❌" }));

    const list = document.getElementById("notifications-list");
    if (items.length === 0) { list.innerHTML = `<div class="empty-state text-faint">You're all caught up.</div>`; return; }
    list.innerHTML = items.slice(0, 6).map((n) => `
      <div class="list-row" style="justify-content:flex-start;">
        <span>${n.tone}</span>
        <div><div style="font-size:14px;">${escapeHtml(n.text)}</div><div class="text-faint" style="font-size:12px;">${escapeHtml(n.time)}</div></div>
      </div>`).join("");
  }

  /* ---------- Violation modal ---------- */
  const modal = document.getElementById("violation-modal");
  const modalReason = document.getElementById("modal-reason");
  Store.VIOLATION_REASONS.forEach((r) => modalReason.appendChild(new Option(r, r)));

  function openViolationModal(plate) {
    document.getElementById("modal-plate").value = plate || "";
    modal.classList.remove("hidden");
  }
  document.getElementById("close-modal").addEventListener("click", () => modal.classList.add("hidden"));
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.add("hidden"); });
  document.getElementById("report-violation-btn").addEventListener("click", () => openViolationModal(""));

  document.getElementById("violation-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    Store.addViolation({ vehicleNumber: data.vehicleNumber.trim().toUpperCase(), reason: data.reason, location: data.location, staffName });
    toast("Violation reported");
    modal.classList.add("hidden");
    e.target.reset();
    renderViolations();
  });

  renderViolations();
});
