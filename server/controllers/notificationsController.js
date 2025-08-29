const db = require("../db");
const oracledb = require("oracledb");

// GET /api/notifications/pending?limit=50
exports.getPending = async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 500);
  let conn;
  try {
    conn = await db.getConnection();
    const result = await conn.execute(
      `SELECT notification_id, reservation_id, user_id, book_id,
              notif_type AS type, channel, notif_status AS status, created_at
       FROM notifications
       WHERE notif_status = 'PENDING'
       ORDER BY created_at
       FETCH FIRST :lim ROWS ONLY`,
      { lim: limit }
    );
    const cols = result.metaData.map(c => c.name.toLowerCase());
    const data = result.rows.map(r => Object.fromEntries(r.map((v,i)=>[cols[i], v])));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
  } finally {
    if (conn) try { await conn.close(); } catch {}
  }
};

// POST /api/notifications/:id/send  (simulate send -> mark SENT)
exports.sendOne = async (req, res) => {
  const { id } = req.params;
  let conn;
  try {
    conn = await db.getConnection();
    await conn.execute(`BEGIN PKG_NOTIFICATIONS.mark_sent(:id); END;`, { id });
    if (conn.commit) await conn.commit();
    res.json({ message: "Notification marked as SENT" });
  } catch (err) {
    res.status(400).json({ error: String(err.message || err) });
  } finally {
    if (conn) try { await conn.close(); } catch {}
  }
};

// POST /api/notifications/:id/fail  (simulate failure with error)
exports.failOne = async (req, res) => {
  const { id } = req.params;
  const { error } = req.body || {};
  let conn;
  try {
    conn = await db.getConnection();
    await conn.execute(
      `BEGIN PKG_NOTIFICATIONS.mark_failed(:id, :err); END;`,
      { id, err: error || 'Simulated failure' }
    );
    if (conn.commit) await conn.commit();
    res.json({ message: "Notification marked as FAILED" });
  } catch (err) {
    res.status(400).json({ error: String(err.message || err) });
  } finally {
    if (conn) try { await conn.close(); } catch {}
  }
};