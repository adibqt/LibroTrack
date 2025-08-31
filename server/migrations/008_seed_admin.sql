-- 008_seed_admin.sql
-- Ensure an ADMIN user exists with known credentials for development

MERGE INTO users u
USING (
  SELECT 'libro@admin.com' AS username,
         'libro@admin.com' AS email
  FROM dual
) src
ON (
  LOWER(u.username) = LOWER(src.username)
  OR LOWER(u.email) = LOWER(src.email)
)
WHEN MATCHED THEN
  UPDATE SET
    u.password_hash = 'admin123',
    u.first_name    = 'Admin',
    u.last_name     = 'User',
    u.user_type     = 'ADMIN',
    u.status        = 'ACTIVE'
WHEN NOT MATCHED THEN
  INSERT (
    user_id, username, email, password_hash, first_name, last_name, user_type, status, created_at
  ) VALUES (
    users_seq.NEXTVAL, src.username, src.email, 'admin123', 'Admin', 'User', 'ADMIN', 'ACTIVE', SYSDATE
  );

-- Optional sanity check (no-op select)
SELECT 1 FROM dual;