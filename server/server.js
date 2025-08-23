require("dotenv").config();
const express = require("express");
const { getConnection } = require("./db");
const runMigrations = require("./migrationRunner");
const app = express();
const port = 3000;

async function startServer() {
  await runMigrations();

  app.get("/", (req, res) => {
    res.send("Hello World!");
  });

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

  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
}

startServer();
