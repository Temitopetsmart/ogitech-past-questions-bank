-- OGITECH Past Questions Bank: MySQL 8 / MariaDB 10.4+ schema.
-- Import with:  mysql -u <user> -p < database/schema.sql
-- Dates are stored in UTC.

CREATE DATABASE IF NOT EXISTS pqb_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pqb_db;

CREATE TABLE admin_users (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name          VARCHAR(60)  NOT NULL,
  username      VARCHAR(30)  NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('main','manager') NOT NULL DEFAULT 'manager',
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  last_login_at DATETIME     NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_admin_username (username)
) ENGINE=InnoDB;

CREATE TABLE programmes (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name       VARCHAR(20)  NOT NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_programme_name (name)
) ENGINE=InnoDB;

CREATE TABLE levels (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  programme_id INT UNSIGNED NOT NULL,
  name         VARCHAR(20)  NOT NULL,
  sort_order   INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_level_name (programme_id, name),
  UNIQUE KEY uq_level_programme (id, programme_id),
  CONSTRAINT fk_level_programme FOREIGN KEY (programme_id) REFERENCES programmes (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE semesters (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name       VARCHAR(20)  NOT NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_semester_name (name)
) ENGINE=InnoDB;

-- Academic session (e.g. 2025/2026). Separate from a question's exam_year (e.g. 2025).
CREATE TABLE academic_sessions (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  start_year SMALLINT UNSIGNED NOT NULL,
  name       VARCHAR(9)   NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_session_start (start_year),
  UNIQUE KEY uq_session_name (name)
) ENGINE=InnoDB;

CREATE TABLE departments (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(80)  NOT NULL,
  description VARCHAR(200) NOT NULL DEFAULT '',
  is_visible  TINYINT(1)   NOT NULL DEFAULT 1,
  sort_order  INT UNSIGNED NOT NULL DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_department_name (name)
) ENGINE=InnoDB;

CREATE TABLE department_programmes (
  department_id INT UNSIGNED NOT NULL,
  programme_id  INT UNSIGNED NOT NULL,
  PRIMARY KEY (department_id, programme_id),
  CONSTRAINT fk_dp_department FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE CASCADE,
  CONSTRAINT fk_dp_programme  FOREIGN KEY (programme_id)  REFERENCES programmes (id)  ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE questions (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  department_id INT UNSIGNED NOT NULL,
  programme_id  INT UNSIGNED NOT NULL,
  level_id      INT UNSIGNED NOT NULL,
  semester_id   INT UNSIGNED NOT NULL,
  session_id    INT UNSIGNED NOT NULL,
  course_code   VARCHAR(20)  NOT NULL,
  course_title  VARCHAR(120) NOT NULL,
  exam_year     SMALLINT UNSIGNED NOT NULL,
  notes         VARCHAR(300) NOT NULL DEFAULT '',
  is_published  TINYINT(1)   NOT NULL DEFAULT 0,
  is_featured   TINYINT(1)   NOT NULL DEFAULT 0,
  -- Document (always delivered as one PDF). file_path is relative to the private storage folder.
  file_path     VARCHAR(255) NULL,
  file_size     INT UNSIGNED NULL,
  page_count    SMALLINT UNSIGNED NULL,
  source_type   ENUM('pdf','images') NULL,
  original_name VARCHAR(255) NULL,
  view_count    INT UNSIGNED NOT NULL DEFAULT 0,
  download_count INT UNSIGNED NOT NULL DEFAULT 0,
  created_by    INT UNSIGNED NULL,
  updated_by    INT UNSIGNED NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_question (department_id, programme_id, level_id, semester_id, course_code, exam_year),
  KEY idx_pub_created (is_published, created_at),
  KEY idx_pub_featured (is_published, is_featured),
  KEY idx_year (exam_year),
  KEY idx_code (course_code),
  CONSTRAINT fk_q_department FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE RESTRICT,
  CONSTRAINT fk_q_programme  FOREIGN KEY (programme_id)  REFERENCES programmes (id)  ON DELETE RESTRICT,
  -- A question's level must belong to its programme.
  CONSTRAINT fk_q_level      FOREIGN KEY (level_id, programme_id) REFERENCES levels (id, programme_id) ON DELETE RESTRICT,
  CONSTRAINT fk_q_semester   FOREIGN KEY (semester_id)   REFERENCES semesters (id)   ON DELETE RESTRICT,
  CONSTRAINT fk_q_session    FOREIGN KEY (session_id)    REFERENCES academic_sessions (id) ON DELETE RESTRICT,
  CONSTRAINT fk_q_created_by FOREIGN KEY (created_by)    REFERENCES admin_users (id) ON DELETE SET NULL,
  CONSTRAINT fk_q_updated_by FOREIGN KEY (updated_by)    REFERENCES admin_users (id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Requests sent from the public "Request a Question" form.
CREATE TABLE question_requests (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  requester_name  VARCHAR(80)  NOT NULL DEFAULT '',
  requester_email VARCHAR(120) NOT NULL DEFAULT '',
  department_id INT UNSIGNED NULL,
  programme     VARCHAR(20)  NOT NULL,
  level         VARCHAR(20)  NOT NULL,
  semester      VARCHAR(20)  NOT NULL,
  course_code   VARCHAR(20)  NOT NULL,
  course_title  VARCHAR(120) NOT NULL,
  exam_year     SMALLINT UNSIGNED NULL,
  details       VARCHAR(500) NOT NULL DEFAULT '',
  status        ENUM('new','resolved') NOT NULL DEFAULT 'new',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at   DATETIME     NULL,
  resolved_by   INT UNSIGNED NULL,
  PRIMARY KEY (id),
  KEY idx_request_status (status, created_at),
  CONSTRAINT fk_r_department  FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE SET NULL,
  CONSTRAINT fk_r_resolved_by FOREIGN KEY (resolved_by)   REFERENCES admin_users (id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Login and public-form throttling.
CREATE TABLE rate_limits (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  action     VARCHAR(30)  NOT NULL,
  subject    VARCHAR(100) NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_rl (action, subject, created_at)
) ENGINE=InnoDB;