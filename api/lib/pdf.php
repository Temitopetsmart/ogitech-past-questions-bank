<?php
declare(strict_types=1);

/* Combine images into ONE PDF using only PHP + GD (no external libraries).
   Every image is decoded and re-encoded as JPEG, which also strips metadata and any hidden payload.
   Page order = order of $paths. Returns the page count. */

function gd_load(string $path, int $type): GdImage
{
    $img = match ($type) {
        IMAGETYPE_JPEG => @imagecreatefromjpeg($path),
        IMAGETYPE_PNG  => @imagecreatefrompng($path),
        IMAGETYPE_WEBP => function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($path) : false,
        default        => false,
    };
    if (!$img) fail(422, 'bad_image', 'One of the images could not be read. Use a valid JPG, PNG or WebP file.');
    return $img;
}

function images_to_pdf(array $paths, string $outFile, int $maxEdge): int
{
    if (!$paths) fail(422, 'no_images', 'Select at least one image.');
    @ini_set('memory_limit', '384M');
    @set_time_limit(120);

    $f = fopen($outFile, 'wb');
    if (!$f) fail(500, 'storage_error', 'Could not create the PDF file.');
    $pos = 0;
    $offsets = [];
    $put = function (string $s) use ($f, &$pos): void {
        if (fwrite($f, $s) !== strlen($s)) throw new RuntimeException('Could not write the PDF file.');
        $pos += strlen($s);
    };
    $begin = function (int $n) use (&$offsets, &$pos, $put): void {
        $offsets[$n] = $pos;
        $put("$n 0 obj\n");
    };

    try {
        $put("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
        $kids = [];
        foreach (array_values($paths) as $i => $path) {
            $info = getimagesize($path);
            $img = gd_load($path, (int)$info[2]);

            // Respect the camera's rotation flag for JPEG photos.
            if ((int)$info[2] === IMAGETYPE_JPEG && function_exists('exif_read_data')) {
                $ex = @exif_read_data($path);
                $o = (int)($ex['Orientation'] ?? 1);
                $angle = [3 => 180, 6 => -90, 8 => 90][$o] ?? 0;
                if ($angle) { $r = imagerotate($img, $angle, 0); if ($r) { imagedestroy($img); $img = $r; } }
            }

            $w = imagesx($img); $h = imagesy($img);
            $scale = min(1.0, $maxEdge / max($w, $h));
            $nw = max(1, (int)round($w * $scale)); $nh = max(1, (int)round($h * $scale));
            // Flatten onto white (removes transparency) and downscale in one step.
            $canvas = imagecreatetruecolor($nw, $nh);
            imagefill($canvas, 0, 0, imagecolorallocate($canvas, 255, 255, 255));
            imagecopyresampled($canvas, $img, 0, 0, 0, 0, $nw, $nh, $w, $h);
            imagedestroy($img);
            ob_start();
            imagejpeg($canvas, null, 85);
            $jpeg = (string)ob_get_clean();
            imagedestroy($canvas);

            // A4 page, portrait or landscape to match the image; image scaled to fit.
            [$pw, $ph] = $nw > $nh ? [841.89, 595.28] : [595.28, 841.89];
            $s = min($pw / $nw, $ph / $nh);
            $dw = $nw * $s; $dh = $nh * $s;
            $x = ($pw - $dw) / 2; $y = ($ph - $dh) / 2;
            $content = sprintf("q %.2F 0 0 %.2F %.2F %.2F cm /Im0 Do Q", $dw, $dh, $x, $y);

            $page = 3 + 3 * $i; $cont = $page + 1; $im = $page + 2;
            $kids[] = "$page 0 R";
            $begin($page);
            $put(sprintf("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 %.2F %.2F] /Resources << /XObject << /Im0 %d 0 R >> >> /Contents %d 0 R >>\nendobj\n", $pw, $ph, $im, $cont));
            $begin($cont);
            $put('<< /Length ' . strlen($content) . " >>\nstream\n$content\nendstream\nendobj\n");
            $begin($im);
            $put("<< /Type /XObject /Subtype /Image /Width $nw /Height $nh /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " . strlen($jpeg) . " >>\nstream\n");
            $put($jpeg);
            $put("\nendstream\nendobj\n");
            unset($jpeg);
        }
        $count = count($kids);
        $begin(2);
        $put('<< /Type /Pages /Kids [' . implode(' ', $kids) . "] /Count $count >>\nendobj\n");
        $begin(1);
        $put("<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

        $total = 3 + 3 * $count;
        $xref = $pos;
        $put("xref\n0 $total\n0000000000 65535 f \n");
        for ($n = 1; $n < $total; $n++) $put(sprintf("%010d 00000 n \n", $offsets[$n]));
        $put("trailer\n<< /Size $total /Root 1 0 R >>\nstartxref\n$xref\n%%EOF\n");
    } catch (Throwable $e) {
        fclose($f);
        @unlink($outFile);
        throw $e;
    }
    fclose($f);
    return $count;
}