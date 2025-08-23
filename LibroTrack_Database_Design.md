# LibroTrack Library Management System - Database Design Document

## Project Overview

LibroTrack is a comprehensive library management system designed with a backend-heavy architecture focusing on Oracle Database with Express.js. The system emphasizes core database concepts including PL/SQL, triggers, functions, and procedures.

## Key Features Implementation Flow

### 1. User Registration & Authentication

- **Database Flow**: User data validation → Password hashing → Account creation → Email verification trigger
- **PL/SQL Components**: User creation procedure, password validation function, email trigger

### 2. Book Management

- **Database Flow**: Book addition → ISBN validation → Category assignment → Availability tracking
- **PL/SQL Components**: Book insertion procedure, ISBN validation function, inventory triggers

### 3. Borrowing System

- **Database Flow**: Availability check → User eligibility → Transaction creation → Due date calculation
- **PL/SQL Components**: Borrowing procedure, eligibility function, due date calculation, automatic notifications

### 4. Return Processing

- **Database Flow**: Book return → Fine calculation → Inventory update → User record update
- **PL/SQL Components**: Return procedure, fine calculation function, inventory triggers

### 5. Administrative Controls

- **Database Flow**: User management → System monitoring → Report generation → Data maintenance
- **PL/SQL Components**: Admin procedures, reporting functions, system maintenance jobs

---

## Database Schema Design

### Core Tables

#### 1. USERS Table

```sql
CREATE TABLE users (
    user_id NUMBER PRIMARY KEY,
    username VARCHAR2(50) UNIQUE NOT NULL,
    email VARCHAR2(100) UNIQUE NOT NULL,
    password_hash VARCHAR2(255) NOT NULL,
    first_name VARCHAR2(50) NOT NULL,
    last_name VARCHAR2(50) NOT NULL,
    phone VARCHAR2(15),
    address VARCHAR2(200),
    user_type VARCHAR2(20) DEFAULT 'MEMBER' CHECK (user_type IN ('MEMBER', 'LIBRARIAN', 'ADMIN')),
    status VARCHAR2(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'INACTIVE')),
    registration_date DATE DEFAULT SYSDATE,
    max_books_allowed NUMBER DEFAULT 3,
    current_books_borrowed NUMBER DEFAULT 0,
    total_fines NUMBER(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sequence for user_id
CREATE SEQUENCE users_seq START WITH 1 INCREMENT BY 1;
```

#### 2. CATEGORIES Table

```sql
CREATE TABLE categories (
    category_id NUMBER PRIMARY KEY,
    category_name VARCHAR2(50) UNIQUE NOT NULL,
    description VARCHAR2(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sequence for category_id
CREATE SEQUENCE categories_seq START WITH 1 INCREMENT BY 1;
```

#### 3. AUTHORS Table

```sql
CREATE TABLE authors (
    author_id NUMBER PRIMARY KEY,
    first_name VARCHAR2(50) NOT NULL,
    last_name VARCHAR2(50) NOT NULL
);

-- Sequence for author_id
CREATE SEQUENCE authors_seq START WITH 1 INCREMENT BY 1;
```

#### 4. BOOKS Table

```sql
CREATE TABLE books (
    book_id NUMBER PRIMARY KEY,
    isbn VARCHAR2(20) UNIQUE NOT NULL,
    title VARCHAR2(200) NOT NULL,
    category_id NUMBER NOT NULL,
    publication_year NUMBER(4),
    publisher VARCHAR2(100),
    language VARCHAR2(50) DEFAULT 'English',
    description CLOB,
    location_shelf VARCHAR2(20),
    total_copies NUMBER DEFAULT 1,
    available_copies NUMBER DEFAULT 1,
    reserved_copies NUMBER DEFAULT 0,
    status VARCHAR2(20) DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'NOT_AVAILABLE')),
    added_date DATE DEFAULT SYSDATE,
    CONSTRAINT fk_books_category FOREIGN KEY (category_id) REFERENCES categories(category_id),
    CONSTRAINT chk_copies CHECK (available_copies <= total_copies),
    CONSTRAINT chk_positive_copies CHECK (total_copies > 0 AND available_copies >= 0)
);

-- Sequence for book_id
CREATE SEQUENCE books_seq START WITH 1 INCREMENT BY 1;
```

#### 5. BOOK_AUTHORS (Many-to-Many Relationship)

