# OGITECH Past Questions Bank

Public website for finding past examination questions, and an admin area for managing them.
Front end: plain HTML, CSS and JavaScript (no build step). Back end: PHP 8 + MySQL (PDO).

## Folders

- `index.html`, `browse.html`, `question-details.html`, `request-question.html`, `about.html`: public site.
  Text such as the hero, leadership message, about page, menu and footer is hardcoded in `assets/js/store.js`.
- `admin/index.html` + `assets/js/admin-*.js`: admin area (Main Admin and Question Manager roles).
- `api/`: the PHP API (`index.php` routes every request). `api/config.php` is private and git-ignored.
- `database/`: `schema.sql`, `seed.sql` and `create-admin.php`.
- `storage/`: private PDF storage (blocked from the web). In production use a folder outside the web root.

## Set up (XAMPP / WAMP)

1. Put the project in `htdocs` and start Apache and MySQL.
2. Import the database as a privileged user: `mysql -u root -p < database/schema.sql` then `mysql -u root -p < database/seed.sql`.
3. Create a limited MySQL user:
   `CREATE USER 'pqb'@'localhost' IDENTIFIED BY 'a-strong-password'; GRANT SELECT, INSERT, UPDATE, DELETE ON pqb_db.* TO 'pqb'@'localhost';`
4. Copy `api/config.example.php` to `agipi/config.php` and fill in the database user and password.
5. Create the first Main Admin: `php database/create-admin.php`
6. In `php.ini`: `upload_max_filesize=20M`, `post_max_size=100M`, `max_file_uploads=30`, `memory_limit=256M`,
   `max_execution_time=120`; enable the `pdo_mysql`, `gd` (JPEG, PNG, WebP), `mbstring`, `fileinfo` and `exif` extensions.
7. Open `http://localhost/<project-folder>/` and `http://localhost/<project-folder>/admin/`.

## How it works

- Students only ever receive published questions, as one PDF. Drafts are invisible to the public API.
- Administrators upload one PDF or several images; the server combines images into a single PDF in the order sent.
- Permissions are enforced on the server for every request: a Question Manager gets 403 on Main Admin endpoints.
- Academic session (e.g. 2025/2026) and examination year (e.g. 2025) are separate fields.
- Views and downloads shown on the site are real counters.
