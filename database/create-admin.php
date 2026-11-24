<?php
declare(strict_types=1);

/* Create an administrator from the command line (the first Main Admin, or a recovery account):
     php database/create-admin.php
   Nothing is stored in this repository: you type the password here and only its hash is saved. */

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

require __DIR__ . '/../api/lib/bootstrap.php';

function ask(string $label, bool $hidden = false): string
{
    echo $label;
    if ($hidden && DIRECTORY_SEPARATOR === '/' && stream_isatty(STDIN)) system('stty -echo');
    $v = trim((string)fgets(STDIN));
    if ($hidden && DIRECTORY_SEPARATOR === '/' && stream_isatty(STDIN)) { system('stty echo'); echo "\n"; }
    return $v;
}

$name = ask('Full name: ');
$username = ask('Username (3-30 letters, numbers, . _ -): ');
$role = ask('Role (main/manager) [main]: ') ?: 'main';
$pw = ask('Password (8+ characters): ', true);
$pw2 = ask('Repeat password: ', true);

$errors = [];
if (mb_strlen($name) < 2) $errors[] = 'Name is too short.';
if (!preg_match('/^[A-Za-z0-9._-]{3,30}$/', $username)) $errors[] = 'Invalid username.';
if (!in_array($role, ['main', 'manager'], true)) $errors[] = 'Role must be main or manager.';
if (strlen($pw) < 8 || strlen($pw) > 72) $errors[] = 'Password must be 8 to 72 characters.';
if ($pw !== $pw2) $errors[] = 'Passwords do not match.';
if (!$errors && q_one('SELECT 1 FROM admin_users WHERE username = ?', [$username])) $errors[] = 'That username already exists.';
if ($errors) { fwrite(STDERR, implode("\n", $errors) . "\n"); exit(1); }

q('INSERT INTO admin_users (name, username, password_hash, role, is_active) VALUES (?, ?, ?, ?, 1)', [$name, $username, password_hash($pw, PASSWORD_DEFAULT), $role]);
echo "Created $role account \"$username\".\n";