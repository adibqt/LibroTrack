// Oracle DB connection utility
const oracledb = require("oracledb");
const dbConfig = require("./dbConfig");

async function getConnection() {
  try {
    return await oracledb.getConnection(dbConfig);
  } catch (err) {
    console.error("OracleDB connection error:", err);
    throw err;
  }
}

module.exports = { getConnection };
