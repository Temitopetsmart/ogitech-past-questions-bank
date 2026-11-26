<?php
declare(strict_types=1);

/* Admin accounts (Main Admin only). */

function users_input(?array $existing): array
{
    $in = body(); $c = new Check($in);
    $name = $c->text('name', 'Full name', 2, 60);
    $username = $c->text('username', 'Username', 3, 30);
    if (!isset($c->errors['username']) && !preg_match('/^[A-Za-z0-9._-]+$/', $username)) $c->errors['username'] = 'Use letters, numbers, dots, dashes or underscores only.';
    $role = (string)($in['role'] ?? '');
    if (!in_array($role, ['main', 'manager'], true)) $c->errors['role'] = 'Choose a role.';
    $active = $c->bool('active', true);
    $pw = (string)($in['password'] ?? '');
    if (!$existing || $pw !== '') {
        if (strlen($pw) < 8) $c->errors['password'] = 'Password must be at least 8 characters.';
        elseif (strlen($pw) > 72) $c->errors['password'] = 'Password must be 72 characters or fewer.';
        elseif (strcasecmp($pw, $username) === 0) $c->errors['password'] = 'Password must not be the same as the username.';
    }
    $c->done();
    if (q_one('SELECT 1 FROM admin_users WHERE username = ? AND id <> ?', [$username, $existing['id'] ?? 0])) {
        fail(422, 'validation', 'Please correct the highlighted fields.', ['username' => 'That username is already taken.']);
    }
    return [$name, $username, $role, $active, $pw];
}

function users_list(array $p): void
{
    [$page, $per] = pagination_params($_GET, 10, 10);
    $total = (int)q_val('SELECT COUNT(*) FROM admin_users');
    $meta = pagination_meta($total, $page, $per);
    $offset = ($page - 1) * $per;
    $rows = q_all('SELECT * FROM admin_users ORDER BY created_at, id LIMIT ' . $per . ' OFFSET ' . $offset);
    json_out(['data' => array_map('user_json', $rows), 'meta' => $meta]);
}

/** Guard: after a change there must still be at least one active Main Admin. */
function ensure_main_remains(int $exceptId, bool $willBeMain): void
{
    if ($willBeMain) return;
    if ((int)q_val("SELECT COUNT(*) FROM admin_users WHERE role = 'main' AND is_active = 1 AND id <> ? FOR UPDATE", [$exceptId]) < 1) {
        db()->rollBack();
        fail(409, 'last_main_admin', 'At least one active Main Admin must remain.');
    }
}

function users_create(array $p): void
{
    [$name, $username, $role, $active, $pw] = users_input(null);
    q('INSERT INTO admin_users (name, username, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?)', [$name, $username, password_hash($pw, PASSWORD_DEFAULT), $role, $active ? 1 : 0]);
    json_out(['data' => user_json(q_one('SELECT * FROM admin_users WHERE id = ?', [db()->lastInsertId()]))], 201);
}

function users_update(array $p): void
{
    $id = path_id($p);
    $ex = q_one('SELECT * FROM admin_users WHERE id = ?', [$id]);
    if (!$ex) fail(404, 'not_found', 'Account not found.');
    [$name, $username, $role, $active, $pw] = users_input($ex);
    db()->beginTransaction();
    ensure_main_remains($id, $role === 'main' && $active);
    q('UPDATE admin_users SET name = ?, username = ?, role = ?, is_active = ? WHERE id = ?', [$name, $username, $role, $active ? 1 : 0, $id]);
    if ($pw !== '') q('UPDATE admin_users SET password_hash = ? WHERE id = ?', [password_hash($pw, PASSWORD_DEFAULT), $id]);
    db()->commit();
    json_out(['data' => user_json(q_one('SELECT * FROM admin_users WHERE id = ?', [$id]))]);
}

function users_delete(array $p): void
{
    $id = path_id($p);
    if ($id === (int)require_auth()['id']) fail(409, 'self_delete', 'You cannot delete your own account.');
    if (!q_one('SELECT 1 FROM admin_users WHERE id = ?', [$id])) fail(404, 'not_found', 'Account not found.');
    db()->beginTransaction();
    ensure_main_remains($id, false);
    q('DELETE FROM admin_users WHERE id = ?', [$id]);
    db()->commit();
    json_out(['ok' => true]);
}