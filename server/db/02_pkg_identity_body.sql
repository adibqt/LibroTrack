-- PKG_IDENTITY Body: User CRUD and Role/Status Checks

CREATE OR REPLACE PACKAGE BODY PKG_IDENTITY AS

  PROCEDURE create_user(
    p_username      IN VARCHAR2,
    p_password_hash IN VARCHAR2,
    p_first_name    IN VARCHAR2,
    p_last_name     IN VARCHAR2,
    p_email         IN VARCHAR2,
    p_user_type     IN VARCHAR2,
    p_status        IN VARCHAR2 DEFAULT 'ACTIVE',
    p_user_id       OUT NUMBER
  ) IS
  BEGIN
    SELECT users_seq.NEXTVAL INTO p_user_id FROM DUAL;
    INSERT INTO users (
      user_id, username, password_hash, first_name, last_name, email, user_type, status, created_at
    ) VALUES (
      p_user_id, p_username, p_password_hash, p_first_name, p_last_name, p_email, p_user_type, p_status, SYSDATE
    );
    COMMIT;
  END create_user;

  PROCEDURE update_user(
    p_user_id       IN NUMBER,
    p_username      IN VARCHAR2,
    p_email         IN VARCHAR2,
    p_user_type     IN VARCHAR2,
    p_status        IN VARCHAR2
  ) IS
  BEGIN
    UPDATE users
    SET username = p_username,
        email = p_email,
        user_type = p_user_type,
        status = p_status
    WHERE user_id = p_user_id;
    COMMIT;
  END update_user;

  PROCEDURE delete_user(
    p_user_id IN NUMBER
  ) IS
  BEGIN
    DELETE FROM users WHERE user_id = p_user_id;
    COMMIT;
  END delete_user;

  PROCEDURE get_user_by_id(
    p_user_id IN NUMBER,
    p_result OUT SYS_REFCURSOR
  ) IS
  BEGIN
    OPEN p_result FOR
      SELECT user_id, username, email, user_type, status, created_at
      FROM users
      WHERE user_id = p_user_id;
  END get_user_by_id;

  PROCEDURE get_user_by_username(
    p_username IN VARCHAR2,
    p_result  OUT SYS_REFCURSOR
  ) IS
  BEGIN
    OPEN p_result FOR
      SELECT user_id, username, email, user_type, status, created_at
      FROM users
      WHERE username = p_username;
  END get_user_by_username;

  FUNCTION has_role(
    p_user_id   IN NUMBER,
    p_user_type IN VARCHAR2
  ) RETURN NUMBER IS
    v_count NUMBER;
  BEGIN
    SELECT COUNT(*) INTO v_count
    FROM users
    WHERE user_id = p_user_id AND user_type = p_user_type;
    RETURN v_count;
  END has_role;

  FUNCTION has_status(
    p_user_id IN NUMBER,
    p_status  IN VARCHAR2
  ) RETURN NUMBER IS
    v_count NUMBER;
  BEGIN
    SELECT COUNT(*) INTO v_count
    FROM users
    WHERE user_id = p_user_id AND status = p_status;
    RETURN v_count;
  END has_status;

END PKG_IDENTITY;
/
