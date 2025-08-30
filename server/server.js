require("dotenv").config();
const express = require("express");
const { getConnection } = require("./db");
const { runMigrations } = require("./migrationRunner");
const app = express();
const port = 3000;

async function startServer() {
  // Fines API routes
  app.use(express.json());

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
