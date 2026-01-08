// routes/authRoutes.js
const express = require("express");
const { signup, login, logout, getMe } = require("../controllers/authController");
const upload = require("../middleware/upload");
const protect = require("../middleware/authMiddleware");



const router = express.Router();

/* Signup with avatar */
router.post("/signup", upload.single("avatar"), signup);
router.post("/login", login);
router.post("/logout", logout);
router.get('/me',protect,getMe)

module.exports = router;
