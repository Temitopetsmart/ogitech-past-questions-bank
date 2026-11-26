<?php
declare(strict_types=1);

/* Admin endpoints available to BOTH roles: dashboard, past questions, student requests. */

function adm_dashboard(array $p): void
{
    $tot = q_one('SELECT COUNT(*) AS total, COALESCE(SUM(is_published),0) AS published FROM questions WHERE document_type = \'question\'');
    $byDept = q_all('SELECT d.id, d.name, COUNT(q.id) AS c FROM departments d LEFT JOIN questions q ON q.department_id = d.id AND q.document_type = \'question\' GROUP BY d.id, d.name ORDER BY d.sort_order, d.id');
    $byYear = q_all('SELECT exam_year AS y, COUNT(*) AS c FROM questions WHERE document_type = \'question\' AND exam_year IS NOT NULL GROUP BY exam_year ORDER BY exam_year');
    $trendRows = q_all("SELECT DATE_FORMAT(created_at, '%Y-%m') AS m, COUNT(*) AS c FROM questions
        WHERE created_at >= DATE_FORMAT(UTC_TIMESTAMP() - INTERVAL 5 MONTH, '%Y-%m-01') GROUP BY m");
    $map = array_column($trendRows, 'c', 'm');
    $trend = [];
    for ($i = 5; $i >= 0; $i--) {
        $m = gmdate('Y-m', strtotime(gmdate('Y-m-01') . " -$i month"));
        $trend[] = ['month' => $m, 'count' => (int)($map[$m] ?? 0)];
    }
    $recent = q_all(QUESTION_SELECT . ' ORDER BY q.created_at DESC, q.id DESC LIMIT 5');
    json_out([
        'totals' => [
            'questions' => (int)$tot['total'], 'published' => (int)$tot['published'], 'drafts' => (int)$tot['total'] - (int)$tot['published'],
            'departments' => (int)q_val('SELECT COUNT(*) FROM departments'),
            'newRequests' => (int)q_val("SELECT COUNT(*) FROM question_requests WHERE status = 'new'"),
        ],
        'byDepartment' => array_map(fn($r) => ['id' => (int)$r['id'], 'name' => $r['name'], 'count' => (int)$r['c']], $byDept),
        'byYear' => array_map(fn($r) => ['year' => (int)$r['y'], 'count' => (int)$r['c']], $byYear),
        'uploadTrend' => $trend,
        'recent' => array_map(fn($r) => question_json($r, true), $recent),
    ]);
}

function adm_questions_list(array $p): void { json_out(question_list($_GET, true, 20, 100)); }

function adm_question_get(array $p): void { json_out(['data' => question_json(get_question(path_id($p), false), true)]); }

function adm_question_file(array $p): void { stream_pdf(get_question(path_id($p), false), true); }

/** Create (POST /admin/questions) or update (POST /admin/questions/{id}). Accepts multipart so a PDF or images can be sent. */
function adm_question_save(array $p): void
{
    $id = isset($p['id']) ? path_id($p) : null;
    $user = require_auth();
    $old = $id ? get_question($id, false) : null;

    $c = new Check(body());
    $dept = $c->id('departmentId', 'department');
    $prog = $c->id('programmeId', 'programme');
    $level = $c->id('levelId', 'level');
    $sem = $c->id('semesterId', 'semester');
    $sess = $c->id('sessionId', 'academic session');
    $code = $c->code('courseCode');
    $title = $c->text('courseTitle', 'Course title', 3, 120);
    $year = $c->year('examYear', true);
    $notes = $c->text('notes', 'Notes', 0, 300, true);
    $pub = $c->bool('published', $old ? (bool)$old['is_published'] : true);
    $feat = $c->bool('featured', $old ? (bool)$old['is_featured'] : false);
    $c->done();

    $err = [];
    if (!q_one('SELECT 1 FROM departments WHERE id = ?', [$dept])) $err['departmentId'] = 'That department does not exist.';
    elseif (!q_one('SELECT 1 FROM department_programmes WHERE department_id = ? AND programme_id = ?', [$dept, $prog])) $err['programmeId'] = 'That department does not offer this programme.';
    if (!q_one('SELECT 1 FROM levels WHERE id = ? AND programme_id = ?', [$level, $prog])) $err['levelId'] = 'That level does not belong to the chosen programme.';
    if (!q_one('SELECT 1 FROM semesters WHERE id = ?', [$sem])) $err['semesterId'] = 'That semester does not exist.';
    if (!q_one('SELECT 1 FROM academic_sessions WHERE id = ?', [$sess])) $err['sessionId'] = 'That academic session does not exist.';
    if (!$err && q_one('SELECT 1 FROM questions WHERE department_id = ? AND programme_id = ? AND level_id = ? AND semester_id = ? AND course_code = ? AND exam_year = ? AND id <> ?',
        [$dept, $prog, $level, $sem, $code, $year, $id ?? 0])) {
        $err['courseCode'] = 'This question already exists for the same department, level, semester and year.';
    }
    if ($err) fail(422, 'validation', 'Please correct the highlighted fields.', $err);

    $file = store_document();   // validates, converts images to one PDF, stores privately
    try {
        $pdo = db();
        $pdo->beginTransaction();
        $vals = [$dept, $prog, $level, $sem, $sess, $code, $title, $year, $notes, $pub ? 1 : 0, $feat ? 1 : 0];
        if ($old) {
            $sql = 'UPDATE questions SET department_id=?, programme_id=?, level_id=?, semester_id=?, session_id=?, course_code=?, course_title=?, exam_year=?, notes=?, is_published=?, is_featured=?, updated_by=?';
            $vals[] = $user['id'];
            if ($file) {
                $sql .= ', file_path=?, file_size=?, page_count=?, source_type=?, original_name=?';
                array_push($vals, $file['path'], $file['size'], $file['pages'], $file['source'], $file['original']);
            }
            $vals[] = $old['id'];
            q($sql . ' WHERE id=?', $vals);
            $newId = (int)$old['id'];
        } else {
            $cols = 'department_id, programme_id, level_id, semester_id, session_id, course_code, course_title, exam_year, notes, is_published, is_featured, created_by, updated_by';
            $vals[] = $user['id']; $vals[] = $user['id'];
            $marks = '?,?,?,?,?,?,?,?,?,?,?,?,?';
            if ($file) {
                $cols .= ', file_path, file_size, page_count, source_type, original_name'; $marks .= ',?,?,?,?,?';
                array_push($vals, $file['path'], $file['size'], $file['pages'], $file['source'], $file['original']);
            }
            q("INSERT INTO questions ($cols) VALUES ($marks)", $vals);
            $newId = (int)$pdo->lastInsertId();
        }
        $reqId = filter_var($c->raw('requestId'), FILTER_VALIDATE_INT);
        if (!$old && $reqId) q("UPDATE question_requests SET status='resolved', resolved_at=UTC_TIMESTAMP(), resolved_by=? WHERE id=? AND status='new'", [$user['id'], $reqId]);
        $pdo->commit();
    } catch (Throwable $e) {
        if (db()->inTransaction()) db()->rollBack();
        if ($file) delete_stored($file['path']);
        throw $e;
    }
    if ($old && $file) delete_stored($old['file_path']);   // replaced document
    json_out(['data' => question_json(get_question($newId, false), true)], $old ? 200 : 201);
}

function adm_question_flag(string $col, array $p): void
{
    $user = require_auth();
    $r = get_question(path_id($p), false);
    $in = body();
    if (!array_key_exists('value', $in)) fail(422, 'validation', 'Send {"value": true|false}.');
    $v = filter_var($in['value'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
    if ($v === null) fail(422, 'validation', 'The value must be true or false.');
    q("UPDATE questions SET $col = ?, updated_by = ? WHERE id = ?", [$v ? 1 : 0, $user['id'], $r['id']]);
    json_out(['data' => question_json(get_question((int)$r['id'], false), true)]);
}
function adm_question_publish(array $p): void { adm_question_flag('is_published', $p); }
function adm_question_feature(array $p): void { adm_question_flag('is_featured', $p); }

function adm_question_delete(array $p): void
{
    $r = get_question(path_id($p), false);
    q('DELETE FROM questions WHERE id = ?', [$r['id']]);
    delete_stored($r['file_path']);
    json_out(['ok' => true]);
}

/* ---------- Student requests ---------- */
function request_json(array $r): array
{
    return [
        'id' => (int)$r['id'], 'name' => $r['requester_name'], 'email' => $r['requester_email'],
        'departmentId' => $r['department_id'] !== null ? (int)$r['department_id'] : null, 'department' => $r['department_name'] ?? null,
        'programme' => $r['programme'], 'level' => $r['level'], 'semester' => $r['semester'],
        'courseCode' => $r['course_code'], 'courseTitle' => $r['course_title'],
        'examYear' => $r['exam_year'] !== null ? (int)$r['exam_year'] : null, 'details' => $r['details'],
        'status' => $r['status'], 'createdAt' => iso($r['created_at']), 'resolvedAt' => iso($r['resolved_at']),
    ];
}

function adm_requests_list(array $p): void
{
    $status = $_GET['status'] ?? '';
    if (!in_array($status, ['', 'new', 'resolved'], true)) fail(400, 'bad_filter', 'Invalid status filter.');
    [$page, $per] = pagination_params($_GET, 10, 10);
    $where = $status ? ' WHERE r.status = ?' : '';
    $args = $status ? [$status] : [];
    $total = (int)q_val('SELECT COUNT(*) FROM question_requests r' . $where, $args);
    $meta = pagination_meta($total, $page, $per);
    $offset = ($page - 1) * $per;
    $rows = q_all('SELECT r.*, d.name AS department_name FROM question_requests r LEFT JOIN departments d ON d.id = r.department_id'
        . $where . ' ORDER BY r.created_at DESC, r.id DESC LIMIT ' . $per . ' OFFSET ' . $offset, $args);
    $counts = q_one("SELECT COUNT(*) AS total, COALESCE(SUM(status='new'),0) AS n FROM question_requests");
    json_out(['data' => array_map('request_json', $rows), 'meta' => $meta + ['all' => (int)$counts['total'], 'new' => (int)$counts['n'], 'resolved' => (int)$counts['total'] - (int)$counts['n']]]);
}

function adm_request_status(array $p): void
{
    $user = require_auth();
    $s = body()['status'] ?? '';
    if (!in_array($s, ['new', 'resolved'], true)) fail(422, 'validation', 'Status must be "new" or "resolved".');
    $id = path_id($p);
    if (!q_one('SELECT 1 FROM question_requests WHERE id = ?', [$id])) fail(404, 'not_found', 'Request not found.');
    if ($s === 'resolved') q('UPDATE question_requests SET status = ?, resolved_at = UTC_TIMESTAMP(), resolved_by = ? WHERE id = ?', [$s, $user['id'], $id]);
    else q('UPDATE question_requests SET status = ?, resolved_at = NULL, resolved_by = NULL WHERE id = ?', [$s, $id]);
    json_out(['ok' => true, 'status' => $s]);
}

function adm_request_delete(array $p): void
{
    $st = q('DELETE FROM question_requests WHERE id = ?', [path_id($p)]);
    if (!$st->rowCount()) fail(404, 'not_found', 'Request not found.');
    json_out(['ok' => true]);
}