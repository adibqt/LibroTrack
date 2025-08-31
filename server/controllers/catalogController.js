// GET /api/catalog/books/:bookId/authors - Get all authors for a book
exports.getAuthorsForBook = async (req, res) => {
  let connection;
  try {
    connection = await db.getConnection();
    const result = await connection.execute(
      `SELECT a.author_id, a.first_name, a.last_name FROM authors a
        JOIN book_authors ba ON a.author_id = ba.author_id
        WHERE ba.book_id = :book_id`,
      { book_id: req.params.bookId }
    );
    const columns = result.metaData.map((col) => col.name.toLowerCase());
    const data = result.rows.map((row) =>
      Object.fromEntries(row.map((v, i) => [columns[i], v]))
    );
    res.json(data);
  } catch (err) {
    console.error("Error fetching authors for book:", err);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {}
    }
  }
};
// controllers/catalogController.js
// Controller for catalog-related endpoints
const db = require("../db");
const oracledb = require("oracledb");

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
  const sql = `
      SELECT DISTINCT
        b.book_id,
        b.isbn,
        b.title,
        b.category_id,
        b.publication_year,
        b.publisher,
    b.language,
    DBMS_LOB.SUBSTR(b.description, 4000, 1) AS description,
        b.location_shelf,
        b.total_copies,
        b.available_copies,
        b.reserved_copies,
        b.status
      FROM books b
      JOIN categories c ON b.category_id = c.category_id
      LEFT JOIN book_authors ba ON b.book_id = ba.book_id
      LEFT JOIN authors a ON ba.author_id = a.author_id
      WHERE (:title IS NULL OR LOWER(b.title) LIKE '%' || LOWER(:title) || '%')
        AND (:author IS NULL OR LOWER(a.first_name || ' ' || a.last_name) LIKE '%' || LOWER(:author) || '%')
        AND (:category IS NULL OR LOWER(c.category_name) LIKE '%' || LOWER(:category) || '%')
      ORDER BY b.title`;
    const result = await connection.execute(sql, {
      title: title || null,
      author: author || null,
      category: category || null,
    });
    const columns = result.metaData.map((col) => col.name.toLowerCase());
    const data = result.rows.map((row) =>
      Object.fromEntries(row.map((v, i) => [columns[i], v]))
    );
    res.json(data);
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

// GET /api/catalog/books/:bookId - Get book details
exports.getBookById = async (req, res) => {
  let connection;
  try {
    connection = await db.getConnection();
  const result = await connection.execute(
      `SELECT 
        b.book_id,
        b.isbn,
        b.title,
        b.category_id,
        b.publication_year,
        b.publisher,
    b.language,
    DBMS_LOB.SUBSTR(b.description, 4000, 1) AS description,
        b.location_shelf,
        b.total_copies,
        b.available_copies,
        b.reserved_copies,
        b.status,
        c.category_name
       FROM books b
       JOIN categories c ON b.category_id = c.category_id
       WHERE b.book_id = :book_id`,
      { book_id: req.params.bookId }
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Book not found" });
    const columns = result.metaData.map((col) => col.name.toLowerCase());
    const data = Object.fromEntries(
      result.rows[0].map((v, i) => [columns[i], v])
    );
    res.json(data);
  } catch (err) {
    console.error("Error fetching book by id:", err);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {}
    }
  }
};

// GET /api/catalog/books/:bookId/availability - Get book availability
exports.getBookAvailability = async (req, res) => {
  let connection;
  try {
    connection = await db.getConnection();
    const result = await connection.execute(
      `BEGIN PKG_STOCK.get_book_availability(:book_id, :available, :reserved, :total); END;`,
      {
        book_id: req.params.bookId,
        available: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        reserved: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        total: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      }
    );
    res.json({
      available_copies: result.outBinds.available,
      reserved_copies: result.outBinds.reserved,
      total_copies: result.outBinds.total,
    });
  } catch (err) {
    console.error("Error fetching book availability:", err);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {}
    }
  }
};

// GET /api/catalog/stock/low - Get books with low stock
exports.getLowStockBooks = async (req, res) => {
  let connection;
  try {
    connection = await db.getConnection();
    const result = await connection.execute(
      `BEGIN PKG_STOCK.get_low_stock_books(:threshold, :result); END;`,
      {
        threshold: 2, // or make this configurable via query param
        result: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR },
      }
    );
    const resultSet = result.outBinds.result;
    const rows = await resultSet.getRows();
    await resultSet.close();
    let data = rows;
    if (rows.length > 0 && resultSet.metaData) {
      const columns = resultSet.metaData.map((col) => col.name.toLowerCase());
      data = rows.map((row) =>
        Object.fromEntries(row.map((v, i) => [columns[i], v]))
      );
    }
    res.json(data);
  } catch (err) {
    console.error("Error fetching low stock books:", err);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {}
    }
  }
};

