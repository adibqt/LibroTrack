-- PKG_FINES Body: Fine assessment, settlement, and waiving

CREATE OR REPLACE PACKAGE BODY PKG_FINES AS
  PROCEDURE assess_fine(
    p_user_id     IN NUMBER,
    p_amount      IN NUMBER,
    p_fine_type   IN VARCHAR2,
    p_fine_id     OUT NUMBER
  ) IS
  BEGIN
    SELECT fines_seq.NEXTVAL INTO p_fine_id FROM DUAL;
    INSERT INTO fines (
      fine_id, user_id, amount, fine_type, status, created_at
    ) VALUES (
      p_fine_id, p_user_id, p_amount, p_fine_type, 'UNPAID', SYSDATE
    );
    UPDATE users SET total_fines = NVL(total_fines,0) + p_amount WHERE user_id = p_user_id;
    COMMIT;
  END assess_fine;

  PROCEDURE settle_fine(
    p_fine_id     IN NUMBER
  ) IS
    v_user_id NUMBER;
    v_amount NUMBER;
  BEGIN
    SELECT user_id, amount INTO v_user_id, v_amount FROM fines WHERE fine_id = p_fine_id;
  UPDATE fines SET status = 'PAID' WHERE fine_id = p_fine_id;
    UPDATE users SET total_fines = NVL(total_fines,0) - v_amount WHERE user_id = v_user_id;
    COMMIT;
  END settle_fine;

  PROCEDURE waive_fine(
    p_fine_id     IN NUMBER
  ) IS
    v_user_id NUMBER;
    v_amount NUMBER;
  BEGIN
    SELECT user_id, amount INTO v_user_id, v_amount FROM fines WHERE fine_id = p_fine_id;
  UPDATE fines SET status = 'WAIVED' WHERE fine_id = p_fine_id;
    UPDATE users SET total_fines = NVL(total_fines,0) - v_amount WHERE user_id = v_user_id;
    COMMIT;
  END waive_fine;

  PROCEDURE get_fine_by_id(
    p_fine_id     IN NUMBER,
    p_result      OUT SYS_REFCURSOR
  ) IS
  BEGIN
    OPEN p_result FOR
      SELECT * FROM fines WHERE fine_id = p_fine_id;
  END get_fine_by_id;

  PROCEDURE get_fines_by_user(
    p_user_id     IN NUMBER,
    p_result      OUT SYS_REFCURSOR
  ) IS
  BEGIN
    OPEN p_result FOR
      SELECT * FROM fines WHERE user_id = p_user_id ORDER BY created_at DESC;
  END get_fines_by_user;
END PKG_FINES;
/
