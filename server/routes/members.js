const express = require("express");
const router = express.Router();
const members = require("../controllers/membersController");

// Member reservation history
router.get("/:userId/history/reservations", members.getReservationHistory);

module.exports = router;