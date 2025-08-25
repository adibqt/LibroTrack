require("dotenv").config();
const express = require("express");
const { getConnection } = require("./db");
const runMigrations = require("./migrationRunner");
const app = express();
const port = 3000;

async function startServer() {
  await runMigrations();

  app.use(express.json());

  app.get("/", (req, res) => {
    res.send("Hello World!");
  });

  // Catalog API routes
  const catalogRoutes = require("./routes/catalog");
  app.use("/api/catalog", catalogRoutes);

  // Authors API routes
  const authorsRoutes = require("./routes/authors");
  app.use("/api/authors", authorsRoutes);

  // Categories API routes
  const categoriesRoutes = require("./routes/categories");
  app.use("/api/categories", categoriesRoutes);

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

  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
}

startServer();
