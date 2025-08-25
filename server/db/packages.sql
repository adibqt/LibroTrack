-- LibroTrack DB Packages: PKG_CATALOG and PKG_STOCK

-- PKG_CATALOG Specification
CREATE OR REPLACE PACKAGE PKG_CATALOG AS
  PROCEDURE add_book(
    p_isbn IN VARCHAR2,
    p_title IN VARCHAR2,
    p_category_id IN NUMBER,
    p_author_ids IN SYS.ODCINUMBERLIST,
    p_publication_year IN NUMBER DEFAULT NULL,
    p_publisher IN VARCHAR2 DEFAULT NULL,
    p_total_copies IN NUMBER DEFAULT 1,
    p_book_id OUT NUMBER
  );
  PROCEDURE update_book(
    p_book_id IN NUMBER,
    p_title IN VARCHAR2,
    p_category_id IN NUMBER,
    p_publication_year IN NUMBER DEFAULT NULL,
    p_publisher IN VARCHAR2 DEFAULT NULL,
    p_total_copies IN NUMBER DEFAULT 1
  );
  PROCEDURE delete_book(
    p_book_id IN NUMBER
  );
  PROCEDURE get_book_by_id(
    p_book_id IN NUMBER,
    p_result OUT SYS_REFCURSOR
  );
  PROCEDURE search_books(
    p_title IN VARCHAR2 DEFAULT NULL,
    p_author IN VARCHAR2 DEFAULT NULL,
    p_category IN VARCHAR2 DEFAULT NULL,
    p_result OUT SYS_REFCURSOR
  );
  PROCEDURE add_author_to_book(
    p_book_id IN NUMBER,
    p_author_id IN NUMBER
  );
  PROCEDURE remove_author_from_book(
    p_book_id IN NUMBER,
    p_author_id IN NUMBER
  );
END PKG_CATALOG;
/

-- PKG_CATALOG Body
CREATE OR REPLACE PACKAGE BODY PKG_CATALOG AS
  PROCEDURE add_book(
    p_isbn IN VARCHAR2,
    p_title IN VARCHAR2,
    p_category_id IN NUMBER,
    p_author_ids IN SYS.ODCINUMBERLIST,
    p_publication_year IN NUMBER DEFAULT NULL,
    p_publisher IN VARCHAR2 DEFAULT NULL,
    p_total_copies IN NUMBER DEFAULT 1,
    p_book_id OUT NUMBER
  ) IS
    v_existing_count NUMBER;
  BEGIN
    SELECT COUNT(*) INTO v_existing_count FROM books WHERE isbn = p_isbn;
    IF v_existing_count > 0 THEN
      RAISE_APPLICATION_ERROR(-20002, 'Book with this ISBN already exists');
    END IF;
    SELECT COUNT(*) INTO v_existing_count FROM categories WHERE category_id = p_category_id;
    IF v_existing_count = 0 THEN
      RAISE_APPLICATION_ERROR(-20003, 'Invalid category ID');
    END IF;
    SELECT books_seq.NEXTVAL INTO p_book_id FROM DUAL;
    INSERT INTO books (
      book_id, isbn, title, category_id, publication_year, publisher,
      total_copies, available_copies
    ) VALUES (
      p_book_id, p_isbn, p_title, p_category_id, p_publication_year, p_publisher,
      p_total_copies, p_total_copies
    );
    FOR i IN 1..p_author_ids.COUNT LOOP
      INSERT INTO book_authors (book_id, author_id)
      VALUES (p_book_id, p_author_ids(i));
    END LOOP;
    COMMIT;
  END add_book;

  PROCEDURE update_book(
    p_book_id IN NUMBER,
    p_title IN VARCHAR2,
    p_category_id IN NUMBER,
    p_publication_year IN NUMBER DEFAULT NULL,
    p_publisher IN VARCHAR2 DEFAULT NULL,
    p_total_copies IN NUMBER DEFAULT 1
  ) IS
  BEGIN
    UPDATE books
    SET title = p_title,
        category_id = p_category_id,
        publication_year = p_publication_year,
        publisher = p_publisher,
        total_copies = p_total_copies
    WHERE book_id = p_book_id;
    COMMIT;
  END update_book;

  PROCEDURE delete_book(
    p_book_id IN NUMBER
  ) IS
  BEGIN
    DELETE FROM books WHERE book_id = p_book_id;
    COMMIT;
  END delete_book;

  PROCEDURE get_book_by_id(
    p_book_id IN NUMBER,
    p_result OUT SYS_REFCURSOR
  ) IS
  BEGIN
    OPEN p_result FOR
      SELECT b.*, c.category_name
      FROM books b
      JOIN categories c ON b.category_id = c.category_id
      WHERE b.book_id = p_book_id;
  END get_book_by_id;

  PROCEDURE search_books(
    p_title IN VARCHAR2 DEFAULT NULL,
    p_author IN VARCHAR2 DEFAULT NULL,
    p_category IN VARCHAR2 DEFAULT NULL,
    p_result OUT SYS_REFCURSOR
  ) IS
  BEGIN
    OPEN p_result FOR
      SELECT DISTINCT b.book_id, b.title, b.isbn, c.category_name, b.available_copies, b.total_copies
      FROM books b
      JOIN categories c ON b.category_id = c.category_id
      LEFT JOIN book_authors ba ON b.book_id = ba.book_id
      LEFT JOIN authors a ON ba.author_id = a.author_id
      WHERE (p_title IS NULL OR LOWER(b.title) LIKE '%' || LOWER(p_title) || '%')
        AND (p_author IS NULL OR LOWER(a.first_name || ' ' || a.last_name) LIKE '%' || LOWER(p_author) || '%')
        AND (p_category IS NULL OR LOWER(c.category_name) LIKE '%' || LOWER(p_category) || '%');
  END search_books;

  PROCEDURE add_author_to_book(
    p_book_id IN NUMBER,
    p_author_id IN NUMBER
  ) IS
  BEGIN
    INSERT INTO book_authors (book_id, author_id)
    VALUES (p_book_id, p_author_id);
    COMMIT;
  END add_author_to_book;

  PROCEDURE remove_author_from_book(
    p_book_id IN NUMBER,
    p_author_id IN NUMBER
  ) IS
  BEGIN
    DELETE FROM book_authors
    WHERE book_id = p_book_id AND author_id = p_author_id;
    COMMIT;
  END remove_author_from_book;

