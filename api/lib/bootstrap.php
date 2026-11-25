<?php
declare(strict_types=1);

date_default_timezone_set('UTC');
mb_internal_encoding('UTF-8');

// Never print PHP errors into API responses; they are written to the server log instead.
ini_set('display_errors', '0');
ini_set('log_errors', '1');

/* ---------- Errors ---------- */
final class HttpError extends RuntimeException
{
    public function __construct(public int $status, public string $errCode, string $message, public array $fields = [])
    {
        parent::__construct($message);
    }
}

function fail(int $status, string $code, string $message, array $fields = []): never
{
    throw new HttpError($status, $code, $message, $fields);
}

/* ---------- Config ---------- */
function config(?string $key = null, mixed $default = null): mixed
{
    static $cfg = null;
    if ($cfg === null) {
        $file = __DIR__ . '/../config.php';
        if (!is_file($file)) {
            fail(500, 'not_configured', 'The server is not configured yet (api/config.php is missing).');
        }
        $cfg = require $file;
        foreach (['host' => 'PQB_DB_HOST', 'name' => 'PQB_DB_NAME', 'user' => 'PQB_DB_USER', 'pass' => 'PQB_DB_PASS'] as $k => $env) {
            $v = getenv($env);
            if ($v !== false && $v !== '') $cfg['db'][$k] = $v;
        }
    }
    if ($key === null) return $cfg;
    $cur = $cfg;
    foreach (explode('.', $key) as $part) {
        if (!is_array($cur) || !array_key_exists($part, $cur)) return $default;
        $cur = $cur[$part];
    }
    return $cur;
}

/* ---------- Database (PDO) ---------- */
function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $c = config('db');
        $dsn = "mysql:host={$c['host']};dbname={$c['name']};charset={$c['charset']}";
        $pdo = new PDO($dsn, $c['user'], $c['pass'], [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
        $pdo->exec("SET time_zone = '+00:00'");
    }
    return $pdo;
}

/** Run a prepared statement and return it. */
function q(string $sql, array $params = []): PDOStatement
{
    $st = db()->prepare($sql);
    $st->execute($params);
    return $st;
}
function q_all(string $sql, array $params = []): array { return q($sql, $params)->fetchAll(); }
function q_one(string $sql, array $params = []): ?array { $r = q($sql, $params)->fetch(); return $r === false ? null : $r; }
function q_val(string $sql, array $params = []): mixed { $r = q($sql, $params)->fetchColumn(); return $r === false ? null : $r; }

