// routes/catalog.js
// Catalog routes for LibroTrack
const express = require("express");
const router = express.Router();
const catalogController = require("../controllers/catalogController");

// GET /api/catalog/books - List/search books
router.get("/books", catalogController.getBooks);

module.exports = router;