END PKG_CATALOG;
/

-- PKG_STOCK Specification
CREATE OR REPLACE PACKAGE PKG_STOCK AS
  PROCEDURE reserve_copy(
    p_book_id IN NUMBER,
    p_user_id IN NUMBER
  );
  PROCEDURE release_copy(
    p_book_id IN NUMBER,
    p_user_id IN NUMBER
  );
  PROCEDURE checkout_copy(
    p_book_id IN NUMBER,
    p_user_id IN NUMBER
  );
  PROCEDURE checkin_copy(
    p_book_id IN NUMBER,
    p_user_id IN NUMBER
  );
  PROCEDURE get_low_stock_books(
    p_threshold IN NUMBER DEFAULT 2,
    p_result OUT SYS_REFCURSOR
  );
END PKG_STOCK;
/

-- PKG_STOCK Body
CREATE OR REPLACE PACKAGE BODY PKG_STOCK AS
  PROCEDURE reserve_copy(
    p_book_id IN NUMBER,
    p_user_id IN NUMBER
  ) IS
  BEGIN
    -- Example: Insert reservation logic here
    NULL;
  END reserve_copy;

  PROCEDURE release_copy(
    p_book_id IN NUMBER,
    p_user_id IN NUMBER
  ) IS
  BEGIN
    -- Example: Release reservation logic here
    NULL;
  END release_copy;

  PROCEDURE checkout_copy(
    p_book_id IN NUMBER,
    p_user_id IN NUMBER
  ) IS
  BEGIN
    UPDATE books
    SET available_copies = available_copies - 1
    WHERE book_id = p_book_id AND available_copies > 0;
    COMMIT;
  END checkout_copy;

  PROCEDURE checkin_copy(
    p_book_id IN NUMBER,
    p_user_id IN NUMBER
  ) IS
  BEGIN
    UPDATE books
    SET available_copies = available_copies + 1
    WHERE book_id = p_book_id AND available_copies < total_copies;
    COMMIT;
  END checkin_copy;

  PROCEDURE get_low_stock_books(
    p_threshold IN NUMBER DEFAULT 2,
    p_result OUT SYS_REFCURSOR
  ) IS
  BEGIN
    OPEN p_result FOR
      SELECT book_id, title, available_copies, total_copies
      FROM books
      WHERE available_copies <= p_threshold;
  END get_low_stock_books;

END PKG_STOCK;
/
