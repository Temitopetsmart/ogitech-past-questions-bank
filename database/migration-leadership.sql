USE pqb_db;

CREATE TABLE IF NOT EXISTS leadership_profiles (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    position VARCHAR(120) NOT NULL DEFAULT '',
    qualifications TEXT NULL,
    message TEXT NOT NULL,
    photo_path VARCHAR(255) NOT NULL,
    is_visible TINYINT(1) NOT NULL DEFAULT 1,
    sort_order INT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_leadership_order (is_visible, sort_order, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;