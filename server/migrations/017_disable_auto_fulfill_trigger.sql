-- Disable the auto-fulfill reservation trigger that causes deadlocks during book deletion
DECLARE
  trigger_count NUMBER;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM user_triggers
  WHERE trigger_name = 'TRG_AUTO_FULFILL_RESERVATION' AND status = 'ENABLED';
  
  IF trigger_count > 0 THEN
    EXECUTE IMMEDIATE 'ALTER TRIGGER TRG_AUTO_FULFILL_RESERVATION DISABLE';
    DBMS_OUTPUT.PUT_LINE('Trigger TRG_AUTO_FULFILL_RESERVATION disabled');
  ELSE
    DBMS_OUTPUT.PUT_LINE('Trigger TRG_AUTO_FULFILL_RESERVATION is already disabled or does not exist');
  END IF;
END;
/
