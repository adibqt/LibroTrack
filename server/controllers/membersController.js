const db = require("../db");

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
    const cols = result.metaData.map((c) => c.name.toLowerCase());
    const data = result.rows.map((row) =>
      Object.fromEntries(row.map((v, i) => [cols[i], v]))
    );
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
  } finally {
    if (conn) try { await conn.close(); } catch {}
  }
};