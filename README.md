# OGITECH Past Questions Bank (frontend prototype)

Public website for finding past examination questions, plus an admin area for managing them.
Plain HTML, CSS and JavaScript. No framework, no build step, no backend yet.

## Run it

Open `index.html` (or use VS Code "Live Server"). Admin: `admin/index.html`.
Open the public site and the admin from the same address, because browser storage is per address.

Demo logins (prototype only): `mainadmin` / `Admin@2026` (Main Admin), `manager` / `Manager@2026` (Question Manager).

## Structure

- Public: `index.html`, `browse.html`, `question-details.html`, `request-question.html`, `about.html`.
  Their text (hero, leadership, about, menu, footer) is hardcoded in `assets/js/store.js`.
- Admin: `admin/index.html`, one JS file per section (`admin-*.js`), shared framework in `admin-core.js`.
- `assets/js/store.js`: the only place that reads and writes data (`window.OGA`).

## Data

Only question-bank data is saved (localStorage key `pqb_state`): questions, departments, academic structure,
sessions, student requests and admin accounts. Academic session and examination year are separate fields.

## Limits (until the PHP/MySQL backend)

- The admin login is a stand-in. Nothing is protected; passwords are plain text in browser storage.
- Selected PDFs and images are validated and previewed but not stored; image-to-PDF conversion is backend work.
- Dashboard numbers come from the saved records. "Frequently opened" counts on the homepage are demonstration values.
