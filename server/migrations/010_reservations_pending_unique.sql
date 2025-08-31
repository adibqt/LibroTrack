-- Replace overly strict unique constraint with a PENDING-only unique index
-- This avoids ORA-00001 when updating status to FULFILLED/CANCELLED/EXPIRED

-- Build a list of duplicate PENDING reservations (keep the oldest per user/book)
CREATE TABLE TMP_DUP_RES_010 AS
SELECT reservation_id, book_id
FROM (
  SELECT reservation_id, book_id,
         ROW_NUMBER() OVER (PARTITION BY user_id, book_id ORDER BY reservation_date ASC) AS rn
    FROM reservations
   WHERE status = 'PENDING'
)
WHERE rn > 1;

-- Cancel duplicates
UPDATE reservations
   SET status = 'CANCELLED'
 WHERE reservation_id IN (SELECT reservation_id FROM TMP_DUP_RES_010);

-- Adjust book counters for cancelled duplicates
UPDATE books b
   SET reserved_copies = reserved_copies - (
         SELECT COUNT(*) FROM TMP_DUP_RES_010 t WHERE t.book_id = b.book_id
       ),
       available_copies = available_copies + (
         SELECT COUNT(*) FROM TMP_DUP_RES_010 t WHERE t.book_id = b.book_id
       )
 WHERE EXISTS (SELECT 1 FROM TMP_DUP_RES_010 t WHERE t.book_id = b.book_id);

-- Cleanup temp table
DROP TABLE TMP_DUP_RES_010 PURGE;

-- Create a function-based unique index that enforces single PENDING reservation per user/book
-- Non-PENDING rows evaluate the expression to NULL and are not subject to uniqueness
CREATE UNIQUE INDEX uq_pending_reservation
  ON reservations (
    user_id,
    book_id,
    CASE WHEN status = 'PENDING' THEN 1 ELSE reservation_id END
  );
