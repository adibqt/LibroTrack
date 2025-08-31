const jwt = require("jsonwebtoken");
const crypto = require("crypto");
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
    // Pre-check for duplicate username/email to provide clear error
    const dupCheck = await connection.execute(
      `SELECT username, email FROM users WHERE username = :username OR email = :email`,
      { username, email }
    );
    if (dupCheck.rows && dupCheck.rows.length > 0) {
      const existing = dupCheck.rows[0];
      const existingUsername = existing[0];
      const existingEmail = existing[1];
      if (existingUsername === username) {
        return res.status(409).json({ error: "Username already exists" });
      }
      if (existingEmail === email) {
        return res.status(409).json({ error: "Email already exists" });
      }
      return res
        .status(409)
        .json({ error: "Username or email already exists" });
    }
    // Hash password (MD5 uppercase hex to align with DB tooling)
    const password_hash = crypto
      .createHash("md5")
      .update(password)
      .digest("hex")
      .toUpperCase();

    const result = await connection.execute(
      `BEGIN PKG_IDENTITY.create_user(:username, :password_hash, :first_name, :last_name, :email, :user_type, 'ACTIVE', :user_id); END;`,
      {
        username,
        password_hash,
        first_name,
        last_name,
        email,
        user_type,
        user_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      }
    );
    res.status(201).json({ user_id: result.outBinds.user_id });
  } catch (err) {
    if (
      err &&
      typeof err.message === "string" &&
      err.message.includes("ORA-00001")
    ) {
      return res
        .status(409)
        .json({ error: "Username or email already exists" });
    }
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
    const db_password = pwResult.rows?.[0]?.[0];
    // Compare hashed password to stored hash
    const input_hash = crypto
      .createHash("md5")
      .update(password)
      .digest("hex")
      .toUpperCase();
    if (!db_password || input_hash !== db_password)
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
    // Fetch additional profile fields from users table
    const extra = await connection.execute(
      `SELECT first_name, last_name, phone, address, max_books_allowed, current_books_borrowed, total_fines
         FROM users WHERE user_id = :user_id`,
      { user_id }
    );
    const [
      first_name,
      last_name,
      phone,
      address,
      max_books_allowed,
      current_books_borrowed,
      total_fines,
    ] =
      extra.rows && extra.rows[0]
        ? extra.rows[0]
        : [null, null, null, null, null, null, null];
    res.json({
      user_id,
      username,
      email,
      user_type,
      status,
      created_at,
      first_name,
      last_name,
      phone,
      address,
      max_books_allowed,
      current_books_borrowed,
      total_fines,
    });
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
    const extra = await connection.execute(
      `SELECT first_name, last_name, phone, address, max_books_allowed, current_books_borrowed, total_fines
         FROM users WHERE user_id = :user_id`,
      { user_id }
    );
    const [
      first_name,
      last_name,
      phone,
      address,
      max_books_allowed,
      current_books_borrowed,
      total_fines,
    ] =
      extra.rows && extra.rows[0]
        ? extra.rows[0]
        : [null, null, null, null, null, null, null];
    res.json({
      user_id,
      username,
      email,
      user_type,
      status,
      created_at,
      first_name,
      last_name,
      phone,
      address,
      max_books_allowed,
      current_books_borrowed,
      total_fines,
    });
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
