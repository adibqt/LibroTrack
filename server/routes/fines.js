const express = require("express");
const router = express.Router();
const finesController = require("../controllers/finesController");

// GET /api/fines - List fines
router.get("/", finesController.listFines);

// POST /api/fines - Assess a new fine
router.post("/", finesController.assessFine);

// PATCH /api/fines/:fineId/pay - Settle (pay) a fine
router.patch("/:fineId/pay", finesController.settleFine);

// PATCH /api/fines/:fineId/waive - Waive a fine
router.patch("/:fineId/waive", finesController.waiveFine);

// GET /api/fines/:fineId - Get fine details
router.get("/:fineId", finesController.getFineById);

// GET /api/fines/user/:userId - Get all fines for a user
router.get("/user/:userId", finesController.getFinesByUser);

module.exports = router;
