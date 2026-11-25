# Third-party libraries (self-hosted)

The admin area runs with an administrator's login, so its scripts are served from this site instead of a CDN.

| File                     | Library     | Version  | Licence | Source                                            |
| ------------------------ | ----------- | -------- | ------- | ------------------------------------------------- |
| `sweetalert2.all.min.js` | SweetAlert2 | 11.26.26 | MIT     | npm `sweetalert2` → `dist/sweetalert2.all.min.js` |
| `chart.umd.min.js`       | Chart.js    | 4.6.2    | MIT     | npm `chart.js` → `dist/chart.umd.min.js`          |

To update: `npm pack sweetalert2@<version>` (or `chart.js@<version>`), copy the same file from the package's `dist/` folder, update the version above and test the admin area.
