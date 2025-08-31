-- 015_delete_fully_available_books.sql
-- Deletes all books that are fully available (all copies free and none reserved)
-- along with dependent rows to satisfy FK constraints.
-- Criteria: available_copies = total_copies AND reserved_copies = 0

-- Collect target books
CREATE TABLE TMP_BOOKS_TO_DELETE AS
SELECT book_id
  FROM books
 WHERE available_copies = total_copies
   AND reserved_copies = 0;

-- Remove dependent rows first (FKs without cascade)
DELETE FROM notifications
 WHERE book_id IN (SELECT book_id FROM TMP_BOOKS_TO_DELETE);

DELETE FROM reservations
 WHERE book_id IN (SELECT book_id FROM TMP_BOOKS_TO_DELETE);

DELETE FROM loans
 WHERE book_id IN (SELECT book_id FROM TMP_BOOKS_TO_DELETE);

-- book_authors has ON DELETE CASCADE; deleting books will remove join rows
DELETE FROM books
 WHERE book_id IN (SELECT book_id FROM TMP_BOOKS_TO_DELETE);

-- Cleanup
DROP TABLE TMP_BOOKS_TO_DELETE PURGE;
