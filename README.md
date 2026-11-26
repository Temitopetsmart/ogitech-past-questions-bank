# OGITECH Past Questions Bank

The OGITECH Past Questions Bank is a web-based academic resource for students of Ogun State Institute of Technology (OGITECH), Igbesa.

It allows students to find and access published past examination questions using their department, programme, level, semester, course code and examination year.

The platform also provides an administration area for managing academic records, questions, institutional information and other public content.

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

- Browse published past questions.
- Search by course code or course title.
- Filter by department, programme, level, semester and academic session.
- View question details.
- Preview and download question documents.
- Request missing past questions.
- View institution-wide academic calendars.
- View institutional and project history.
- View historical institutional leaders and SUG office holders.
- View current executive information and public hotlines.

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

Departments are not maintained as a hardcoded JavaScript list. They are created and managed from the administration area and loaded through the API.

Each department can be linked to the programmes it actually offers.

### Academic Calendar

- Upload academic calendar PDFs.
- Associate calendars with academic sessions.
- Publish or unpublish calendars.
- Replace or remove calendar documents.

Academic calendars are institution-wide resources and are not restricted to one department or level.

### About Page and Historical Records

The About page is database-backed.

Main Admin can manage:

- Project introduction.
- History of the Past Questions Bank.
- Institution history.
- Project purpose and objectives.
- Historical notes and milestones.
- Names of important institutional and student leaders.
- Official positions and organisations.
- Tenure or service periods.
- Biographies and historical contributions.
- Public visibility of each historical record.

Historical people are stored as separate database records. Adding a new office holder does not require replacing the previous office holder's record. Records can be hidden from the public page while remaining stored in the database.

### Administration and Access Control

The platform has two administrator roles:

**Main Admin**

- Full administrative access.
- Manages academic structure.
- Manages administrator accounts.
- Manages leadership and executive information.
- Manages the About page and historical records.
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
│       ├── about.php
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
│   ├── migration-about-records.sql
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
- PHP extensions:
  - PDO MySQL
  - GD
  - mbstring
  - fileinfo
  - exif

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

Run the About page migration:

```bash
mysql -u root -p pqb_db < database/migration-about-records.sql
```

For Windows PowerShell, use:

```powershell
Get-Content .\database\migration-about-records.sql | C:\xampp\mysql\bin\mysql.exe -u root -p pqb_db
```

The seed creates the initial programmes, levels, semesters and academic sessions. Departments are added through the Main Admin area.

### 3. Configure the API

Copy:

```text
api/config.example.php
```

to:

```text
api/config.php
```

Configure the database connection and private storage paths.

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

The database is the source of truth for academic structure, questions, requests, leadership records, committee information, hotlines and About page content.

The public website retrieves database-managed content through the PHP API.

The About page uses:

- `about_content` for the main institutional and project information.
- `about_people` for historical people and office holders.

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

Schedule backups daily using Windows Task Scheduler or Linux cron.

Keep an additional copy outside the application server.

A backup should be tested by restoring it to a separate database and checking the restored files.

## Deployment Checklist

- [ ] Configure production database credentials.
- [ ] Configure private storage and backup paths outside the public web root.
- [ ] Enable HTTPS.
- [ ] Disable API debug mode.
- [ ] Confirm database permissions are restricted.
- [ ] Create the production Main Admin account.
- [ ] Add the official departments and their programme offerings.
- [ ] Add verified institutional history and project information.
- [ ] Add verified historical people and their tenure periods.
- [ ] Test uploads, publishing, previewing and downloads.
- [ ] Test both administrator roles.
- [ ] Confirm public pages load database-managed information.
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
