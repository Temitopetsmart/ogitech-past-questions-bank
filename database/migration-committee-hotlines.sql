USE pqb_db;

-- One row per administration (e.g. "2026/2027"). Exactly one is shown as current.
CREATE TABLE IF NOT EXISTS committee_terms (
    id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    label      VARCHAR(40)  NOT NULL,
    is_current TINYINT(1)   NOT NULL DEFAULT 0,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_term_label (label),
    KEY idx_term_current (is_current)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS committee_members (
    id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    term_id    INT UNSIGNED NOT NULL,
    name       VARCHAR(100) NOT NULL,
    office     VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL DEFAULT '',
    level      VARCHAR(30)  NOT NULL DEFAULT '',
    photo_path VARCHAR(255) NULL,
    is_visible TINYINT(1)   NOT NULL DEFAULT 1,
    sort_order INT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_member_term (term_id, is_visible, sort_order, id),
    CONSTRAINT fk_member_term FOREIGN KEY (term_id) REFERENCES committee_terms (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hotlines (
    id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
    title        VARCHAR(100) NOT NULL,
    holder       VARCHAR(100) NOT NULL DEFAULT '',
    phone        VARCHAR(20)  NOT NULL,
    has_whatsapp TINYINT(1)   NOT NULL DEFAULT 0,
    note         VARCHAR(160) NOT NULL DEFAULT '',
    is_visible   TINYINT(1)   NOT NULL DEFAULT 1,
    sort_order   INT UNSIGNED NOT NULL DEFAULT 0,
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_hotline_order (is_visible, sort_order, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;