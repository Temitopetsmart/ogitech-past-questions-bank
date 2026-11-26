<?php
declare(strict_types=1);

/* Departments and academic structure. Reading is allowed for both roles (the upload form needs it);
   every change is Main Admin only (enforced by the router). */

function structure_payload(): array
{
    $links = q_all('SELECT department_id, programme_id FROM department_programmes');
    $deps = [];
    foreach (q_all('SELECT d.*, (SELECT COUNT(*) FROM questions q WHERE q.department_id = d.id) AS qc FROM departments d ORDER BY d.sort_order, d.id') as $d) {
        $deps[] = [
            'id' => (int)$d['id'], 'name' => $d['name'], 'description' => $d['description'],
            'visible' => (bool)$d['is_visible'], 'order' => (int)$d['sort_order'], 'questionCount' => (int)$d['qc'],
            'programmeIds' => array_values(array_map(fn($l) => (int)$l['programme_id'], array_filter($links, fn($l) => (int)$l['department_id'] === (int)$d['id']))),
        ];
    }
    $lists = academic_lists();
    $count = fn(string $col) => array_column(q_all("SELECT $col AS k, COUNT(*) AS c FROM questions GROUP BY $col"), 'c', 'k');
    $byProg = $count('programme_id'); $byLevel = $count('level_id'); $bySem = $count('semester_id'); $bySess = $count('session_id');
    $depCount = array_column(q_all('SELECT programme_id AS k, COUNT(*) AS c FROM department_programmes GROUP BY programme_id'), 'c', 'k');
    foreach ($lists['programmes'] as &$p) {
        $p['questionCount'] = (int)($byProg[$p['id']] ?? 0);
        $p['departmentCount'] = (int)($depCount[$p['id']] ?? 0);
        foreach ($p['levels'] as &$l) $l['questionCount'] = (int)($byLevel[$l['id']] ?? 0);
        unset($l);
    }
    unset($p);
    foreach ($lists['semesters'] as &$s) $s['questionCount'] = (int)($bySem[$s['id']] ?? 0);
    unset($s);
    foreach ($lists['sessions'] as &$s) $s['questionCount'] = (int)($bySess[$s['id']] ?? 0);
    unset($s);
    return ['departments' => $deps] + $lists;
}

function adm_structure(array $p): void
{
    if (($_GET['list'] ?? '') === 'departments') {
        [$page, $per] = pagination_params($_GET, 10, 10);
        $total = (int)q_val('SELECT COUNT(*) FROM departments');
        $meta = pagination_meta($total, $page, $per);
        $offset = ($page - 1) * $per;
        $rows = q_all('SELECT d.*, (SELECT COUNT(*) FROM questions q WHERE q.department_id = d.id) AS qc
            FROM departments d ORDER BY d.sort_order, d.id LIMIT ' . $per . ' OFFSET ' . $offset);
        $ids = array_map('intval', array_column($rows, 'id'));
        $links = [];
        if ($ids) {
            $links = q_all('SELECT department_id, programme_id FROM department_programmes WHERE department_id IN (' . implode(',', $ids) . ')');
        }
        $data = array_map(function ($d) use ($links) {
            return [
                'id' => (int)$d['id'], 'name' => $d['name'], 'description' => $d['description'],
                'visible' => (bool)$d['is_visible'], 'order' => (int)$d['sort_order'],
                'questionCount' => (int)$d['qc'],
                'programmeIds' => array_values(array_map(fn($l) => (int)$l['programme_id'],
                    array_filter($links, fn($l) => (int)$l['department_id'] === (int)$d['id']))),
            ];
        }, $rows);
        json_out(['data' => $data, 'meta' => $meta]);
    }
    json_out(structure_payload());
}

function next_order(string $table): int { return (int)q_val("SELECT COALESCE(MAX(sort_order), 0) + 1 FROM $table"); }

/* ---------- Departments ---------- */
function dept_input(?int $selfId): array
{
    $in = body();
    $c = new Check($in);
    $name = $c->text('name', 'Department name', 2, 80);
    $desc = $c->text('description', 'Description', 0, 200);
    $vis = $c->bool('visible', true);
    $ids = $in['programmeIds'] ?? null;
    if (!is_array($ids) || !$ids) {
        $c->errors['programmeIds'] = 'Choose at least one programme.';
    } else {
        foreach ($ids as $value) {
            if (!is_scalar($value) || filter_var($value, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]) === false) {
                $c->errors['programmeIds'] = 'Choose valid programmes from the list.';
                break;
            }
        }
    }
    $c->done();
    $ids = array_values(array_unique(array_map('intval', $ids)));
    $found = (int)q_val('SELECT COUNT(*) FROM programmes WHERE id IN (' . implode(',', array_fill(0, count($ids), '?')) . ')', $ids);
    if ($found !== count($ids)) fail(422, 'validation', 'Please correct the highlighted fields.', ['programmeIds' => 'One of the programmes does not exist.']);
    if (q_one('SELECT 1 FROM departments WHERE name = ? AND id <> ?', [$name, $selfId ?? 0])) {
        fail(422, 'validation', 'Please correct the highlighted fields.', ['name' => 'A department with this name already exists.']);
    }
    return [$name, $desc, $vis, $ids];
}

