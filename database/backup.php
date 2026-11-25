<?php
declare(strict_types=1);

/* Back up the database and the uploaded PDFs:   php database/backup.php
   Creates  <backup_path>/pqb-YYYYMMDD-HHMMSS.sql.gz  and  <backup_path>/pqb-YYYYMMDD-HHMMSS-files.tar.gz
   and keeps the newest 'backup_keep' of each. Schedule it daily (cron / Windows Task Scheduler).
   The database password is passed to mysqldump through the environment, never on the command line.
   RESTORE:  gunzip -c pqb-....sql.gz | mysql -u root -p pqb_db     and     tar -xzf pqb-....-files.tar.gz -C <storage_path> */

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

require __DIR__ . '/../api/lib/bootstrap.php';
require __DIR__ . '/../api/lib/files.php';

$dir = config('backup_path');
if (!$dir) { fwrite(STDERR, "Set 'backup_path' in api/config.php (a folder OUTSIDE the web root).\n"); exit(1); }
if (!is_dir($dir) && !@mkdir($dir, 0700, true)) { fwrite(STDERR, "Cannot create $dir\n"); exit(1); }
$dir = realpath($dir);
if (str_starts_with($dir . '/', realpath(__DIR__ . '/..') . '/')) { fwrite(STDERR, "backup_path must not be inside the project folder.\n"); exit(1); }

$stamp = gmdate('Ymd-His');
$sql = "$dir/pqb-$stamp.sql.gz";
$db = config('db');

/* 1. Database dump (compressed in PHP so no extra tools are needed). */
$cmd = [config('mysqldump', 'mysqldump'), '--single-transaction', '--routines', '--default-character-set=utf8mb4', '-h', $db['host'], '-u', $db['user'], $db['name']];
$proc = proc_open($cmd, [1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes, null, ['MYSQL_PWD' => $db['pass'], 'PATH' => getenv('PATH') ?: ''] + (getenv('SystemRoot') ? ['SystemRoot' => getenv('SystemRoot')] : []));
if (!is_resource($proc)) { fwrite(STDERR, "Could not start mysqldump. Set 'mysqldump' in config to its full path.\n"); exit(1); }
$gz = gzopen($sql, 'wb9');
while (!feof($pipes[1])) { $chunk = fread($pipes[1], 1048576); if ($chunk !== false && $chunk !== '') gzwrite($gz, $chunk); }
gzclose($gz);
$err = stream_get_contents($pipes[2]);
$code = proc_close($proc);
if ($code !== 0 || filesize($sql) < 200) { @unlink($sql); fwrite(STDERR, "mysqldump failed: " . trim($err) . "\n"); exit(1); }
chmod($sql, 0600);
echo "Database saved: $sql (" . round(filesize($sql) / 1024) . " KB)\n";

/* 2. Uploaded PDFs. */
$root = storage_root();
$tar = "$dir/pqb-$stamp-files.tar";
try {
    $phar = new PharData($tar);
    if (is_dir("$root/questions")) $phar->buildFromDirectory($root, '#^' . preg_quote($root . DIRECTORY_SEPARATOR, '#') . 'questions#');
    else $phar->addFromString('questions/.empty', '');
    $phar->compress(Phar::GZ);
    unset($phar);
    @unlink($tar);
    chmod("$tar.gz", 0600);
    echo "Files saved: $tar.gz (" . round(filesize("$tar.gz") / 1024) . " KB)\n";
} catch (Throwable $e) {
    fwrite(STDERR, 'File backup failed: ' . $e->getMessage() . "\n");
    exit(1);
}

/* 3. Keep only the newest N. */
$keep = max(1, (int)config('backup_keep', 14));
foreach (['*.sql.gz', '*-files.tar.gz'] as $pattern) {
    $files = glob("$dir/pqb-$pattern") ?: [];
    rsort($files);
    foreach (array_slice($files, $keep) as $old) { @unlink($old); echo "Removed old backup: " . basename($old) . "\n"; }
}
echo "Done.\n";