/* ==========================================================================
   ParkPilot — audit.js
   Shared rendering for the audit log (report Part 18). Every sensitive
   action across the app writes an audit record via Store.addAuditLog();
   this module is only responsible for displaying that trail to admins.
   ========================================================================== */

function auditRowHtml(log) {
  return `
    <div class="list-row" style="align-items:flex-start;">
      <div>
        <div style="font-size:13px; font-weight:700;">${escapeHtml(log.action)}</div>
        <div class="text-faint" style="font-size:12px;">${escapeHtml(log.recordType)} · ${escapeHtml(log.recordId)}</div>
        ${log.description ? `<div class="text-muted mt-1" style="font-size:12.5px;">${escapeHtml(log.description)}</div>` : ""}
        ${log.previousStatus !== "—" || log.newStatus !== "—" ? `<div class="mt-1" style="font-size:12px;"><span class="mono text-faint">${escapeHtml(log.previousStatus)}</span> → <span class="mono" style="color:var(--blue-soft);">${escapeHtml(log.newStatus)}</span></div>` : ""}
      </div>
      <div class="text-faint text-center" style="font-size:12px; min-width:150px;">
        <div>${escapeHtml(log.actor)} <span class="role-tag">${escapeHtml(log.actorRole)}</span></div>
        <div class="mt-1">${fmtDateTime(log.timestamp)}</div>
        <div class="mono mt-1">${escapeHtml(log.id)}</div>
      </div>
    </div>`;
}

/** Renders an audit log list, most recent first, optionally filtered. */
function renderAuditLogs(containerId, filters) {
  const mount = document.getElementById(containerId);
  if (!mount) return;
  let logs = Store.getAuditLogs().slice().reverse();
  if (filters) {
    if (filters.recordType) logs = logs.filter((l) => l.recordType === filters.recordType);
    if (filters.action) logs = logs.filter((l) => l.action.toLowerCase().includes(filters.action.toLowerCase()));
    if (filters.query) {
      const q = filters.query.toLowerCase();
      logs = logs.filter((l) => [l.actor, l.recordId, l.action, l.description].join(" ").toLowerCase().includes(q));
    }
  }
  if (logs.length === 0) { mount.innerHTML = emptyState("🗂️", "No audit records match", "Sensitive actions (verification, stickers, suspensions, incidents...) will appear here."); return; }
  mount.innerHTML = logs.slice(0, 200).map(auditRowHtml).join("");
}
