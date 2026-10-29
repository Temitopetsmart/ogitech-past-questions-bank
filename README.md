# OGITECH Past Questions Bank (frontend prototype)

A mobile-first website for finding past examination questions, with an admin area that edits the site's content.
Plain HTML, CSS and JavaScript. No framework, no build step, no backend.

## Run it

1. Keep the folder structure exactly as delivered.
2. Put your SUG logo at `assets/images/logo.png` (header and favicon). Optional hero photo: `assets/images/gate.png`.
3. Open `index.html` in a browser, or use VS Code "Live Server". The admin is at `admin/index.html`.
   Open the public site and the admin from the same address, because browser storage is per address.

## Structure

- `index.html`, `browse.html`, `question-details.html`, `request-question.html`, `about.html`: public pages (empty containers filled by JavaScript).
- `admin/index.html`: admin demo (single page, sections switch by `#hash`).
- `assets/js/store.js`: the only place that reads and writes data (`window.OGA`).
- `assets/js/app.js`: shared header, footer, theme and homepage. `browse.js`, `details.js`, `request.js`, `about.js`: one file per page.
- `assets/js/validation.js`: shared validators. `admin-*.js`: one file per admin section.

## How data works

All content is one JSON object saved in `localStorage` under the key `oga_demo_state` (schema version 1).
On first visit it is created from the sample data inside `store.js`; it is never overwritten on later visits.
Damaged or unsupported data is not overwritten either: the site shows sample data and a notice, and the admin "Demo data" page offers import or reset.
Use the admin "Demo data" page to export, import (validated before anything is replaced) or reset.

## Important limits

- This is a prototype. The admin "Demo access" screen is a labelled simulation, not a login. There is no password and nothing is protected.
- Data lives only in this browser profile and address. It is not shared with other people or devices, and clearing site data erases it.
- `localStorage` can be edited by anyone using the browser. Never treat it as secure storage.
- Images and PDFs chosen in the admin are previewed for the session only. To keep a file, copy it into `assets/images/` or `assets/files/` and enter its path. No sample PDFs are included, so questions show "no document attached".
- The request form only validates. It does not send, save or email anything.
- "Frequently opened" numbers are demonstration values, not real usage.
- Not ready for production administration.

## Moving to PHP and MySQL later

Everything that touches data goes through `OGA` in `store.js` and `A.commit` in `admin-core.js`. Replace these:

| Prototype function                                     | Becomes                                                                              |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `OGA.getQuestions()`, `getQuestion(id)`                | `GET /api/questions`, `GET /api/questions/{id}` (filtering and paging on the server) |
| `A.commit` for questions                               | `POST`, `PUT`, `DELETE /api/questions/{id}`                                          |
| `OGA.getDepartments()` and department edits            | `/api/departments`                                                                   |
| `OGA.getSettings()` and settings, footer, menu edits   | `GET`/`PUT /api/settings`                                                            |
| hero, sections, leadership, announcements, about       | one endpoint each                                                                    |
| file pickers                                           | real uploads with server-side type and size checks                                   |
| `exportData`, `importData`, `resetDemoData`, demo gate | remove; replace with real authentication and roles                                   |

Re-validate every input on the server. The checks in `validation.js` and the admin forms improve usability only; they are not security.
Use prepared statements, escape output, and store files outside the web root with generated names.
