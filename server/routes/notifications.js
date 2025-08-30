const express = require("express");
const router = express.Router();
const notifications = require("../controllers/notificationsController");

router.get("/pending", notifications.getPending);
router.post("/:id/send", notifications.sendOne);
router.post("/:id/fail", notifications.failOne);

module.exports = router;