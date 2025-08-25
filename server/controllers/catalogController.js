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
    const result = await connection.execute(
      `BEGIN PKG_CATALOG.search_books(:title, :author, :category, :result); END;`,
      {
        title: title || null,
        author: author || null,
        category: category || null,
        result: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR },
      }
    );
    const resultSet = result.outBinds.result;
    const rows = await resultSet.getRows();
    await resultSet.close();
    // Always map to objects with keys
    let columns;
    if (rows.length > 0 && resultSet.metaData) {
      columns = resultSet.metaData.map((col) => col.name.toLowerCase());
    } else {
      // Fallback: match the new SELECT in PKG_CATALOG.search_books
      columns = [
        "book_id",
        "isbn",
        "title",
        "category_id",
        "publication_year",
        "publisher",
        "language",
        "description",
        "location_shelf",
        "total_copies",
        "available_copies",
        "reserved_copies",
        "status",
      ];
    }
    const data = rows.map((row) =>
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
      `BEGIN PKG_CATALOG.get_book_by_id(:book_id, :result); END;`,
      {
        book_id: req.params.bookId,
        result: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR },
      }
    );
    const resultSet = result.outBinds.result;
    const rows = await resultSet.getRows();
    await resultSet.close();
    if (rows.length === 0)
      return res.status(404).json({ error: "Book not found" });
    let columns;
    if (rows.length > 0 && resultSet.metaData) {
      columns = resultSet.metaData.map((col) => col.name.toLowerCase());
    } else {
      // Fallback: match the SELECT in get_book_by_id
      columns = [
        "book_id",
        "isbn",
        "title",
        "category_id",
        "publication_year",
        "publisher",
        "language",
        "description",
        "location_shelf",
        "total_copies",
        "available_copies",
        "reserved_copies",
        "status",
        "category_name",
      ];
    }
    const data = Object.fromEntries(rows[0].map((v, i) => [columns[i], v]));
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
      `BEGIN PKG_CATALOG.create_book(:isbn, :title, :category_id, :publication_year, :publisher, :language, :description, :location_shelf, :total_copies, :book_id); END;`,
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
    res.status(201).json({ book_id: result.outBinds.book_id });
  } catch (err) {
    console.error("Error creating book:", err);
    res.status(500).json({ error: "Internal server error" });
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
    await connection.execute(
      `BEGIN PKG_CATALOG.update_book(:book_id, :isbn, :title, :category_id, :publication_year, :publisher, :language, :description, :location_shelf, :total_copies, :status); END;`,
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
    res.json({ message: "Book updated" });
  } catch (err) {
    console.error("Error updating book:", err);
    res.status(500).json({ error: "Internal server error" });
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
