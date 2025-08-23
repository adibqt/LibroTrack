-- PL/SQL Procedures, Functions, and Triggers for LibroTrack

-- 1. User Registration Procedure
CREATE OR REPLACE PROCEDURE register_user(
    p_username IN VARCHAR2,
    p_email IN VARCHAR2,
    p_password IN VARCHAR2,
    p_first_name IN VARCHAR2,
    p_last_name IN VARCHAR2,
    p_phone IN VARCHAR2 DEFAULT NULL,
    p_address IN VARCHAR2 DEFAULT NULL,
    p_user_id OUT NUMBER
) AS
    v_password_hash VARCHAR2(255);
    v_existing_count NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_existing_count FROM users WHERE username = p_username OR email = p_email;
    IF v_existing_count > 0 THEN
        RAISE_APPLICATION_ERROR(-20001, 'Username or email already exists');
    END IF;
    v_password_hash := UPPER(UTL_RAW.CAST_TO_RAW(DBMS_OBFUSCATION_TOOLKIT.MD5(INPUT_STRING => p_password)));
    SELECT users_seq.NEXTVAL INTO p_user_id FROM DUAL;
    INSERT INTO users (user_id, username, email, password_hash, first_name, last_name, phone, address)
    VALUES (p_user_id, p_username, p_email, v_password_hash, p_first_name, p_last_name, p_phone, p_address);
    COMMIT;
    DBMS_OUTPUT.PUT_LINE('User registered successfully with ID: ' || p_user_id);
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        RAISE;
END register_user;
/

-- 2. Password Validation Function
CREATE OR REPLACE FUNCTION validate_password(
    p_password IN VARCHAR2
) RETURN BOOLEAN AS
    v_length NUMBER;
    v_has_upper BOOLEAN := FALSE;
    v_has_lower BOOLEAN := FALSE;
    v_has_digit BOOLEAN := FALSE;
    v_has_special BOOLEAN := FALSE;
BEGIN
    v_length := LENGTH(p_password);
    IF v_length < 8 THEN RETURN FALSE; END IF;
    FOR i IN 1..v_length LOOP
        DECLARE v_char VARCHAR2(1) := SUBSTR(p_password, i, 1);
        BEGIN
            IF ASCII(v_char) BETWEEN 65 AND 90 THEN v_has_upper := TRUE;
            ELSIF ASCII(v_char) BETWEEN 97 AND 122 THEN v_has_lower := TRUE;
            ELSIF ASCII(v_char) BETWEEN 48 AND 57 THEN v_has_digit := TRUE;
            ELSIF v_char IN ('!', '@', '#', '$', '%', '^', '&', '*') THEN v_has_special := TRUE;
            END IF;
        END;
    END LOOP;
    RETURN (v_has_upper AND v_has_lower AND v_has_digit AND v_has_special);
END validate_password;
/

-- 3. Add Book Procedure
CREATE OR REPLACE PROCEDURE add_book(
    p_isbn IN VARCHAR2,
    p_title IN VARCHAR2,
    p_category_id IN NUMBER,
    p_author_ids IN SYS.ODCINUMBERLIST,
    p_publication_year IN NUMBER DEFAULT NULL,
    p_publisher IN VARCHAR2 DEFAULT NULL,
    p_total_copies IN NUMBER DEFAULT 1,
    p_book_id OUT NUMBER
) AS
    v_existing_count NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_existing_count FROM books WHERE isbn = p_isbn;
    IF v_existing_count > 0 THEN RAISE_APPLICATION_ERROR(-20002, 'Book with this ISBN already exists'); END IF;
    SELECT COUNT(*) INTO v_existing_count FROM categories WHERE category_id = p_category_id;
    IF v_existing_count = 0 THEN RAISE_APPLICATION_ERROR(-20003, 'Invalid category ID'); END IF;
    SELECT books_seq.NEXTVAL INTO p_book_id FROM DUAL;
    INSERT INTO books (book_id, isbn, title, category_id, publication_year, publisher, total_copies, available_copies)
    VALUES (p_book_id, p_isbn, p_title, p_category_id, p_publication_year, p_publisher, p_total_copies, p_total_copies);
    FOR i IN 1..p_author_ids.COUNT LOOP
        INSERT INTO book_authors (book_id, author_id) VALUES (p_book_id, p_author_ids(i));
    END LOOP;
    COMMIT;
    DBMS_OUTPUT.PUT_LINE('Book added successfully with ID: ' || p_book_id);
