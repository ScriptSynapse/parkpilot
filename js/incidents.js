/* ==========================================================================
   ParkPilot — incidents.js
   Shared rendering + helpers for "Vehicle & Security Incidents" (report
   Part 11 & 17). Used by the guard portal (report + view own reports) and
   the admin Incident Management section (triage + resolve).
   ========================================================================== */

function incidentRowHtml(inc, opts) {
  opts = opts || {};
  const actions = opts.adminActions ? `
    <div class="flex gap-1 wrap justify-end">
      <button class="btn btn-ghost btn-sm" data-incident-open="${inc.id}">Open</button>
    </div>` : "";
  return `
    <div class="list-row">
      <div class="flex items-center gap-2">
        <span>${inc.status === "New" ? "🚨" : inc.status === "In Progress" ? "🟡" : inc.status === "Resolved" ? "✅" : "🗄️"}</span>
        <div>
          <div class="mono" style="font-size:14px; font-weight:600;">${escapeHtml(inc.vehicleNumber || "—")}</div>
          <div class="text-faint" style="font-size:12px;">${escapeHtml(inc.issueType)} · ${escapeHtml(inc.location)}</div>
        </div>
      </div>
      <div class="flex items-center gap-2 text-faint" style="font-size:12px;">
        <span>${escapeHtml(inc.reportingGuard)}</span>
        <span>${fmtDateTime(inc.timestamp)}</span>
        ${statusBadge(inc.status)}
        ${actions}
      </div>
    </div>`;
}

function renderIncidentsList(containerId, incidents, opts) {
  const mount = document.getElementById(containerId);
  if (!mount) return;
  if (!incidents || incidents.length === 0) { mount.innerHTML = emptyState("🚨", "No incidents reported yet", "Reported incidents will show up here."); return; }
  mount.innerHTML = incidents.slice().reverse().map((i) => incidentRowHtml(i, opts)).join("");
}

/** Detail panel used by the admin Incident Management section. */
function incidentDetailHtml(inc) {
  return `
    <div class="flex justify-between items-start mb-3">
      <div>
        <div style="font-weight:800; font-size:16px;">${escapeHtml(inc.id)}</div>
        <div class="text-faint" style="font-size:12px;">${escapeHtml(inc.issueType)}</div>
      </div>
      ${statusBadge(inc.status)}
    </div>
    <div class="kv-grid mb-3">
      <div class="kv-tile"><div class="kv-label">Vehicle</div><div class="kv-value mono">${escapeHtml(inc.vehicleNumber || "—")}</div></div>
      <div class="kv-tile"><div class="kv-label">Location</div><div class="kv-value">${escapeHtml(inc.location)}</div></div>
      <div class="kv-tile"><div class="kv-label">Reported By</div><div class="kv-value">${escapeHtml(inc.reportingGuard)}</div></div>
      <div class="kv-tile"><div class="kv-label">Created</div><div class="kv-value">${fmtDateTime(inc.timestamp)}</div></div>
      <div class="kv-tile"><div class="kv-label">Assigned Admin</div><div class="kv-value">${escapeHtml(inc.assignedAdmin || "Unassigned")}</div></div>
      <div class="kv-tile"><div class="kv-label">Remarks</div><div class="kv-value">${escapeHtml(inc.remarks || "—")}</div></div>
    </div>
    <div style="font-weight:700; font-size:13px; margin-bottom:8px;">History</div>
    <div class="timeline mb-3">
      ${(inc.history || []).map((h) => `<div class="timeline-item"><b>${escapeHtml(h.by)}</b> — ${escapeHtml(h.note)}<div class="text-faint">${fmtDateTime(h.at)}</div></div>`).join("") || `<div class="text-faint" style="font-size:13px;">No history yet.</div>`}
    </div>`;
}
