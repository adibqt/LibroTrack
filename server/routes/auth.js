const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// Test endpoint to verify route is loaded
router.get("/test", authController.test);

// Register
router.post("/register", authController.register);

// Login
router.post("/login", authController.login);

// Get current user (not implemented)
router.get("/me", authController.getMe);

// Get user by id
router.get("/users/:id", authController.getUserById);

// Update user
router.patch("/users/:id", authController.updateUser);

// Can user issue books?
router.get("/users/:id/can-issue", authController.canIssue);

module.exports = router;
