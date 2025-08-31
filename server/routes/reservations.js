const express = require("express");
const router = express.Router();
const reservations = require("../controllers/reservationsController");

// List reservations
router.get("/", reservations.listReservations);

// Create reservation
router.post("/", reservations.createReservation);

// Cancel reservation
router.post("/:id/cancel", reservations.cancelReservation);

// Fulfill reservation
router.post("/:id/fulfill", reservations.fulfillReservation);

// Manually run expiry
router.post("/expire/run", reservations.expireReservations);

module.exports = router;