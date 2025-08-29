-- Loans table
CREATE TABLE loans (
  loan_id     NUMBER PRIMARY KEY,
  user_id     NUMBER NOT NULL,
  book_id     NUMBER NOT NULL,
  issue_date  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  due_date    DATE NOT NULL,
  return_date DATE,
  status      VARCHAR2(20) DEFAULT 'ISSUED' CHECK (status IN ('ISSUED','RETURNED','LOST')),
  CONSTRAINT fk_loans_user FOREIGN KEY (user_id) REFERENCES users(user_id),
  CONSTRAINT fk_loans_book FOREIGN KEY (book_id) REFERENCES books(book_id)
);

CREATE SEQUENCE loans_seq START WITH 1 INCREMENT BY 1;

CREATE INDEX idx_loans_user_status ON loans(user_id, status);
CREATE INDEX idx_loans_book_status ON loans(book_id, status);

-- Orchestration package (uses PKG_STOCK). Exposes a flag that triggers inspect.
CREATE OR REPLACE PACKAGE PKG_LOANS AS
  g_in_proc BOOLEAN := FALSE;

  PROCEDURE issue_book(
    p_user_id IN NUMBER,
    p_book_id IN NUMBER,
    p_due_days IN NUMBER DEFAULT 14,
    p_loan_id OUT NUMBER
  );

  PROCEDURE return_book(
    p_loan_id IN NUMBER
  );
END PKG_LOANS;
/

CREATE OR REPLACE PACKAGE BODY PKG_LOANS AS
  PROCEDURE issue_book(
    p_user_id IN NUMBER,
    p_book_id IN NUMBER,
    p_due_days IN NUMBER DEFAULT 14,
    p_loan_id OUT NUMBER
  ) IS
    v_max   NUMBER;
    v_curr  NUMBER;
    v_stat  VARCHAR2(20);
  BEGIN
    g_in_proc := TRUE;

    -- Validate user allowance
    SELECT max_books_allowed, current_books_borrowed, status
      INTO v_max, v_curr, v_stat
    FROM users
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF v_stat <> 'ACTIVE' THEN
      RAISE_APPLICATION_ERROR(-20030, 'User is not active');
    END IF;

    IF v_curr >= v_max THEN
      RAISE_APPLICATION_ERROR(-20031, 'Borrow limit reached');
    END IF;

    -- Decrement stock (raises if none available)
    PKG_STOCK.checkout_copy(p_book_id => p_book_id, p_user_id => p_user_id);

    -- Create loan
    SELECT loans_seq.NEXTVAL INTO p_loan_id FROM dual;
    INSERT INTO loans (loan_id, user_id, book_id, issue_date, due_date, status)
    VALUES (p_loan_id, p_user_id, p_book_id, SYSTIMESTAMP, SYSDATE + NVL(p_due_days, 14), 'ISSUED');

    -- Track user's count
  UPDATE users SET current_books_borrowed = current_books_borrowed + 1
  WHERE user_id = p_user_id;

    COMMIT;
    g_in_proc := FALSE;
  EXCEPTION
    WHEN OTHERS THEN
      g_in_proc := FALSE;
      RAISE;
  END issue_book;

  PROCEDURE return_book(
    p_loan_id IN NUMBER
  ) IS
    v_user NUMBER;
    v_book NUMBER;
    v_status VARCHAR2(20);
    v_due DATE;
  BEGIN
    g_in_proc := TRUE;

    SELECT user_id, book_id, status, due_date
      INTO v_user, v_book, v_status, v_due
    FROM loans
    WHERE loan_id = p_loan_id
    FOR UPDATE;

    IF v_status <> 'ISSUED' THEN
      RAISE_APPLICATION_ERROR(-20032, 'Loan is not in ISSUED status');
    END IF;

    -- Increment stock
    PKG_STOCK.checkin_copy(p_book_id => v_book, p_user_id => v_user);

    -- Close loan
  UPDATE loans SET status = 'RETURNED', return_date = SYSDATE
  WHERE loan_id = p_loan_id;

    -- Track user's count
  UPDATE users SET current_books_borrowed = current_books_borrowed - 1
  WHERE user_id = v_user;

    -- Optional overdue fine: 1 per day late
    IF SYSDATE > v_due THEN
      INSERT INTO fines (
        fine_id, user_id, fine_type, amount, description, fine_date, due_date, status
      ) VALUES (
        fines_seq.NEXTVAL, v_user, 'OVERDUE',
        GREATEST(TRUNC(SYSDATE) - TRUNC(v_due), 0),
        'Overdue return',
        SYSDATE, NULL, 'UNPAID'
      );
    END IF;

    COMMIT;
    g_in_proc := FALSE;
  EXCEPTION
    WHEN OTHERS THEN
      g_in_proc := FALSE;
      RAISE;
  END return_book;
