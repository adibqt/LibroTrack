-- Fix mutating-table error by avoiding SELECT on RESERVATIONS inside row-level triggers
-- Refactor PKG_NOTIFICATIONS to accept user_id/book_id and update triggers to pass :NEW values

CREATE OR REPLACE PACKAGE PKG_NOTIFICATIONS AS
  -- New signatures that avoid querying RESERVATIONS in row-level triggers
  PROCEDURE enqueue_reserve_ready(p_reservation_id IN NUMBER, p_user_id IN NUMBER, p_book_id IN NUMBER);
  PROCEDURE enqueue_status_notification(p_reservation_id IN NUMBER, p_user_id IN NUMBER, p_book_id IN NUMBER, p_type IN VARCHAR2);

  -- Existing procedures kept for backward compatibility (may query RESERVATIONS when used directly)
  PROCEDURE enqueue_reserve_ready(p_reservation_id IN NUMBER);
  PROCEDURE enqueue_status_notification(p_reservation_id IN NUMBER, p_type IN VARCHAR2);

  PROCEDURE mark_sent(p_notification_id IN NUMBER);
  PROCEDURE mark_failed(p_notification_id IN NUMBER, p_error IN VARCHAR2);
  PROCEDURE list_pending(p_limit IN NUMBER DEFAULT 50, p_result OUT SYS_REFCURSOR);
END PKG_NOTIFICATIONS;
/

CREATE OR REPLACE PACKAGE BODY PKG_NOTIFICATIONS AS
  PROCEDURE enqueue_reserve_ready(p_reservation_id IN NUMBER, p_user_id IN NUMBER, p_book_id IN NUMBER) IS
  BEGIN
    INSERT INTO notifications (
      notification_id, reservation_id, user_id, book_id, notif_type, payload, notif_status, created_at
    ) VALUES (
      notifications_seq.NEXTVAL, p_reservation_id, p_user_id, p_book_id, 'RESERVE_READY',
      NULL, 'PENDING', SYSTIMESTAMP
    );
  EXCEPTION
    WHEN DUP_VAL_ON_INDEX THEN NULL; -- already queued
  END enqueue_reserve_ready;

  PROCEDURE enqueue_status_notification(p_reservation_id IN NUMBER, p_user_id IN NUMBER, p_book_id IN NUMBER, p_type IN VARCHAR2) IS
  BEGIN
    INSERT INTO notifications (
      notification_id, reservation_id, user_id, book_id, notif_type, payload, notif_status, created_at
    ) VALUES (
      notifications_seq.NEXTVAL, p_reservation_id, p_user_id, p_book_id, p_type,
      NULL, 'PENDING', SYSTIMESTAMP
    );
  EXCEPTION
    WHEN DUP_VAL_ON_INDEX THEN NULL; -- already queued
  END enqueue_status_notification;

  -- Back-compat wrappers (not used by triggers)
  PROCEDURE enqueue_reserve_ready(p_reservation_id IN NUMBER) IS
    v_user NUMBER; v_book NUMBER;
  BEGIN
    SELECT user_id, book_id INTO v_user, v_book FROM reservations WHERE reservation_id = p_reservation_id;
    enqueue_reserve_ready(p_reservation_id, v_user, v_book);
  EXCEPTION
    WHEN DUP_VAL_ON_INDEX THEN NULL;
  END enqueue_reserve_ready;

  PROCEDURE enqueue_status_notification(p_reservation_id IN NUMBER, p_type IN VARCHAR2) IS
    v_user NUMBER; v_book NUMBER;
  BEGIN
    SELECT user_id, book_id INTO v_user, v_book FROM reservations WHERE reservation_id = p_reservation_id;
    enqueue_status_notification(p_reservation_id, v_user, v_book, p_type);
  EXCEPTION
    WHEN DUP_VAL_ON_INDEX THEN NULL;
  END enqueue_status_notification;

  PROCEDURE mark_sent(p_notification_id IN NUMBER) IS
    v_type VARCHAR2(30);
    v_res  NUMBER;
  BEGIN
    UPDATE notifications
      SET notif_status = 'SENT', sent_at = SYSTIMESTAMP, error_message = NULL
      WHERE notification_id = p_notification_id;

    SELECT notif_type, reservation_id INTO v_type, v_res
      FROM notifications WHERE notification_id = p_notification_id;

    IF v_type = 'RESERVE_READY' THEN
      UPDATE reservations SET notified = 'YES' WHERE reservation_id = v_res;
    END IF;
  END mark_sent;

  PROCEDURE mark_failed(p_notification_id IN NUMBER, p_error IN VARCHAR2) IS
  BEGIN
    UPDATE notifications
      SET notif_status = 'FAILED', error_message = SUBSTR(p_error, 1, 4000)
      WHERE notification_id = p_notification_id;
  END mark_failed;

  PROCEDURE list_pending(p_limit IN NUMBER DEFAULT 50, p_result OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_result FOR
      SELECT notification_id, reservation_id, user_id, book_id, notif_type, channel, notif_status, created_at
        FROM notifications
       WHERE notif_status = 'PENDING'
       ORDER BY created_at
       FETCH FIRST NVL(p_limit, 50) ROWS ONLY;
  END list_pending;
END PKG_NOTIFICATIONS;
/

-- Replace triggers to pass :NEW values and avoid mutating RESERVATIONS reads
CREATE OR REPLACE TRIGGER trg_res_notify_ai
AFTER INSERT ON reservations
FOR EACH ROW
BEGIN
  IF :NEW.status = 'PENDING' AND :NEW.notified = 'NO' THEN
    PKG_NOTIFICATIONS.enqueue_reserve_ready(:NEW.reservation_id, :NEW.user_id, :NEW.book_id);
  END IF;
END;
/

CREATE OR REPLACE TRIGGER trg_res_notify_au_status
AFTER UPDATE OF status ON reservations
FOR EACH ROW
BEGIN
  IF :OLD.status <> :NEW.status THEN
    IF :NEW.status = 'CANCELLED' THEN
      PKG_NOTIFICATIONS.enqueue_status_notification(:NEW.reservation_id, :NEW.user_id, :NEW.book_id, 'RESERVATION_CANCELLED');
    ELSIF :NEW.status = 'FULFILLED' THEN
      PKG_NOTIFICATIONS.enqueue_status_notification(:NEW.reservation_id, :NEW.user_id, :NEW.book_id, 'RESERVATION_FULFILLED');
    ELSIF :NEW.status = 'EXPIRED' THEN
      PKG_NOTIFICATIONS.enqueue_status_notification(:NEW.reservation_id, :NEW.user_id, :NEW.book_id, 'RESERVATION_EXPIRED');
    END IF;
  END IF;
END;
/
