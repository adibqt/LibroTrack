-- 014_reservations_fulfill_issue_loan.sql
-- Adjust PKG_RESERVATIONS so that approving (fulfilling) a reservation
-- automatically issues a loan to the requesting user via PKG_LOANS.
-- This ensures the book shows up in the user's borrowed books list.

CREATE OR REPLACE PACKAGE BODY PKG_RESERVATIONS AS
  PROCEDURE create_reservation(
    p_user_id        IN NUMBER,
    p_book_id        IN NUMBER,
    p_expiry_days    IN NUMBER DEFAULT 3,
    p_priority       IN NUMBER DEFAULT 1,
    p_reservation_id OUT NUMBER
  ) IS
    v_exists  NUMBER;
    v_dummy   NUMBER;
  BEGIN
    -- Validate user exists
    SELECT COUNT(*) INTO v_dummy FROM users WHERE user_id = p_user_id;
    IF v_dummy = 0 THEN
      RAISE_APPLICATION_ERROR(-20015, 'Invalid user_id');
    END IF;

    -- Validate book exists
    SELECT COUNT(*) INTO v_dummy FROM books WHERE book_id = p_book_id;
    IF v_dummy = 0 THEN
      RAISE_APPLICATION_ERROR(-20014, 'Invalid book_id');
    END IF;

    -- Prevent duplicate pending reservation for same user/book
    SELECT COUNT(*) INTO v_exists
      FROM reservations
     WHERE user_id = p_user_id AND book_id = p_book_id AND status = 'PENDING';
    IF v_exists > 0 THEN
      RAISE_APPLICATION_ERROR(-20010, 'An active reservation already exists for this user and book');
    END IF;

    -- Queue a reservation regardless of current availability
    SELECT reservations_seq.NEXTVAL INTO p_reservation_id FROM dual;

    INSERT INTO reservations (
      reservation_id, user_id, book_id, reservation_date, expiry_date, status, priority_level, notified
    ) VALUES (
      p_reservation_id, p_user_id, p_book_id, SYSTIMESTAMP, SYSDATE + NVL(p_expiry_days, 3), 'PENDING', NVL(p_priority, 1), 'NO'
    );

    -- Track queue length only
    UPDATE books
       SET reserved_copies = reserved_copies + 1
     WHERE book_id = p_book_id;

    COMMIT;
  END create_reservation;

  PROCEDURE cancel_reservation(p_reservation_id IN NUMBER) IS
    v_book_id  NUMBER;
    v_status   VARCHAR2(20);
  BEGIN
    BEGIN
      SELECT book_id, status INTO v_book_id, v_status
        FROM reservations
       WHERE reservation_id = p_reservation_id
         FOR UPDATE;
    EXCEPTION
      WHEN NO_DATA_FOUND THEN
        RAISE_APPLICATION_ERROR(-20016, 'Reservation not found');
    END;

    IF v_status <> 'PENDING' THEN
      RAISE_APPLICATION_ERROR(-20012, 'Only PENDING reservations can be cancelled');
    END IF;

    UPDATE reservations
       SET status = 'CANCELLED'
     WHERE reservation_id = p_reservation_id;

    -- Reduce queue length
    UPDATE books
       SET reserved_copies = reserved_copies - 1
     WHERE book_id = v_book_id;

    COMMIT;
  END cancel_reservation;

  PROCEDURE fulfill_reservation(p_reservation_id IN NUMBER) IS
    v_user_id NUMBER;
    v_book_id NUMBER;
    v_status  VARCHAR2(20);
    v_loan_id NUMBER;
  BEGIN
    BEGIN
      SELECT user_id, book_id, status INTO v_user_id, v_book_id, v_status
        FROM reservations
       WHERE reservation_id = p_reservation_id
         FOR UPDATE;
    EXCEPTION
      WHEN NO_DATA_FOUND THEN
        RAISE_APPLICATION_ERROR(-20016, 'Reservation not found');
    END;

    IF v_status <> 'PENDING' THEN
      RAISE_APPLICATION_ERROR(-20013, 'Only PENDING reservations can be fulfilled');
    END IF;

    -- Issue a loan; this handles stock decrement and user limits
    PKG_LOANS.issue_book(
      p_user_id => v_user_id,
      p_book_id => v_book_id,
      p_due_days => 14,
      p_loan_id => v_loan_id
    );

    -- Mark reservation fulfilled and reduce queue length
    UPDATE reservations
       SET status = 'FULFILLED'
     WHERE reservation_id = p_reservation_id;

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

      -- Reduce queue length
      UPDATE books
         SET reserved_copies = reserved_copies - 1
       WHERE book_id = r.book_id;
    END LOOP;

    COMMIT;
  END expire_due_reservations;
END PKG_RESERVATIONS;
/
