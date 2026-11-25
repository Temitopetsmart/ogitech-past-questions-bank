# OGITECH Past Questions Bank

Public website for finding past examination questions, and an admin area for managing them.
Front end: plain HTML, CSS and JavaScript (no build step). Back end: PHP 8.1+ and MySQL (PDO).

## Folders

- `index.html`, `browse.html`, `question-details.html`, `request-question.html`, `about.html`: public site.
  Text such as the hero, leadership message, about page, menu and footer is hardcoded in `assets/js/store.js`.
- `admin/index.html` + `assets/js/admin-*.js`: admin area (Main Admin and Question Manager roles).
- `assets/vendor/`: self-hosted SweetAlert2 and Chart.js used by the admin (see its README for versions).
- `api/`: the PHP API (`index.php` routes every request). `api/config.php` is private and git-ignored.
- `database/`: `schema.sql`, `seed.sql`, `create-admin.php`, `doctor.php`, `backup.php` (command line only).
- `storage/`: private PDFs and login sessions (blocked from the web). In production keep it outside the web root.

## Set up (XAMPP / WAMP / any Apache + PHP + MySQL)

1. Put the project in the web root (`htdocs`) and start Apache and MySQL. Apache needs `mod_rewrite` and `mod_headers`
   and `AllowOverride All` for the project folder.
2. Import the database as a privileged user:
   `mysql -u root -p < database/schema.sql` then `mysql -u root -p < database/seed.sql`
3. Create a limited MySQL user (it must NOT have DROP/CREATE/ALTER):
   `CREATE USER 'pqb'@'localhost' IDENTIFIED BY 'a-strong-password'; GRANT SELECT, INSERT, UPDATE, DELETE ON pqb_db.* TO 'pqb'@'localhost';`
4. Copy `api/config.example.php` to `api/config.php` and fill in the database user and password.
5. Create the first Main Admin: `php database/create-admin.php`
6. In `php.ini`: `upload_max_filesize=20M`, `post_max_size=100M`, `max_file_uploads=30`, `memory_limit=256M`,
   `max_execution_time=120`; enable `pdo_mysql`, `gd` (JPEG, PNG, WebP), `mbstring`, `fileinfo`, `exif`. Restart Apache.
7. Run the health check: `php database/doctor.php` (fix every `[FAIL]`; read every `[WARN]`).
8. Open the site and `/admin/`.

## Before going live (checklist)

- [ ] Site served over **HTTPS**. Then enable the HSTS line and the HTTPS redirect in the root `.htaccess`.
- [ ] `api/config.php`: `debug` is `false`; `storage_path` and `backup_path` are **outside** the web root.
- [ ] If the site is behind Cloudflare or another proxy: list its address ranges in `trusted_proxies`
      (otherwise every visitor looks like one address to the rate limiter).
- [ ] The database user can only SELECT/INSERT/UPDATE/DELETE (`doctor.php` warns otherwise).
- [ ] Open the site and admin with the browser console open. The Content-Security-Policy is in report-only mode:
      if nothing is reported, rename `Content-Security-Policy-Report-Only` to `Content-Security-Policy` in `.htaccess`.
- [ ] Sign in as each role and try: upload a PDF, upload several phone photos, publish, download as a student.
- [ ] A backup has been taken AND a restore has been tried (below).
- [ ] The default or sample admin passwords do not exist: accounts are only the ones you created.

## Backups

`php database/backup.php` writes a compressed database dump and a copy of all PDFs to `backup_path`
(owner-only permissions) and keeps the newest `backup_keep`. Schedule it daily:

- Linux cron: `30 2 * * * cd /path/to/project && php database/backup.php >> /path/to/backup.log 2>&1`
- Windows Task Scheduler: run `php.exe database\backup.php` daily from the project folder.

Also copy the backup folder off the server (another machine or cloud storage); a backup on the same disk
does not survive a disk failure.

**Restore** (into an empty database, then put the files back):

    gunzip -c pqb-YYYYMMDD-HHMMSS.sql.gz | mysql -u root -p pqb_db
    tar -xzf pqb-YYYYMMDD-HHMMSS-files.tar.gz -C /path/to/storage_path

Then run `php database/doctor.php` to confirm every question still has its PDF.

## How it works

- Students only ever receive published questions, as one PDF. Drafts are invisible to the public API.
- Administrators upload one PDF or several images; the server combines images into a single PDF in the order sent.
- Permissions are enforced on the server for every request: a Question Manager gets 403 on Main Admin endpoints.
- Academic session (e.g. 2025/2026) and examination year (e.g. 2025) are separate fields.
- Views and downloads are real counters (one per visitor per question per hour).
- Sessions last 2 hours idle / 12 hours total (`session_idle_minutes`, `session_max_hours`).
