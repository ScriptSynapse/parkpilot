/* ==========================================================================
   ParkPilot — auth.js
   Central authentication module (report Part 20).

   The prototype still accepts any credentials — that behavior is preserved
   on purpose — but every page now goes through this ONE module instead of
   reading/writing sessionStorage directly. Swapping this out for a real
   university SSO / JWT backend later means changing only this file:
   Auth.login() would become an API call that returns a token, and
   Auth.session() would decode/validate that token instead of reading
   sessionStorage.
   ========================================================================== */

const SESSION_KEY = "parkpilot:session";

const Auth = {
  /**
   * Logs a user in for the prototype. `extra` can carry role-specific
   * context, e.g. { vehicleId } for a student session opened via
   * "look up my registration", or { visitorId } for a visitor.
   */
  login(role, name, extra) {
    const session = {
      role,
      name: name || "User",
      loginAt: new Date().toISOString(),
      ...(extra || {}),
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    // Legacy keys kept in sync so any old code path still reading them works.
    sessionStorage.setItem("parkpilot:role", role);
    sessionStorage.setItem("parkpilot:name", session.name);
    return session;
  },

  logout() {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem("parkpilot:role");
    sessionStorage.removeItem("parkpilot:name");
  },

  session() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore corrupt session */ }
    // Fall back to legacy keys so sessions started before this module
    // existed (or by an older cached page) still work.
    const role = sessionStorage.getItem("parkpilot:role");
    if (!role) return null;
    return { role, name: sessionStorage.getItem("parkpilot:name") || "User" };
  },

  currentUser() { return this.session(); },
  currentRole() { const s = this.session(); return s ? s.role : null; },
  currentName() { const s = this.session(); return s ? s.name : "Guest"; },

  isAuthenticated() { return !!this.session(); },

  hasRole(role) {
    const s = this.session();
    if (!s) return false;
    return Array.isArray(role) ? role.includes(s.role) : s.role === role;
  },

  can(permission) {
    const s = this.session();
    if (!s || !window.Store) return false;
    return Store.can(s.role, permission);
  },

  /**
   * Protects a page. `role` can be a single role string or an array of
   * allowed roles. Redirects to `loginPage` if the session is missing or
   * doesn't match. Call this at the top of every protected page's script.
   */
  requireRole(role, loginPage) {
    if (!this.hasRole(role)) {
      window.location.href = loginPage;
      return false;
    }
    return true;
  },
};

window.Auth = Auth;
