-- Keep users.total_fines consistent on any direct DML to FINES

CREATE OR REPLACE TRIGGER trg_fines_aiu_sync_user
AFTER INSERT OR UPDATE OF status ON fines
FOR EACH ROW
DECLARE
  v_delta NUMBER := 0;
BEGIN
  -- On insert of an UNPAID fine, add amount
  IF INSERTING THEN
    IF NVL(:NEW.status,'UNPAID') = 'UNPAID' THEN
      v_delta := NVL(:NEW.amount,0);
    END IF;
  ELSIF UPDATING('status') THEN
    -- Transition to PAID or WAIVED reduces total_fines by amount; other transitions no-op
    IF NVL(:OLD.status,'UNPAID') = 'UNPAID' AND :NEW.status IN ('PAID','WAIVED') THEN
      v_delta := -NVL(:NEW.amount,0);
    END IF;
  END IF;

  IF v_delta <> 0 THEN
    UPDATE users SET total_fines = NVL(total_fines,0) + v_delta
     WHERE user_id = :NEW.user_id;
  END IF;
END;
/
