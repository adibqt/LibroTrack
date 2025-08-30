// controllers/finesController.js
// Controller for fines endpoints
const db = require("../db");
const oracledb = require("oracledb");

// POST /api/fines - Assess a new fine
exports.assessFine = async (req, res) => {
  const body = req.body || {};
  const { user_id, amount, fine_type } = body;
  if (!user_id || !amount || !fine_type) {
    return res.status(400).json({
      error:
        "Missing required fields: user_id, amount, fine_type are required.",
    });
  }
  // Debug log for values sent to PL/SQL
  console.log("Calling PKG_FINES.assess_fine with:", {
    user_id,
    amount,
    fine_type,
  });
  let connection;
  try {
    connection = await db.getConnection();
    const result = await connection.execute(
      `BEGIN PKG_FINES.assess_fine(:user_id, :amount, :fine_type, :fine_id); END;`,
      {
        user_id,
        amount,
        fine_type,
        fine_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      }
    );
    res.status(201).json({ fine_id: result.outBinds.fine_id });
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

// PATCH /api/fines/:fineId/pay - Settle (pay) a fine
exports.settleFine = async (req, res) => {
  const fine_id = req.params.fineId;
  let connection;
  try {
    connection = await db.getConnection();
    await connection.execute(`BEGIN PKG_FINES.settle_fine(:fine_id); END;`, {
      fine_id,
    });
    res.json({ message: "Fine settled" });
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

// PATCH /api/fines/:fineId/waive - Waive a fine
exports.waiveFine = async (req, res) => {
  const fine_id = req.params.fineId;
  let connection;
  try {
    connection = await db.getConnection();
    await connection.execute(`BEGIN PKG_FINES.waive_fine(:fine_id); END;`, {
      fine_id,
    });
    res.json({ message: "Fine waived" });
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

// GET /api/fines/:fineId - Get fine details
exports.getFineById = async (req, res) => {
  const fine_id = req.params.fineId;
  let connection;
  try {
    connection = await db.getConnection();
    const result = await connection.execute(
      `BEGIN PKG_FINES.get_fine_by_id(:fine_id, :result); END;`,
      {
        fine_id,
        result: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR },
      }
    );
    const cursor = result.outBinds.result;
    const fine = (await cursor.getRows(1))[0];
    // Get column names from cursor metadata
    const meta = cursor.metaData;
    await cursor.close();
    if (!fine) return res.status(404).json({ error: "Fine not found" });
    // Map columns to object using metadata
    const data = {};
    for (let i = 0; i < meta.length; i++) {
      data[meta[i].name.toLowerCase()] = fine[i];
    }
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

// GET /api/fines/user/:userId - Get all fines for a user
exports.getFinesByUser = async (req, res) => {
  const user_id = req.params.userId;
  let connection;
  try {
    connection = await db.getConnection();
    const result = await connection.execute(
      `BEGIN PKG_FINES.get_fines_by_user(:user_id, :result); END;`,
      {
        user_id,
        result: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR },
      }
    );
    const cursor = result.outBinds.result;
    const rows = await cursor.getRows();
    // Get column names from cursor metadata
    const meta = cursor.metaData;
    await cursor.close();
    // Map columns to object using metadata
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
