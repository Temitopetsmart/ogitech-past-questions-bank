<?php
declare(strict_types=1);

/* Secure upload handling. Uploaded files are never kept under the client's name or served from a public URL:
   they are renamed to random names inside a private storage folder and delivered only through the API. */

function storage_root(): string
{
    $p = (string)config('storage_path');
    if (!is_dir($p) && !@mkdir($p, 0750, true)) fail(500, 'storage_error', 'The storage folder is missing and could not be created.');
    $real = realpath($p);
    if ($real === false || !is_writable($real)) fail(500, 'storage_error', 'The storage folder is not writable.');
    return $real;
}

function limit(string $k): int { return (int)config("limits.$k"); }

function upload_error_check(array $f): void
{
    switch ($f['error']) {
        case UPLOAD_ERR_OK: return;
        case UPLOAD_ERR_INI_SIZE:
        case UPLOAD_ERR_FORM_SIZE:
            fail(413, 'too_large', 'A file is larger than the server allows. Use a smaller file.');
        case UPLOAD_ERR_PARTIAL:
            fail(400, 'upload_partial', 'The upload was interrupted. Please try again.');
        default:
            fail(500, 'upload_failed', 'The upload failed on the server.');
    }
}

/** Flatten $_FILES[$key] (single or multiple) into a list of file arrays, skipping empty slots. */
function uploaded_list(string $key): array
{
    if (empty($_FILES[$key])) return [];
    $f = $_FILES[$key];
    $out = [];
    if (is_array($f['name'])) {
        foreach (array_keys($f['name']) as $i) {
            $out[] = ['name' => $f['name'][$i], 'tmp_name' => $f['tmp_name'][$i], 'error' => $f['error'][$i], 'size' => $f['size'][$i]];
        }
    } else {
        $out[] = $f;
    }
    return array_values(array_filter($out, fn($x) => $x['error'] !== UPLOAD_ERR_NO_FILE));
}

function mime_of(string $path): string
{
    $fi = new finfo(FILEINFO_MIME_TYPE);
    return (string)$fi->file($path);
}

function validate_pdf(array $f): void
{
    upload_error_check($f);
    $max = limit('pdf_mb') * 1048576;
    if (!is_uploaded_file($f['tmp_name'])) fail(400, 'bad_upload', 'The file was not uploaded correctly.');
    if ($f['size'] <= 0) fail(422, 'empty_file', 'The PDF is empty.', ['pdf' => 'The PDF is empty.']);
    if ($f['size'] > $max) fail(413, 'too_large', 'The PDF is too large. The limit is ' . limit('pdf_mb') . ' MB.', ['pdf' => 'The PDF is too large.']);
    $fh = fopen($f['tmp_name'], 'rb');
    $head = fread($fh, 8);
    fseek($fh, max(0, $f['size'] - 2048));
    $tail = (string)fread($fh, 2048);
    fclose($fh);
    if (!preg_match('/^%PDF-\d\.\d/', (string)$head) || mime_of($f['tmp_name']) !== 'application/pdf') {
        fail(422, 'not_pdf', 'That file is not a valid PDF.', ['pdf' => 'That file is not a valid PDF.']);
    }
    if (!str_contains($tail, '%%EOF')) fail(422, 'broken_pdf', 'The PDF looks incomplete or damaged.', ['pdf' => 'The PDF looks incomplete or damaged.']);
    // Reject PDFs with obvious active content. (This catches the common cases; it is not a full malware scan.)
    $data = (string)file_get_contents($f['tmp_name']);
    if (preg_match('#/(JavaScript|Launch|EmbeddedFile|RichMedia)\b|/JS\s*[(<]#i', $data)) {
        fail(422, 'unsafe_pdf', 'The PDF contains scripts or embedded files and was rejected.', ['pdf' => 'The PDF contains scripts or embedded files.']);
    }
}