EXCEPTION
    WHEN OTHERS THEN ROLLBACK; RAISE;
END add_book;
/

-- 4. Borrow Book Procedure
CREATE OR REPLACE PROCEDURE borrow_book(
    p_user_id IN NUMBER,
    p_book_id IN NUMBER,
    p_processed_by IN NUMBER,
    p_transaction_id OUT NUMBER
) AS
    v_available_copies NUMBER;
    v_user_current_books NUMBER;
    v_user_max_books NUMBER;
    v_user_status VARCHAR2(20);
    v_book_status VARCHAR2(20);
    v_due_date DATE;
    v_borrow_period NUMBER := 14;
BEGIN
    SELECT current_books_borrowed, max_books_allowed, status INTO v_user_current_books, v_user_max_books, v_user_status FROM users WHERE user_id = p_user_id;
    IF v_user_status != 'ACTIVE' THEN RAISE_APPLICATION_ERROR(-20004, 'User account is not active'); END IF;
    IF v_user_current_books >= v_user_max_books THEN RAISE_APPLICATION_ERROR(-20005, 'User has reached maximum borrowing limit'); END IF;
    SELECT available_copies, status INTO v_available_copies, v_book_status FROM books WHERE book_id = p_book_id;
    IF v_book_status != 'AVAILABLE' THEN RAISE_APPLICATION_ERROR(-20006, 'Book is not available for borrowing'); END IF;
    IF v_available_copies <= 0 THEN RAISE_APPLICATION_ERROR(-20007, 'No copies available for borrowing'); END IF;
    SELECT SYSDATE + v_borrow_period INTO v_due_date FROM DUAL;
    UPDATE books SET available_copies = available_copies - 1 WHERE book_id = p_book_id;
    UPDATE users SET current_books_borrowed = current_books_borrowed + 1 WHERE user_id = p_user_id;
    COMMIT;
    DBMS_OUTPUT.PUT_LINE('Book borrowed successfully. Due Date: ' || v_due_date);
EXCEPTION
    WHEN OTHERS THEN ROLLBACK; RAISE;
END borrow_book;
/

-- 5. Return Book Procedure
CREATE OR REPLACE PROCEDURE return_book(
    p_transaction_id IN NUMBER,
    p_processed_by IN NUMBER,
    p_condition IN VARCHAR2 DEFAULT 'GOOD'
) AS
    v_user_id NUMBER;
    v_book_id NUMBER;
    v_due_date DATE;
    v_days_overdue NUMBER;
    v_fine_amount NUMBER := 0;
    v_daily_fine_rate NUMBER := 1;
    v_transaction_status VARCHAR2(20);
BEGIN
    v_days_overdue := GREATEST(0, TRUNC(SYSDATE) - TRUNC(v_due_date));
    IF v_days_overdue > 0 THEN v_fine_amount := v_days_overdue * v_daily_fine_rate; END IF;
    IF v_fine_amount > 0 THEN
        INSERT INTO fines (fine_id, user_id, fine_type, amount, description)
        VALUES (fines_seq.NEXTVAL, v_user_id, 'OVERDUE', v_fine_amount, 'Overdue fine for ' || v_days_overdue || ' days');
    END IF;
    UPDATE books SET available_copies = available_copies + 1 WHERE book_id = v_book_id;
    UPDATE users SET current_books_borrowed = current_books_borrowed - 1, total_fines = total_fines + v_fine_amount WHERE user_id = v_user_id;
    COMMIT;
    DBMS_OUTPUT.PUT_LINE('Book returned successfully. Fine amount: $' || v_fine_amount);
