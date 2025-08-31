-- Fix mutating table error when reservations status changes trigger notifications
-- Strategy: avoid selecting from RESERVATIONS inside row-level triggers by
-- overloading the notification procedures to accept user_id and book_id, and
-- updating triggers to call those overloads with :NEW values.

--------------------------------------------------------------------------------
-- Replace package with overloads (keeping original signatures for non-trigger callers)
--------------------------------------------------------------------------------
CREATE OR REPLACE PACKAGE PKG_NOTIFICATIONS AS
	-- Original signatures (may be used by non-trigger callers; these do lookups)
	PROCEDURE enqueue_reserve_ready(p_reservation_id IN NUMBER);
	PROCEDURE enqueue_status_notification(p_reservation_id IN NUMBER, p_type IN VARCHAR2);

	-- Non-mutating overloads for triggers (no selects from RESERVATIONS)
	PROCEDURE enqueue_reserve_ready(
		p_reservation_id IN NUMBER,
		p_user_id        IN NUMBER,
		p_book_id        IN NUMBER
	);
	PROCEDURE enqueue_status_notification(
		p_reservation_id IN NUMBER,
		p_type           IN VARCHAR2,
		p_user_id        IN NUMBER,
		p_book_id        IN NUMBER
	);

	PROCEDURE mark_sent(p_notification_id IN NUMBER);
	PROCEDURE mark_failed(p_notification_id IN NUMBER, p_error IN VARCHAR2);
	PROCEDURE list_pending(p_limit IN NUMBER DEFAULT 50, p_result OUT SYS_REFCURSOR);
END PKG_NOTIFICATIONS;
/

CREATE OR REPLACE PACKAGE BODY PKG_NOTIFICATIONS AS
	-- Original (lookup) versions: not for use inside row-level triggers on RESERVATIONS
	PROCEDURE enqueue_reserve_ready(p_reservation_id IN NUMBER) IS
		v_user NUMBER; v_book NUMBER;
	BEGIN
		SELECT user_id, book_id INTO v_user, v_book
			FROM reservations WHERE reservation_id = p_reservation_id;
		PKG_NOTIFICATIONS.enqueue_reserve_ready(p_reservation_id, v_user, v_book);
	END enqueue_reserve_ready;

	PROCEDURE enqueue_status_notification(p_reservation_id IN NUMBER, p_type IN VARCHAR2) IS
		v_user NUMBER; v_book NUMBER;
	BEGIN
		SELECT user_id, book_id INTO v_user, v_book
			FROM reservations WHERE reservation_id = p_reservation_id;
		PKG_NOTIFICATIONS.enqueue_status_notification(p_reservation_id, p_type, v_user, v_book);
	END enqueue_status_notification;

	-- Overloads (no lookup): safe for use in row-level triggers
	PROCEDURE enqueue_reserve_ready(
		p_reservation_id IN NUMBER,
		p_user_id        IN NUMBER,
		p_book_id        IN NUMBER
	) IS
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

	PROCEDURE enqueue_status_notification(
		p_reservation_id IN NUMBER,
		p_type           IN VARCHAR2,
		p_user_id        IN NUMBER,
		p_book_id        IN NUMBER
	) IS
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

--------------------------------------------------------------------------------
-- Replace triggers to call the non-mutating overloads
--------------------------------------------------------------------------------

-- Drop existing triggers (if present)
BEGIN EXECUTE IMMEDIATE 'DROP TRIGGER trg_res_notify_ai'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TRIGGER trg_res_notify_au_status'; EXCEPTION WHEN OTHERS THEN NULL; END;
/

-- On reservation insert: notify reserve ready if pending and not notified
CREATE OR REPLACE TRIGGER trg_res_notify_ai
AFTER INSERT ON reservations
FOR EACH ROW
BEGIN
	IF :NEW.status = 'PENDING' AND :NEW.notified = 'NO' THEN
		PKG_NOTIFICATIONS.enqueue_reserve_ready(:NEW.reservation_id, :NEW.user_id, :NEW.book_id);
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
			PKG_NOTIFICATIONS.enqueue_status_notification(:NEW.reservation_id, 'RESERVATION_CANCELLED', :NEW.user_id, :NEW.book_id);
		ELSIF :NEW.status = 'FULFILLED' THEN
			PKG_NOTIFICATIONS.enqueue_status_notification(:NEW.reservation_id, 'RESERVATION_FULFILLED', :NEW.user_id, :NEW.book_id);
		ELSIF :NEW.status = 'EXPIRED' THEN
			PKG_NOTIFICATIONS.enqueue_status_notification(:NEW.reservation_id, 'RESERVATION_EXPIRED', :NEW.user_id, :NEW.book_id);
		END IF;
	END IF;
END;
/
