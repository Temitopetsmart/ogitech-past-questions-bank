-- Academic calendars use the existing questions table.

ALTER TABLE questions
    ADD COLUMN document_type ENUM('question', 'calendar')
        NOT NULL DEFAULT 'question' AFTER id,
    MODIFY department_id INT UNSIGNED NULL,
    MODIFY programme_id INT UNSIGNED NULL,
    MODIFY level_id INT UNSIGNED NULL,
    MODIFY semester_id INT UNSIGNED NULL,
    MODIFY course_code VARCHAR(20) NOT NULL DEFAULT '',
    MODIFY exam_year SMALLINT UNSIGNED NULL;

CREATE INDEX idx_document_type_published
    ON questions (document_type, is_published, session_id);