function struct_dept_create(array $p): void
{
    [$name, $desc, $vis, $ids] = dept_input(null);
    $pdo = db(); $pdo->beginTransaction();
    q('INSERT INTO departments (name, description, is_visible, sort_order) VALUES (?, ?, ?, ?)', [$name, $desc, $vis ? 1 : 0, next_order('departments')]);
    $id = (int)$pdo->lastInsertId();
    foreach ($ids as $pid) q('INSERT INTO department_programmes (department_id, programme_id) VALUES (?, ?)', [$id, $pid]);
    $pdo->commit();
    json_out(structure_payload(), 201);
}

function struct_dept_update(array $p): void
{
    $id = path_id($p);
    if (!q_one('SELECT 1 FROM departments WHERE id = ?', [$id])) fail(404, 'not_found', 'Department not found.');
    [$name, $desc, $vis, $ids] = dept_input($id);
    $blocked = q_all('SELECT DISTINCT pr.name FROM questions q JOIN programmes pr ON pr.id = q.programme_id WHERE q.department_id = ? AND q.programme_id NOT IN (' . implode(',', array_fill(0, count($ids), '?')) . ')', array_merge([$id], $ids));
    if ($blocked) fail(409, 'in_use', 'Questions exist for ' . implode(', ', array_column($blocked, 'name')) . ' in this department. Move or delete them before removing that programme.', ['programmeIds' => 'Programme still has questions.']);
    $pdo = db(); $pdo->beginTransaction();
    q('UPDATE departments SET name = ?, description = ?, is_visible = ? WHERE id = ?', [$name, $desc, $vis ? 1 : 0, $id]);
    q('DELETE FROM department_programmes WHERE department_id = ?', [$id]);
    foreach ($ids as $pid) q('INSERT INTO department_programmes (department_id, programme_id) VALUES (?, ?)', [$id, $pid]);
    $pdo->commit();
    json_out(structure_payload());
}

function struct_dept_delete(array $p): void
{
    $id = path_id($p);
    if (!q_one('SELECT 1 FROM departments WHERE id = ?', [$id])) fail(404, 'not_found', 'Department not found.');
    $n = (int)q_val('SELECT COUNT(*) FROM questions WHERE department_id = ?', [$id]);
    $pdo = db(); $pdo->beginTransaction();
    if ($n > 0) {
        $rawMoveTo = $_GET['moveTo'] ?? (body()['moveTo'] ?? null);
        $to = is_scalar($rawMoveTo) ? filter_var($rawMoveTo, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]) : false;
        if (!$to || $to === $id) fail(409, 'in_use', "$n question(s) use this department. Choose another department to move them to.");
        if (!q_one('SELECT 1 FROM departments WHERE id = ?', [$to])) fail(422, 'validation', 'The department to move questions to does not exist.');
        $missing = q_all('SELECT DISTINCT pr.name FROM questions q JOIN programmes pr ON pr.id = q.programme_id
            WHERE q.department_id = ? AND q.programme_id NOT IN (SELECT programme_id FROM department_programmes WHERE department_id = ?)', [$id, $to]);
        if ($missing) fail(409, 'in_use', 'The target department does not offer ' . implode(', ', array_column($missing, 'name')) . '. Add that programme to it first.');
        q('UPDATE questions SET department_id = ? WHERE department_id = ?', [$to, $id]);
        q('UPDATE question_requests SET department_id = ? WHERE department_id = ?', [$to, $id]);
    }
    q('DELETE FROM departments WHERE id = ?', [$id]);
    $pdo->commit();
    json_out(structure_payload());
}

