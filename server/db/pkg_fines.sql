-- PKG_FINES: Fine assessment, settlement, and waiving

CREATE OR REPLACE PACKAGE PKG_FINES AS
  -- Assess a new fine for a user
  PROCEDURE assess_fine(
    p_user_id     IN NUMBER,
    p_amount      IN NUMBER,
    p_fine_type   IN VARCHAR2,
    p_fine_id     OUT NUMBER
  );

  -- Settle (pay) a fine
  PROCEDURE settle_fine(
    p_fine_id     IN NUMBER
  );

  -- Waive a fine
  PROCEDURE waive_fine(
    p_fine_id     IN NUMBER
  );

  -- Get fine details by ID
  PROCEDURE get_fine_by_id(
    p_fine_id     IN NUMBER,
    p_result      OUT SYS_REFCURSOR
  );

  -- Get all fines for a user
  PROCEDURE get_fines_by_user(
    p_user_id     IN NUMBER,
    p_result      OUT SYS_REFCURSOR
  );
END PKG_FINES;
/