function validate_images(array $list): void
{
    $n = count($list);
    if ($n > limit('image_count')) fail(422, 'too_many', 'You can upload up to ' . limit('image_count') . ' images.', ['images' => 'Too many images.']);
    foreach ($list as $f) {
        upload_error_check($f);
        $label = $f['name'];
        if (!is_uploaded_file($f['tmp_name'])) fail(400, 'bad_upload', 'A file was not uploaded correctly.');
        if ($f['size'] <= 0) fail(422, 'empty_file', "$label is empty.", ['images' => "$label is empty."]);
        if ($f['size'] > limit('image_mb') * 1048576) fail(413, 'too_large', "$label is larger than " . limit('image_mb') . ' MB.', ['images' => "$label is too large."]);
        $info = @getimagesize($f['tmp_name']);
        $okTypes = [IMAGETYPE_JPEG => 'image/jpeg', IMAGETYPE_PNG => 'image/png', IMAGETYPE_WEBP => 'image/webp'];
        if (!$info || !isset($okTypes[$info[2]]) || mime_of($f['tmp_name']) !== $okTypes[$info[2]]) {
            fail(422, 'bad_image', "$label is not a JPG, PNG or WebP image.", ['images' => "$label is not a JPG, PNG or WebP image."]);
        }
        if ($info[2] === IMAGETYPE_WEBP && !function_exists('imagecreatefromwebp')) {
            fail(422, 'webp_unsupported', 'This server cannot read WebP images. Use JPG or PNG.', ['images' => 'WebP is not supported on this server.']);
        }
        if ($info[0] * $info[1] > limit('image_max_pixels')) fail(422, 'image_too_big', "$label has too many pixels. Reduce its size.", ['images' => "$label is too large in pixels."]);
    }
}

function new_pdf_path(): array
{
    $root = storage_root();
    $rel = 'questions/' . gmdate('Y') . '/' . bin2hex(random_bytes(16)) . '.pdf';
    $dir = dirname("$root/$rel");
    if (!is_dir($dir) && !@mkdir($dir, 0750, true)) fail(500, 'storage_error', 'Could not create the storage folder.');
    return [$rel, "$root/$rel"];
}

/** Validate and store an uploaded PDF or image set as ONE stored PDF. Returns file metadata. */
function store_document(): ?array
{
    $pdf = uploaded_list('pdf');
    $images = uploaded_list('images');
    if ($pdf && $images) fail(422, 'both_sources', 'Send either one PDF or a set of images, not both.', ['pdf' => 'Choose a PDF or images, not both.']);
    if (count($pdf) > 1) fail(422, 'too_many', 'Send only one PDF.', ['pdf' => 'Send only one PDF.']);
    if (!$pdf && !$images) return null;

    [$rel, $abs] = new_pdf_path();
    if ($pdf) {
        validate_pdf($pdf[0]);
        if (!move_uploaded_file($pdf[0]['tmp_name'], $abs)) fail(500, 'storage_error', 'Could not store the PDF.');
        chmod($abs, 0640);
        return ['path' => $rel, 'size' => filesize($abs), 'pages' => null, 'source' => 'pdf', 'original' => mb_substr(clean((string)$pdf[0]['name']), 0, 255)];
    }
    // PHP silently drops files beyond max_file_uploads/post_max_size. The client states how many it sent,
    // so a truncated upload is rejected instead of producing a PDF with missing pages.
    $expected = filter_var(body()['imageCount'] ?? null, FILTER_VALIDATE_INT);
    if ($expected === false || $expected === null) fail(422, 'incomplete_upload', 'Send imageCount with the images.', ['images' => 'The number of images was not sent.']);
    if ($expected !== count($images)) {
        fail(422, 'incomplete_upload', 'Only ' . count($images) . " of $expected images were received. Use fewer images or ask the administrator to raise the server upload limits.", ['images' => 'Some images were not received.']);
    }
    validate_images($images);
    $pages = images_to_pdf(array_map(fn($f) => $f['tmp_name'], $images), $abs, limit('pdf_max_edge_px'));
    chmod($abs, 0640);
    return ['path' => $rel, 'size' => filesize($abs), 'pages' => $pages, 'source' => 'images', 'original' => null];
}

function delete_stored(?string $rel): void
{
    if ($rel === null || !preg_match('#^questions/\d{4}/[a-f0-9]{32}\.pdf$#', $rel)) return;
    $abs = storage_root() . '/' . $rel;
    if (is_file($abs)) @unlink($abs);
}

function download_name(array $q): string
{
    $base = preg_replace('/[^A-Za-z0-9]+/', '-', $q['course_code'] . ' ' . $q['exam_year'] . ' ' . $q['course_title']);
    return trim(substr((string)$base, 0, 80), '-') . '.pdf';
}

function stream_pdf(array $q, bool $inline): never
{
    if (empty($q['file_path']) || !preg_match('#^questions/\d{4}/[a-f0-9]{32}\.pdf$#', $q['file_path'])) fail(404, 'no_document', 'No document is available for this question.');
    $abs = storage_root() . '/' . $q['file_path'];
    if (!is_file($abs)) fail(404, 'no_document', 'The document file could not be found.');
    while (ob_get_level()) ob_end_clean();
    header('Content-Type: application/pdf');
    header('Content-Length: ' . filesize($abs));
    header('Content-Disposition: ' . ($inline ? 'inline' : 'attachment') . '; filename="' . download_name($q) . '"');
    header('Cache-Control: private, max-age=0, must-revalidate');
    readfile($abs);
    exit;
}