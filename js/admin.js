/* js/admin.js */
document.addEventListener("DOMContentLoaded", () => {
  requireRole("admin", "admin-login.html");
  renderNav();

  const vehicles = Store.getVehicles();
  const violations = Store.getViolations();
  const scans = Store.getScans();
  const today = new Date().toISOString().slice(0, 10);

  /* ---------- Stat cards ---------- */
  document.getElementById("stat-total").textContent = vehicles.length;
  document.getElementById("stat-scans").textContent = scans.filter((s) => s.timestamp.slice(0, 10) === today).length;
  document.getElementById("stat-violations").textContent = violations.filter((v) => v.date === today).length;
  document.getElementById("stat-contacted").textContent = scans.filter((s) => s.result === "found").length;

  const chartColors = { blue: "#1d4ed8", purple: "#0f172a", teal: "#0d9488", amber: "#d97706", grid: "rgba(15,23,42,.08)", text: "#475569" };
  Chart.defaults.color = chartColors.text;
  Chart.defaults.font.size = 12;

  /* ---------- Trend chart (scans, last 7 days) ---------- */
  const trendDays = [];
  const trendCounts = [];
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

  /* ---------- Vehicle type pie ---------- */
  const typeMap = {};
  vehicles.forEach((v) => (typeMap[v.vehicleType] = (typeMap[v.vehicleType] || 0) + 1));
  new Chart(document.getElementById("typeChart"), {
    type: "doughnut",
    data: { labels: Object.keys(typeMap), datasets: [{ data: Object.values(typeMap), backgroundColor: [chartColors.blue, chartColors.purple, chartColors.teal, chartColors.amber] }] },
    options: { plugins: { legend: { position: "bottom" } } },
  });

  /* ---------- Registrations by department ---------- */
  const deptMap = {};
  vehicles.forEach((v) => (deptMap[v.department] = (deptMap[v.department] || 0) + 1));
  new Chart(document.getElementById("deptChart"), {
    type: "bar",
    data: { labels: Object.keys(deptMap).map((d) => d.split(" ")[0]), datasets: [{ label: "Vehicles", data: Object.values(deptMap), backgroundColor: chartColors.purple, borderRadius: 6 }] },
    options: { plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: chartColors.grid }, beginAtZero: true, ticks: { precision: 0 } } } },
  });

  /* ---------- Recent registrations ---------- */
  document.getElementById("recent-registrations").innerHTML = vehicles.slice().reverse().slice(0, 6).map((v) => `
    <div class="list-row">
      <div class="flex items-center gap-2">
        <div class="avatar" style="width:32px;height:32px;font-size:11px;">${initials(v.studentName)}</div>
        <div><div style="font-size:14px; font-weight:600;">${escapeHtml(v.studentName)}</div><div class="mono text-faint" style="font-size:12px;">${escapeHtml(v.vehicleNumber)}</div></div>
      </div>
      <span class="text-faint" style="font-size:12px;">${fmtDateTime(v.registeredAt)}</span>
    </div>`).join("");

  /* ---------- Recent violations ---------- */
  document.getElementById("recent-violations").innerHTML = violations.slice().reverse().slice(0, 6).map((v) => `
    <div class="list-row">
      <div><div class="mono" style="font-size:14px; font-weight:600;">${escapeHtml(v.vehicleNumber)}</div><div class="text-faint" style="font-size:12px;">${escapeHtml(v.reason)} · ${escapeHtml(v.location)}</div></div>
      <span class="badge ${v.status === "Pending" ? "badge-amber" : "badge-teal"}">${v.status}</span>
    </div>`).join("");

  /* ---------- Search table ---------- */
  const tbody = document.getElementById("vehicle-table-body");
  function renderTable(list) {
    if (list.length === 0) { tbody.innerHTML = `<tr><td colspan="6" class="text-faint text-center" style="padding:24px;">No vehicles match your search.</td></tr>`; return; }
    tbody.innerHTML = list.map((v) => `
      <tr>
        <td>${escapeHtml(v.studentName)}</td>
        <td class="text-muted">${escapeHtml(v.studentId)}</td>
        <td class="text-muted">${escapeHtml(v.department)}</td>
        <td class="mono" style="color:var(--blue-soft);">${escapeHtml(v.vehicleNumber)}</td>
        <td class="text-muted">${escapeHtml(v.brand)} ${escapeHtml(v.model)}</td>
        <td><span class="badge ${v.parkingStatus.startsWith("Parked") ? "badge-teal" : "badge-grey"}">${escapeHtml(v.parkingStatus)}</span></td>
      </tr>`).join("");
  }
  renderTable(vehicles);
  document.getElementById("search-input").addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    if (!q) return renderTable(vehicles);
    renderTable(vehicles.filter((v) => v.vehicleNumber.toLowerCase().includes(q) || v.studentId.toLowerCase().includes(q) || v.studentName.toLowerCase().includes(q)));
  });

  /* ---------- CSV export ---------- */
  document.getElementById("export-csv").addEventListener("click", () => {
    const headers = ["Student Name", "Student ID", "Department", "Vehicle Number", "Vehicle Type", "Brand", "Model", "Mobile", "Registered At"];
    const rows = vehicles.map((v) => [v.studentName, v.studentId, v.department, v.vehicleNumber, v.vehicleType, v.brand, v.model, v.mobile, v.registeredAt]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "vehicle-registrations.csv"; a.click();
    URL.revokeObjectURL(url);
    toast("CSV exported");
  });
});