const express = require("express");
const router = express.Router();
const loans = require("../controllers/loansController");

// Issue a book (checkout)
router.post("/", loans.issue);

// Return a book (checkin)
router.post("/:id/return", loans.returnLoan);

// List loans for a user (requires auth; only self)
router.get("/user/:userId", loans.listForUser);

module.exports = router;
