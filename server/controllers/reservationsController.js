const db = require("../db");
const oracledb = require("oracledb");

exports.createReservation = async (req, res) => {
  const { user_id, book_id, expiry_days, priority_level } = req.body || {};
  if (!user_id || !book_id) return res.status(400).json({ error: "user_id and book_id are required" });

  let conn;
  try {
    conn = await db.getConnection();
    const result = await conn.execute(
      `BEGIN
         PKG_RESERVATIONS.create_reservation(
           p_user_id => :user_id,
           p_book_id => :book_id,
           p_expiry_days => :expiry_days,
           p_priority => :priority_level,
           p_reservation_id => :res_id
         );
       END;`,
      {
        user_id,
        book_id,
        expiry_days: expiry_days ?? null,
        priority_level: priority_level ?? null,
        res_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      }
    );
    if (conn.commit) await conn.commit();
    res.status(201).json({ reservation_id: result.outBinds.res_id[0] });
  } catch (err) {
    res.status(400).json({ error: err.message });
  } finally {
    if (conn) try { await conn.close(); } catch {}
  }
};

exports.cancelReservation = async (req, res) => {
  const { id } = req.params;
  let conn;
  try {
    conn = await db.getConnection();
    await conn.execute(
      `BEGIN PKG_RESERVATIONS.cancel_reservation(:id); END;`,
      { id }
    );
    if (conn.commit) await conn.commit();
    res.json({ message: "Reservation cancelled" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  } finally {
    if (conn) try { await conn.close(); } catch {}
  }
};

exports.fulfillReservation = async (req, res) => {
  const { id } = req.params;
  let conn;
  try {
    conn = await db.getConnection();
    await conn.execute(
      `BEGIN PKG_RESERVATIONS.fulfill_reservation(:id); END;`,
      { id }
    );
    if (conn.commit) await conn.commit();
    res.json({ message: "Reservation fulfilled" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  } finally {
    if (conn) try { await conn.close(); } catch {}
  }
};

exports.expireReservations = async (_req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    await conn.execute(`BEGIN PKG_RESERVATIONS.expire_due_reservations; END;`);
    if (conn.commit) await conn.commit();
    res.json({ message: "Expired reservations processed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) try { await conn.close(); } catch {}
  }
};