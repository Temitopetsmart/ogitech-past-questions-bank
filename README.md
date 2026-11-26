# OGITECH Past Questions Bank

The OGITECH Past Questions Bank is a web-based academic resource for students of Ogun State Institute of Technology (OGITECH), Igbesa.

It helps students find published past examination questions using department, programme, level, semester, course and examination year.

The platform includes a public website and an administration area for managing academic records, questions, calendars, leadership, committee information and student requests.

## Technology Stack

### Frontend
- HTML5
- CSS3
- Vanilla JavaScript
- Font Awesome
- SweetAlert2
- Chart.js

### Backend
- PHP 8.1+
- MySQL / MariaDB
- PDO
- Session-based authentication
- JSON API

There is no frontend build process or framework dependency.

## Main Features

### Public Website
- Browse and search published past questions.
- Filter by department, programme, level, semester and academic session.
- View question details and preview or download documents.
- Request missing past questions.
- View institution-wide academic calendars.
- View current executive information, committee information and public hotlines.
- Read the static About page and project history.

### Question Management
- Upload PDF documents.
- Upload multiple images and convert them into one PDF.
- Edit question details.
- Publish or unpublish questions.
- Feature selected questions.
- Track question views and downloads.
- Manage student requests.

### Academic Structure
The academic structure is stored in MySQL.

Main Admin can manage:
- Departments.
- ND and HND programmes.
- Academic levels.
- Semesters.
- Academic sessions.
- Department-to-programme relationships.

Departments are not maintained as a hardcoded JavaScript list. They are created and managed from the administration area and loaded through the API. Each department can be linked to the programmes it actually offers.

### Academic Calendar
- Upload academic calendar PDFs.
- Associate calendars with academic sessions.
- Publish or unpublish calendars.
- Replace or remove calendar documents.

Academic calendars are institution-wide resources and are not restricted to one department or level.

### About Page — Static Historical Record

The About page is a static source-code page located at `about.html`.

- Its text and historical entries are written directly in the HTML source.
- It does not read or write About content in MySQL.
- It has no About API endpoint.
- It has no About editor or management section in the admin dashboard.
- Administrators cannot change it through the application.
- Changes require a developer with source-code access to edit `about.html` (and, where needed, its styles) and deploy the updated website.

This page is intended to preserve the project's background, purpose, institutional context, verified milestones and historical leadership. Names, titles, dates and contributions should be checked against reliable records before publication.

**Legacy database note:** Earlier versions introduced `about_content` and `about_people` tables through `database/migration-about-records.sql`. The current application no longer uses these tables. If they already exist in a database, leave them unused; this change does not require dropping tables or altering existing academic, question or user data. Do not run the legacy About migration for a fresh installation.

### Administration and Access Control

The platform has two administrator roles.

**Main Admin**
- Full administrative access.
- Manages academic structure.
- Manages administrator accounts.
- Manages leadership and executive information.
- Manages calendars, committee information and hotlines.

**Question Manager**
- Manages past questions.
- Handles student requests.
- Does not have access to Main Admin-only features.

Permissions are enforced by the PHP API, not only by hiding navigation links.

## Project Structure

```text
oga-past-questions/
├── admin/
│   └── index.html
├── api/
│   ├── index.php
│   ├── config.example.php
│   ├── lib/
│   └── routes/
│       ├── admin.php
│       ├── calendars.php
│       ├── committee.php
│       ├── leadership.php
│       ├── public.php
│       ├── structure.php
│       └── users.php
├── assets/
│   ├── css/
│   ├── images/
│   ├── js/
│   └── vendor/
├── database/
│   ├── schema.sql
│   ├── seed.sql
│   ├── migration-academic-calendars.sql
│   ├── migration-leadership.sql
│   ├── migration-leadership-profile-details.sql
│   ├── migration-committee-hotlines.sql
│   ├── migration-about-records.sql (legacy; unused)
│   ├── create-admin.php
│   ├── doctor.php
│   └── backup.php
├── storage/
├── about.html
├── academic-calendar.html
├── browse.html
├── committee.html
├── index.html
├── question-details.html
├── request-question.html
└── README.md
```

## Installation

