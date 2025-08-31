CREATE OR REPLACE TRIGGER trg_update_stock_on_return
AFTER UPDATE OF return_date ON loans
FOR EACH ROW
WHEN (new.return_date IS NOT NULL AND old.return_date IS NULL)
DECLARE
  v_book_id books.book_id%TYPE;
BEGIN
  -- Get the book_id from the book_stock table using the stock_id
  SELECT book_id INTO v_book_id
  FROM book_stock
  WHERE stock_id = :new.stock_id;

  -- Call the procedure to update the stock
  pkg_stock.update_stock_on_return(v_book_id);
END;
/
