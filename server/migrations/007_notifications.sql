-- Notifications for reservation events

CREATE TABLE notifications (
  notification_id   NUMBER PRIMARY KEY,
  reservation_id    NUMBER NOT NULL,
  user_id           NUMBER NOT NULL,
  book_id           NUMBER NOT NULL,
  notif_type        VARCHAR2(30) NOT NULL CHECK (notif_type IN (
                      'RESERVE_READY','RESERVATION_CANCELLED','RESERVATION_FULFILLED','RESERVATION_EXPIRED'
                    )),
  channel           VARCHAR2(20) DEFAULT 'SYSTEM' CHECK (channel IN ('SYSTEM','EMAIL','SMS','PUSH')),
  payload           CLOB,
  notif_status      VARCHAR2(20) DEFAULT 'PENDING' CHECK (notif_status IN ('PENDING','SENT','FAILED','CANCELLED')),
  error_message     VARCHAR2(4000),
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sent_at           TIMESTAMP,
  CONSTRAINT fk_notif_res  FOREIGN KEY (reservation_id) REFERENCES reservations(reservation_id) ON DELETE CASCADE,
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id)        REFERENCES users(user_id),
  CONSTRAINT fk_notif_book FOREIGN KEY (book_id)        REFERENCES books(book_id)
);

CREATE SEQUENCE notifications_seq START WITH 1 INCREMENT BY 1;

-- Avoid duplicate notifications of same type for a reservation
ALTER TABLE notifications ADD CONSTRAINT uq_notif_res_type UNIQUE (reservation_id, notif_type);

CREATE INDEX idx_notif_status_time ON notifications(notif_status, created_at);
CREATE INDEX idx_notif_user ON notifications(user_id);

--------------------------------------------------------------------------------
-- Package to manage notifications
--------------------------------------------------------------------------------
CREATE OR REPLACE PACKAGE PKG_NOTIFICATIONS AS
  PROCEDURE enqueue_reserve_ready(p_reservation_id IN NUMBER);
  PROCEDURE enqueue_status_notification(p_reservation_id IN NUMBER, p_type IN VARCHAR2);
  PROCEDURE mark_sent(p_notification_id IN NUMBER);
  PROCEDURE mark_failed(p_notification_id IN NUMBER, p_error IN VARCHAR2);
  PROCEDURE list_pending(p_limit IN NUMBER DEFAULT 50, p_result OUT SYS_REFCURSOR);
END PKG_NOTIFICATIONS;
/

CREATE OR REPLACE PACKAGE BODY PKG_NOTIFICATIONS AS
  PROCEDURE enqueue_reserve_ready(p_reservation_id IN NUMBER) IS
    v_user NUMBER; v_book NUMBER;
  BEGIN
    SELECT user_id, book_id INTO v_user, v_book
    FROM reservations WHERE reservation_id = p_reservation_id;

    INSERT INTO notifications (
      notification_id, reservation_id, user_id, book_id, notif_type, payload, notif_status, created_at
    ) VALUES (
      notifications_seq.NEXTVAL, p_reservation_id, v_user, v_book, 'RESERVE_READY',
      NULL, 'PENDING', SYSTIMESTAMP
    );
  EXCEPTION
    WHEN DUP_VAL_ON_INDEX THEN NULL; -- already queued
  END enqueue_reserve_ready;

  PROCEDURE enqueue_status_notification(p_reservation_id IN NUMBER, p_type IN VARCHAR2) IS
    v_user NUMBER; v_book NUMBER;
  BEGIN
    SELECT user_id, book_id INTO v_user, v_book
    FROM reservations WHERE reservation_id = p_reservation_id;

    INSERT INTO notifications (
      notification_id, reservation_id, user_id, book_id, notif_type, payload, notif_status, created_at
    ) VALUES (
      notifications_seq.NEXTVAL, p_reservation_id, v_user, v_book, p_type,
      NULL, 'PENDING', SYSTIMESTAMP
    );
  EXCEPTION
    WHEN DUP_VAL_ON_INDEX THEN NULL; -- already queued
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

    -- When the "reserve ready" notification is sent, mark reservation as notified
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

--------------------------------------------------------------------------------
-- Triggers to enqueue notifications from reservation events
--------------------------------------------------------------------------------

-- On reservation insert: notify reserve ready if pending and not notified
CREATE OR REPLACE TRIGGER trg_res_notify_ai
AFTER INSERT ON reservations
FOR EACH ROW
BEGIN
  IF :NEW.status = 'PENDING' AND :NEW.notified = 'NO' THEN
    PKG_NOTIFICATIONS.enqueue_reserve_ready(:NEW.reservation_id);
  END IF;
END;
/

-- On reservation status change: notify outcome
CREATE OR REPLACE TRIGGER trg_res_notify_au_status
AFTER UPDATE OF status ON reservations
FOR EACH ROW
BEGIN
  IF :OLD.status <> :NEW.status THEN
    IF :NEW.status = 'CANCELLED' THEN
      PKG_NOTIFICATIONS.enqueue_status_notification(:NEW.reservation_id, 'RESERVATION_CANCELLED');
    ELSIF :NEW.status = 'FULFILLED' THEN
      PKG_NOTIFICATIONS.enqueue_status_notification(:NEW.reservation_id, 'RESERVATION_FULFILLED');
    ELSIF :NEW.status = 'EXPIRED' THEN
      PKG_NOTIFICATIONS.enqueue_status_notification(:NEW.reservation_id, 'RESERVATION_EXPIRED');
    END IF;
  END IF;
END;
/