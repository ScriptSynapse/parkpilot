/* js/visitor.js — Visitor Self-Service Registration (report Parts 5–6) */
document.addEventListener("DOMContentLoaded", () => {
  renderNav();

  const form = document.getElementById("visitor-form");
  const deptSelect = form.querySelector('[name="department"]');
  Store.DEPARTMENTS.forEach((d) => deptSelect.appendChild(new Option(d, d)));

  const errorBox = document.getElementById("form-error");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    errorBox.classList.add("hidden");
    const data = Object.fromEntries(new FormData(form).entries());

    if (!data.fullName.trim() || !data.mobile.trim() || !data.purpose.trim() || !data.host.trim() || !data.department) {
      showError("Please fill in all required fields.");
      return;
    }
    if (!/^\d{10}$/.test(data.mobile.trim())) {
      showError("Please enter a valid 10-digit mobile number.");
      return;
    }

    const { visitor, pass } = Store.registerVisitor(data);
    Auth.login("visitor", visitor.fullName, { visitorId: visitor.id });
    toast("Visitor registered — pass generated");
    showSuccess(visitor, pass);
  });

  function showError(msg) {
    errorBox.textContent = "❌ " + msg;
    errorBox.classList.remove("hidden");
  }

  function showSuccess(visitor, pass) {
    document.getElementById("form-view").classList.add("hidden");
    document.getElementById("success-view").classList.remove("hidden");
    document.getElementById("success-title").textContent = `You're registered, ${visitor.fullName.split(" ")[0]}!`;
    document.getElementById("pass-mount").innerHTML = visitorPassHtml(visitor, pass);
    renderQrInto(`visitor-qr-${visitor.id}`, pass.token, 96);

    document.getElementById("register-another").onclick = () => {
      form.reset();
      document.getElementById("success-view").classList.add("hidden");
      document.getElementById("form-view").classList.remove("hidden");
    };
  }

  function visitorPassHtml(visitor, pass) {
    const status = Store.computePassStatus(pass);
    return `
      <div class="pass-card">
        <div class="pass-head"><span>🪪 DIGITAL VISITOR PASS</span><span>${escapeHtml(visitor.id)}</span></div>
        <div class="pass-body">
          <div class="flex gap-3 items-center mb-3">
            <div class="qr-box" id="visitor-qr-${escapeHtml(visitor.id)}"></div>
            <div>
              <div style="font-weight:800; font-size:16px;">${escapeHtml(visitor.fullName)}</div>
              <div class="text-faint" style="font-size:12px;">${escapeHtml(visitor.purpose)}</div>
            </div>
          </div>
          <div class="pass-row"><span>Vehicle Number</span><span class="mono">${escapeHtml(visitor.vehicleNumber || "—")}</span></div>
          <div class="pass-row"><span>Host</span><span>${escapeHtml(visitor.host)}</span></div>
          <div class="pass-row"><span>Department</span><span>${escapeHtml(visitor.department)}</span></div>
          <div class="pass-row"><span>Valid From</span><span>${fmtDateTime(pass.validFrom)}</span></div>
          <div class="pass-row"><span>Valid Until</span><span>${fmtDateTime(pass.validUntil)}</span></div>
          <div class="pass-row"><span>Status</span><span>${statusBadge(status)}</span></div>
          <div class="pass-warning">⚠ Show this QR to security at the gate. The <b>first scan checks you in</b>, the <b>second scan checks you out</b> — after that the pass is used up. It also expires automatically, so a screenshot won't work after your visit window ends.</div>
        </div>
      </div>`;
  }
});
