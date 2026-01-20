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
  deleteForMe,
  deleteForEveryone,
  markAsRead,
  markAsDelivered,
} = require("../controllers/messageController");

const router = express.Router();

router.get("/chat/:userId", protect, getOrCreateChat);
router.get("/:chatId", protect, getMessages);

router.post("/", protect, sendMessage);

router.post("/upload", protect, messageUpload, uploadMessage);

router.put("/:id/delete-for-me", protect, deleteForMe);
router.put("/:id/delete-for-everyone", protect, deleteForEveryone);
router.put("/:id/read", protect, markAsRead);
router.put("/:id/delivered", protect, markAsDelivered);

module.exports = router;
