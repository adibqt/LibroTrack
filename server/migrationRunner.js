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
      // When inside a PL/SQL object definition, accumulate lines until a single slash on its own line
      if (/^\s*\/\s*$/.test(line)) {
        // Push the block without the trailing slash (the slash is a SQL*Plus directive, not part of the DDL)
        const cleaned = buf.join("\n").trim();
        if (cleaned) statements.push(cleaned);
        buf = [];
        inPlsql = false;
      } else {
        buf.push(line);
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

    // Create migrations log table if not exists (ignore ORA-00955)
    try {
      await connection.execute(
        `CREATE TABLE librotrack_migrations (
           filename   VARCHAR2(255) PRIMARY KEY,
           applied_at TIMESTAMP DEFAULT SYSTIMESTAMP
         )`
      );
      if (connection.commit) await connection.commit();
    } catch (e) {
      if (!(e && e.errorNum === 955)) {
        throw e;
      }
    }

    // Load already applied migrations
    const applied = new Set();
    const res = await connection.execute(
      `SELECT filename FROM librotrack_migrations`
    );
    for (const row of res.rows || []) {
      applied.add(Array.isArray(row) ? row[0] : row.FILENAME);
    }

    // Helper to check compilation errors for the most recently created object
    async function checkCompileErrorsForStmt(stmt) {
      // Try to extract object type and name
      const header = stmt.slice(0, 500).replace(/^[\s\S]*?(CREATE\s+(?:OR\s+REPLACE\s+)?)/i, "$1");
      const m = header.match(/^\s*CREATE\s+(?:OR\s+REPLACE\s+)?(PROCEDURE|FUNCTION|TRIGGER|PACKAGE(?:\s+BODY)?|TYPE)\s+([A-Za-z0-9_$#\"]+)/i);
      if (!m) return; // not a creatable PL/SQL object
      let type = m[1].toUpperCase();
      let name = m[2];
      // Strip optional quotes
      if (name.startsWith('"') && name.endsWith('"')) name = name.slice(1, -1);
      name = name.split(".").pop(); // drop schema if present
      const binds = { name, type };
      const qry = `SELECT name, type, line, position, text FROM user_errors
                   WHERE name = :name AND type = :type
                   ORDER BY sequence`;
      const errRes = await connection.execute(qry, binds);
      if ((errRes.rows || []).length > 0) {
        const msgs = (errRes.rows || []).map((r) => {
          const row = Array.isArray(r) ? { name: r[0], type: r[1], line: r[2], position: r[3], text: r[4] } : r;
          return `[${row.TYPE}] ${row.NAME} @${row.LINE}:${row.POSITION} - ${row.TEXT}`;
        });
        throw new Error(`PL/SQL compilation errors for ${type} ${name}:\n` + msgs.join("\n"));
      }
    }

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`Skipping already applied migration: ${file}`);
        continue;
      }
      const full = path.join(migrationsDir, file);
      const sql = fs.readFileSync(full, "utf8");
      const statements = splitStatements(sql);
      for (const stmt of statements) {
        try {
          await connection.execute(stmt);
          // After executing a CREATE of a PL/SQL object, surface any compilation errors
          await checkCompileErrorsForStmt(stmt);
        } catch (e) {
          // Strip leading SQL comments and whitespace to detect CREATE statements
          const stripLeadingComments = (s) => {
            let t = s.replace(/^\uFEFF/, "");
            let changed = true;
            while (changed) {
              changed = false;
              // Remove leading line comments
              t = t.replace(/^(\s*--.*(?:\r?\n|$))+/m, (m) => {
                changed = true; return "";
              });
              // Remove leading block comments
              t = t.replace(/^(\s*\/\*[\s\S]*?\*\/\s*)/m, (m) => {
                changed = true; return "";
              });
              // Trim leading whitespace
              const trimmed = t.replace(/^\s+/, "");
              if (trimmed.length !== t.length) { changed = true; t = trimmed; }
            }
            return t;
          };
          const head = stripLeadingComments(stmt);
          const isCreate = /^\s*CREATE\b/i.test(head);
          if (isCreate && e && e.errorNum === 955) {
            // ORA-00955: name is already used by an existing object -> safe to skip
            console.warn(`Skipping existing object during ${file}: ORA-00955`);
            continue;
          }
          console.error(`Migration failed in ${file}:\n`, stmt, "\nError:", e);
          throw e;
        }
      }
      // Record migration as applied
      await connection.execute(
        `INSERT INTO librotrack_migrations (filename) VALUES (:filename)`,
        { filename: file }
      );
      if (connection.commit) await connection.commit();
    }
    console.log("Migrations applied successfully.");
  } finally {
    if (connection) try { await connection.close(); } catch {}
  }
}

module.exports = { runMigrations };
