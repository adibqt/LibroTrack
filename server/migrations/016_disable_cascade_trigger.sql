-- Check if trigger exists before disabling it
DECLARE
  trigger_count NUMBER;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM user_triggers
  WHERE trigger_name = 'TRG_DELETE_BOOK_CASCADE';
  
  IF trigger_count > 0 THEN
    EXECUTE IMMEDIATE 'ALTER TRIGGER trg_delete_book_cascade DISABLE';
    DBMS_OUTPUT.PUT_LINE('Trigger TRG_DELETE_BOOK_CASCADE disabled');
  ELSE
    DBMS_OUTPUT.PUT_LINE('Trigger TRG_DELETE_BOOK_CASCADE does not exist - skipping');
  END IF;
END;
/
