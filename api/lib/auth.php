<?php
declare(strict_types=1);

/* Session-based admin authentication. Roles and "is active" are re-read from the database on every
   request, so disabling or demoting an account takes effect immediately. */

function start_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) return;
    $secure = config('secure_cookies');
    if ($secure === null) {
        $secure = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
        // Behind a trusted proxy/CDN that terminates HTTPS, PHP only sees plain HTTP: believe its forwarded protocol.
        if (!$secure && strtolower((string)($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https'
            && ip_matches((string)($_SERVER['REMOTE_ADDR'] ?? ''), (array)config('trusted_proxies', []))) $secure = true;
    }
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    // Keep session files in our own private folder and let PHP clean them up only after they truly expire.
    // (PHP's default cleanup is 24 minutes, which would sign admins out long before the idle limit.)
    $dir = (string)(config('session_path') ?: storage_root() . '/sessions');
    if (!is_dir($dir) && !@mkdir($dir, 0700, true)) fail(500, 'storage_error', 'The session folder could not be created.');
    ini_set('session.save_path', $dir);
    ini_set('session.gc_maxlifetime', (string)max((int)config('session_idle_minutes', 120) * 60, (int)config('session_max_hours', 12) * 3600));
    ini_set('session.gc_probability', '1');
    ini_set('session.gc_divisor', '100');
    session_name('pqb_sid');
    session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => (bool)$secure, 'httponly' => true, 'samesite' => 'Lax']);
    session_start();
}

function user_json(array $u): array
{
    return [
        'id' => (int)$u['id'], 'name' => $u['name'], 'username' => $u['username'], 'role' => $u['role'],
        'isActive' => (bool)$u['is_active'], 'lastLoginAt' => iso($u['last_login_at'] ?? null), 'createdAt' => iso($u['created_at'] ?? null),
    ];
}

function destroy_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        $_SESSION = [];
        $p = session_get_cookie_params();
        setcookie(session_name(), '', ['expires' => time() - 3600, 'path' => $p['path'], 'secure' => $p['secure'], 'httponly' => true, 'samesite' => 'Lax']);
        session_destroy();
    }
}

function current_user(): ?array
{
    static $loaded = false, $user = null;
    if ($loaded) return $user;
    $loaded = true;
    if (!isset($_COOKIE['pqb_sid'])) return null;
    start_session();
    $uid = $_SESSION['uid'] ?? null;
    if (!$uid) return null;
    $now = time();
    $idle = (int)config('session_idle_minutes', 120) * 60;
    $max  = (int)config('session_max_hours', 12) * 3600;
    if ($now - (int)($_SESSION['seen'] ?? 0) > $idle || $now - (int)($_SESSION['started'] ?? 0) > $max) {
        destroy_session();
        return null;
    }
    $row = q_one('SELECT * FROM admin_users WHERE id = ? AND is_active = 1', [$uid]);
    if (!$row) { destroy_session(); return null; }
    $_SESSION['seen'] = $now;
    return $user = $row;
}

function require_auth(): array
{
    $u = current_user();
    if (!$u) fail(401, 'unauthenticated', 'Please sign in.');
    return $u;
}

function require_role(string $role): void
{
    $u = require_auth();
    if ($u['role'] !== $role) fail(403, 'forbidden', 'Your account does not have permission to do that.');
}

function csrf_token(): string
{
    start_session();
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
    return $_SESSION['csrf'];
}

/** State-changing authenticated requests need the session's CSRF token and a same-origin Origin header. */
function check_csrf(): void
{
    start_session();
    $sent = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (empty($_SESSION['csrf']) || !is_string($sent) || !hash_equals($_SESSION['csrf'], $sent)) {
        fail(403, 'csrf', 'Your session security token is missing or expired. Reload the page and try again.');
    }
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '') {
        $oh = parse_url($origin, PHP_URL_HOST);
        $op = parse_url($origin, PHP_URL_PORT);
        $host = $_SERVER['HTTP_HOST'] ?? '';
        $originHost = $oh . ($op ? ':' . $op : '');
        if (!hash_equals(strtolower($host), strtolower((string)$originHost))) fail(403, 'csrf', 'Cross-site request blocked.');
    }
}

function do_login(string $username, string $password): array
{
    $subject = strtolower($username);
    $ip = client_ip();
    if (rl_count('login_user', $subject, 900) >= 5 || rl_count('login_ip', $ip, 900) >= 20) {
        fail(429, 'too_many_attempts', 'Too many failed sign-in attempts. Wait 15 minutes and try again.');
    }
    $row = q_one('SELECT * FROM admin_users WHERE username = ?', [$username]);
    // Always run a password check so response time does not reveal whether the username exists.
    $hash = $row['password_hash'] ?? '$2y$10$usesomesillystringforsalt.eOu5i1D4lJ6QHqk3sFZ8q3JpvEVLK';
    $ok = password_verify($password, $hash) && $row && (int)$row['is_active'] === 1;
    if (!$ok) {
        rl_hit('login_user', $subject);
        rl_hit('login_ip', $ip);
        fail(401, 'bad_credentials', 'Incorrect username or password.');
    }
    rl_clear('login_user', $subject);
    if (password_needs_rehash($row['password_hash'], PASSWORD_DEFAULT)) {
        q('UPDATE admin_users SET password_hash = ? WHERE id = ?', [password_hash($password, PASSWORD_DEFAULT), $row['id']]);
    }
    q('UPDATE admin_users SET last_login_at = UTC_TIMESTAMP() WHERE id = ?', [$row['id']]);
    start_session();
    session_regenerate_id(true);
    $_SESSION = ['uid' => (int)$row['id'], 'started' => time(), 'seen' => time(), 'csrf' => bin2hex(random_bytes(32))];
    return q_one('SELECT * FROM admin_users WHERE id = ?', [$row['id']]);
}