// POST /api/catalog/books - Create a new book (admin)
exports.createBook = async (req, res) => {
  const {
    isbn,
    title,
    category_id,
    publication_year,
    publisher,
    language,
    description,
    location_shelf,
    total_copies,
  } = req.body;
  let connection;
  try {
    connection = await db.getConnection();
    const result = await connection.execute(
      `INSERT INTO books (
        book_id, isbn, title, category_id, publication_year, publisher, language, description, location_shelf, total_copies, available_copies, reserved_copies, status, added_date
      ) VALUES (
        books_seq.NEXTVAL, :isbn, :title, :category_id, :publication_year, :publisher, :language, :description, :location_shelf, :total_copies, :total_copies, 0, 'AVAILABLE', SYSDATE
      ) RETURNING book_id INTO :book_id`,
      {
        isbn,
        title,
        category_id,
        publication_year,
        publisher,
        language,
        description,
        location_shelf,
        total_copies,
        book_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      }
    );
    if (connection.commit) await connection.commit();
    const newId = Array.isArray(result.outBinds.book_id)
      ? result.outBinds.book_id[0]
      : result.outBinds.book_id;
    res.status(201).json({ book_id: newId });
  } catch (err) {
    console.error("Error creating book:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {}
    }
  }
};

// PUT /api/catalog/books/:bookId - Update book (admin)
exports.updateBook = async (req, res) => {
  const {
    isbn,
    title,
    category_id,
    publication_year,
    publisher,
    language,
    description,
    location_shelf,
    total_copies,
    status,
  } = req.body;
  let connection;
  try {
    connection = await db.getConnection();
    const result = await connection.execute(
      `UPDATE books SET
        isbn = :isbn,
        title = :title,
        category_id = :category_id,
        publication_year = :publication_year,
        publisher = :publisher,
        language = :language,
        description = :description,
        location_shelf = :location_shelf,
        total_copies = :total_copies,
        status = :status
      WHERE book_id = :book_id`,
      {
        book_id: req.params.bookId,
        isbn,
        title,
        category_id,
        publication_year,
        publisher,
        language,
        description,
        location_shelf,
        total_copies,
        status,
      }
    );
    if (connection.commit) await connection.commit();
    if ((result.rowsAffected || 0) === 0)
      return res.status(404).json({ error: "Book not found" });
    res.json({ message: "Book updated" });
  } catch (err) {
    console.error("Error updating book:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {}
    }
  }
};

// POST /api/catalog/books/:bookId/authors/:authorId - Add author to book (admin)
exports.addAuthorToBook = async (req, res) => {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.execute(
      `BEGIN PKG_CATALOG.add_author_to_book(:book_id, :author_id); END;`,
      {
        book_id: req.params.bookId,
        author_id: req.params.authorId,
      }
    );
    res.status(201).json({ message: "Author added to book" });
  } catch (err) {
    console.error("Error adding author to book:", err);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {}
    }
  }
};

// DELETE /api/catalog/books/:bookId/authors/:authorId - Remove author from book (admin)
exports.removeAuthorFromBook = async (req, res) => {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.execute(
      `BEGIN PKG_CATALOG.remove_author_from_book(:book_id, :author_id); END;`,
      {
        book_id: req.params.bookId,
        author_id: req.params.authorId,
      }
    );
    res.json({ message: "Author removed from book" });
  } catch (err) {
    console.error("Error removing author from book:", err);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {}
    }
  }
};

// DELETE /api/catalog/books/:bookId - Delete a book (admin)
exports.deleteBook = async (req, res) => {
  let connection;
  try {
    connection = await db.getConnection();
    const result = await connection.execute(
      `DELETE FROM books WHERE book_id = :book_id`,
      { book_id: req.params.bookId }
    );
    if (connection.commit) await connection.commit();
    if ((result.rowsAffected || 0) === 0)
      return res.status(404).json({ error: "Book not found" });
    res.json({ message: "Book deleted" });
  } catch (err) {
    console.error("Error deleting book:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {}
    }
  }
};
