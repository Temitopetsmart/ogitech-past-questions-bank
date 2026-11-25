<?php
/* Copy this file to api/config.php and fill it in. api/config.php is git-ignored: never commit it.
   Any value can also be supplied as an environment variable (PQB_DB_HOST, PQB_DB_NAME, PQB_DB_USER, PQB_DB_PASS). */
return [
    'db' => [
        'host'    => 'localhost',
        'name'    => 'pqb_db',
        'user'    => 'CHANGE_ME',   // local XAMPP/WAMP: create a dedicated MySQL user instead of using root
        'pass'    => 'CHANGE_ME',
        'charset' => 'utf8mb4',
    ],

    // Where uploaded PDFs are kept. Best practice: a folder OUTSIDE the public web root,
    // e.g. '/home/youraccount/pqb-storage'. The default below is blocked by storage/.htaccess on Apache.
    'storage_path' => __DIR__ . '/../storage',

    // null = decide automatically (secure cookie when the site is served over HTTPS).
    'secure_cookies' => null,

    // Idle minutes before an admin session expires, and the hard limit in hours.
    'session_idle_minutes' => 120,
    'session_max_hours'    => 12,

    // Upload limits. Keep PHP's upload_max_filesize / post_max_size / max_file_uploads at or above these.
    'limits' => [
        'pdf_mb'           => 20,
        'image_mb'         => 8,
        'image_count'      => 30,
        'image_max_pixels' => 20000000,   // reject huge images (memory protection)
        'pdf_max_edge_px'  => 3508,       // images are scaled down to this longest edge inside the PDF
    ],

    // Only if the site sits behind a proxy/CDN (e.g. Cloudflare): list ITS addresses or CIDR ranges here so visitors'
    // real addresses are used for rate limiting. Leave empty otherwise. Never list addresses you do not control.
    'trusted_proxies' => [],

    // Optional: a private folder for login sessions (default: <storage_path>/sessions).
    'session_path' => null,

    // Backups (php database/backup.php). backup_path MUST be outside the public web root.
    'backup_path' => null,          // e.g. '/home/youraccount/pqb-backups'
    'backup_keep' => 14,            // how many recent backups to keep
    'mysqldump'   => 'mysqldump',   // XAMPP on Windows: 'C:\\xampp\\mysql\\bin\\mysqldump.exe'

    'year_min' => 2000,

    // true = include technical detail in 500 errors. Never enable on a live site.
    'debug' => false,
];