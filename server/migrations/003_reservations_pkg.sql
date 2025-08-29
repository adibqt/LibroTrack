-- PKG_RESERVATIONS provides create, cancel, fulfill, and expiry processing

CREATE OR REPLACE PACKAGE PKG_RESERVATIONS AS
  PROCEDURE create_reservation(
    p_user_id      IN NUMBER,
    p_book_id      IN NUMBER,
    p_expiry_days  IN NUMBER DEFAULT 3,
    p_priority     IN NUMBER DEFAULT 1,
    p_reservation_id OUT NUMBER
  );
  PROCEDURE cancel_reservation(p_reservation_id IN NUMBER);
  PROCEDURE fulfill_reservation(p_reservation_id IN NUMBER);
  PROCEDURE expire_due_reservations;
END PKG_RESERVATIONS;
/

CREATE OR REPLACE PACKAGE BODY PKG_RESERVATIONS AS
  PROCEDURE create_reservation(
    p_user_id      IN NUMBER,
    p_book_id      IN NUMBER,
    p_expiry_days  IN NUMBER DEFAULT 3,
    p_priority     IN NUMBER DEFAULT 1,
    p_reservation_id OUT NUMBER
  ) IS
    v_avail   NUMBER;
    v_exists  NUMBER;
  BEGIN
    -- prevent duplicate pending reservation for same user/book
    SELECT COUNT(*) INTO v_exists
      FROM reservations
      WHERE user_id = p_user_id AND book_id = p_book_id AND status = 'PENDING';
    IF v_exists > 0 THEN
      RAISE_APPLICATION_ERROR(-20010, 'An active reservation already exists for this user and book');
    END IF;

    -- lock the book row and ensure availability
    SELECT available_copies INTO v_avail
      FROM books
      WHERE book_id = p_book_id
      FOR UPDATE;

    IF v_avail <= 0 THEN
      RAISE_APPLICATION_ERROR(-20011, 'No available copies to reserve');
    END IF;

    SELECT reservations_seq.NEXTVAL INTO p_reservation_id FROM dual;

    INSERT INTO reservations (
      reservation_id, user_id, book_id, reservation_date, expiry_date, status, priority_level, notified
    ) VALUES (
      p_reservation_id, p_user_id, p_book_id, SYSTIMESTAMP, SYSDATE + NVL(p_expiry_days, 3), 'PENDING', NVL(p_priority, 1), 'NO'
    );

    UPDATE books
      SET reserved_copies = reserved_copies + 1,
          available_copies = available_copies - 1
      WHERE book_id = p_book_id;

    COMMIT;
  END create_reservation;

  PROCEDURE cancel_reservation(p_reservation_id IN NUMBER) IS
    v_book_id  NUMBER;
    v_status   VARCHAR2(20);
  BEGIN
    SELECT book_id, status INTO v_book_id, v_status
      FROM reservations
      WHERE reservation_id = p_reservation_id
      FOR UPDATE;

    IF v_status <> 'PENDING' THEN
      RAISE_APPLICATION_ERROR(-20012, 'Only PENDING reservations can be cancelled');
    END IF;

    UPDATE reservations
      SET status = 'CANCELLED'
      WHERE reservation_id = p_reservation_id;

    UPDATE books
      SET reserved_copies = reserved_copies - 1,
          available_copies = available_copies + 1
      WHERE book_id = v_book_id;

    COMMIT;
  END cancel_reservation;

  PROCEDURE fulfill_reservation(p_reservation_id IN NUMBER) IS
    v_book_id  NUMBER;
    v_status   VARCHAR2(20);
  BEGIN
    SELECT book_id, status INTO v_book_id, v_status
      FROM reservations
      WHERE reservation_id = p_reservation_id
      FOR UPDATE;

    IF v_status <> 'PENDING' THEN
      RAISE_APPLICATION_ERROR(-20013, 'Only PENDING reservations can be fulfilled');
    END IF;

    UPDATE reservations
      SET status = 'FULFILLED'
      WHERE reservation_id = p_reservation_id;

    -- Reservation consumes a reserved copy; available was already reduced at create time
    UPDATE books
      SET reserved_copies = reserved_copies - 1
      WHERE book_id = v_book_id;

    COMMIT;
  END fulfill_reservation;

  PROCEDURE expire_due_reservations IS
  BEGIN
    FOR r IN (
      SELECT reservation_id, book_id
      FROM reservations
      WHERE status = 'PENDING'
        AND expiry_date < SYSDATE
      FOR UPDATE
    ) LOOP
      UPDATE reservations
        SET status = 'EXPIRED'
        WHERE reservation_id = r.reservation_id;

      UPDATE books
        SET reserved_copies = reserved_copies - 1,
            available_copies = available_copies + 1
        WHERE book_id = r.book_id;
    END LOOP;

    COMMIT;
  END expire_due_reservations;
END PKG_RESERVATIONS;
/

-- Helpful indexes
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_reservations_book_status ON reservations(book_id, status);
CREATE INDEX idx_reservations_user_status ON reservations(user_id, status);