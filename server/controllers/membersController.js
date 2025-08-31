const db = require("../db");
const oracledb = require("oracledb");

// Utility to map rows to objects using metaData
function mapRows(result) {
  const cols = result.metaData.map((c) => c.name.toLowerCase());
  return result.rows.map((row) => Object.fromEntries(row.map((v, i) => [cols[i], v])));
}

// GET /api/members?q=&limit=50
exports.listMembers = async (req, res) => {
  const q = (req.query.q || "").toString().trim();
  const limit = Math.min(Number(req.query.limit) || 50, 500);
  let conn;
  try {
    conn = await db.getConnection();
    let sql = `
      SELECT * FROM (
        SELECT
          u.user_id, u.username, u.email,
          u.first_name, u.last_name, u.phone, u.address,
          u.user_type, u.status, u.registration_date,
          u.max_books_allowed, u.current_books_borrowed, u.total_fines
        FROM users u
      `;
    const binds = { lim: limit };
    if (q) {
      sql += `
        WHERE LOWER(u.username) LIKE LOWER(:p)
           OR LOWER(u.email) LIKE LOWER(:p)
           OR LOWER(u.first_name) LIKE LOWER(:p)
           OR LOWER(u.last_name) LIKE LOWER(:p)
      `;
      binds.p = `%${q}%`;
    }
    sql += `
        ORDER BY u.registration_date DESC
      ) WHERE ROWNUM <= :lim`;

    const result = await conn.execute(sql, binds);
    res.json(mapRows(result));
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
  } finally {
    if (conn) try { await conn.close(); } catch {}
  }
};

// GET /api/members/:userId
exports.getMember = async (req, res) => {
  const userId = Number(req.params.userId);
  if (!userId) return res.status(400).json({ error: "Invalid userId" });
  let conn;
  try {
    conn = await db.getConnection();
    const result = await conn.execute(
      `SELECT
         u.user_id, u.username, u.email, u.first_name, u.last_name,
         u.phone, u.address, u.user_type, u.status, u.registration_date,
         u.max_books_allowed, u.current_books_borrowed, u.total_fines
       FROM users u
       WHERE u.user_id = :user_id`,
      { user_id: userId }
    );
    const rows = mapRows(result);
    if (rows.length === 0) return res.status(404).json({ error: "Member not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
  } finally {
    if (conn) try { await conn.close(); } catch {}
  }
};

// PUT /api/members/:userId
exports.updateMember = async (req, res) => {
  const userId = Number(req.params.userId);
  if (!userId) return res.status(400).json({ error: "Invalid userId" });
  const allowed = [
    "first_name",
    "last_name",
    "email",
    "phone",
    "address",
    "user_type",
    "status",
    "max_books_allowed",
  ];
  const fields = Object.keys(req.body || {}).filter((k) => allowed.includes(k));
  if (fields.length === 0) return res.status(400).json({ error: "No updatable fields provided" });
  const sets = fields.map((k, i) => `${k} = :v${i}`);
  const binds = fields.reduce((acc, k, i) => ({ ...acc, ["v" + i]: req.body[k] }), { id: userId });
  let conn;
  try {
    conn = await db.getConnection();
    const r = await conn.execute(
      `UPDATE users SET ${sets.join(", ")} WHERE user_id = :id`,
      binds
    );
    if (conn.commit) await conn.commit();
    if ((r.rowsAffected || 0) === 0) return res.status(404).json({ error: "Member not found" });
    res.json({ message: "Member updated" });
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
  } finally {
    if (conn) try { await conn.close(); } catch {}
  }
};

// DELETE /api/members/:userId
exports.deleteMember = async (req, res) => {
  const userId = Number(req.params.userId);
  if (!userId) return res.status(400).json({ error: "Invalid userId" });
  let conn;
  try {
    conn = await db.getConnection();
    await conn.execute(
      `BEGIN PKG_IDENTITY.delete_user(:user_id); END;`,
      { user_id: userId }
    );
    if (conn.commit) await conn.commit();
    res.json({ message: "Member deleted" });
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
  } finally {
    if (conn) try { await conn.close(); } catch {}
  }
};

// GET /api/members/:userId/history/reservations?limit=50&status=PENDING|CANCELLED|FULFILLED|EXPIRED
exports.getReservationHistory = async (req, res) => {
  const userId = Number(req.params.userId);
  const limit = Math.min(Number(req.query.limit) || 50, 500);
  const status = req.query.status; // filter by to_status

  if (!userId) return res.status(400).json({ error: "Invalid userId" });

  let conn;
  try {
    conn = await db.getConnection();
    const binds = { user_id: userId, lim: limit };
    let sql = `
      SELECT *
      FROM (
        SELECT
          h.history_id,
          h.reservation_id,
          h.user_id,
          h.book_id,
          h.action,
          h.from_status,
          h.to_status,
          h.changed_at,
          b.title
        FROM reservation_history h
        JOIN books b ON b.book_id = h.book_id
        WHERE h.user_id = :user_id
    `;
    if (status) {
      sql += ` AND h.to_status = :status`;
      binds.status = status;
    }
    sql += `
        ORDER BY h.changed_at DESC
      )
      WHERE ROWNUM <= :lim
    `;

    const result = await conn.execute(sql, binds);
    res.json(mapRows(result));
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
  } finally {
    if (conn) try { await conn.close(); } catch {}
  }
};

// GET /api/members/:userId/history/loans?limit=50&status=ISSUED|RETURNED|LOST
exports.getLoansHistory = async (req, res) => {
  const userId = Number(req.params.userId);
  const limit = Math.min(Number(req.query.limit) || 50, 500);
  const status = req.query.status;
  if (!userId) return res.status(400).json({ error: "Invalid userId" });
  let conn;
  try {
    conn = await db.getConnection();
    const binds = { user_id: userId, lim: limit };
    let sql = `
      SELECT * FROM (
        SELECT
          l.loan_id,
          l.user_id,
          l.book_id,
          b.title,
          l.issue_date,
          l.due_date,
          l.return_date,
          l.status
        FROM loans l
        JOIN books b ON b.book_id = l.book_id
        WHERE l.user_id = :user_id
    `;
    if (status) {
      sql += ` AND l.status = :status`;
      binds.status = status;
    }
    sql += `
        ORDER BY l.issue_date DESC
      ) WHERE ROWNUM <= :lim
    `;
    const result = await conn.execute(sql, binds);
    res.json(mapRows(result));
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
  } finally {
    if (conn) try { await conn.close(); } catch {}
  }
};