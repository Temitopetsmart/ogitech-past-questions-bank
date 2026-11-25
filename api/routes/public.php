<?php
declare(strict_types=1);

/* Public (no sign-in) endpoints. Only published questions are ever returned. */

function pub_meta(array $p): void
{
    $deps = q_all('SELECT d.id, d.name, d.description,
            (SELECT COUNT(*) FROM questions q WHERE q.department_id = d.id AND q.is_published = 1) AS question_count
        FROM departments d WHERE d.is_visible = 1 ORDER BY d.sort_order, d.id');
    $links = q_all('SELECT department_id, programme_id FROM department_programmes');
    $out = [];
    foreach ($deps as $d) {
        $out[] = [
            'id' => (int)$d['id'], 'name' => $d['name'], 'description' => $d['description'],
            'questionCount' => (int)$d['question_count'],
            'programmeIds' => array_values(array_map(fn($l) => (int)$l['programme_id'], array_filter($links, fn($l) => (int)$l['department_id'] === (int)$d['id']))),
        ];
    }
    $years = array_map('intval', array_column(q_all('SELECT DISTINCT exam_year FROM questions WHERE is_published = 1 ORDER BY exam_year DESC'), 'exam_year'));
    json_out(['departments' => $out, 'years' => $years] + academic_lists());
}

function pub_questions(array $p): void
{
    json_out(question_list($_GET, false, 12, 50));
}

function pub_question(array $p): void
{
    $r = get_question(path_id($p), true);
    // One view per visitor per question per hour, so refreshing (or a bot) cannot inflate the numbers.
    $k = client_ip() . '|' . $r['id'];
    if (rl_count('view', $k, 3600) === 0) {
        rl_hit('view', $k);
        q('UPDATE questions SET view_count = view_count + 1 WHERE id = ?', [$r['id']]);
        $r['view_count']++;
    }
    json_out(['data' => question_json($r, false)]);
}

function pub_file(array $p): void
{
    $r = get_question(path_id($p), true);
    $download = ($_GET['download'] ?? '') === '1';
    if ($download && !empty($r['file_path'])) {
        $k = client_ip() . '|' . $r['id'];
        if (rl_count('download', $k, 3600) === 0) {
            rl_hit('download', $k);
            q('UPDATE questions SET download_count = download_count + 1 WHERE id = ?', [$r['id']]);
        }
    }
    stream_pdf($r, !$download);
}

function pub_request_create(array $p): void
{
    $ip = client_ip();
    if (rl_count('request', $ip, 3600) >= 5) fail(429, 'too_many_requests', 'You have sent several requests recently. Please try again later.');
    $c = new Check(body());
    $name = $c->text('name', 'Name', 0, 80);
    $email = $c->email('email');
    $deptId = $c->id('departmentId', 'department');
    $prog = $c->text('programme', 'Programme', 1, 20);
    $level = $c->text('level', 'Level', 1, 20);
    $sem = $c->text('semester', 'Semester', 1, 20);
    $code = $c->code('courseCode');
    $title = $c->text('courseTitle', 'Course title', 3, 120);
    $year = $c->year('examYear', false);
    $details = $c->text('details', 'Details', 0, 500, true);
    $c->done();

    $err = [];
    if (!q_one('SELECT 1 FROM departments WHERE id = ? AND is_visible = 1', [$deptId])) $err['departmentId'] = 'Choose a valid department.';
    if (!q_one('SELECT 1 FROM programmes WHERE name = ?', [$prog])) $err['programme'] = 'Choose a valid programme.';
    elseif (!q_one('SELECT 1 FROM levels l JOIN programmes p ON p.id = l.programme_id WHERE p.name = ? AND l.name = ?', [$prog, $level])) $err['level'] = 'Choose a valid level for that programme.';
    if (!q_one('SELECT 1 FROM semesters WHERE name = ?', [$sem])) $err['semester'] = 'Choose a valid semester.';
    if ($err) fail(422, 'validation', 'Please correct the highlighted fields.', $err);

    q('INSERT INTO question_requests (requester_name, requester_email, department_id, programme, level, semester, course_code, course_title, exam_year, details)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [$name, $email, $deptId, $prog, $level, $sem, $code, $title, $year, $details]);
    rl_hit('request', $ip);
    json_out(['data' => ['id' => (int)db()->lastInsertId(), 'message' => 'Your request has been sent to the administrators.']], 201);
}