```sql
CREATE TABLE book_authors (
    book_id NUMBER,
    author_id NUMBER,
    PRIMARY KEY (book_id, author_id),
    CONSTRAINT fk_book_authors_book FOREIGN KEY (book_id) REFERENCES books(book_id) ON DELETE CASCADE,
    CONSTRAINT fk_book_authors_author FOREIGN KEY (author_id) REFERENCES authors(author_id) ON DELETE CASCADE
);
```

<!-- TRANSACTIONS table and related features have been removed as per new requirements. -->

#### 7. RESERVATIONS Table

```sql
CREATE TABLE reservations (
    reservation_id NUMBER PRIMARY KEY,
    user_id NUMBER NOT NULL,
    book_id NUMBER NOT NULL,
    reservation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expiry_date DATE,
    status VARCHAR2(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'FULFILLED', 'EXPIRED', 'CANCELLED')),
    priority_level NUMBER DEFAULT 1,
    notified VARCHAR2(10) DEFAULT 'NO' CHECK (notified IN ('YES', 'NO')),
    CONSTRAINT fk_reservations_user FOREIGN KEY (user_id) REFERENCES users(user_id),
    CONSTRAINT fk_reservations_book FOREIGN KEY (book_id) REFERENCES books(book_id),
    CONSTRAINT uq_active_reservation UNIQUE (user_id, book_id, status)
);

-- Sequence for reservation_id
CREATE SEQUENCE reservations_seq START WITH 1 INCREMENT BY 1;
```

#### 6. FINES Table (Redesigned)

```sql
CREATE TABLE fines (
    fine_id NUMBER PRIMARY KEY,
    user_id NUMBER NOT NULL,
    fine_type VARCHAR2(50) NOT NULL CHECK (fine_type IN ('OVERDUE', 'DAMAGE', 'LOST', 'OTHER')),
    amount NUMBER(10,2) NOT NULL,
    description VARCHAR2(200),
    fine_date DATE DEFAULT SYSDATE,
    due_date DATE,
    paid_amount NUMBER(10,2) DEFAULT 0,
    payment_date DATE,
    status VARCHAR2(20) DEFAULT 'UNPAID' CHECK (status IN ('UNPAID', 'PAID')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_fines_user FOREIGN KEY (user_id) REFERENCES users(user_id),
    CONSTRAINT chk_fine_amounts CHECK (amount > 0 AND paid_amount >= 0 AND paid_amount <= amount)
);

-- Sequence for fine_id
CREATE SEQUENCE fines_seq START WITH 1 INCREMENT BY 1;
```

---

## PL/SQL Procedures and Functions

### 1. User Management Procedures

#### User Registration Procedure

```sql
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
    -- Check if username or email already exists
    SELECT COUNT(*) INTO v_existing_count
    FROM users
    WHERE username = p_username OR email = p_email;

    IF v_existing_count > 0 THEN
        RAISE_APPLICATION_ERROR(-20001, 'Username or email already exists');
    END IF;

    -- Hash password (simplified - in real implementation use proper hashing)
    v_password_hash := UPPER(UTL_RAW.CAST_TO_RAW(DBMS_OBFUSCATION_TOOLKIT.MD5(INPUT_STRING => p_password)));

    -- Generate new user ID
    SELECT users_seq.NEXTVAL INTO p_user_id FROM DUAL;

    -- Insert new user
    INSERT INTO users (
        user_id, username, email, password_hash, first_name, last_name, phone, address
    ) VALUES (
        p_user_id, p_username, p_email, v_password_hash, p_first_name, p_last_name, p_phone, p_address
    );

    COMMIT;

    DBMS_OUTPUT.PUT_LINE('User registered successfully with ID: ' || p_user_id);
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        RAISE;
END register_user;
```

#### Password Validation Function

```sql
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

    -- Check minimum length
    IF v_length < 8 THEN
        RETURN FALSE;
    END IF;

    -- Check for character types
    FOR i IN 1..v_length LOOP
        DECLARE
            v_char VARCHAR2(1) := SUBSTR(p_password, i, 1);
        BEGIN
            IF ASCII(v_char) BETWEEN 65 AND 90 THEN -- Uppercase
                v_has_upper := TRUE;
            ELSIF ASCII(v_char) BETWEEN 97 AND 122 THEN -- Lowercase
                v_has_lower := TRUE;
            ELSIF ASCII(v_char) BETWEEN 48 AND 57 THEN -- Digit
                v_has_digit := TRUE;
            ELSIF v_char IN ('!', '@', '#', '$', '%', '^', '&', '*') THEN -- Special
                v_has_special := TRUE;
            END IF;
        END;
    END LOOP;

    RETURN (v_has_upper AND v_has_lower AND v_has_digit AND v_has_special);
END validate_password;
```

