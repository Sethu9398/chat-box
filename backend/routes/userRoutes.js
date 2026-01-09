// backend/routes/userRoutes.js
const express = require("express");
const protect = require("../middleware/authMiddleware");
const { getSidebarUsers } = require("../controllers/userController");
const upload = require("../middleware/upload");
const { updateProfile } = require("../controllers/userController");

const router = express.Router();

// 🔐 Protected
router.get("/sidebar", protect, getSidebarUsers);

// ✅ NEW
router.put(
  "/profile",
  protect,
  upload.single("avatar"),
  updateProfile
);

module.exports = router;