END PKG_LOANS;
/

--------------------------------------------------------------------------------
-- Triggers (safety net for direct DML; skipped when PKG_LOANS runs)
--------------------------------------------------------------------------------

-- Normalize loan rows and defaults
CREATE OR REPLACE TRIGGER trg_loans_biu_norm
BEFORE INSERT OR UPDATE OF status ON loans
FOR EACH ROW
BEGIN
  IF INSERTING THEN
    IF :NEW.issue_date IS NULL THEN
      :NEW.issue_date := SYSTIMESTAMP;
    END IF;
    IF :NEW.status IS NULL THEN
      :NEW.status := 'ISSUED';
    END IF;
    IF :NEW.due_date IS NULL THEN
      :NEW.due_date := TRUNC(SYSDATE) + 14;
    END IF;
  END IF;

  -- If marking returned and return_date not provided, set it
  IF UPDATING('status') THEN
    IF :OLD.status = 'ISSUED' AND :NEW.status = 'RETURNED' AND :NEW.return_date IS NULL THEN
      :NEW.return_date := SYSDATE;
    END IF;
    -- Allowed transitions: ISSUED -> RETURNED/LOST; prevent others
    IF :OLD.status = 'ISSUED' AND :NEW.status NOT IN ('RETURNED','LOST') THEN
      RAISE_APPLICATION_ERROR(-20033, 'Invalid status transition');
    END IF;
    IF :OLD.status <> 'ISSUED' AND :NEW.status <> :OLD.status THEN
      RAISE_APPLICATION_ERROR(-20034, 'Loan already closed');
    END IF;
  END IF;
END;
/

-- Stock & user counter on insert (direct DML only)
CREATE OR REPLACE TRIGGER trg_loans_ai_stock_user
AFTER INSERT ON loans
FOR EACH ROW
BEGIN
  IF PKG_LOANS.g_in_proc THEN
    RETURN;
  END IF;

  IF :NEW.status = 'ISSUED' THEN
    PKG_STOCK.checkout_copy(:NEW.book_id, :NEW.user_id);
    UPDATE users SET current_books_borrowed = current_books_borrowed + 1
    WHERE user_id = :NEW.user_id;
  END IF;
END;
/

-- Stock & user counter on status change (direct DML only)
CREATE OR REPLACE TRIGGER trg_loans_au_stock_user
AFTER UPDATE OF status ON loans
FOR EACH ROW
BEGIN
  IF PKG_LOANS.g_in_proc THEN
    RETURN;
  END IF;

  IF :OLD.status = 'ISSUED' AND :NEW.status = 'RETURNED' THEN
    PKG_STOCK.checkin_copy(:NEW.book_id, :NEW.user_id);
    UPDATE users SET current_books_borrowed = current_books_borrowed - 1
    WHERE user_id = :NEW.user_id;
  ELSIF :OLD.status = 'ISSUED' AND :NEW.status = 'LOST' THEN
    -- Consider decrementing user's count; do not adjust stock to keep copy unavailable
    UPDATE users SET current_books_borrowed = current_books_borrowed - 1
    WHERE user_id = :NEW.user_id;
  END IF;
END;
/

-- Guard deletes
CREATE OR REPLACE TRIGGER trg_loans_bd_guard
BEFORE DELETE ON loans
FOR EACH ROW
BEGIN
  IF :OLD.status = 'ISSUED' THEN
    RAISE_APPLICATION_ERROR(-20035, 'Cannot delete active (ISSUED) loans');
  END IF;
END;
/