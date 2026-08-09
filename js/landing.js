/* ParkPilot — landing.js */
document.addEventListener("DOMContentLoaded", () => {
  renderNav();

  const vehicles = Store.getVehicles();
  const scans = Store.getScans();
  const today = new Date().toISOString().slice(0, 10);

  document.getElementById("stat-vehicles").textContent = vehicles.length;
  document.getElementById("stat-scans-today").textContent = scans.filter((s) => s.timestamp.slice(0, 10) === today).length;
  document.getElementById("hero-plate").innerHTML = plateHtml("MH12AB1234", "lg");
});
