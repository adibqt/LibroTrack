const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "librotrack_secret";
// controllers/authController.js
// Controller for authentication and user management endpoints
const db = require("../db");
const oracledb = require("oracledb");

// POST /api/auth/register
exports.register = async (req, res) => {
  const { username, password, first_name, last_name, email, user_type } =
    req.body;
  if (
    !username ||
    !password ||
    !first_name ||
    !last_name ||
    !email ||
    !user_type
  ) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  let connection;
  try {
    connection = await db.getConnection();
    const result = await connection.execute(
      `BEGIN PKG_IDENTITY.create_user(:username, :password, :first_name, :last_name, :email, :user_type, 'ACTIVE', :user_id); END;`,
      {
        username,
        password,
        first_name,
        last_name,
        email,
        user_type,
        user_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      }
    );
    res.status(201).json({ user_id: result.outBinds.user_id });
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

// POST /api/auth/login
exports.login = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Missing username or password" });
  }
  let connection;
  try {
    connection = await db.getConnection();
    const result = await connection.execute(
      `BEGIN PKG_IDENTITY.get_user_by_username(:username, :result); END;`,
      {
        username,
        result: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR },
      }
    );
    const cursor = result.outBinds.result;
    const user = (await cursor.getRows(1))[0];
    await cursor.close();
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    const [
      user_id,
      db_username,
      db_email,
      db_user_type,
      db_status,
      db_created_at,
    ] = user;
    // Get password from DB
    const pwResult = await connection.execute(
      `SELECT password_hash FROM users WHERE user_id = :user_id`,
      { user_id }
    );
    const db_password = pwResult.rows[0][0];
    if (password !== db_password)
      return res.status(401).json({ error: "Invalid credentials" });
    // Generate JWT
    const token = jwt.sign(
      { user_id, username: db_username, user_type: db_user_type },
      JWT_SECRET,
      { expiresIn: "1d" }
    );
    res.json({ token });
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

// GET /api/auth/me
exports.getMe = async (req, res) => {
  // JWT-based authentication
  const header = req.headers["authorization"];
  if (!header) return res.status(401).json({ error: "No token" });
  const token = header.split(" ")[1];
  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
  let connection;
  try {
    connection = await db.getConnection();
    const result = await connection.execute(
      `BEGIN PKG_IDENTITY.get_user_by_id(:user_id, :result); END;`,
      {
        user_id: payload.user_id,
        result: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR },
      }
    );
    const cursor = result.outBinds.result;
    const user = (await cursor.getRows(1))[0];
    await cursor.close();
    if (!user) return res.status(404).json({ error: "User not found" });
    const [user_id, username, email, user_type, status, created_at] = user;
    res.json({ user_id, username, email, user_type, status, created_at });
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

// GET /api/auth/users/:id
exports.getUserById = async (req, res) => {
  let connection;
  try {
    connection = await db.getConnection();
    const result = await connection.execute(
      `BEGIN PKG_IDENTITY.get_user_by_id(:user_id, :result); END;`,
      {
        user_id: req.params.id,
        result: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR },
      }
    );
    const cursor = result.outBinds.result;
    const user = (await cursor.getRows(1))[0];
    await cursor.close();
    if (!user) return res.status(404).json({ error: "User not found" });
    const [user_id, username, email, user_type, status, created_at] = user;
    res.json({ user_id, username, email, user_type, status, created_at });
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

// PATCH /api/auth/users/:id
exports.updateUser = async (req, res) => {
  const { username, email, user_type, status } = req.body;
  let connection;
  try {
    connection = await db.getConnection();
    await connection.execute(
      `BEGIN PKG_IDENTITY.update_user(:user_id, :username, :email, :user_type, :status); END;`,
      {
        user_id: req.params.id,
        username,
        email,
        user_type,
        status,
      }
    );
    res.json({ message: "User updated" });
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

// GET /api/auth/users/:id/can-issue
exports.canIssue = async (req, res) => {
  let connection;
  try {
    connection = await db.getConnection();
    const result = await connection.execute(
      `SELECT PKG_IDENTITY.has_status(:user_id, 'ACTIVE') AS can_issue FROM dual`,
      { user_id: req.params.id }
    );
    const can_issue = result.rows[0][0] === 1;
    res.json({ can_issue });
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

// GET /api/auth/test
exports.test = (req, res) => {
  res.json({ message: "Auth route is working" });
};
