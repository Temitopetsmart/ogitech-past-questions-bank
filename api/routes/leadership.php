<?php
declare(strict_types=1);

/* ---------- Leadership helpers ---------- */

function leadership_json(array $r): array
{
    return [
        'id' => (int)$r['id'],
        'name' => $r['name'],
        'message' => $r['message'],
        'imageUrl' => 'api/public/leadership/' . (int)$r['id'] . '/image',
        'visible' => (bool)$r['is_visible'],
        'order' => (int)$r['sort_order'],
        'createdAt' => iso($r['created_at']),
        'updatedAt' => iso($r['updated_at']),
    ];
}

function leadership_file_path(int $id): ?string
{
    $row = q_one(
        'SELECT photo_path FROM leadership_profiles WHERE id = ?',
        [$id]
    );

    return $row ? $row['photo_path'] : null;
}

function leadership_delete_image(?string $path): void
{
    if (!$path || !preg_match(
        '#^leadership/\d{4}/[a-f0-9]{32}\.(jpg|png|webp)$#',
        $path
    )) {
        return;
    }

    $file = storage_root() . '/' . $path;

    if (is_file($file)) {
        @unlink($file);
    }
}

function leadership_store_image(): string
{
    if (empty($_FILES['image'])) {
        fail(422, 'image_required', 'Upload a leadership photograph.');
    }

    $f = $_FILES['image'];

    upload_error_check($f);

    if (!is_uploaded_file($f['tmp_name'])) {
        fail(400, 'bad_upload', 'The image upload is invalid.');
    }

    if ($f['size'] <= 0) {
        fail(422, 'empty_image', 'The image is empty.');
    }

    if ($f['size'] > limit('image_mb') * 1048576) {
        fail(413, 'too_large', 'The image exceeds the upload limit.');
    }

    $info = @getimagesize($f['tmp_name']);

    $types = [
        IMAGETYPE_JPEG => 'jpg',
        IMAGETYPE_PNG => 'png',
        IMAGETYPE_WEBP => 'webp',
    ];

    if (!$info || !isset($types[$info[2]])) {
        fail(422, 'bad_image', 'Use a JPG, PNG or WebP photograph.');
    }

    $mime = mime_of($f['tmp_name']);

    $expected = [
        IMAGETYPE_JPEG => 'image/jpeg',
        IMAGETYPE_PNG => 'image/png',
        IMAGETYPE_WEBP => 'image/webp',
    ];

    if ($mime !== $expected[$info[2]]) {
        fail(422, 'bad_image', 'The uploaded image is invalid.');
    }

    if ($info[0] * $info[1] > limit('image_max_pixels')) {
        fail(422, 'image_too_big', 'The image dimensions are too large.');
    }

    $root = storage_root();
    $year = gmdate('Y');
    $folder = $root . '/leadership/' . $year;

    if (!is_dir($folder) && !mkdir($folder, 0750, true)) {
        fail(500, 'storage_error', 'Could not create the image storage folder.');
    }

    $name = bin2hex(random_bytes(16)) . '.' . $types[$info[2]];
    $relative = 'leadership/' . $year . '/' . $name;
    $absolute = $root . '/' . $relative;

    if (!move_uploaded_file($f['tmp_name'], $absolute)) {
        fail(500, 'storage_error', 'Could not save the leadership photograph.');
    }

    chmod($absolute, 0640);

    return $relative;
}

/* ---------- Public endpoints ---------- */

function pub_leadership(array $p): void
{
    $rows = q_all(
        'SELECT * FROM leadership_profiles
         WHERE is_visible = 1
         ORDER BY sort_order, id'
    );

    json_out([
        'data' => array_map('leadership_json', $rows)
    ]);
}

function pub_leadership_image(array $p): never
{
    $id = path_id($p);
    $path = leadership_file_path($id);

    if (!$path || !preg_match(
        '#^leadership/\d{4}/[a-f0-9]{32}\.(jpg|png|webp)$#',
        $path
    )) {
        fail(404, 'not_found', 'Leadership photograph not found.');
    }

    $file = storage_root() . '/' . $path;

    if (!is_file($file)) {
        fail(404, 'not_found', 'Leadership photograph not found.');
    }

    $mime = mime_of($file);

    if (!in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true)) {
        fail(404, 'not_found', 'Leadership photograph not found.');
    }

    while (ob_get_level()) {
        ob_end_clean();
    }

    header('Content-Type: ' . $mime);
    header('Content-Length: ' . filesize($file));
    header('Cache-Control: public, max-age=86400');
    header('X-Content-Type-Options: nosniff');

    readfile($file);
    exit;
}

/* ---------- Admin endpoints ---------- */

function adm_leadership_list(array $p): void
{
    $rows = q_all(
        'SELECT * FROM leadership_profiles ORDER BY sort_order, id'
    );

    json_out([
        'data' => array_map('leadership_json', $rows)
    ]);
}

function adm_leadership_save(array $p): void
{
    $id = isset($p['id']) ? path_id($p) : null;

    $old = $id
        ? q_one('SELECT * FROM leadership_profiles WHERE id = ?', [$id])
        : null;

    if ($id && !$old) {
        fail(404, 'not_found', 'Leadership profile not found.');
    }

    $c = new Check(body());

    $name = $c->text('name', 'Name', 2, 100);
    $message = $c->text('message', 'Message', 10, 5000, true);
    $visible = $c->bool('visible', $old ? (bool)$old['is_visible'] : true);

    $c->done();

    $newImage = null;

    if (!empty($_FILES['image'])) {
        $newImage = leadership_store_image();
    } elseif (!$old) {
        fail(422, 'image_required', 'Upload a leadership photograph.');
    }

    $oldImage = $old['photo_path'] ?? null;

    try {
        if ($old) {
            if ($newImage) {
                q(
                    'UPDATE leadership_profiles
                     SET name = ?, message = ?, photo_path = ?, is_visible = ?
                     WHERE id = ?',
                    [$name, $message, $newImage, $visible ? 1 : 0, $id]
                );
            } else {
                q(
                    'UPDATE leadership_profiles
                     SET name = ?, message = ?, is_visible = ?
                     WHERE id = ?',
                    [$name, $message, $visible ? 1 : 0, $id]
                );
            }

            $newId = $id;
        } else {
            $order = (int)q_val(
                'SELECT COALESCE(MAX(sort_order), 0) + 1
                 FROM leadership_profiles'
            );

            q(
                'INSERT INTO leadership_profiles
                 (name, message, photo_path, is_visible, sort_order)
                 VALUES (?, ?, ?, ?, ?)',
                [$name, $message, $newImage, $visible ? 1 : 0, $order]
            );

            $newId = (int)db()->lastInsertId();
        }
    } catch (Throwable $e) {
        leadership_delete_image($newImage);
        throw $e;
    }

    if ($newImage && $oldImage) {
        leadership_delete_image($oldImage);
    }

    $saved = q_one(
        'SELECT * FROM leadership_profiles WHERE id = ?',
        [$newId]
    );

    json_out(['data' => leadership_json($saved)], $old ? 200 : 201);
}

function adm_leadership_delete(array $p): void
{
    $id = path_id($p);

    $row = q_one(
        'SELECT * FROM leadership_profiles WHERE id = ?',
        [$id]
    );

    if (!$row) {
        fail(404, 'not_found', 'Leadership profile not found.');
    }

    q('DELETE FROM leadership_profiles WHERE id = ?', [$id]);

    leadership_delete_image($row['photo_path']);

    json_out(['ok' => true]);
}