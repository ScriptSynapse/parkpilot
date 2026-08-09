# ParkPilot — Smart Student Parking Management System (Prototype)

A demo-ready prototype for a college campus parking system. No build step,
no dependencies to install — it's plain HTML, CSS and JavaScript that runs
in any modern browser.

## Folder structure

```
parkpilot/
├── index.html            Landing page
├── register.html         Module 1 — Student Vehicle Registration
├── staff-login.html      Staff login
├── staff.html            Module 2 — Security / Scanning portal
├── admin-login.html      Admin login
├── admin.html            Admin Dashboard
├── css/
│   └── styles.css        Design system (tokens, components, animations)
├── js/
│   ├── store.js          "Central database" — reads/writes localStorage
│   ├── ui.js              Shared nav, toasts, formatting helpers
│   ├── landing.js
│   ├── register.js
│   ├── staff.js
│   └── admin.js
└── README.md
```

## Running it

No install required — just open `index.html` in a browser.

For full functionality (file downloads, multiple tabs syncing live) it's
best to serve the folder over a local server rather than the `file://`
protocol:

```bash
# from inside the parkpilot/ folder
python3 -m http.server 5500
# then open http://localhost:5500
```

or with Node:

```bash
npx serve .
```

## How the "central database" is simulated

`js/store.js` stores everything in the browser's `localStorage` under three
keys: `parkpilot:vehicles`, `parkpilot:violations`, `parkpilot:scans`. All
three modules (Registration, Staff, Admin) read and write through this same
module, so a vehicle registered in `register.html` is immediately visible
to `staff.html` and `admin.html` in the same browser. Because `localStorage`
is shared across tabs on the same origin, you can open Registration, Staff
and Admin in three separate tabs to demo the full workflow live.

Six sample students/vehicles, two sample violations, and three sample scans
are pre-seeded on first load so the demo works immediately.

## What's mocked (by design, for a prototype)

| Feature | How it's simulated |
|---|---|
| Database | `localStorage`, wrapped by `store.js` |
| OCR / number-plate recognition | "Use Webcam" / "Upload Image" trigger a short delay, then pick a plate at random from the registered vehicles (85% hit rate) to mimic a real detection |
| Authentication | Any name + password combination logs in; role is kept in `sessionStorage` |
| Phone calls | `tel:` links — opens the real dialer on a phone or the desktop calling app |
| SMS | `sms:` links |
| Parking pass | Generated on the fly as a downloadable SVG |

## Moving this to a real backend

To turn this into the production stack described in the original brief
(React + Node/Express + MongoDB + JWT + a real OCR API), the natural swap
points are:

- Replace `store.js`'s `localStorage` reads/writes with `fetch()` calls to
  a REST API (`/api/vehicles`, `/api/violations`, `/api/scans`).
- Replace the `Store.login()` mock with a real JWT-based auth call and
  store the returned token instead of a plain role string.
- Replace `simulateScan()` in `js/staff.js` with an upload to an OCR
  endpoint (Google Vision API, EasyOCR, etc.) that returns a detected
  plate string.
- Keep the HTML/CSS/JS structure as-is, or port the markup into React
  components — the data layer (`store.js`) is the only piece that's aware
  of *how* data is persisted, so it's the natural seam.

## Tech notes

- Charts on the Admin Dashboard use [Chart.js](https://www.chartjs.org/)
  via CDN (`admin.html`).
- No frameworks or bundlers — every page is linked directly to
  `css/styles.css` and the relevant `js/*.js` files.
- Vehicle numbers are case-normalized and whitespace-stripped on both
  registration and scan, so `mh12 ab1234` and `MH12AB1234` match.
