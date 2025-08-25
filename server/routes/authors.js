const express = require("express");
const router = express.Router();
const authorsController = require("../controllers/authorsController");

// GET /api/authors/:authorId/books - Get all books for an author
router.get("/:authorId/books", authorsController.getBooksForAuthor);

router.post("/", authorsController.createAuthor);
router.get("/", authorsController.getAuthors);
router.get("/:id", authorsController.getAuthorById);
router.put("/:id", authorsController.updateAuthor);
router.delete("/:id", authorsController.deleteAuthor);

module.exports = router;
