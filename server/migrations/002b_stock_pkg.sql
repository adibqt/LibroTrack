-- Stock service used by reservations and loans

CREATE OR REPLACE PACKAGE PKG_STOCK AS
  PROCEDURE reserve_copy(p_book_id IN NUMBER, p_user_id IN NUMBER);
  PROCEDURE release_copy(p_book_id IN NUMBER, p_user_id IN NUMBER);
  PROCEDURE checkout_copy(p_book_id IN NUMBER, p_user_id IN NUMBER);
  PROCEDURE checkin_copy(p_book_id IN NUMBER, p_user_id IN NUMBER);
  PROCEDURE get_low_stock_books(p_threshold IN NUMBER DEFAULT 2, p_result OUT SYS_REFCURSOR);
  PROCEDURE get_book_availability(
    p_book_id IN NUMBER,
    p_available OUT NUMBER,
    p_reserved OUT NUMBER,
    p_total OUT NUMBER
  );
END PKG_STOCK;
/

CREATE OR REPLACE PACKAGE BODY PKG_STOCK AS
  PROCEDURE reserve_copy(p_book_id IN NUMBER, p_user_id IN NUMBER) IS
  BEGIN
    -- Moves one copy from available to reserved
    UPDATE books
      SET available_copies = available_copies - 1,
          reserved_copies  = reserved_copies + 1
    WHERE book_id = p_book_id
      AND available_copies > 0;
    IF SQL%ROWCOUNT = 0 THEN
      RAISE_APPLICATION_ERROR(-20041, 'No available copies to reserve');
    END IF;
    COMMIT;
  END reserve_copy;

  PROCEDURE release_copy(p_book_id IN NUMBER, p_user_id IN NUMBER) IS
  BEGIN
    -- Moves one copy from reserved back to available
    UPDATE books
      SET reserved_copies  = reserved_copies - 1,
          available_copies = available_copies + 1
    WHERE book_id = p_book_id
      AND reserved_copies > 0;
    IF SQL%ROWCOUNT = 0 THEN
      RAISE_APPLICATION_ERROR(-20042, 'No reserved copies to release');
    END IF;
    COMMIT;
  END release_copy;

  PROCEDURE checkout_copy(p_book_id IN NUMBER, p_user_id IN NUMBER) IS
  BEGIN
    -- Direct checkout consumes an available copy
    UPDATE books
      SET available_copies = available_copies - 1
    WHERE book_id = p_book_id
      AND available_copies > 0;
    IF SQL%ROWCOUNT = 0 THEN
      RAISE_APPLICATION_ERROR(-20043, 'No available copies to checkout');
    END IF;
    COMMIT;
  END checkout_copy;

  PROCEDURE checkin_copy(p_book_id IN NUMBER, p_user_id IN NUMBER) IS
  BEGIN
    -- Return adds to available, but never above total
    UPDATE books
      SET available_copies = available_copies + 1
    WHERE book_id = p_book_id
      AND available_copies < total_copies;
    IF SQL%ROWCOUNT = 0 THEN
      RAISE_APPLICATION_ERROR(-20044, 'Cannot check in beyond total copies');
    END IF;
    COMMIT;
  END checkin_copy;

  PROCEDURE get_low_stock_books(p_threshold IN NUMBER DEFAULT 2, p_result OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_result FOR
      SELECT book_id, title, available_copies, total_copies
      FROM books
      WHERE available_copies <= p_threshold
      ORDER BY available_copies ASC, title;
  END get_low_stock_books;

  PROCEDURE get_book_availability(
    p_book_id IN NUMBER,
    p_available OUT NUMBER,
    p_reserved OUT NUMBER,
    p_total OUT NUMBER
  ) IS
  BEGIN
    SELECT available_copies, reserved_copies, total_copies
      INTO p_available, p_reserved, p_total
    FROM books
    WHERE book_id = p_book_id;
  END get_book_availability;
END PKG_STOCK;
/