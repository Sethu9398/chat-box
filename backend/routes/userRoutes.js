// backend/routes/userRoutes.js
const express = require("express");
const protect = require("../middleware/authMiddleware");
const { getSidebarUsers } = require("../controllers/userController");

const router = express.Router();

// 🔐 Protected
router.get("/sidebar", protect, getSidebarUsers);

module.exports = router;
