// routes/catalog.js
// Catalog routes for LibroTrack
const express = require("express");
const router = express.Router();
const catalogController = require("../controllers/catalogController");

// GET /api/catalog/books - List/search books
router.get("/books", catalogController.getBooks);

// GET /api/catalog/books/:bookId - Get book details
router.get("/books/:bookId", catalogController.getBookById);

// GET /api/catalog/books/:bookId/availability - Get book availability
router.get(
  "/books/:bookId/availability",
  catalogController.getBookAvailability
);

// GET /api/catalog/stock/low - Get books with low stock
router.get("/stock/low", catalogController.getLowStockBooks);

// GET /api/catalog/books/:bookId/authors - Get all authors for a book
router.get("/books/:bookId/authors", catalogController.getAuthorsForBook);

// POST /api/catalog/books - Create a new book (admin)
router.post("/books", catalogController.createBook);

// PUT /api/catalog/books/:bookId - Update book (admin)
router.put("/books/:bookId", catalogController.updateBook);

// POST /api/catalog/books/:bookId/authors/:authorId - Add author to book (admin)
router.post(
  "/books/:bookId/authors/:authorId",
  catalogController.addAuthorToBook
);

// DELETE /api/catalog/books/:bookId/authors/:authorId - Remove author from book (admin)
router.delete(
  "/books/:bookId/authors/:authorId",
  catalogController.removeAuthorFromBook
);

module.exports = router;
