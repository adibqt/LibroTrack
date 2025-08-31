-- Recompile PKG_LOANS to compute overdue fines at return time using PKG_FINES
-- Fine rule: 10 per day of lateness (days late = TRUNC(SYSDATE) - TRUNC(due_date))

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
    v_days_late NUMBER;
    v_amount NUMBER;
    v_dummy NUMBER;
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

    -- Overdue fine: 10 per day late
    v_days_late := GREATEST(TRUNC(SYSDATE) - TRUNC(v_due), 0);
    v_amount := 10 * v_days_late;
    IF v_amount > 0 THEN
      PKG_FINES.assess_fine(p_user_id => v_user, p_amount => v_amount, p_fine_type => 'OVERDUE', p_fine_id => v_dummy);
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
