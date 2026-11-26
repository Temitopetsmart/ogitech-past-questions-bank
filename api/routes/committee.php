<?php
declare(strict_types=1);

/* Committee (per administration/term) and hotlines. Admin endpoints are Main Admin only. */

/* ---------- Photo helpers (private storage, served through the API) ---------- */

const COMMITTEE_PHOTO_RE = '#^committee/\d{4}/[a-f0-9]{32}\.(jpg|png|webp)$#';

function committee_photo_delete(?string $path): void
{
    if (!$path || !preg_match(COMMITTEE_PHOTO_RE, $path)) return;
    $file = storage_root() . '/' . $path;
    if (is_file($file)) @unlink($file);
}

function committee_photo_store(): string
{
    $f = $_FILES['image'];
    upload_error_check($f);
    if (!is_uploaded_file($f['tmp_name'])) fail(400, 'bad_upload', 'The image upload is invalid.');
    if ($f['size'] <= 0) fail(422, 'empty_image', 'The image is empty.');
    if ($f['size'] > limit('image_mb') * 1048576) fail(413, 'too_large', 'The image exceeds the upload limit.');

    $info = @getimagesize($f['tmp_name']);
    $types = [IMAGETYPE_JPEG => 'jpg', IMAGETYPE_PNG => 'png', IMAGETYPE_WEBP => 'webp'];
    $mimes = [IMAGETYPE_JPEG => 'image/jpeg', IMAGETYPE_PNG => 'image/png', IMAGETYPE_WEBP => 'image/webp'];
    if (!$info || !isset($types[$info[2]])) fail(422, 'bad_image', 'Use a JPG, PNG or WebP photograph.');
    if (mime_of($f['tmp_name']) !== $mimes[$info[2]]) fail(422, 'bad_image', 'The uploaded image is invalid.');
    if ($info[0] * $info[1] > limit('image_max_pixels')) fail(422, 'image_too_big', 'The image dimensions are too large.');

    $root = storage_root();
    $year = gmdate('Y');
    $folder = $root . '/committee/' . $year;
    if (!is_dir($folder) && !mkdir($folder, 0750, true)) fail(500, 'storage_error', 'Could not create the image storage folder.');

    $relative = 'committee/' . $year . '/' . bin2hex(random_bytes(16)) . '.' . $types[$info[2]];
    $absolute = $root . '/' . $relative;
    if (!move_uploaded_file($f['tmp_name'], $absolute)) fail(500, 'storage_error', 'Could not save the photograph.');
    chmod($absolute, 0640);
    return $relative;
}

/* ---------- JSON shapes ---------- */

function term_json(array $r): array
{
    return [
        'id' => (int)$r['id'],
        'label' => $r['label'],
        'current' => (bool)$r['is_current'],
        'memberCount' => isset($r['member_count']) ? (int)$r['member_count'] : null,
    ];
}

function member_json(array $r): array
{
    return [
        'id' => (int)$r['id'],
        'termId' => (int)$r['term_id'],
        'name' => $r['name'],
        'office' => $r['office'],
        'department' => $r['department'],
        'level' => $r['level'],
        'imageUrl' => $r['photo_path']
            ? 'api/public/committee/' . (int)$r['id'] . '/image?v=' . strtotime((string)$r['updated_at'] . ' UTC')
            : null,
        'visible' => (bool)$r['is_visible'],
        'order' => (int)$r['sort_order'],
    ];
}

function hotline_json(array $r): array
{
    return [
        'id' => (int)$r['id'],
        'title' => $r['title'],
        'holder' => $r['holder'],
        'phone' => $r['phone'],
        'whatsapp' => (bool)$r['has_whatsapp'],
        'note' => $r['note'],
        'visible' => (bool)$r['is_visible'],
        'order' => (int)$r['sort_order'],
    ];
}

/* ---------- Public ---------- */