### 2. Book Management Procedures

#### Add Book Procedure

```sql
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
    -- Check if ISBN already exists
    SELECT COUNT(*) INTO v_existing_count
    FROM books
    WHERE isbn = p_isbn;

    IF v_existing_count > 0 THEN
        RAISE_APPLICATION_ERROR(-20002, 'Book with this ISBN already exists');
    END IF;

    -- Validate category exists
    SELECT COUNT(*) INTO v_existing_count
    FROM categories
    WHERE category_id = p_category_id;

    IF v_existing_count = 0 THEN
        RAISE_APPLICATION_ERROR(-20003, 'Invalid category ID');
    END IF;

    -- Generate new book ID
    SELECT books_seq.NEXTVAL INTO p_book_id FROM DUAL;

    -- Insert book
    INSERT INTO books (
        book_id, isbn, title, category_id, publication_year, publisher,
        total_copies, available_copies
    ) VALUES (
        p_book_id, p_isbn, p_title, p_category_id, p_publication_year, p_publisher,
        p_total_copies, p_total_copies
    );

    -- Insert book-author relationships
    FOR i IN 1..p_author_ids.COUNT LOOP
        INSERT INTO book_authors (book_id, author_id)
        VALUES (p_book_id, p_author_ids(i));
    END LOOP;

    COMMIT;

    DBMS_OUTPUT.PUT_LINE('Book added successfully with ID: ' || p_book_id);
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        RAISE;
END add_book;
```

### 3. Borrowing System Procedures

#### Borrow Book Procedure

```sql
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
    v_borrow_period NUMBER := 14; -- Default 14 days
BEGIN
    -- Check user status and borrowing limits
    SELECT current_books_borrowed, max_books_allowed, status
    INTO v_user_current_books, v_user_max_books, v_user_status
    FROM users
    WHERE user_id = p_user_id;

    IF v_user_status != 'ACTIVE' THEN
        RAISE_APPLICATION_ERROR(-20004, 'User account is not active');
    END IF;

    IF v_user_current_books >= v_user_max_books THEN
        RAISE_APPLICATION_ERROR(-20005, 'User has reached maximum borrowing limit');
    END IF;

    -- Check book availability
    SELECT available_copies, status
    INTO v_available_copies, v_book_status
    FROM books
    WHERE book_id = p_book_id;

    IF v_book_status != 'AVAILABLE' THEN
        RAISE_APPLICATION_ERROR(-20006, 'Book is not available for borrowing');
    END IF;

    IF v_available_copies <= 0 THEN
        RAISE_APPLICATION_ERROR(-20007, 'No copies available for borrowing');
    END IF;

    -- Calculate due date
    SELECT SYSDATE + v_borrow_period INTO v_due_date FROM DUAL;


    -- Update book availability
    UPDATE books
    SET available_copies = available_copies - 1
    WHERE book_id = p_book_id;

    -- Update user's current books count
    UPDATE users
    SET current_books_borrowed = current_books_borrowed + 1
    WHERE user_id = p_user_id;

    COMMIT;

    DBMS_OUTPUT.PUT_LINE('Book borrowed successfully. Due Date: ' || v_due_date);
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        RAISE;
END borrow_book;
```

#### Return Book Procedure

```sql
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
    v_daily_fine_rate NUMBER := 1; -- $1 per day
    v_transaction_status VARCHAR2(20);
BEGIN

    -- Calculate overdue fine
    v_days_overdue := GREATEST(0, TRUNC(SYSDATE) - TRUNC(v_due_date));
    IF v_days_overdue > 0 THEN
        v_fine_amount := v_days_overdue * v_daily_fine_rate;
    END IF;

    -- Create fine record if applicable
    IF v_fine_amount > 0 THEN
        INSERT INTO fines (
            fine_id, user_id, fine_type, amount, description
        ) VALUES (
            fines_seq.NEXTVAL, v_user_id, 'OVERDUE',
            v_fine_amount, 'Overdue fine for ' || v_days_overdue || ' days'
        );
    END IF;

    -- Update book availability
    UPDATE books
    SET available_copies = available_copies + 1
    WHERE book_id = v_book_id;

    -- Update user's current books count
    UPDATE users
    SET current_books_borrowed = current_books_borrowed - 1,
        total_fines = total_fines + v_fine_amount
    WHERE user_id = v_user_id;

    COMMIT;

    DBMS_OUTPUT.PUT_LINE('Book returned successfully. Fine amount: $' || v_fine_amount);
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        RAISE;
END return_book;
```

---

## Database Triggers

### 1. User Management Triggers

