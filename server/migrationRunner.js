// migrationRunner.js - Simple migration runner for OracleDB
const fs = require("fs");
const path = require("path");
const db = require("./db");

function splitStatements(sql) {
  const lines = sql.split(/\r?\n/);
  const statements = [];
  let buf = [];
  let inPlsql = false;

  const plsqlStart = /^\s*(CREATE\s+OR\s+REPLACE\s+)?(PROCEDURE|FUNCTION|TRIGGER|PACKAGE(?:\s+BODY)?|TYPE)\b/i;

  for (let raw of lines) {
    const line = raw.replace(/\uFEFF/g, ""); // strip BOM if any
    if (!inPlsql && plsqlStart.test(line)) {
      inPlsql = true;
      buf.push(line);
      continue;
    }

    if (inPlsql) {
      buf.push(line);
      if (/^\s*\/\s*$/.test(line)) {
        statements.push(buf.join("\n"));
        buf = [];
        inPlsql = false;
      }
      continue;
    }

    // outside PL/SQL: split on semicolons
    if (line.includes(";")) {
      const parts = line.split(";");
      for (let i = 0; i < parts.length - 1; i++) {
        buf.push(parts[i]);
        const stmt = buf.join("\n").trim();
        if (stmt) statements.push(stmt);
        buf = [];
      }
      const tail = parts[parts.length - 1];
      if (tail.trim()) buf.push(tail);
    } else {
      buf.push(line);
    }
  }
  const last = buf.join("\n").trim();
  if (last) statements.push(last);
  return statements.filter((s) => s.trim());
}

async function runMigrations() {
  const migrationsDir = path.join(__dirname, "migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  let connection;
  try {
    connection = await db.getConnection();
    for (const file of files) {
      const full = path.join(migrationsDir, file);
      const sql = fs.readFileSync(full, "utf8");
      const statements = splitStatements(sql);
      for (const stmt of statements) {
        try {
          await connection.execute(stmt);
        } catch (e) {
          console.error(`Migration failed in ${file}:\n`, stmt, "\nError:", e);
          throw e;
        }
      }
    }
    if (connection.commit) await connection.commit();
    console.log("Migrations applied successfully.");
  } finally {
    if (connection) try { await connection.close(); } catch {}
  }
}

module.exports = { runMigrations };
