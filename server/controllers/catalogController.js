// controllers/catalogController.js
// Controller for catalog-related endpoints
const db = require("../db");

/**
 * GET /api/catalog/books
 * List or search books using PKG_CATALOG.search_books
 * Query params: title, author, category (all optional)
 */
exports.getBooks = async (req, res) => {
  const { title, author, category } = req.query;
  let connection;
  try {
    connection = await db.getConnection();
    const result = await connection.execute(
      `BEGIN PKG_CATALOG.search_books(:title, :author, :category, :result); END;`,
      {
        title: title || null,
        author: author || null,
        category: category || null,
        result: {
          dir: require("oracledb").BIND_OUT,
          type: require("oracledb").CURSOR,
        },
      }
    );
    const resultSet = result.outBinds.result;
    const rows = await resultSet.getRows();
    await resultSet.close();
    res.json(rows);
  } catch (err) {
    console.error("Error fetching books:", err);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {}
    }
  }
};
