-- Audit history for reservation lifecycle

CREATE TABLE reservation_history (
  history_id      NUMBER PRIMARY KEY,
  reservation_id  NUMBER NOT NULL,
  user_id         NUMBER NOT NULL,
  book_id         NUMBER NOT NULL,
  action          VARCHAR2(20) NOT NULL, -- CREATE, CANCEL, FULFILL, EXPIRE, STATUS_CHANGE, DELETE
  from_status     VARCHAR2(20),
  to_status       VARCHAR2(20),
  note            VARCHAR2(200),
  changed_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_hist_reservation FOREIGN KEY (reservation_id) REFERENCES reservations(reservation_id) ON DELETE CASCADE,
  CONSTRAINT fk_hist_user        FOREIGN KEY (user_id)        REFERENCES users(user_id),
  CONSTRAINT fk_hist_book        FOREIGN KEY (book_id)        REFERENCES books(book_id)
);

CREATE SEQUENCE reservation_history_seq START WITH 1 INCREMENT BY 1;

CREATE INDEX idx_res_hist_user_time ON reservation_history(user_id, changed_at DESC);
CREATE INDEX idx_res_hist_res ON reservation_history(reservation_id);

-- Log creation
CREATE OR REPLACE TRIGGER trg_res_hist_ai
AFTER INSERT ON reservations
FOR EACH ROW
BEGIN
  INSERT INTO reservation_history (
    history_id, reservation_id, user_id, book_id,
    action, from_status, to_status, note, changed_at
  ) VALUES (
    reservation_history_seq.NEXTVAL, :NEW.reservation_id, :NEW.user_id, :NEW.book_id,
    'CREATE', NULL, :NEW.status, NULL, SYSTIMESTAMP
  );
END;
/

-- Log status transitions
CREATE OR REPLACE TRIGGER trg_res_hist_au_status
AFTER UPDATE OF status ON reservations
FOR EACH ROW
BEGIN
  INSERT INTO reservation_history (
    history_id, reservation_id, user_id, book_id,
    action, from_status, to_status, note, changed_at
  ) VALUES (
    reservation_history_seq.NEXTVAL, :NEW.reservation_id, :NEW.user_id, :NEW.book_id,
    CASE
      WHEN :OLD.status = 'PENDING' AND :NEW.status = 'CANCELLED' THEN 'CANCEL'
      WHEN :OLD.status = 'PENDING' AND :NEW.status = 'FULFILLED' THEN 'FULFILL'
      WHEN :OLD.status = 'PENDING' AND :NEW.status = 'EXPIRED'   THEN 'EXPIRE'
      ELSE 'STATUS_CHANGE'
    END,
    :OLD.status, :NEW.status, NULL, SYSTIMESTAMP
  );
END;
/

-- Optional: log deletes
CREATE OR REPLACE TRIGGER trg_res_hist_bd
BEFORE DELETE ON reservations
FOR EACH ROW
BEGIN
  INSERT INTO reservation_history (
    history_id, reservation_id, user_id, book_id,
    action, from_status, to_status, note, changed_at
  ) VALUES (
    reservation_history_seq.NEXTVAL, :OLD.reservation_id, :OLD.user_id, :OLD.book_id,
    'DELETE', :OLD.status, NULL, NULL, SYSTIMESTAMP
  );
END;
/