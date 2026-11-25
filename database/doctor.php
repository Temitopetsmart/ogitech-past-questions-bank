<?php
declare(strict_types=1);

/* Deployment health check:   php database/doctor.php           (add --delete-orphans to remove stray PDF files)
   Checks PHP, extensions, upload limits, config, database, permissions, storage safety and file consistency.
   NOTE: this runs under the command-line PHP, whose php.ini can differ from the web server's. After fixing
   anything it reports, also upload a real PDF and a few phone photos through the admin to prove the web side. */

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

require __DIR__ . '/../api/lib/bootstrap.php';
require __DIR__ . '/../api/lib/files.php';

$bad = 0; $warn = 0;
function out(string $level, string $msg): void
{
    global $bad, $warn;
    $tag = ['ok' => '[ OK ]', 'warn' => '[WARN]', 'fail' => '[FAIL]', 'info' => '[INFO]'][$level];
    if ($level === 'fail') $bad++;
    if ($level === 'warn') $warn++;
    echo "$tag $msg\n";
}
function bytes(string $v): int
{
    $v = trim($v);
    if ($v === '-1') return PHP_INT_MAX;
    $n = (int)$v;
    return match (strtolower(substr($v, -1))) { 'g' => $n * 1073741824, 'm' => $n * 1048576, 'k' => $n * 1024, default => $n };
}

echo "Past Questions Bank: deployment check\n\n";

/* PHP and extensions */
version_compare(PHP_VERSION, '8.1.0', '>=') ? out('ok', 'PHP ' . PHP_VERSION) : out('fail', 'PHP 8.1 or newer is required (found ' . PHP_VERSION . ').');
foreach (['pdo_mysql', 'gd', 'mbstring', 'fileinfo', 'exif'] as $ext) {
    extension_loaded($ext) ? out('ok', "Extension $ext") : out($ext === 'exif' ? 'warn' : 'fail', "Extension $ext is missing" . ($ext === 'exif' ? ' (phone photos may be rotated wrongly).' : '.'));
}
if (extension_loaded('gd')) {
    $gd = gd_info();
    foreach (['JPEG Support' => 'JPEG', 'PNG Support' => 'PNG', 'WebP Support' => 'WebP'] as $key => $name) {
        !empty($gd[$key]) ? out('ok', "GD $name support") : out($name === 'WebP' ? 'warn' : 'fail', "GD has no $name support.");
    }
}

/* Config */
$cfgFile = __DIR__ . '/../api/config.php';
if (!is_file($cfgFile)) { out('fail', 'api/config.php is missing. Copy api/config.example.php and fill it in.'); exit(1); }
out('ok', 'api/config.php found');
config('debug') ? out('fail', "config 'debug' is true. Turn it off on a live site.") : out('ok', 'Debug mode is off');
$lim = (array)config('limits');
foreach ([['upload_max_filesize', max($lim['pdf_mb'], $lim['image_mb']) * 1048576], ['post_max_size', $lim['pdf_mb'] * 1048576]] as [$k, $need]) {
    bytes((string)ini_get($k)) >= $need ? out('ok', "$k = " . ini_get($k)) : out('fail', "$k = " . ini_get($k) . ' is below the configured upload limits.');
}
bytes((string)ini_get('post_max_size')) >= 64 * 1048576 ? out('ok', 'post_max_size allows large image sets') : out('warn', 'post_max_size under 64M: uploads of many large photos will be refused. 100M is recommended.');
(int)ini_get('max_file_uploads') >= $lim['image_count'] ? out('ok', 'max_file_uploads = ' . ini_get('max_file_uploads')) : out('fail', 'max_file_uploads (' . ini_get('max_file_uploads') . ') is below the ' . $lim['image_count'] . '-image limit.');
bytes((string)ini_get('memory_limit')) >= 256 * 1048576 ? out('ok', 'memory_limit = ' . ini_get('memory_limit')) : out('warn', 'memory_limit = ' . ini_get('memory_limit') . ' (256M recommended for converting photos to PDF).');

