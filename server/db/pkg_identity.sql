-- PKG_IDENTITY: User CRUD and Role/Status Checks

CREATE OR REPLACE PACKAGE PKG_IDENTITY AS
  -- Create a new user
  PROCEDURE create_user(
    p_username      IN VARCHAR2,
    p_password_hash IN VARCHAR2,
    p_first_name    IN VARCHAR2,
    p_last_name     IN VARCHAR2,
    p_email         IN VARCHAR2,
    p_user_type     IN VARCHAR2,
    p_status        IN VARCHAR2 DEFAULT 'ACTIVE',
    p_user_id       OUT NUMBER
  );

  -- Update user details
  PROCEDURE update_user(
    p_user_id       IN NUMBER,
    p_username      IN VARCHAR2,
    p_email         IN VARCHAR2,
    p_user_type     IN VARCHAR2,
    p_status        IN VARCHAR2
  );

  -- Delete a user
  PROCEDURE delete_user(
    p_user_id IN NUMBER
  );

  -- Get user by ID
  PROCEDURE get_user_by_id(
    p_user_id IN NUMBER,
    p_result OUT SYS_REFCURSOR
  );

  -- Get user by username
  PROCEDURE get_user_by_username(
    p_username IN VARCHAR2,
    p_result  OUT SYS_REFCURSOR
  );

  -- Check if user has a specific role
  FUNCTION has_role(
    p_user_id   IN NUMBER,
    p_user_type IN VARCHAR2
  ) RETURN NUMBER;

  -- Check if user has a specific status
  FUNCTION has_status(
    p_user_id IN NUMBER,
    p_status  IN VARCHAR2
  ) RETURN NUMBER;

END PKG_IDENTITY;
/
