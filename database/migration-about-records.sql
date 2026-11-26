
USE pqb_db;

CREATE TABLE IF NOT EXISTS about_content (
    id TINYINT UNSIGNED NOT NULL DEFAULT 1,
    heading VARCHAR(160) NOT NULL DEFAULT 'About OGITECH Past Questions Bank',
    introduction TEXT NOT NULL,
    project_history MEDIUMTEXT NOT NULL,
    institution_history MEDIUMTEXT NOT NULL,
    project_purpose MEDIUMTEXT NOT NULL,
    historical_note MEDIUMTEXT NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT chk_about_content_singleton CHECK (id = 1)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS about_people (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(120) NOT NULL,
    position VARCHAR(160) NOT NULL,
    organisation VARCHAR(160) NOT NULL DEFAULT '',
    tenure_period VARCHAR(100) NOT NULL DEFAULT '',
    biography MEDIUMTEXT NOT NULL,
    sort_order INT UNSIGNED NOT NULL DEFAULT 0,
    is_visible TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_about_people (is_visible, sort_order, id)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

INSERT INTO about_content (
    id,
    heading,
    introduction,
    project_history,
    institution_history,
    project_purpose,
    historical_note
)
VALUES (
    1,
    'About OGITECH Past Questions Bank',
    '',
    '',
    '',
    '',
    ''
)
ON DUPLICATE KEY UPDATE id = id;