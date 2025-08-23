// initDb.js - Run DDL to create/update Oracle tables and sequences
const fs = require("fs");
const path = require("path");
const oracledb = require("oracledb");
const dbConfig = require("./dbConfig");

async function runDDL() {
  const ddlPath = path.join(__dirname, "librotrack_schema.sql");
  const ddl = fs.readFileSync(ddlPath, "utf8");
  // Split statements by semicolon at line end (not perfect, but works for this DDL)
  const statements = ddl
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  let conn;
  try {
    conn = await oracledb.getConnection(dbConfig);
    for (const stmt of statements) {
      try {
        await conn.execute(stmt);
        console.log("Executed:", stmt.split("\n")[0]);
      } catch (err) {
        // Ignore "already exists" errors (ORA-00955, ORA-00942, ORA-02261, ORA-02275)
        if (err.errorNum && [955, 942, 2261, 2275].includes(err.errorNum)) {
          console.log("Skip (already exists):", stmt.split("\n")[0]);
        } else {
          console.error("Error executing:", stmt.split("\n")[0], err.message);
        }
      }
    }
    await conn.commit();
    console.log("DDL execution complete.");
  } catch (err) {
    console.error("DB connection error:", err);
  } finally {
    if (conn) await conn.close();
  }
}

if (require.main === module) {
  runDDL();
}

module.exports = runDDL;