function pub_committee(array $p): void
{
    $terms = q_all(
        'SELECT t.*, COUNT(m.id) AS member_count
         FROM committee_terms t
         JOIN committee_members m ON m.term_id = t.id AND m.is_visible = 1
         GROUP BY t.id
         ORDER BY t.is_current DESC, t.label DESC'
    );
    if (!$terms) json_out(['terms' => [], 'term' => null, 'data' => []]);

    $want = isset($_GET['term']) ? (int)$_GET['term'] : 0;
    $term = $terms[0];                     // current term first, else newest
    foreach ($terms as $t) if ((int)$t['id'] === $want) { $term = $t; break; }

    [$page, $per] = pagination_params($_GET, 20, 20);
    $total = (int)q_val('SELECT COUNT(*) FROM committee_members WHERE term_id = ? AND is_visible = 1', [(int)$term['id']]);
    $meta = pagination_meta($total, $page, $per);
    $offset = ($page - 1) * $per;
    $rows = q_all('SELECT * FROM committee_members WHERE term_id = ? AND is_visible = 1 ORDER BY sort_order, id LIMIT ' . $per . ' OFFSET ' . $offset, [(int)$term['id']]);
    json_out([
        'terms' => array_map('term_json', $terms),
        'term' => term_json($term),
        'data' => array_map('member_json', $rows),
        'meta' => $meta,
    ]);
}

function pub_committee_image(array $p): never
{
    $row = q_one('SELECT photo_path FROM committee_members WHERE id = ? AND is_visible = 1', [path_id($p)]);
    $path = $row['photo_path'] ?? null;
    if (!$path || !preg_match(COMMITTEE_PHOTO_RE, $path)) fail(404, 'not_found', 'Photograph not found.');
    $file = storage_root() . '/' . $path;
    if (!is_file($file)) fail(404, 'not_found', 'Photograph not found.');
    $mime = mime_of($file);
    if (!in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true)) fail(404, 'not_found', 'Photograph not found.');

    while (ob_get_level()) ob_end_clean();
    header('Content-Type: ' . $mime);
    header('Content-Length: ' . filesize($file));
    header('Cache-Control: public, max-age=86400');
    header('X-Content-Type-Options: nosniff');
    readfile($file);
    exit;
}

function pub_hotlines(array $p): void
{
    $rows = q_all('SELECT * FROM hotlines WHERE is_visible = 1 ORDER BY sort_order, id');
    json_out(['data' => array_map('hotline_json', $rows)]);
}

/* ---------- Admin: terms ---------- */

function adm_committee_list(array $p): void
{
    $terms = q_all(
        'SELECT t.*, COUNT(m.id) AS member_count
         FROM committee_terms t LEFT JOIN committee_members m ON m.term_id = t.id
         GROUP BY t.id ORDER BY t.is_current DESC, t.label DESC'
    );
    $want = isset($_GET['term']) ? (int)$_GET['term'] : 0;
    $term = null;
    foreach ($terms as $t) if ((int)$t['id'] === $want) $term = $t;
    if (!$term && $terms) $term = $terms[0];

    [$page, $per] = pagination_params($_GET, 10, 10);
    $total = $term ? (int)q_val('SELECT COUNT(*) FROM committee_members WHERE term_id = ?', [(int)$term['id']]) : 0;
    $meta = pagination_meta($total, $page, $per);
    $offset = ($page - 1) * $per;
    $rows = $term
        ? q_all('SELECT * FROM committee_members WHERE term_id = ? ORDER BY sort_order, id LIMIT ' . $per . ' OFFSET ' . $offset, [(int)$term['id']])
        : [];
    json_out([
        'terms' => array_map('term_json', $terms),
        'term' => $term ? term_json($term) : null,
        'data' => array_map('member_json', $rows),
        'meta' => $meta,
    ]);
}