### Requirements
- Apache
- PHP 8.1 or later
- MySQL 8 or MariaDB 10.4+
- PHP extensions: PDO MySQL, GD, mbstring, fileinfo and exif

Apache should have `mod_rewrite` and `mod_headers` enabled, with `AllowOverride All` for the project directory.

### 1. Place the project

For XAMPP, place the project inside:

```text
C:\xampp\htdocs\oga-past-questions
```

Start Apache and MySQL.

### 2. Create the database

Import the database schema:

```bash
mysql -u root -p < database/schema.sql
```

Import the initial academic structure:

```bash
mysql -u root -p < database/seed.sql
```

The seed creates the initial programmes, levels, semesters and academic sessions. Departments are added through the Main Admin area.

Apply the feature migrations once, in this order:

```bash
mysql -u root -p pqb_db < database/migration-academic-calendars.sql
mysql -u root -p pqb_db < database/migration-leadership.sql
mysql -u root -p pqb_db < database/migration-leadership-profile-details.sql
mysql -u root -p pqb_db < database/migration-committee-hotlines.sql
```

Use the database name configured in `api/config.php` instead of `pqb_db` if it differs. The profile-details migration is safe to run after the updated leadership migration; it adds missing columns only.

Do not run `database/migration-about-records.sql`. It belongs to the retired database-backed About implementation. If its tables already exist, leave them unused; do not drop them or import that migration again.

### 3. Configure the API

Copy `api/config.example.php` to `api/config.php`, then configure the database connection and private storage paths.

`api/config.php` must not be committed to Git.

### 4. Create the first Main Admin

Run:

```bash
php database/create-admin.php
```

Follow the prompts to create the first administrator account.

### 5. Configure PHP uploads

Recommended PHP settings:

```ini
upload_max_filesize=20M
post_max_size=100M
max_file_uploads=30
memory_limit=256M
max_execution_time=120
```

Enable the required PHP extensions and restart Apache.

### 6. Run the health check

```bash
php database/doctor.php
```

Resolve all `[FAIL]` messages and review all `[WARN]` messages.

### 7. Open the application

Public website:

```text
http://localhost/oga-past-questions/
```

Administration:

```text
http://localhost/oga-past-questions/admin/
```

## Database and Content Management

The database is the source of truth for academic structure, questions, requests, leadership records, committee information, hotlines and calendars.

The public website retrieves database-managed content through the PHP API. The About page is the exception: it is static HTML and is not connected to the database.

Departments and their programme relationships use:
- `departments`
- `programmes`
- `department_programmes`

Question records reference their department, programme, level, semester and academic session.

## Security

- Passwords are stored using PHP password hashing.
- Administrator sessions use secure session handling.
- State-changing authenticated requests require CSRF validation.
- Main Admin-only endpoints are protected server-side.
- Database queries use PDO prepared statements.
- Question documents and private uploads are served through controlled API endpoints.
- Private storage should be outside the public web root.
- Production must use HTTPS.
- Production API debug mode must be disabled.

## Backups

Run:

```bash
php database/backup.php
```

The backup process creates compressed database and file backups using the configured private backup directory.

Schedule backups daily using Windows Task Scheduler or Linux cron. Keep an additional copy outside the application server. Test backups by restoring them to a separate database and checking the restored files.

## Deployment Checklist

- [ ] Configure production database credentials.
- [ ] Configure private storage and backup paths outside the public web root.
- [ ] Enable HTTPS.
- [ ] Disable API debug mode.
- [ ] Confirm database permissions are restricted.
- [ ] Create the production Main Admin account.
- [ ] Add the official departments and their programme offerings.
- [ ] Verify the names, official titles and dates shown on the static About page.
- [ ] Test uploads, publishing, previewing and downloads.
- [ ] Test both administrator roles.
- [ ] Confirm public pages load database-managed information where applicable.
- [ ] Take a backup and test restoration.

## Maintenance

Keep the PHP application, database and private storage backed up.

When updating the application:
1. Back up the database and storage.
2. Pull or deploy the reviewed code changes.
3. Run any new database migrations.
4. Run the health check.
5. Test the public website and administration area.
6. Confirm that existing questions and documents remain accessible.

To update the About page, edit its static source in `about.html`, review the change, and deploy the updated website. No database migration is needed.