#### Update User Timestamp Trigger

```sql
-- No longer needed since updated_at field was removed
-- Users table now only has created_at timestamp
```

### 2. Book Management Triggers

#### Book Availability Validation Trigger

```sql
CREATE OR REPLACE TRIGGER trg_books_availability_check
    BEFORE UPDATE ON books
    FOR EACH ROW
BEGIN
    -- Ensure available copies don't exceed total copies
    IF :NEW.available_copies > :NEW.total_copies THEN
        RAISE_APPLICATION_ERROR(-20009, 'Available copies cannot exceed total copies');
    END IF;

    -- Ensure available copies are not negative
    IF :NEW.available_copies < 0 THEN
        RAISE_APPLICATION_ERROR(-20010, 'Available copies cannot be negative');
    END IF;
END;
```

<!-- Transaction management triggers removed as transactions table is no longer present. -->

#### Reservation Auto-Fulfill Trigger

```sql
CREATE OR REPLACE TRIGGER trg_auto_fulfill_reservation
    AFTER UPDATE ON books
    FOR EACH ROW
    WHEN (NEW.available_copies > OLD.available_copies)
DECLARE
    v_reservation_id NUMBER;
    v_user_id NUMBER;
    v_reservation_count NUMBER;
BEGIN
    -- Check if there are pending reservations for this book
    SELECT COUNT(*) INTO v_reservation_count
    FROM reservations
    WHERE book_id = :NEW.book_id AND status = 'PENDING';

    IF v_reservation_count > 0 THEN
        -- Get the oldest pending reservation
        SELECT reservation_id, user_id INTO v_reservation_id, v_user_id
        FROM (
            SELECT reservation_id, user_id
            FROM reservations
            WHERE book_id = :NEW.book_id AND status = 'PENDING'
            ORDER BY reservation_date ASC
        ) WHERE ROWNUM = 1;

        -- Update reservation status
        UPDATE reservations
        SET status = 'FULFILLED',
            notified = 'YES'
        WHERE reservation_id = v_reservation_id;

        DBMS_OUTPUT.PUT_LINE('Reservation fulfilled for user: ' || v_user_id);
    END IF;
END;
```

---

## Utility Functions

### 1. Fine Calculation Function

```sql
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
```

### 2. Book Availability Check Function

```sql
CREATE OR REPLACE FUNCTION is_book_available(
    p_book_id IN NUMBER
) RETURN BOOLEAN AS
    v_available_copies NUMBER;
    v_book_status VARCHAR2(20);
BEGIN
    SELECT available_copies, status
    INTO v_available_copies, v_book_status
    FROM books
    WHERE book_id = p_book_id;

    RETURN (v_available_copies > 0 AND v_book_status = 'AVAILABLE');
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RETURN FALSE;
END is_book_available;
```

### 3. User Eligibility Check Function

```sql
CREATE OR REPLACE FUNCTION is_user_eligible_to_borrow(
    p_user_id IN NUMBER
) RETURN BOOLEAN AS
    v_current_books NUMBER;
    v_max_books NUMBER;
    v_user_status VARCHAR2(20);
    v_total_fines NUMBER;
    v_max_fine_limit NUMBER := 50; -- Maximum allowed unpaid fines
BEGIN
    SELECT current_books_borrowed, max_books_allowed, status, total_fines
    INTO v_current_books, v_max_books, v_user_status, v_total_fines
    FROM users
    WHERE user_id = p_user_id;

    RETURN (
        v_user_status = 'ACTIVE' AND
        v_current_books < v_max_books AND
        v_total_fines < v_max_fine_limit
    );
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RETURN FALSE;
END is_user_eligible_to_borrow;
```

---

## Reporting Views

### 1. User Activity Summary View

```sql
CREATE OR REPLACE VIEW vw_user_activity_summary AS
SELECT
    u.user_id,
    u.username,
    u.first_name || ' ' || u.last_name AS full_name,
    u.current_books_borrowed,
    u.total_fines,
    -- Transaction-related columns and joins removed due to schema update.
FROM users u
GROUP BY u.user_id, u.username, u.first_name, u.last_name, u.current_books_borrowed, u.total_fines;
```

### 2. Book Popularity View

```sql
CREATE OR REPLACE VIEW vw_book_popularity AS
SELECT
    b.book_id,
    b.title,
    b.isbn,
    c.category_name,
    COUNT(r.reservation_id) AS total_reservations
FROM books b
LEFT JOIN reservations r ON b.book_id = r.book_id
JOIN categories c ON b.category_id = c.category_id
GROUP BY b.book_id, b.title, b.isbn, c.category_name, b.added_date
ORDER BY b.title ASC;
```

