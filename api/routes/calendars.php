<?php
declare(strict_types=1);

/*
 * Academic Calendar API
 * Reuses the existing questions table and PDF storage system.
 */

function calendar_json(array $r, bool $admin = false): array
{
    $hasDocument = !empty($r['file_path']);

    $data = [
        'id' => (int)$r['id'],
        'title' => $r['course_title'],
        'sessionId' => (int)$r['session_id'],
        'session' => $r['session_name'],
        'hasDocument' => $hasDocument,
        'createdAt' => iso($r['created_at']),
        'updatedAt' => iso($r['updated_at']),
    ];

    if ($admin) {
        $data['published'] = (bool)$r['is_published'];
        $data['downloads'] = (int)$r['download_count'];

        $data['document'] = $hasDocument ? [
            'source' => $r['source_type'],
            'pages' => $r['page_count'] !== null
                ? (int)$r['page_count'] : null,
            'size' => (int)$r['file_size'],
            'originalName' => $r['original_name'],
        ] : null;
    }

    return $data;
}

function calendar_row(int $id, bool $publishedOnly = false): array
{
    $sql = "
        SELECT q.*, a.name AS session_name
        FROM questions q
        JOIN academic_sessions a ON a.id = q.session_id
        WHERE q.id = ?
        AND q.document_type = 'calendar'
    ";

    if ($publishedOnly) {
        $sql .= " AND q.is_published = 1";
    }

    $row = q_one($sql, [$id]);

    if (!$row) {
        fail(404, 'not_found', 'Academic calendar not found.');
    }

    return $row;
}


/*
|--------------------------------------------------------------------------
| PUBLIC ENDPOINTS
|--------------------------------------------------------------------------
*/

function pub_calendars(array $p): void
{
    $rows = q_all("
        SELECT q.*, a.name AS session_name
        FROM questions q
        JOIN academic_sessions a ON a.id = q.session_id
        WHERE q.document_type = 'calendar'
        AND q.is_published = 1
        ORDER BY a.start_year DESC, q.created_at DESC, q.id DESC
    ");

    json_out([
        'data' => array_map(
            fn($r) => calendar_json($r),
            $rows
        )
    ]);
}

function pub_calendar_file(array $p): never
{
    $row = calendar_row(path_id($p), true);

    $row['course_code'] = 'Academic Calendar';
    $row['exam_year'] = '';

    stream_pdf(
        $row,
        ($_GET['download'] ?? '') !== '1'
    );
}


/*
|--------------------------------------------------------------------------
| ADMIN ENDPOINTS
|--------------------------------------------------------------------------
*/

function adm_calendars_list(array $p): void
{
    $rows = q_all("
        SELECT q.*, a.name AS session_name
        FROM questions q
        JOIN academic_sessions a ON a.id = q.session_id
        WHERE q.document_type = 'calendar'
        ORDER BY a.start_year DESC, q.created_at DESC, q.id DESC
    ");

    json_out([
        'data' => array_map(
            fn($r) => calendar_json($r, true),
            $rows
        )
    ]);
}

function adm_calendar_save(array $p): void
{
    $id = isset($p['id']) ? path_id($p) : null;

    $user = require_auth();

    $old = $id ? calendar_row($id) : null;

    $c = new Check(body());

    $title = $c->text(
        'title',
        'Calendar title',
        3,
        120
    );

    $sessionId = $c->id(
        'sessionId',
        'Academic session'
    );

    $published = $c->bool(
        'published',
        $old ? (bool)$old['is_published'] : true
    );

    $c->done();

    if (!q_one(
        'SELECT 1 FROM academic_sessions WHERE id = ?',
        [$sessionId]
    )) {
        fail(422, 'validation', 'Choose a valid academic session.', [
            'sessionId' => 'Invalid academic session.'
        ]);
    }

    // Reuse the existing PDF upload system.
    $file = store_document();

    if (!$old && !$file) {
        fail(422, 'file_required', 'Upload the academic calendar PDF.', [
            'pdf' => 'Choose an academic calendar PDF.'
        ]);
    }

    try {
        if ($old) {
            $values = [
                $title,
                $sessionId,
                $published ? 1 : 0,
                $user['id']
            ];

            $sql = "
                UPDATE questions
                SET course_title = ?,
                    session_id = ?,
                    is_published = ?,
                    updated_by = ?,
                    is_featured = 0
            ";

            if ($file) {
                $sql .= ",
                    file_path = ?,
                    file_size = ?,
                    page_count = ?,
                    source_type = ?,
                    original_name = ?
                ";

                array_push(
                    $values,
                    $file['path'],
                    $file['size'],
                    $file['pages'],
                    $file['source'],
                    $file['original']
                );
            }

            $values[] = $id;

            q(
                $sql . "
                WHERE id = ?
                AND document_type = 'calendar'
                ",
                $values
            );

            $savedId = $id;

        } else {
            q("
                INSERT INTO questions (
                    document_type,
                    department_id,
                    programme_id,
                    level_id,
                    semester_id,
                    session_id,
                    course_code,
                    course_title,
                    exam_year,
                    is_published,
                    is_featured,
                    file_path,
                    file_size,
                    page_count,
                    source_type,
                    original_name,
                    created_by,
                    updated_by
                )
                VALUES (
                    'calendar',
                    NULL,
                    NULL,
                    NULL,
                    NULL,
                    ?,
                    '',
                    ?,
                    NULL,
                    ?,
                    0,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?
                )
            ", [
                $sessionId,
                $title,
                $published ? 1 : 0,
                $file['path'],
                $file['size'],
                $file['pages'],
                $file['source'],
                $file['original'],
                $user['id'],
                $user['id']
            ]);

            $savedId = (int)db()->lastInsertId();
        }

    } catch (Throwable $e) {
        if ($file) {
            delete_stored($file['path']);
        }

        throw $e;
    }

    // Remove the old PDF only after the replacement is saved.
    if ($file && $old && !empty($old['file_path'])) {
        delete_stored($old['file_path']);
    }

    $saved = calendar_row($savedId);

    json_out([
        'data' => calendar_json($saved, true)
    ], $old ? 200 : 201);
}

function adm_calendar_delete(array $p): void
{
    $row = calendar_row(path_id($p));

    q("
        DELETE FROM questions
        WHERE id = ?
        AND document_type = 'calendar'
    ", [$row['id']]);

    delete_stored($row['file_path']);

    json_out(['ok' => true]);
}