function adm_term_save(array $p): void
{
    $id = isset($p['id']) ? path_id($p) : null;
    $old = $id ? q_one('SELECT * FROM committee_terms WHERE id = ?', [$id]) : null;
    if ($id && !$old) fail(404, 'not_found', 'Term not found.');

    $c = new Check(body());
    $label = $c->text('label', 'Term name', 3, 40);
    $current = $c->bool('current', $old ? (bool)$old['is_current'] : false);
    $c->done();

    if (q_val('SELECT 1 FROM committee_terms WHERE label = ? AND id <> ?', [$label, $id ?? 0])) {
        fail(422, 'validation', 'A term with that name already exists.', ['label' => 'A term with that name already exists.']);
    }
    // The very first term is always current.
    if (!$old && !q_val('SELECT 1 FROM committee_terms LIMIT 1')) $current = true;

    $pdo = db();
    $pdo->beginTransaction();
    try {
        if ($current) q('UPDATE committee_terms SET is_current = 0');
        if ($old) {
            q('UPDATE committee_terms SET label = ?, is_current = ? WHERE id = ?', [$label, $current ? 1 : (int)$old['is_current'], $id]);
            $newId = $id;
        } else {
            q('INSERT INTO committee_terms (label, is_current) VALUES (?, ?)', [$label, $current ? 1 : 0]);
            $newId = (int)$pdo->lastInsertId();
        }
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
    json_out(['data' => term_json(q_one('SELECT * FROM committee_terms WHERE id = ?', [$newId]))], $old ? 200 : 201);
}

function adm_term_current(array $p): void
{
    $id = path_id($p);
    if (!q_one('SELECT id FROM committee_terms WHERE id = ?', [$id])) fail(404, 'not_found', 'Term not found.');
    $pdo = db();
    $pdo->beginTransaction();
    try {
        q('UPDATE committee_terms SET is_current = 0');
        q('UPDATE committee_terms SET is_current = 1 WHERE id = ?', [$id]);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
    json_out(['ok' => true]);
}

function adm_term_delete(array $p): void
{
    $id = path_id($p);
    if (!q_one('SELECT id FROM committee_terms WHERE id = ?', [$id])) fail(404, 'not_found', 'Term not found.');
    $photos = array_column(q_all('SELECT photo_path FROM committee_members WHERE term_id = ?', [$id]), 'photo_path');
    q('DELETE FROM committee_terms WHERE id = ?', [$id]);   // members cascade
    foreach ($photos as $ph) committee_photo_delete($ph);
    // Keep one term current if any remain.
    if (!q_val('SELECT 1 FROM committee_terms WHERE is_current = 1') && ($n = q_val('SELECT id FROM committee_terms ORDER BY label DESC LIMIT 1'))) {
        q('UPDATE committee_terms SET is_current = 1 WHERE id = ?', [(int)$n]);
    }
    json_out(['ok' => true]);
}

/* ---------- Admin: members ---------- */

function adm_member_save(array $p): void
{
    $id = isset($p['id']) ? path_id($p) : null;
    $old = $id ? q_one('SELECT * FROM committee_members WHERE id = ?', [$id]) : null;
    if ($id && !$old) fail(404, 'not_found', 'Committee member not found.');

    $c = new Check(body());
    $name = $c->text('name', 'Name', 2, 100);
    $office = $c->text('office', 'Office held', 2, 100);
    $dept = $c->text('department', 'Department', 0, 100);
    $level = $c->text('level', 'Level', 0, 30);
    $visible = $c->bool('visible', $old ? (bool)$old['is_visible'] : true);
    $remove = $c->bool('removePhoto', false);
    $termId = $old ? (int)$old['term_id'] : $c->id('termId', 'term');
    $c->done();

    if (!$old && !q_one('SELECT id FROM committee_terms WHERE id = ?', [$termId])) fail(404, 'not_found', 'Term not found.');

    $newPhoto = !empty($_FILES['image']) ? committee_photo_store() : null;
    $oldPhoto = $old['photo_path'] ?? null;
    $photo = $newPhoto ?? ($remove ? null : $oldPhoto);

    try {
        if ($old) {
            q('UPDATE committee_members SET name=?, office=?, department=?, level=?, photo_path=?, is_visible=? WHERE id=?',
              [$name, $office, $dept, $level, $photo, $visible ? 1 : 0, $id]);
            $newId = $id;
        } else {
            $order = (int)q_val('SELECT COALESCE(MAX(sort_order),0)+1 FROM committee_members WHERE term_id = ?', [$termId]);
            q('INSERT INTO committee_members (term_id, name, office, department, level, photo_path, is_visible, sort_order) VALUES (?,?,?,?,?,?,?,?)',
              [$termId, $name, $office, $dept, $level, $photo, $visible ? 1 : 0, $order]);
            $newId = (int)db()->lastInsertId();
        }
    } catch (Throwable $e) {
        committee_photo_delete($newPhoto);
        throw $e;
    }
    if ($oldPhoto && $oldPhoto !== $photo) committee_photo_delete($oldPhoto);

    json_out(['data' => member_json(q_one('SELECT * FROM committee_members WHERE id = ?', [$newId]))], $old ? 200 : 201);
}

function adm_member_delete(array $p): void
{
    $id = path_id($p);
    $row = q_one('SELECT * FROM committee_members WHERE id = ?', [$id]);
    if (!$row) fail(404, 'not_found', 'Committee member not found.');
    q('DELETE FROM committee_members WHERE id = ?', [$id]);
    committee_photo_delete($row['photo_path']);
    json_out(['ok' => true]);
}

/** Apply a new order. Body: {ids:[...]} — every id must belong to the same table (and term for members). */
function reorder_rows(string $table, array $ids, ?array $scope = null): void
{
    $ids = array_values(array_unique(array_map('intval', $ids)));
    if (!$ids) fail(422, 'validation', 'Nothing to reorder.');
    $in = implode(',', array_fill(0, count($ids), '?'));
    $sql = "SELECT COUNT(*) FROM $table WHERE id IN ($in)" . ($scope ? " AND {$scope[0]} = ?" : '');
    $n = (int)q_val($sql, $scope ? array_merge($ids, [$scope[1]]) : $ids);
    if ($n !== count($ids)) fail(422, 'validation', 'Some items could not be found.');
    $pdo = db();
    $pdo->beginTransaction();
    try {
        foreach ($ids as $i => $rid) q("UPDATE $table SET sort_order = ? WHERE id = ?", [$i + 1, $rid]);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}

function adm_member_reorder(array $p): void
{
    $in = body();
    $term = (int)($in['termId'] ?? 0);
    if (!is_array($in['ids'] ?? null) || $term < 1) fail(422, 'validation', 'Invalid order.');
    reorder_rows('committee_members', $in['ids'], ['term_id', $term]);
    json_out(['ok' => true]);
}

/* ---------- Admin: hotlines ---------- */

function adm_hotlines_list(array $p): void
{
    [$page, $per] = pagination_params($_GET, 10, 10);
    $total = (int)q_val('SELECT COUNT(*) FROM hotlines');
    $meta = pagination_meta($total, $page, $per);
    $offset = ($page - 1) * $per;
    $rows = q_all('SELECT * FROM hotlines ORDER BY sort_order, id LIMIT ' . $per . ' OFFSET ' . $offset);
    json_out(['data' => array_map('hotline_json', $rows), 'meta' => $meta]);
}

function adm_hotline_save(array $p): void
{
    $id = isset($p['id']) ? path_id($p) : null;
    $old = $id ? q_one('SELECT * FROM hotlines WHERE id = ?', [$id]) : null;
    if ($id && !$old) fail(404, 'not_found', 'Hotline not found.');

    $in = body();
    $c = new Check($in);
    $title = $c->text('title', 'Hotline name', 2, 100);
    $holder = $c->text('holder', 'Contact person', 0, 100);
    $note = $c->text('note', 'Note', 0, 160);
    $wa = $c->bool('whatsapp', false);
    $visible = $c->bool('visible', true);

    $phone = preg_replace('/[\s\-().]/', '', (string)($in['phone'] ?? '')) ?? '';
    if ($phone === '') $c->errors['phone'] = 'Phone number is required.';
    elseif (!preg_match('/^\+?\d{7,15}$/', $phone)) $c->errors['phone'] = 'Enter a valid phone number, for example 08012345678 or +2348012345678.';
    $c->done();

    if ($old) {
        q('UPDATE hotlines SET title=?, holder=?, phone=?, has_whatsapp=?, note=?, is_visible=? WHERE id=?',
          [$title, $holder, $phone, $wa ? 1 : 0, $note, $visible ? 1 : 0, $id]);
        $newId = $id;
    } else {
        $order = (int)q_val('SELECT COALESCE(MAX(sort_order),0)+1 FROM hotlines');
        q('INSERT INTO hotlines (title, holder, phone, has_whatsapp, note, is_visible, sort_order) VALUES (?,?,?,?,?,?,?)',
          [$title, $holder, $phone, $wa ? 1 : 0, $note, $visible ? 1 : 0, $order]);
        $newId = (int)db()->lastInsertId();
    }
    json_out(['data' => hotline_json(q_one('SELECT * FROM hotlines WHERE id = ?', [$newId]))], $old ? 200 : 201);
}

function adm_hotline_delete(array $p): void
{
    $id = path_id($p);
    if (!q_one('SELECT id FROM hotlines WHERE id = ?', [$id])) fail(404, 'not_found', 'Hotline not found.');
    q('DELETE FROM hotlines WHERE id = ?', [$id]);
    json_out(['ok' => true]);
}

function adm_hotline_reorder(array $p): void
{
    $in = body();
    if (!is_array($in['ids'] ?? null)) fail(422, 'validation', 'Invalid order.');
    reorder_rows('hotlines', $in['ids']);
    json_out(['ok' => true]);
}