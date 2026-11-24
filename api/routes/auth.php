<?php
declare(strict_types=1);

function auth_login(array $p): void
{
    $in = body();
    $username = clean((string)($in['username'] ?? ''));
    $password = (string)($in['password'] ?? '');
    if ($username === '' || $password === '') fail(422, 'validation', 'Enter your username and password.');
    if (strlen($username) > 30 || strlen($password) > 200) fail(401, 'bad_credentials', 'Incorrect username or password.');
    $u = do_login($username, $password);
    json_out(['user' => user_json($u), 'csrfToken' => csrf_token()]);
}

function auth_me(array $p): void
{
    $u = current_user();
    json_out($u ? ['user' => user_json($u), 'csrfToken' => csrf_token()] : ['user' => null, 'csrfToken' => null]);
}

function auth_logout(array $p): void
{
    if (current_user()) check_csrf();
    destroy_session();
    json_out(['ok' => true]);
}