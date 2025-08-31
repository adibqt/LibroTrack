require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { getConnection } = require("./db");
const { runMigrations } = require("./migrationRunner");
const app = express();
const port = 3000;

async function startServer() {
  app.use(express.json());
  // Allow client app to call the API directly in dev/preview
  app.use(
    cors({
      origin: [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        process.env.CLIENT_ORIGIN || "",
      ].filter(Boolean),
      methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
      credentials: true,
    })
  );

  const finesRoutes = require("./routes/fines");
  app.use("/api/fines", finesRoutes);
  await runMigrations();

  app.get("/", (req, res) => {
    res.send("Hello World!");
  });

  // Auth API routes
  const authRoutes = require("./routes/auth");
  app.use("/api/auth", authRoutes);

  // Catalog API routes
  const catalogRoutes = require("./routes/catalog");
  app.use("/api/catalog", catalogRoutes);

  // Authors API routes
  const authorsRoutes = require("./routes/authors");
  app.use("/api/authors", authorsRoutes);

  // Categories API routes
  const categoriesRoutes = require("./routes/categories");
  app.use("/api/categories", categoriesRoutes);

  // Reservations API routes
  const reservationsRoutes = require("./routes/reservations");
  app.use("/api/reservations", reservationsRoutes);

  // Loans API routes
  const loansRoutes = require("./routes/loans");
  app.use("/api/loans", loansRoutes);

  // Members API routes
  const membersRoutes = require("./routes/members");
  app.use("/api/members", membersRoutes);

  // Notifications API routes
  const notificationsRoutes = require("./routes/notifications");
  app.use("/api/notifications", notificationsRoutes);

  // Reports API routes
  const reportsRoutes = require("./routes/reports");
  app.use("/api/reports", reportsRoutes);

  // Test OracleDB connection endpoint
  app.get("/dbtest", async (req, res) => {
    try {
      const conn = await getConnection();
      const result = await conn.execute(
        "SELECT 'Connected to Oracle!' AS message FROM dual"
      );
      await conn.close();
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // List tables in current schema
  app.get("/db/tables", async (req, res) => {
    try {
      const conn = await getConnection();
      const r = await conn.execute(
        "SELECT table_name FROM user_tables ORDER BY table_name"
      );
      await conn.close();
      res.json(r.rows.map((row) => row[0]));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // DEV ONLY: Inspect a user by username/email
  app.get("/db/user", async (req, res) => {
    const u = (req.query.u || "").toString();
    if (!u) return res.status(400).json({ error: "Missing ?u=" });
    try {
      const conn = await getConnection();
      const r = await conn.execute(
        `SELECT user_id, username, email, user_type, status, password_hash
           FROM users
          WHERE LOWER(username)=LOWER(:u) OR LOWER(email)=LOWER(:u)`,
        { u }
      );
      await conn.close();
      res.json(r.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // DEV ONLY: Reset password_hash for a user
  app.post("/db/user/reset-password", async (req, res) => {
    try {
      const { u, password } = req.body || {};
      if (!u || !password) return res.status(400).json({ error: "u and password required" });
      const conn = await getConnection();
      const r = await conn.execute(
        `UPDATE users SET password_hash = :p WHERE LOWER(username)=LOWER(:u) OR LOWER(email)=LOWER(:u)`,
        { p: password, u }
      );
      if (conn.commit) await conn.commit();
      await conn.close();
      res.json({ updated: r.rowsAffected || 0 });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Check notifications table content
  app.get("/db/notifications", async (req, res) => {
    try {
      const conn = await getConnection();
      const r = await conn.execute(
        "SELECT notification_id, reservation_id, user_id, book_id, notif_type, notif_status, created_at FROM notifications ORDER BY created_at DESC FETCH FIRST 10 ROWS ONLY"
      );
      const cols = r.metaData.map((c) => c.name.toLowerCase());
      const data = r.rows.map((row) =>
        Object.fromEntries(row.map((v, i) => [cols[i], v]))
      );
      await conn.close();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
}

// Optional: periodically expire overdue reservations
const db = require("./db");
setInterval(async () => {
  let conn;
  try {
    conn = await db.getConnection();
    await conn.execute(`BEGIN PKG_RESERVATIONS.expire_due_reservations; END;`);
    if (conn.commit) await conn.commit();
  } catch (e) {
    console.error("Reservation expiry job failed:", e.message);
  } finally {
    if (conn)
      try {
        await conn.close();
      } catch {}
  }
}, 5 * 60 * 1000); // every 5 minutes

startServer();