/* Database */
try { $pdo = db(); out('ok', 'Connected to database "' . config('db.name') . '"'); }
catch (Throwable $e) { out('fail', 'Database connection failed: ' . $e->getMessage()); exit(1); }
$need = ['admin_users', 'programmes', 'levels', 'semesters', 'academic_sessions', 'departments', 'department_programmes', 'questions', 'question_requests', 'rate_limits'];
$have = array_column(q_all('SELECT TABLE_NAME AS t FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()'), 't');
$missing = array_diff($need, $have);
$missing ? out('fail', 'Missing tables: ' . implode(', ', $missing) . '. Import database/schema.sql.') : out('ok', 'All tables exist');
if ($missing) exit(1);
$grants = implode(' ', array_map('current', q_all('SHOW GRANTS FOR CURRENT_USER()')));
preg_match('/ALL PRIVILEGES|\bDROP\b|\bCREATE\b|\bALTER\b|GRANT OPTION|SUPER/i', $grants)
    ? out('warn', 'The database user has more than it needs (e.g. ALL/DROP/CREATE/ALTER). Grant only SELECT, INSERT, UPDATE, DELETE.')
    : out('ok', 'Database user is limited to data access');
(int)q_val("SELECT COUNT(*) FROM admin_users WHERE role = 'main' AND is_active = 1") >= 1
    ? out('ok', 'At least one active Main Admin exists') : out('fail', 'No active Main Admin. Run: php database/create-admin.php');
(int)q_val('SELECT COUNT(*) FROM programmes') && (int)q_val('SELECT COUNT(*) FROM semesters') && (int)q_val('SELECT COUNT(*) FROM academic_sessions') && (int)q_val('SELECT COUNT(*) FROM departments')
    ? out('ok', 'Academic structure and departments are set up') : out('warn', 'Programmes, semesters, sessions or departments are empty. Import database/seed.sql or add them in the admin.');

/* Storage */
$root = storage_root();
out('ok', "Storage folder $root is writable");
$project = realpath(__DIR__ . '/..');
if (str_starts_with($root . '/', $project . '/')) {
    out('warn', 'Storage is INSIDE the project folder. It is blocked only by storage/.htaccess (Apache). Move it outside the web root and set storage_path.');
    $ht = $root . '/.htaccess';
    is_file($ht) && str_contains((string)file_get_contents($ht), 'denied') ? out('ok', 'storage/.htaccess blocks web access') : out('fail', 'storage/.htaccess is missing, so uploaded PDFs could be fetched directly.');
} else {
    out('ok', 'Storage is outside the project folder');
}
$sess = (string)(config('session_path') ?: $root . '/sessions');
(is_dir($sess) || @mkdir($sess, 0700, true)) && is_writable($sess) ? out('ok', "Session folder $sess is writable") : out('fail', "Session folder $sess is not writable.");
$bk = config('backup_path');
$bk ? (str_starts_with((string)realpath((string)$bk) . '/', $project . '/') ? out('fail', 'backup_path is inside the project folder. Move it outside the web root.') : out('ok', 'backup_path is set outside the project')) : out('warn', "No 'backup_path' set: no backups are being taken. See README.");

/* Files vs database */
$referenced = array_column(q_all('SELECT file_path FROM questions WHERE file_path IS NOT NULL'), 'file_path');
$refSet = array_flip($referenced);
$gone = array_filter($referenced, fn($p) => !is_file("$root/$p"));
$gone ? out('fail', count($gone) . ' question(s) point to PDF files that no longer exist (e.g. ' . reset($gone) . ').') : out('ok', count($referenced) . ' stored PDF(s) all present');
$orphans = [];
if (is_dir("$root/questions")) {
    $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator("$root/questions", FilesystemIterator::SKIP_DOTS));
    foreach ($it as $f) {
        if ($f->isFile() && $f->getExtension() === 'pdf') {
            $rel = 'questions/' . substr($f->getPathname(), strlen("$root/questions/"));
            $rel = str_replace('\\', '/', $rel);
            if (!isset($refSet[$rel]) && time() - $f->getMTime() > 3600) $orphans[] = $f->getPathname();
        }
    }
}
if ($orphans) {
    if (in_array('--delete-orphans', $argv, true)) { foreach ($orphans as $o) @unlink($o); out('ok', 'Deleted ' . count($orphans) . ' orphaned file(s).'); }
    else out('warn', count($orphans) . ' stray PDF file(s) are not linked to any question. Run with --delete-orphans to remove them.');
} else out('ok', 'No orphaned PDF files');

out('info', 'Reminders: serve the site over HTTPS (then enable HSTS in .htaccess), keep config.php private, and schedule php database/backup.php.');
echo "\n" . ($bad ? "$bad problem(s) must be fixed" : 'No blocking problems') . ($warn ? ", $warn warning(s)." : '.') . "\n";
exit($bad ? 1 : 0);