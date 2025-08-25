-- LibroTrack DB Schema: Authors, Categories, Books, Book_Authors

-- Authors Table
CREATE TABLE authors (
    author_id NUMBER PRIMARY KEY,
    first_name VARCHAR2(50) NOT NULL,
    last_name VARCHAR2(50) NOT NULL
);
CREATE SEQUENCE authors_seq START WITH 1 INCREMENT BY 1;

-- Categories Table
CREATE TABLE categories (
    category_id NUMBER PRIMARY KEY,
    category_name VARCHAR2(50) UNIQUE NOT NULL,
    description VARCHAR2(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE SEQUENCE categories_seq START WITH 1 INCREMENT BY 1;

-- Books Table
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

-- Book_Authors Table (Junction)
CREATE TABLE book_authors (
    book_id NUMBER,
    author_id NUMBER,
    PRIMARY KEY (book_id, author_id),
    CONSTRAINT fk_book_authors_book FOREIGN KEY (book_id) REFERENCES books(book_id) ON DELETE CASCADE,
    CONSTRAINT fk_book_authors_author FOREIGN KEY (author_id) REFERENCES authors(author_id) ON DELETE CASCADE
);
