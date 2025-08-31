const db = require("../db");
const oracledb = require("oracledb");

// GET /api/reservations - List reservations with optional filters
exports.listReservations = async (req, res) => {
  const { status, user_id, book_id, limit } = req.query;
  let connection;
  try {
    connection = await db.getConnection();
    
    let whereClause = "WHERE 1=1";
    const bindParams = {};
    
    if (status) {
      whereClause += " AND r.status = :status";
      bindParams.status = status.toUpperCase();
    }
    if (user_id) {
      whereClause += " AND r.user_id = :user_id";
      bindParams.user_id = parseInt(user_id);
    }
    if (book_id) {
      whereClause += " AND r.book_id = :book_id";
      bindParams.book_id = parseInt(book_id);
    }
    
    const limitClause = limit ? `AND ROWNUM <= :limit` : "";
    if (limit) {
      bindParams.limit = parseInt(limit);
    }
    
    const result = await connection.execute(
      `SELECT r.reservation_id, r.user_id, r.book_id, r.status, 
              r.reservation_date, r.expiry_date, r.priority_level,
              u.username, u.first_name, u.last_name, u.email,
              b.title, b.isbn
       FROM reservations r
       JOIN users u ON r.user_id = u.user_id
       JOIN books b ON r.book_id = b.book_id
       ${whereClause} ${limitClause}
       ORDER BY r.reservation_date DESC`,
      bindParams
    );
    
    const reservations = result.rows.map(row => ({
      reservation_id: row[0],
      user_id: row[1],
      book_id: row[2],
      status: row[3],
      reservation_date: row[4],
      expiry_date: row[5],
      priority_level: row[6],
      user: {
        username: row[7],
        first_name: row[8],
        last_name: row[9],
        email: row[10]
      },
      book: {
        title: row[11],
        isbn: row[12]
      }
    }));
    
    res.json(reservations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch {}
    }
  }
};

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
    const msg = String(err.message || "");
    // If a pending reservation already exists for this user/book, return its ID (idempotent create)
    if (msg.includes("ORA-20010")) {
      try {
        const r = await conn.execute(
          `SELECT reservation_id
             FROM reservations
            WHERE user_id = :user_id AND book_id = :book_id AND status = 'PENDING'
            ORDER BY reservation_date ASC`,
          { user_id, book_id }
        );
        const id = r.rows && r.rows[0] && (Array.isArray(r.rows[0]) ? r.rows[0][0] : r.rows[0].RESERVATION_ID);
        if (id) {
          return res.status(200).json({ reservation_id: id, existing: true });
        }
      } catch (_) {
        // fall through to default mapping
      }
    }
    if (msg.includes("ORA-01403")) {
      return res.status(404).json({ error: "Invalid user_id or book_id" });
    }
    if (msg.includes("ORA-20014") || msg.includes("ORA-20015") || msg.includes("ORA-20016")) {
      return res.status(404).json({ error: msg });
    }
    if (msg.includes("ORA-20011") || msg.includes("ORA-20012") || msg.includes("ORA-20013")) {
      return res.status(400).json({ error: msg });
    }
    res.status(500).json({ error: msg });
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