function struct_dept_reorder(array $p): void
{
    $ids = body()['ids'] ?? null;
    $all = array_map('intval', array_column(q_all('SELECT id FROM departments'), 'id'));
    if (!is_array($ids)) fail(422, 'validation', 'Send {"ids": [...]}.');
    $ids = array_map('intval', $ids);
    $a = $all; $b = $ids; sort($a); sort($b);
    if ($a !== $b) fail(422, 'validation', 'The list must contain every department exactly once.');
    $pdo = db(); $pdo->beginTransaction();
    foreach ($ids as $i => $id) q('UPDATE departments SET sort_order = ? WHERE id = ?', [$i + 1, $id]);
    $pdo->commit();
    json_out(structure_payload());
}

/* ---------- Programmes, levels, semesters ---------- */
function name_input(string $label): string
{
    $c = new Check(body());
    $n = $c->text('name', $label, 2, 20);
    $c->done();
    return $n;
}
function unique_or_fail(string $sql, array $args, string $label): void
{
    if (q_one($sql, $args)) fail(422, 'validation', 'Please correct the highlighted fields.', ['name' => "That $label already exists."]);
}

function struct_prog_create(array $p): void
{
    $n = name_input('Programme');
    unique_or_fail('SELECT 1 FROM programmes WHERE name = ?', [$n], 'programme');
    q('INSERT INTO programmes (name, sort_order) VALUES (?, ?)', [$n, next_order('programmes')]);
    json_out(structure_payload(), 201);
}
function struct_prog_update(array $p): void
{
    $id = path_id($p); $n = name_input('Programme');
    if (!q_one('SELECT 1 FROM programmes WHERE id = ?', [$id])) fail(404, 'not_found', 'Programme not found.');
    unique_or_fail('SELECT 1 FROM programmes WHERE name = ? AND id <> ?', [$n, $id], 'programme');
    q('UPDATE programmes SET name = ? WHERE id = ?', [$n, $id]);   // questions reference the id, so nothing else changes
    json_out(structure_payload());
}
function struct_prog_delete(array $p): void
{
    $id = path_id($p);
    if (!q_one('SELECT 1 FROM programmes WHERE id = ?', [$id])) fail(404, 'not_found', 'Programme not found.');
    if ((int)q_val('SELECT COUNT(*) FROM programmes') <= 1) fail(409, 'in_use', 'At least one programme is required.');
    if (q_val('SELECT 1 FROM questions WHERE programme_id = ? LIMIT 1', [$id]) || q_val('SELECT 1 FROM department_programmes WHERE programme_id = ? LIMIT 1', [$id])) {
        fail(409, 'in_use', 'This programme is used by questions or departments. Move or remove them first.');
    }
    q('DELETE FROM programmes WHERE id = ?', [$id]);   // its levels go with it
    json_out(structure_payload());
}

function struct_level_create(array $p): void
{
    $in = body(); $c = new Check($in);
    $pid = $c->id('programmeId', 'programme'); $n = $c->text('name', 'Level', 2, 20); $c->done();
    if (!q_one('SELECT 1 FROM programmes WHERE id = ?', [$pid])) fail(422, 'validation', 'That programme does not exist.', ['programmeId' => 'That programme does not exist.']);
    unique_or_fail('SELECT 1 FROM levels WHERE programme_id = ? AND name = ?', [$pid, $n], 'level');
    q('INSERT INTO levels (programme_id, name, sort_order) VALUES (?, ?, (SELECT COALESCE(MAX(l.sort_order), 0) + 1 FROM levels l WHERE l.programme_id = ?))', [$pid, $n, $pid]);
    json_out(structure_payload(), 201);
}
function struct_level_update(array $p): void
{
    $id = path_id($p); $n = name_input('Level');
    $l = q_one('SELECT programme_id FROM levels WHERE id = ?', [$id]);
    if (!$l) fail(404, 'not_found', 'Level not found.');
    unique_or_fail('SELECT 1 FROM levels WHERE programme_id = ? AND name = ? AND id <> ?', [$l['programme_id'], $n, $id], 'level');
    q('UPDATE levels SET name = ? WHERE id = ?', [$n, $id]);
    json_out(structure_payload());
}
function struct_level_delete(array $p): void
{
    $id = path_id($p);
    if (!q_one('SELECT 1 FROM levels WHERE id = ?', [$id])) fail(404, 'not_found', 'Level not found.');
    if (q_val('SELECT 1 FROM questions WHERE level_id = ? LIMIT 1', [$id])) fail(409, 'in_use', 'Questions use this level. Move or delete them first.');
    q('DELETE FROM levels WHERE id = ?', [$id]);
    json_out(structure_payload());
}

