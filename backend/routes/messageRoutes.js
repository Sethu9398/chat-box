// routes/messageRoutes.js
const express = require("express");
const protect = require("../middleware/authMiddleware");
const messageUpload = require("../middleware/messageUpload");
const attachIO = require("../middleware/attachIO");
const {
  uploadMessage,
  getMessages,
  getOrCreateChat,
  sendMessage,
} = require("../controllers/messageController");

const router = express.Router();

router.get("/chat/:userId", protect, getOrCreateChat);
router.get("/:chatId", protect, getMessages);

router.post("/", protect, sendMessage);

router.post(
  "/upload",
  protect,
  messageUpload.single("file"), // ✅ FIX
  uploadMessage
);

module.exports = router;
