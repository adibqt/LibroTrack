// controllers/reportsController.js
const db = require("../db");
const oracledb = require("oracledb");

// GET /api/reports/popular-books
exports.getPopularBooks = async (req, res) => {
  let connection;
  try {
    connection = await db.getConnection();
    const result = await connection.execute(
      `BEGIN PKG_REPORTS.get_popular_books(:result); END;`,
      { result: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR } }
    );
    const cursor = result.outBinds.result;
    const rows = await cursor.getRows();
    const meta = cursor.metaData;
    await cursor.close();
    const data = rows.map((row) => {
      const obj = {};
      for (let i = 0; i < meta.length; i++) {
        obj[meta[i].name.toLowerCase()] = row[i];
      }
      return obj;
    });
    res.json(data);
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

// GET /api/reports/member-activity
exports.getMemberActivity = async (req, res) => {
  let connection;
  try {
    connection = await db.getConnection();
    const result = await connection.execute(
      `BEGIN PKG_REPORTS.get_member_activity(:result); END;`,
      { result: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR } }
    );
    const cursor = result.outBinds.result;
    const rows = await cursor.getRows();
    const meta = cursor.metaData;
    await cursor.close();
    const data = rows.map((row) => {
      const obj = {};
      for (let i = 0; i < meta.length; i++) {
        obj[meta[i].name.toLowerCase()] = row[i];
      }
      return obj;
    });
    res.json(data);
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

// GET /api/reports/fines
exports.getFinesSummary = async (req, res) => {
  let connection;
  try {
    connection = await db.getConnection();
    const result = await connection.execute(
      `BEGIN PKG_REPORTS.get_fines_summary(:result); END;`,
      { result: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR } }
    );
    const cursor = result.outBinds.result;
    const rows = await cursor.getRows();
    const meta = cursor.metaData;
    await cursor.close();
    const data = rows.map((row) => {
      const obj = {};
      for (let i = 0; i < meta.length; i++) {
        obj[meta[i].name.toLowerCase()] = row[i];
      }
      return obj;
    });
    res.json(data);
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
