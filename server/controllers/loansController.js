const db = require("../db");
const oracledb = require("oracledb");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "librotrack_secret";

exports.issue = async (req, res) => {
  const { user_id, book_id, due_days } = req.body || {};
  if (!user_id || !book_id)
    return res.status(400).json({ error: "user_id and book_id are required" });
  let conn;
  try {
    conn = await db.getConnection();
    const result = await conn.execute(
      `BEGIN
         PKG_LOANS.issue_book(
           p_user_id => :user_id,
           p_book_id => :book_id,
           p_due_days => :due_days,
           p_loan_id => :loan_id
         );
       END;`,
      {
        user_id,
        book_id,
        due_days: due_days ?? null,
        loan_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      }
    );
    if (conn.commit) await conn.commit();
    const out = result && result.outBinds ? result.outBinds.loan_id : undefined;
    const loanId = Array.isArray(out) ? out[0] : out;
    res.status(201).json({ loan_id: loanId });
  } catch (err) {
    res.status(400).json({ error: err.message });
  } finally {
    if (conn)
      try {
        await conn.close();
      } catch {}
  }
};

exports.returnLoan = async (req, res) => {
  const { id } = req.params;
  let conn;
  try {
    conn = await db.getConnection();
    // Auth: only the user who borrowed can return
    const header = req.headers["authorization"];
    if (!header) return res.status(401).json({ error: "No token" });
    const token = header.split(" ")[1];
    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }

    // Find loan and validate ownership and status
    const r = await conn.execute(
      `SELECT user_id, status FROM loans WHERE loan_id = :id`,
      { id }
    );
    if (!r.rows || r.rows.length === 0) {
      return res.status(404).json({ error: "Loan not found" });
    }
    const [loan_user_id, status] = r.rows[0];
    if (loan_user_id !== payload.user_id) {
      return res.status(403).json({ error: "Not allowed" });
    }
    if (status !== "ISSUED") {
      return res.status(400).json({ error: "Loan is not active" });
    }

    await conn.execute(`BEGIN PKG_LOANS.return_book(p_loan_id => :id); END;`, {
      id,
    });
    if (conn.commit) await conn.commit();
    res.json({ message: "Book returned" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  } finally {
    if (conn)
      try {
        await conn.close();
      } catch {}
  }
};

// List loans for the authenticated user (optionally filter by status)
exports.listForUser = async (req, res) => {
  const { userId } = req.params;
  const { status } = req.query;
  const header = req.headers["authorization"];
  if (!header) return res.status(401).json({ error: "No token" });
  const token = header.split(" ")[1];
  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
  if (String(payload.user_id) !== String(userId)) {
    return res.status(403).json({ error: "Not allowed" });
  }
  let conn;
  try {
    conn = await db.getConnection();
    const result = await conn.execute(
      `SELECT l.loan_id, l.book_id, b.title, l.issue_date, l.due_date, l.return_date, l.status
         FROM loans l
         JOIN books b ON b.book_id = l.book_id
        WHERE l.user_id = :user_id
          AND (:status IS NULL OR l.status = :status)
        ORDER BY l.issue_date DESC`,
      { user_id: userId, status: status || null }
    );
    const cols = result.metaData.map((c) => c.name.toLowerCase());
    const data = result.rows.map((row) =>
      Object.fromEntries(row.map((v, i) => [cols[i], v]))
    );
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  } finally {
    if (conn)
      try {
        await conn.close();
      } catch {}
  }
};