function struct_sem_create(array $p): void
{
    $n = name_input('Semester');
    unique_or_fail('SELECT 1 FROM semesters WHERE name = ?', [$n], 'semester');
    q('INSERT INTO semesters (name, sort_order) VALUES (?, ?)', [$n, next_order('semesters')]);
    json_out(structure_payload(), 201);
}
function struct_sem_update(array $p): void
{
    $id = path_id($p); $n = name_input('Semester');
    if (!q_one('SELECT 1 FROM semesters WHERE id = ?', [$id])) fail(404, 'not_found', 'Semester not found.');
    unique_or_fail('SELECT 1 FROM semesters WHERE name = ? AND id <> ?', [$n, $id], 'semester');
    q('UPDATE semesters SET name = ? WHERE id = ?', [$n, $id]);
    json_out(structure_payload());
}
function struct_sem_delete(array $p): void
{
    $id = path_id($p);
    if (!q_one('SELECT 1 FROM semesters WHERE id = ?', [$id])) fail(404, 'not_found', 'Semester not found.');
    if ((int)q_val('SELECT COUNT(*) FROM semesters') <= 1) fail(409, 'in_use', 'At least one semester is required.');
    if (q_val('SELECT 1 FROM questions WHERE semester_id = ? LIMIT 1', [$id])) fail(409, 'in_use', 'Questions use this semester. Move or delete them first.');
    q('DELETE FROM semesters WHERE id = ?', [$id]);
    json_out(structure_payload());
}

/* ---------- Academic sessions (e.g. 2025/2026) ---------- */
function session_input(?int $selfId): array
{
    $c = new Check(body());
    $n = $c->text('name', 'Session', 9, 9);
    $c->done();
    if (!preg_match('#^(\d{4})/(\d{4})$#', $n, $m) || (int)$m[2] !== (int)$m[1] + 1 || (int)$m[1] < (int)config('year_min', 2000) || (int)$m[1] > (int)gmdate('Y') + 2) {
        fail(422, 'validation', 'Please correct the highlighted fields.', ['name' => 'Use the format 2025/2026 (the second year is one more than the first).']);
    }
    unique_or_fail('SELECT 1 FROM academic_sessions WHERE start_year = ? AND id <> ?', [(int)$m[1], $selfId ?? 0], 'session');
    return [$n, (int)$m[1]];
}
function struct_sess_create(array $p): void
{
    [$n, $y] = session_input(null);
    q('INSERT INTO academic_sessions (start_year, name) VALUES (?, ?)', [$y, $n]);
    json_out(structure_payload(), 201);
}
function struct_sess_update(array $p): void
{
    $id = path_id($p);
    if (!q_one('SELECT 1 FROM academic_sessions WHERE id = ?', [$id])) fail(404, 'not_found', 'Session not found.');
    [$n, $y] = session_input($id);
    q('UPDATE academic_sessions SET start_year = ?, name = ? WHERE id = ?', [$y, $n, $id]);
    json_out(structure_payload());
}
function struct_sess_delete(array $p): void
{
    $id = path_id($p);
    if (!q_one('SELECT 1 FROM academic_sessions WHERE id = ?', [$id])) fail(404, 'not_found', 'Session not found.');
    if (q_val('SELECT 1 FROM questions WHERE session_id = ? LIMIT 1', [$id])) fail(409, 'in_use', 'Questions use this session. Move or delete them first.');
    q('DELETE FROM academic_sessions WHERE id = ?', [$id]);
    json_out(structure_payload());
}