EXCEPTION
    WHEN OTHERS THEN ROLLBACK; RAISE;
END return_book;
/

-- 6. Book Availability Validation Trigger
CREATE OR REPLACE TRIGGER trg_books_availability_check
    BEFORE UPDATE ON books
    FOR EACH ROW
BEGIN
    IF :NEW.available_copies > :NEW.total_copies THEN
        RAISE_APPLICATION_ERROR(-20009, 'Available copies cannot exceed total copies');
    END IF;
    IF :NEW.available_copies < 0 THEN
        RAISE_APPLICATION_ERROR(-20010, 'Available copies cannot be negative');
    END IF;
END;
/

-- 7. Reservation Auto-Fulfill Trigger
CREATE OR REPLACE TRIGGER trg_auto_fulfill_reservation
    AFTER UPDATE ON books
    FOR EACH ROW
    WHEN (NEW.available_copies > OLD.available_copies)
DECLARE
    v_reservation_id NUMBER;
    v_user_id NUMBER;
    v_reservation_count NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_reservation_count FROM reservations WHERE book_id = :NEW.book_id AND status = 'PENDING';
    IF v_reservation_count > 0 THEN
        SELECT reservation_id, user_id INTO v_reservation_id, v_user_id FROM (
            SELECT reservation_id, user_id FROM reservations WHERE book_id = :NEW.book_id AND status = 'PENDING' ORDER BY reservation_date ASC
        ) WHERE ROWNUM = 1;
        UPDATE reservations SET status = 'FULFILLED', notified = 'YES' WHERE reservation_id = v_reservation_id;
        DBMS_OUTPUT.PUT_LINE('Reservation fulfilled for user: ' || v_user_id);
    END IF;
END;
/

-- 8. Fine Calculation Function
CREATE OR REPLACE FUNCTION calculate_fine(
    p_due_date IN DATE,
    p_return_date IN DATE DEFAULT SYSDATE,
    p_daily_rate IN NUMBER DEFAULT 1
) RETURN NUMBER AS
    v_days_overdue NUMBER;
    v_fine_amount NUMBER;
BEGIN
    v_days_overdue := GREATEST(0, TRUNC(p_return_date) - TRUNC(p_due_date));
    v_fine_amount := v_days_overdue * p_daily_rate;
    RETURN v_fine_amount;
END calculate_fine;
/

-- 9. Book Availability Check Function
CREATE OR REPLACE FUNCTION is_book_available(
    p_book_id IN NUMBER
) RETURN BOOLEAN AS
    v_available_copies NUMBER;
    v_book_status VARCHAR2(20);
BEGIN
    SELECT available_copies, status INTO v_available_copies, v_book_status FROM books WHERE book_id = p_book_id;
    RETURN (v_available_copies > 0 AND v_book_status = 'AVAILABLE');
EXCEPTION
    WHEN NO_DATA_FOUND THEN RETURN FALSE;
END is_book_available;
/

-- 10. User Eligibility Check Function
CREATE OR REPLACE FUNCTION is_user_eligible_to_borrow(
    p_user_id IN NUMBER
) RETURN BOOLEAN AS
    v_current_books NUMBER;
    v_max_books NUMBER;
    v_user_status VARCHAR2(20);
    v_total_fines NUMBER;
    v_max_fine_limit NUMBER := 50;
BEGIN
    SELECT current_books_borrowed, max_books_allowed, status, total_fines INTO v_current_books, v_max_books, v_user_status, v_total_fines FROM users WHERE user_id = p_user_id;
    RETURN (
        v_user_status = 'ACTIVE' AND
        v_current_books < v_max_books AND
        v_total_fines < v_max_fine_limit
    );
EXCEPTION
    WHEN NO_DATA_FOUND THEN RETURN FALSE;
END is_user_eligible_to_borrow;
/
