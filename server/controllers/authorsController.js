// GET /api/authors/:authorId/books - Get all books for an author
exports.getBooksForAuthor = async (req, res) => {
  const db = require("../db");
  let connection;
  try {
    connection = await db.getConnection();
    const result = await connection.execute(
      `SELECT b.book_id, b.title, b.isbn, b.category_id, b.publication_year, b.publisher, b.language, b.status
        FROM books b
        JOIN book_authors ba ON b.book_id = ba.book_id
        WHERE ba.author_id = :author_id`,
      { author_id: req.params.authorId }
    );
    const columns = result.metaData.map((col) => col.name.toLowerCase());
    const data = result.rows.map((row) =>
      Object.fromEntries(row.map((v, i) => [columns[i], v]))
    );
    res.json(data);
  } catch (err) {
    console.error("Error fetching books for author:", err);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {}
    }
  }
};
// CRUD operations for authors table
const db = require("../db");

// Create Author
exports.createAuthor = async (req, res) => {
  const { first_name, last_name } = req.body;
  let connection;
  try {
    connection = await db.getConnection();
    const oracledb = require("oracledb");
    const result = await connection.execute(
      `INSERT INTO authors (author_id, first_name, last_name) VALUES (authors_seq.NEXTVAL, :first_name, :last_name) RETURNING author_id INTO :id`,
      {
        first_name,
        last_name,
        id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      }
    );
    (await connection.commit) && connection.commit();
    res
      .status(201)
      .json({ author_id: result.outBinds.id[0], first_name, last_name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {}
    }
  }
};

// Get All Authors
exports.getAuthors = async (req, res) => {
  let connection;
  try {
    connection = await db.getConnection();
    const result = await connection.execute("SELECT * FROM authors", {});
    const columns = result.metaData.map((col) => col.name.toLowerCase());
    const data = result.rows.map((row) =>
      Object.fromEntries(row.map((v, i) => [columns[i], v]))
    );
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {}
    }
  }
};

// Get Author by ID
exports.getAuthorById = async (req, res) => {
  let connection;
  try {
    connection = await db.getConnection();
    const result = await connection.execute(
      "SELECT * FROM authors WHERE author_id = :id",
      { id: req.params.id }
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Author not found" });
    const columns = result.metaData.map((col) => col.name.toLowerCase());
    const data = Object.fromEntries(
      result.rows[0].map((v, i) => [columns[i], v])
    );
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {}
    }
  }
};

// Update Author
exports.updateAuthor = async (req, res) => {
  const { first_name, last_name } = req.body;
  let connection;
  try {
    connection = await db.getConnection();
    const result = await connection.execute(
      "UPDATE authors SET first_name = :first_name, last_name = :last_name WHERE author_id = :id",
      { first_name, last_name, id: req.params.id }
    );
    (await connection.commit) && connection.commit();
    if (result.rowsAffected === 0)
      return res.status(404).json({ error: "Author not found" });
    res.json({ message: "Author updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {}
    }
  }
};

// Delete Author
exports.deleteAuthor = async (req, res) => {
  let connection;
  try {
    connection = await db.getConnection();
    const result = await connection.execute(
      "DELETE FROM authors WHERE author_id = :id",
      { id: req.params.id }
    );
    (await connection.commit) && connection.commit();
    if (result.rowsAffected === 0)
      return res.status(404).json({ error: "Author not found" });
    res.json({ message: "Author deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {}
    }
  }
};
