-- PKG_REPORTS: Reporting procedures for book popularity, member activity, and fines summary

CREATE OR REPLACE PACKAGE PKG_REPORTS AS
  -- Get most popular books (by number of loans)
  PROCEDURE get_popular_books(p_result OUT SYS_REFCURSOR);

  -- Get member activity (number of loans, reservations, fines per member)
  PROCEDURE get_member_activity(p_result OUT SYS_REFCURSOR);

  -- Get fines summary (total fines, paid, unpaid, waived)
  PROCEDURE get_fines_summary(p_result OUT SYS_REFCURSOR);
END PKG_REPORTS;
/
