/* ParkPilot — register.js */
document.addEventListener("DOMContentLoaded", () => {
  renderNav();

  const form = document.getElementById("reg-form");

  // Populate selects
  const deptSelect = form.querySelector('[name="department"]');
  Store.DEPARTMENTS.forEach((d) => deptSelect.appendChild(new Option(d, d)));
  const yearSelect = form.querySelector('[name="year"]');
  Store.YEARS.forEach((y) => yearSelect.appendChild(new Option(y, y)));
  const colorSelect = form.querySelector('[name="color"]');
  Store.COLORS_LIST.forEach((c) => colorSelect.appendChild(new Option(c, c)));

  // Vehicle type toggle
  const typeToggle = document.getElementById("type-toggle");
  const typeHidden = form.querySelector('[name="vehicleType"]');
  const typeIcons = { Bike: "🏍️", Scooter: "🛵", Car: "🚗" };
  Store.VEHICLE_TYPES.forEach((t) => {
    const btn = el(`<button type="button" class="type-option">${typeIcons[t]}<br>${t}</button>`);
    btn.addEventListener("click", () => {
      typeHidden.value = t;
      [...typeToggle.children].forEach((c) => c.classList.remove("active"));
      btn.classList.add("active");
    });
    typeToggle.appendChild(btn);
  });

  // File inputs
  function wireFile(inputId, dropId, labelId) {
    const input = document.getElementById(inputId);
    const drop = document.getElementById(dropId);
    const label = document.getElementById(labelId);
    drop.addEventListener("click", () => input.click());
    input.addEventListener("change", () => {
      const name = input.files[0]?.name || "";
      label.textContent = name || "Choose file...";
      drop.classList.toggle("has-file", !!name);
    });
  }
  wireFile("idcard-input", "idcard-drop", "idcard-label");
  wireFile("rc-input", "rc-drop", "rc-label");

  const errorBox = document.getElementById("form-error");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    errorBox.classList.add("hidden");

    if (!typeHidden.value) {
      showError("Please select a vehicle type.");
      return;
    }

    const data = Object.fromEntries(new FormData(form).entries());
    data.idCardFile = document.getElementById("idcard-input").files[0]?.name || "";
    data.rcFile = document.getElementById("rc-input").files[0]?.name || "";

    try {
      const record = Store.addVehicle(data);
      toast("Vehicle registered successfully");
      showSuccess(record);
    } catch (err) {
      showError(err.message);
    }
  });

  function showError(msg) {
    errorBox.textContent = "❌ " + msg;
    errorBox.classList.remove("hidden");
  }

  function showSuccess(rec) {
    document.getElementById("form-view").classList.add("hidden");
    const successView = document.getElementById("success-view");
    successView.classList.remove("hidden");
    document.getElementById("success-title").textContent = `You're registered, ${rec.studentName.split(" ")[0]}!`;
    document.getElementById("success-plate").innerHTML = plateHtml(rec.vehicleNumber, "lg");
    const details = [
      ["Student ID", rec.studentId],
      ["Department", rec.department],
      ["Vehicle", `${rec.brand} ${rec.model}`],
      ["Status", "Active"],
    ];
    document.getElementById("success-details").innerHTML = details
      .map(([l, v]) => `
        <div class="glass p-4" style="background:rgba(255,255,255,.03);">
          <div class="text-faint" style="font-size:11px;">${l}</div>
          <div style="font-size:14px; font-weight:600;">${escapeHtml(v || "—")}</div>
        </div>`)
      .join("");

    document.getElementById("download-pass").onclick = () => downloadPass(rec);
    document.getElementById("register-another").onclick = () => {
      form.reset();
      [...typeToggle.children].forEach((c) => c.classList.remove("active"));
      typeHidden.value = "";
      document.getElementById("idcard-label").textContent = "Choose file...";
      document.getElementById("rc-label").textContent = "Choose file...";
      successView.classList.add("hidden");
      document.getElementById("form-view").classList.remove("hidden");
    };
  }

  function downloadPass(rec) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360">
      <rect width="600" height="360" rx="24" fill="#0d1220"/>
      <rect x="0" y="0" width="600" height="70" rx="24" fill="url(#g)"/>
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4f7cff"/><stop offset="1" stop-color="#a855f7"/></linearGradient></defs>
      <text x="30" y="45" font-family="monospace" font-size="22" fill="#0a0d18" font-weight="bold">CAMPUS PARKING PASS</text>
      <text x="30" y="115" font-family="sans-serif" font-size="24" fill="#eef0f7" font-weight="bold">${escapeHtml(rec.studentName)}</text>
      <text x="30" y="145" font-family="sans-serif" font-size="15" fill="#94a0b8">${escapeHtml(rec.studentId)} · ${escapeHtml(rec.department)}</text>
      <text x="30" y="215" font-family="monospace" font-size="30" fill="#7c9eff" letter-spacing="3">${escapeHtml(rec.vehicleNumber)}</text>
      <text x="30" y="245" font-family="sans-serif" font-size="15" fill="#94a0b8">${escapeHtml(rec.brand)} ${escapeHtml(rec.model)} · ${escapeHtml(rec.color)} · ${escapeHtml(rec.vehicleType)}</text>
      <text x="30" y="320" font-family="sans-serif" font-size="12" fill="#5b6478">Issued ${new Date(rec.registeredAt).toLocaleDateString()} · Valid for current academic year</text>
    </svg>`;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `parking-pass-${rec.vehicleNumber}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }
});
