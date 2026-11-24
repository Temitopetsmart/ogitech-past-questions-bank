-- Starting academic structure only. No sample questions and no admin accounts:
-- create the first Main Admin with  php database/create-admin.php
USE pqb_db;

INSERT INTO programmes (name, sort_order) VALUES ('ND', 1), ('HND', 2);

INSERT INTO levels (programme_id, name, sort_order)
SELECT p.id, v.name, v.ord FROM programmes p
JOIN (SELECT 'ND' pn, 'ND I' name, 1 ord UNION ALL SELECT 'ND', 'ND II', 2
      UNION ALL SELECT 'HND', 'HND I', 1 UNION ALL SELECT 'HND', 'HND II', 2) v ON v.pn = p.name;

INSERT INTO semesters (name, sort_order) VALUES ('First', 1), ('Second', 2);

INSERT INTO academic_sessions (start_year, name) VALUES
  (2022, '2022/2023'), (2023, '2023/2024'), (2024, '2024/2025'), (2025, '2025/2026');

INSERT INTO departments (name, description, is_visible, sort_order) VALUES
  ('Computer Science & Engineering', '', 1, 1),
  ('Mechanical Engineering', '', 1, 2),
  ('Electrical & Electronics Engineering', '', 1, 3),
  ('Business Administration', '', 1, 4),
  ('Mass Communication', '', 1, 5);

INSERT INTO department_programmes (department_id, programme_id)
SELECT d.id, p.id FROM departments d CROSS JOIN programmes p;