/* ---------- Request / response ---------- */
function method(): string { return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET'); }

function request_path(): string
{
    $uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    $base = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/');
    if ($base !== '' && str_starts_with($uri, $base)) $uri = substr($uri, strlen($base));
    return '/' . trim(rawurldecode($uri), '/');
}

/** True if $ip equals, or falls inside, any entry of $list (single IPs or CIDR ranges, IPv4 or IPv6). */
function ip_matches(string $ip, array $list): bool
{
    $bin = @inet_pton($ip);
    if ($bin === false) return false;
    foreach ($list as $entry) {
        [$net, $bits] = array_pad(explode('/', (string)$entry, 2), 2, null);
        $nb = @inet_pton($net);
        if ($nb === false || strlen($nb) !== strlen($bin)) continue;
        $bits = $bits === null ? strlen($bin) * 8 : (int)$bits;
        $bytes = intdiv($bits, 8); $rem = $bits % 8;
        if (substr($bin, 0, $bytes) !== substr($nb, 0, $bytes)) continue;
        if ($rem === 0) return true;
        $mask = (0xFF << (8 - $rem)) & 0xFF;
        if ((ord($bin[$bytes]) & $mask) === (ord($nb[$bytes]) & $mask)) return true;
    }
    return false;
}

/** The visitor's address. X-Forwarded-For is believed ONLY when the request comes from a proxy listed in
 *  config 'trusted_proxies'; otherwise anyone could fake their address and dodge the rate limits. */
function client_ip(): string
{
    $ip = substr((string)($_SERVER['REMOTE_ADDR'] ?? 'unknown'), 0, 45);
    $trusted = (array)config('trusted_proxies', []);
    if ($trusted && ip_matches($ip, $trusted) && !empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $hops = array_map('trim', explode(',', (string)$_SERVER['HTTP_X_FORWARDED_FOR']));
        for ($i = count($hops) - 1; $i >= 0; $i--) {          // right-most address that is not one of our proxies
            if (filter_var($hops[$i], FILTER_VALIDATE_IP) && !ip_matches($hops[$i], $trusted)) return $hops[$i];
        }
    }
    return $ip;
}

/** Request data: JSON body, or form fields for multipart/form posts. */
function body(): array
{
    static $data = null;
    if ($data !== null) return $data;
    $type = strtolower($_SERVER['CONTENT_TYPE'] ?? '');
    if (str_contains($type, 'application/json')) {
        $raw = file_get_contents('php://input', false, null, 0, 1048577);
        if ($raw !== '' && $raw !== false) {
            if (strlen($raw) > 1048576) fail(413, 'too_large', 'The request is too large.');
            $j = json_decode($raw, true);
            if (!is_array($j)) fail(400, 'bad_json', 'The request body is not valid JSON.');
            return $data = $j;
        }
        return $data = [];
    }
    $len = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($len > 0 && !$_POST && !$_FILES && str_contains($type, 'multipart/form-data')) {
        fail(413, 'too_large', 'The upload is larger than the server allows (post_max_size). Use fewer or smaller files.');
    }
    return $data = $_POST;
}

function send_headers(): void
{
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: no-referrer');
    header('X-Frame-Options: SAMEORIGIN');
}

function json_out(mixed $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

function iso(?string $dt): ?string
{
    return $dt === null ? null : str_replace(' ', 'T', $dt) . 'Z';
}

/* ---------- Validation ---------- */
function clean(string $s, bool $multiline = false): string
{
    $s = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $s) ?? '';
    if (!$multiline) $s = preg_replace('/\s+/u', ' ', $s) ?? '';
    return trim($s);
}

final class Check
{
    public array $errors = [];
    public function __construct(private array $in) {}

    public function has(string $k): bool { return array_key_exists($k, $this->in); }
    public function raw(string $k): mixed { return $this->in[$k] ?? null; }

    public function text(string $k, string $label, int $min, int $max, bool $multi = false): string
    {
        $v = $this->in[$k] ?? '';
        if (!is_string($v) && !is_numeric($v)) $v = '';
        $v = (string)$v;
        if (!mb_check_encoding($v, 'UTF-8')) { $this->errors[$k] = "$label has invalid characters."; return ''; }
        $v = clean($v, $multi);
        if (!$multi && preg_match('/[<>]/', $v)) { $this->errors[$k] = "$label cannot contain < or > characters."; return $v; }
        $len = mb_strlen($v);
        if ($len === 0 && $min > 0) $this->errors[$k] = "$label is required.";
        elseif ($len > 0 && $len < $min) $this->errors[$k] = "$label must be at least $min characters.";
        elseif ($len > $max) $this->errors[$k] = "$label must be $max characters or fewer.";
        return $v;
    }

    public function id(string $k, string $label, bool $required = true): ?int
    {
        $v = $this->in[$k] ?? null;
        if ($v === null || $v === '') {
            if ($required) $this->errors[$k] = "Choose a $label.";
            return null;
        }
        $n = filter_var($v, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        if ($n === false) { $this->errors[$k] = "Choose a valid $label."; return null; }
        return $n;
    }

    public function bool(string $k, bool $default = false): bool
    {
        if (!array_key_exists($k, $this->in)) return $default;
        $v = $this->in[$k];
        if (is_bool($v)) return $v;
        return in_array(strtolower((string)$v), ['1', 'true', 'on', 'yes'], true);
    }

    public function year(string $k, bool $required): ?int
    {
        $v = trim((string)($this->in[$k] ?? ''));
        if ($v === '') {
            if ($required) $this->errors[$k] = 'Examination year is required.';
            return null;
        }
        $min = (int)config('year_min', 2000);
        $max = (int)gmdate('Y');
        if (!preg_match('/^\d{4}$/', $v) || (int)$v < $min || (int)$v > $max) {
            $this->errors[$k] = "Year must be a four-digit year between $min and $max.";
            return null;
        }
        return (int)$v;
    }

    public function code(string $k): string
    {
        $v = $this->text($k, 'Course code', 2, 20);
        if (!isset($this->errors[$k]) && !preg_match('/^[A-Za-z0-9][A-Za-z0-9 \/-]*$/', $v)) {
            $this->errors[$k] = 'Use letters, numbers, spaces, hyphens or slashes only, for example CSC 101.';
        }
        return $v;
    }

    public function email(string $k): string
    {
        $v = $this->text($k, 'Email', 0, 120);
        if ($v !== '' && !isset($this->errors[$k]) && !filter_var($v, FILTER_VALIDATE_EMAIL)) {
            $this->errors[$k] = 'Enter an email like name@example.com, or leave it blank.';
        }
        return $v;
    }

    public function done(): void
    {
        if ($this->errors) fail(422, 'validation', 'Please correct the highlighted fields.', $this->errors);
    }
}

/** Validate an ID path parameter. */
function path_id(array $p): int { return (int)($p['id'] ?? 0); }

/* ---------- Throttling ---------- */
function rl_count(string $action, string $subject, int $windowSec): int
{
    return (int)q_val(
        'SELECT COUNT(*) FROM rate_limits WHERE action = ? AND subject = ? AND created_at > (UTC_TIMESTAMP() - INTERVAL ? SECOND)',
        [$action, $subject, $windowSec]
    );
}
function rl_hit(string $action, string $subject): void
{
    q('INSERT INTO rate_limits (action, subject, created_at) VALUES (?, ?, UTC_TIMESTAMP())', [$action, substr($subject, 0, 100)]);
    if (random_int(1, 50) === 1) q('DELETE FROM rate_limits WHERE created_at < (UTC_TIMESTAMP() - INTERVAL 1 DAY)');
}
function rl_clear(string $action, string $subject): void
{
    q('DELETE FROM rate_limits WHERE action = ? AND subject = ?', [$action, $subject]);
}

/* ---------- Router ---------- */
/** $routes: [method, pattern like /admin/questions/{id}, handler function name, access: public|admin|main] */
function dispatch(array $routes): never
{
    send_headers();
    try {
        $path = request_path();
        $m = method();
        $pathMatched = false;
        foreach ($routes as [$rm, $pattern, $handler, $access]) {
            $re = '#^' . preg_replace('#\{(\w+)\}#', '(?P<$1>\d+)', $pattern) . '$#';
            if (!preg_match($re, $path, $mt)) continue;
            $pathMatched = true;
            if ($rm !== $m) continue;
            $params = array_filter($mt, 'is_string', ARRAY_FILTER_USE_KEY);
            if ($access !== 'public') {
                require_auth();
                if (!in_array($m, ['GET', 'HEAD'], true)) check_csrf();
                if ($access === 'main') require_role('main');
            }
            $handler($params);
            fail(500, 'no_response', 'The handler returned no response.');
        }
        fail($pathMatched ? 405 : 404, $pathMatched ? 'method_not_allowed' : 'not_found', $pathMatched ? 'That method is not allowed here.' : 'Not found.');
    } catch (HttpError $e) {
        $out = ['error' => ['code' => $e->errCode, 'message' => $e->getMessage()]];
        if ($e->fields) $out['error']['fields'] = $e->fields;
        json_out($out, $e->status);
    } catch (PDOException $e) {
        error_log('PQB database error: ' . $e->getMessage());
        if ($e->getCode() === '23000') {
            json_out(['error' => ['code' => 'conflict', 'message' => 'That change conflicts with existing records.']], 409);
        }
        json_out(['error' => ['code' => 'server_error', 'message' => 'A database error occurred.'] + (config('debug') ? ['detail' => $e->getMessage()] : [])], 500);
    } catch (Throwable $e) {
        error_log('PQB error: ' . $e);
        json_out(['error' => ['code' => 'server_error', 'message' => 'Something went wrong on the server.'] + (config('debug') ? ['detail' => $e->getMessage()] : [])], 500);
    }
}