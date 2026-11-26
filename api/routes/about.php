<?php
declare(strict_types=1);

/* Institutional and project history. All changes are Main Admin only. */

function about_content_json(?array $row): array
{
    return [
        'heading' => $row['heading'] ?? 'About OGITECH Past Questions Bank',
        'introduction' => $row['introduction'] ?? '',
        'projectHistory' => $row['project_history'] ?? '',
        'institutionHistory' => $row['institution_history'] ?? '',
        'projectPurpose' => $row['project_purpose'] ?? '',
        'historicalNote' => $row['historical_note'] ?? '',
        'updatedAt' => isset($row['updated_at']) ? iso($row['updated_at']) : null,
    ];
}

function about_person_json(array $r): array
{
    return [
        'id' => (int)$r['id'],
        'name' => $r['name'],
        'position' => $r['position'],
        'organisation' => $r['organisation'],
        'tenurePeriod' => $r['tenure_period'],
        'biography' => $r['biography'],
        'order' => (int)$r['sort_order'],
        'visible' => (bool)$r['is_visible'],
        'createdAt' => iso($r['created_at']),
        'updatedAt' => iso($r['updated_at']),
    ];
}

function about_get_data(bool $includeHidden = false): array
{
    $content = q_one('SELECT * FROM about_content WHERE id = 1');

    $sql = 'SELECT * FROM about_people';
    if (!$includeHidden) $sql .= ' WHERE is_visible = 1';
    $sql .= ' ORDER BY sort_order, id';

    return [
        'content' => about_content_json($content),
        'people' => array_map('about_person_json', q_all($sql)),
    ];
}

/* Public About page */
function pub_about(array $p): void
{
    json_out(['data' => about_get_data(false)]);
}

/* Main Admin: read all content, including hidden historical entries */
function adm_about_get(array $p): void
{
    json_out(['data' => about_get_data(true)]);
}

/* Main Admin: save the main About page content */
function adm_about_save(array $p): void
{
    $c = new Check(body());

    $heading = $c->text('heading', 'Heading', 3, 160);
    $intro = $c->text('introduction', 'Introduction', 0, 5000, true);
    $project = $c->text('projectHistory', 'Project history', 0, 30000, true);
    $institution = $c->text('institutionHistory', 'Institution history', 0, 30000, true);
    $purpose = $c->text('projectPurpose', 'Project purpose', 0, 15000, true);
    $note = $c->text('historicalNote', 'Historical note', 0, 15000, true);

    $c->done();

    q(
        'INSERT INTO about_content
         (id, heading, introduction, project_history, institution_history, project_purpose, historical_note)
         VALUES (1, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         heading = VALUES(heading),
         introduction = VALUES(introduction),
         project_history = VALUES(project_history),
         institution_history = VALUES(institution_history),
         project_purpose = VALUES(project_purpose),
         historical_note = VALUES(historical_note)',
        [$heading, $intro, $project, $institution, $purpose, $note]
    );

    json_out(['data' => about_get_data(true)]);
}

/* Main Admin: add or update a person in the historical record */
function adm_about_person_save(array $p): void
{
    $id = isset($p['id']) ? path_id($p) : null;
    $old = $id ? q_one('SELECT * FROM about_people WHERE id = ?', [$id]) : null;

    if ($id && !$old) {
        fail(404, 'not_found', 'Historical record not found.');
    }

    $c = new Check(body());

    $name = $c->text('name', 'Full name', 2, 120);
    $position = $c->text('position', 'Position', 2, 160);
    $organisation = $c->text('organisation', 'Organisation', 0, 160);
    $tenure = $c->text('tenurePeriod', 'Tenure period', 0, 100);
    $bio = $c->text('biography', 'Biography', 0, 10000, true);
    $visible = $c->bool('visible', $old ? (bool)$old['is_visible'] : true);

    $c->done();

    if ($old) {
        q(
            'UPDATE about_people
             SET name = ?, position = ?, organisation = ?, tenure_period = ?,
                 biography = ?, is_visible = ?
             WHERE id = ?',
            [$name, $position, $organisation, $tenure, $bio, $visible ? 1 : 0, $id]
        );
        $newId = $id;
    } else {
        $order = (int)q_val(
            'SELECT COALESCE(MAX(sort_order), 0) + 1 FROM about_people'
        );

        q(
            'INSERT INTO about_people
             (name, position, organisation, tenure_period, biography, sort_order, is_visible)
             VALUES (?, ?, ?, ?, ?, ?, ?)',
            [$name, $position, $organisation, $tenure, $bio, $order, $visible ? 1 : 0]
        );

        $newId = (int)db()->lastInsertId();
    }

    $saved = q_one('SELECT * FROM about_people WHERE id = ?', [$newId]);

    json_out(['data' => about_person_json($saved)], $old ? 200 : 201);
}
