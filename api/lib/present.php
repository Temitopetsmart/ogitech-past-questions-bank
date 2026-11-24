<?php
declare(strict_types=1);

/* Shared question queries and JSON shapes. */

const QUESTION_SELECT = 'SELECT q.*, d.name AS department_name, p.name AS programme_name, l.name AS level_name,
        s.name AS semester_name, a.name AS session_name
    FROM questions q
    JOIN departments d ON d.id = q.department_id
    JOIN programmes p ON p.id = q.programme_id
    JOIN levels l ON l.id = q.level_id
    JOIN semesters s ON s.id = q.semester_id
    JOIN academic_sessions a ON a.id = q.session_id';

function question_json(array $r, bool $admin): array
{
    $has = !empty($r['file_path']);
    $o = [
        'id' => (int)$r['id'],
        'courseCode' => $r['course_code'], 'courseTitle' => $r['course_title'],
        'departmentId' => (int)$r['department_id'], 'department' => $r['department_name'],
        'programmeId' => (int)$r['programme_id'], 'programme' => $r['programme_name'],
        'levelId' => (int)$r['level_id'], 'level' => $r['level_name'],
        'semesterId' => (int)$r['semester_id'], 'semester' => $r['semester_name'],
        'sessionId' => (int)$r['session_id'], 'session' => $r['session_name'],
        'examYear' => (int)$r['exam_year'],
        'notes' => $r['notes'],
        'featured' => (bool)$r['is_featured'],
        'views' => (int)$r['view_count'],
        'hasDocument' => $has,
        'createdAt' => iso($r['created_at']), 'updatedAt' => iso($r['updated_at']),
    ];
    if ($admin) {
        $o['published'] = (bool)$r['is_published'];
        $o['downloads'] = (int)$r['download_count'];
        $o['document'] = $has ? [
            'source' => $r['source_type'], 'pages' => $r['page_count'] !== null ? (int)$r['page_count'] : null,
            'size' => (int)$r['file_size'], 'originalName' => $r['original_name'],
        ] : null;
    } else {
        $o['downloads'] = (int)$r['download_count'];
    }
    return $o;
}

function like_escape(string $s): string { return addcslashes($s, '%_\\'); }

/** Build WHERE conditions from request filters. $admin = may see drafts and use the status filter. */
function question_filters(array $in, bool $admin): array
{
    $where = []; $args = [];
    if (!$admin) $where[] = 'q.is_published = 1';
    foreach (['department' => 'q.department_id', 'programme' => 'q.programme_id', 'level' => 'q.level_id', 'semester' => 'q.semester_id', 'session' => 'q.session_id', 'year' => 'q.exam_year'] as $k => $col) {
        if (isset($in[$k]) && $in[$k] !== '') {
            $n = filter_var($in[$k], FILTER_VALIDATE_INT);
            if ($n === false) fail(400, 'bad_filter', "Invalid $k filter.");
            $where[] = "$col = ?"; $args[] = $n;
        }
    }
    if (!empty($in['featured']) && $in['featured'] !== '0') $where[] = 'q.is_featured = 1';
    if ($admin && !empty($in['status'])) {
        match ($in['status']) {
            'published' => $where[] = 'q.is_published = 1',
            'draft'     => $where[] = 'q.is_published = 0',
            'featured'  => $where[] = 'q.is_featured = 1',
            default     => fail(400, 'bad_filter', 'Invalid status filter.'),
        };
    }
    $term = clean((string)($in['q'] ?? ''));
    if ($term !== '') {
        $term = mb_substr($term, 0, 80);
        $tokens = array_slice(preg_split('/\s+/u', $term), 0, 6);
        $perToken = []; $targs = [];
        foreach ($tokens as $t) {
            $like = '%' . like_escape($t) . '%';
            $perToken[] = '(q.course_code LIKE ? OR q.course_title LIKE ? OR q.notes LIKE ? OR d.name LIKE ? OR p.name LIKE ? OR l.name LIKE ? OR s.name LIKE ? OR a.name LIKE ? OR CAST(q.exam_year AS CHAR) LIKE ?)';
            array_push($targs, $like, $like, $like, $like, $like, $like, $like, $like, $like);
        }
        $cond = '(' . implode(' AND ', $perToken) . ')';
        $compact = preg_replace('/[^a-z0-9]/i', '', $term);
        if ($compact !== '' && mb_strlen($compact) >= 3) {
            // "csc101" should find "CSC 101".
            $cond .= " OR REPLACE(REPLACE(REPLACE(q.course_code, ' ', ''), '-', ''), '/', '') LIKE ?";
            $targs[] = '%' . like_escape($compact) . '%';
        }
        $where[] = "($cond)";
        $args = array_merge($args, $targs);
    }
    return [$where, $args];
}

function question_list(array $in, bool $admin, int $defaultPer, int $maxPer): array
{
    [$where, $args] = question_filters($in, $admin);
    $w = $where ? ' WHERE ' . implode(' AND ', $where) : '';
    $page = max(1, (int)($in['page'] ?? 1));
    $per = (int)($in['perPage'] ?? $defaultPer);
    $per = min($maxPer, max(1, $per));
    $order = match ($in['sort'] ?? 'recent') {
        'popular' => 'q.view_count DESC, q.created_at DESC',
        'year'    => 'q.exam_year DESC, q.course_code ASC',
        'code'    => 'q.course_code ASC, q.exam_year DESC',
        'updated' => 'q.updated_at DESC',
        default   => 'q.created_at DESC, q.id DESC',
    };
    $from = substr(QUESTION_SELECT, strpos(QUESTION_SELECT, 'FROM questions'));
    $total = (int)q_val('SELECT COUNT(*) ' . $from . $w, $args);
    $offset = ($page - 1) * $per;
    $rows = q_all(QUESTION_SELECT . $w . " ORDER BY $order LIMIT $per OFFSET $offset", $args);
    return [
        'data' => array_map(fn($r) => question_json($r, $admin), $rows),
        'meta' => ['total' => $total, 'page' => $page, 'perPage' => $per, 'pages' => (int)max(1, ceil($total / $per))],
    ];
}

function get_question(int $id, bool $publishedOnly): array
{
    $sql = QUESTION_SELECT . ' WHERE q.id = ?' . ($publishedOnly ? ' AND q.is_published = 1' : '');
    $r = q_one($sql, [$id]);
    if (!$r) fail(404, 'not_found', 'Question not found.');
    return $r;
}

/** Programmes with their levels, semesters and sessions (used by public and admin screens). */
function academic_lists(): array
{
    $levels = q_all('SELECT id, programme_id, name FROM levels ORDER BY sort_order, id');
    $progs = [];
    foreach (q_all('SELECT id, name FROM programmes ORDER BY sort_order, id') as $p) {
        $progs[] = ['id' => (int)$p['id'], 'name' => $p['name'], 'levels' => array_values(array_map(
            fn($l) => ['id' => (int)$l['id'], 'name' => $l['name']],
            array_filter($levels, fn($l) => (int)$l['programme_id'] === (int)$p['id'])
        ))];
    }
    return [
        'programmes' => $progs,
        'semesters' => array_map(fn($s) => ['id' => (int)$s['id'], 'name' => $s['name']], q_all('SELECT id, name FROM semesters ORDER BY sort_order, id')),
        'sessions' => array_map(fn($s) => ['id' => (int)$s['id'], 'name' => $s['name']], q_all('SELECT id, name FROM academic_sessions ORDER BY start_year DESC')),
        'yearMin' => (int)config('year_min', 2000),
    ];
}