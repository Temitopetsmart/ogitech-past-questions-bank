USE pqb_db;

-- Safe for databases where leadership_profiles already exists.
SET @has_position = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'leadership_profiles'
      AND COLUMN_NAME = 'position'
);
SET @sql = IF(
    @has_position = 0,
    CONCAT('ALTER TABLE leadership_profiles ADD COLUMN position VARCHAR(120) NOT NULL DEFAULT ', CHAR(39), CHAR(39), ' AFTER name'),
    'SELECT 1'
);
PREPARE leadership_stmt FROM @sql;
EXECUTE leadership_stmt;
DEALLOCATE PREPARE leadership_stmt;

SET @has_qualifications = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'leadership_profiles'
      AND COLUMN_NAME = 'qualifications'
);
SET @sql = IF(
    @has_qualifications = 0,
    'ALTER TABLE leadership_profiles ADD COLUMN qualifications TEXT NULL AFTER position',
    'SELECT 1'
);
PREPARE leadership_stmt FROM @sql;
EXECUTE leadership_stmt;
DEALLOCATE PREPARE leadership_stmt;

-- The first two public profiles are the Rector and SUG President records.
UPDATE leadership_profiles
SET position = CASE id
    WHEN 1 THEN 'Rector'
    WHEN 2 THEN 'SUG President'
    ELSE position
END
WHERE id IN (1, 2)
  AND (position IS NULL OR position = '');
