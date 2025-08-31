const express = require("express");
const router = express.Router();
const members = require("../controllers/membersController");

// List/search members
router.get("/", members.listMembers);

// Member profile
router.get("/:userId", members.getMember);
router.put("/:userId", members.updateMember);
router.delete("/:userId", members.deleteMember);

// Member histories
router.get("/:userId/history/reservations", members.getReservationHistory);
router.get("/:userId/history/loans", members.getLoansHistory);

module.exports = router;