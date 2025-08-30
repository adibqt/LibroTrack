const express = require("express");
const router = express.Router();
const reportsController = require("../controllers/reportsController");

// GET /api/reports/popular-books
router.get("/popular-books", reportsController.getPopularBooks);

// GET /api/reports/member-activity
router.get("/member-activity", reportsController.getMemberActivity);

// GET /api/reports/fines
router.get("/fines", reportsController.getFinesSummary);

module.exports = router;
