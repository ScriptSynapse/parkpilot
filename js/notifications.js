/* ==========================================================================
   ParkPilot — notifications.js
   Shared rendering for the notification store (report Part 21). Any page
   that needs a notification feed (student, guard, admin) calls into this
   module instead of re-implementing the same list markup.
   ========================================================================== */

function notificationItemHtml(n) {
  return `
    <div class="list-row" style="justify-content:flex-start;">
      <span>${n.tone}</span>
      <div style="flex:1;">
        <div style="font-size:14px;">${escapeHtml(n.text)}</div>
        <div class="text-faint" style="font-size:12px;">${fmtDateTime(n.createdAt)}</div>
      </div>
      ${!n.read ? `<span class="notif-dot" title="Unread"></span>` : ""}
    </div>`;
}

/** Renders a notification feed for a given audience ("admin" | "staff" | "student" | "visitor")
 *  into the element with id `containerId`. `targetId` narrows student/visitor notifications
 *  to the ones addressed to that specific vehicle/visitor record. */
function renderNotifications(containerId, audience, targetId) {
  const list = document.getElementById(containerId);
  if (!list) return;
  const items = Store.getNotificationsFor(audience, targetId);
  if (items.length === 0) {
    list.innerHTML = emptyState("🔔", "You're all caught up", "New alerts will show up here.");
    return;
  }
  list.innerHTML = items.slice(0, 25).map(notificationItemHtml).join("");
  items.forEach((n) => Store.markNotificationRead(n.id));
}

function unreadNotificationCount(audience, targetId) {
  return Store.getNotificationsFor(audience, targetId).filter((n) => !n.read).length;
}
