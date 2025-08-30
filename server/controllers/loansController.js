const db = require("../db");
const oracledb = require("oracledb");

exports.issue = async (req, res) => {
  const { user_id, book_id, due_days } = req.body || {};
  if (!user_id || !book_id) return res.status(400).json({ error: "user_id and book_id are required" });
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
        loan_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      }
    );
  if (conn.commit) await conn.commit();
  const out = result && result.outBinds ? result.outBinds.loan_id : undefined;
  const loanId = Array.isArray(out) ? out[0] : out;
  res.status(201).json({ loan_id: loanId });
  } catch (err) {
    res.status(400).json({ error: err.message });
  } finally {
    if (conn) try { await conn.close(); } catch {}
  }
};

exports.returnLoan = async (req, res) => {
  const { id } = req.params;
  let conn;
  try {
    conn = await db.getConnection();
    await conn.execute(`BEGIN PKG_LOANS.return_book(p_loan_id => :id); END;`, { id });
    if (conn.commit) await conn.commit();
    res.json({ message: "Book returned" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  } finally {
    if (conn) try { await conn.close(); } catch {}
  }
};