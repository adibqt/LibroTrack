-- PKG_REPORTS Body: Reporting procedures for book popularity, member activity, and fines summary

CREATE OR REPLACE PACKAGE BODY PKG_REPORTS AS
  -- Most popular books by number of loans
  PROCEDURE get_popular_books(p_result OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_result FOR
      SELECT b.book_id, b.title, COUNT(l.loan_id) AS loan_count
      FROM books b
      LEFT JOIN loans l ON b.book_id = l.book_id
      GROUP BY b.book_id, b.title
      ORDER BY loan_count DESC, b.title;
  END get_popular_books;

  -- Member activity: number of loans, reservations, fines per member
  PROCEDURE get_member_activity(p_result OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_result FOR
      SELECT u.user_id, u.username, u.first_name, u.last_name,
        (SELECT COUNT(*) FROM loans l WHERE l.user_id = u.user_id) AS loan_count,
        (SELECT COUNT(*) FROM reservations r WHERE r.user_id = u.user_id) AS reservation_count,
        (SELECT COUNT(*) FROM fines f WHERE f.user_id = u.user_id) AS fine_count
      FROM users u;
  END get_member_activity;

  -- Fines summary: total, paid, unpaid, waived
  PROCEDURE get_fines_summary(p_result OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_result FOR
      SELECT
        COUNT(*) AS total_fines,
        SUM(CASE WHEN status = 'PAID' THEN 1 ELSE 0 END) AS paid_fines,
        SUM(CASE WHEN status = 'UNPAID' THEN 1 ELSE 0 END) AS unpaid_fines,
        SUM(CASE WHEN status = 'WAIVED' THEN 1 ELSE 0 END) AS waived_fines,
        NVL(SUM(amount),0) AS total_amount,
        NVL(SUM(CASE WHEN status = 'PAID' THEN amount ELSE 0 END),0) AS paid_amount,
        NVL(SUM(CASE WHEN status = 'UNPAID' THEN amount ELSE 0 END),0) AS unpaid_amount,
        NVL(SUM(CASE WHEN status = 'WAIVED' THEN amount ELSE 0 END),0) AS waived_amount
      FROM fines;
  END get_fines_summary;
END PKG_REPORTS;
/
