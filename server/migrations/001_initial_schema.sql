-- 001_initial_schema.sql
-- Initial schema for LibroTrack

-- USERS Table
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

CREATE SEQUENCE users_seq START WITH 1 INCREMENT BY 1;

-- CATEGORIES Table
CREATE TABLE categories (
    category_id NUMBER PRIMARY KEY,
    category_name VARCHAR2(50) UNIQUE NOT NULL,
    description VARCHAR2(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE SEQUENCE categories_seq START WITH 1 INCREMENT BY 1;

-- AUTHORS Table
CREATE TABLE authors (
    author_id NUMBER PRIMARY KEY,
    first_name VARCHAR2(50) NOT NULL,
    last_name VARCHAR2(50) NOT NULL
);

CREATE SEQUENCE authors_seq START WITH 1 INCREMENT BY 1;

-- BOOKS Table
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

CREATE SEQUENCE books_seq START WITH 1 INCREMENT BY 1;

-- BOOK_AUTHORS Table
CREATE TABLE book_authors (
    book_id NUMBER,
    author_id NUMBER,
    PRIMARY KEY (book_id, author_id),
    CONSTRAINT fk_book_authors_book FOREIGN KEY (book_id) REFERENCES books(book_id) ON DELETE CASCADE,
    CONSTRAINT fk_book_authors_author FOREIGN KEY (author_id) REFERENCES authors(author_id) ON DELETE CASCADE
);

-- RESERVATIONS Table
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

CREATE SEQUENCE reservations_seq START WITH 1 INCREMENT BY 1;

-- FINES Table
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

CREATE SEQUENCE fines_seq START WITH 1 INCREMENT BY 1;