<!-- Overdue books view removed as it depended on transactions table. -->

---

## Initial Data Setup

### Categories Data

```sql
-- Insert book categories
INSERT INTO categories (category_id, category_name, description) VALUES
(categories_seq.NEXTVAL, 'Fiction', 'Fictional literature and novels');

INSERT INTO categories (category_id, category_name, description) VALUES
(categories_seq.NEXTVAL, 'Non-Fiction', 'Factual and educational books');

INSERT INTO categories (category_id, category_name, description) VALUES
(categories_seq.NEXTVAL, 'Science', 'Scientific and technical books');

INSERT INTO categories (category_id, category_name, description) VALUES
(categories_seq.NEXTVAL, 'History', 'Historical books and biographies');

INSERT INTO categories (category_id, category_name, description) VALUES
(categories_seq.NEXTVAL, 'Technology', 'Computer science and technology books');
```

---

## Scheduled Jobs and Maintenance

### 1. Daily Overdue Check Job

```sql
BEGIN
    DBMS_SCHEDULER.CREATE_JOB(
        job_name        => 'DAILY_OVERDUE_CHECK',
        job_type        => 'PLSQL_BLOCK',
        job_action      => 'BEGIN
                              UPDATE transactions
                              SET status = ''OVERDUE''
                              WHERE transaction_type = ''BORROW''
                                AND status = ''ACTIVE''
                                AND SYSDATE > due_date;
                              COMMIT;
                            END;',
        start_date      => SYSTIMESTAMP,
        repeat_interval => 'FREQ=DAILY; BYHOUR=1',
        enabled         => TRUE,
        comments        => 'Daily job to update overdue book status'
    );
END;
```

### 2. Weekly Reservation Cleanup Job

```sql
BEGIN
    DBMS_SCHEDULER.CREATE_JOB(
        job_name        => 'WEEKLY_RESERVATION_CLEANUP',
        job_type        => 'PLSQL_BLOCK',
        job_action      => 'BEGIN
                              UPDATE reservations
                              SET status = ''EXPIRED''
                              WHERE status = ''PENDING''
                                AND SYSDATE > expiry_date;
                              COMMIT;
                            END;',
        start_date      => SYSTIMESTAMP,
        repeat_interval => 'FREQ=WEEKLY; BYDAY=SUN; BYHOUR=2',
        enabled         => TRUE,
        comments        => 'Weekly job to clean up expired reservations'
    );
END;
```

---

## Performance Indexes

```sql
-- User management indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);

-- Book management indexes
CREATE INDEX idx_books_isbn ON books(isbn);
CREATE INDEX idx_books_title ON books(title);
CREATE INDEX idx_books_category ON books(category_id);
CREATE INDEX idx_books_status ON books(status);


-- Transaction indexes removed.

-- Reservation indexes
CREATE INDEX idx_reservations_user ON reservations(user_id);
CREATE INDEX idx_reservations_book ON reservations(book_id);
CREATE INDEX idx_reservations_status ON reservations(status);

-- Fine indexes
CREATE INDEX idx_fines_user ON fines(user_id);
CREATE INDEX idx_fines_status ON fines(status);
```

---

## Key Feature Implementation Flow Summary

### 1. User Registration Flow

**Database Components:**

- `register_user()` procedure validates and creates user accounts
- `validate_password()` function ensures password strength
- Password hashing implemented in registration procedure

### 2. Book Management Flow

**Database Components:**

- `add_book()` procedure handles book insertion with author relationships
- `trg_books_availability_check` trigger validates book data integrity
- Automatic ISBN validation and duplicate prevention
- Multi-author support through `book_authors` junction table

### 3. Borrowing System Flow

**Database Components:**

- `borrow_book()` procedure manages complete borrowing workflow
- `is_user_eligible_to_borrow()` function validates user eligibility
- `is_book_available()` function checks book availability
- Automatic due date calculation and transaction logging

### 4. Return Processing Flow

**Database Components:**

- `return_book()` procedure handles returns with fine calculation
- `calculate_fine()` function computes overdue penalties
- `trg_auto_fulfill_reservation` trigger automatically processes waiting reservations
- Comprehensive fine tracking and user balance updates

### 5. Administrative Features Flow

**Database Components:**

- Automated maintenance jobs for overdue checking and cleanup
- Rich reporting views for management insights

This database design provides a robust foundation for the LibroTrack system with extensive use of PL/SQL procedures, functions, and triggers to implement business logic at the database level, ensuring data integrity and optimal performance.
