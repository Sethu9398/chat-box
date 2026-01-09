const express = require("express");
const protect = require("../middleware/authMiddleware");
const messageUpload = require("../middleware/messageUpload");
const {
  getOrCreateChat,
  getMessages,
  uploadMessage,
} = require("../controllers/messageController");

const router = express.Router();

/* CHAT */
router.get("/chat/:userId", protect, getOrCreateChat);

/* GET MESSAGES */
router.get("/:chatId", protect, getMessages);

/* MEDIA MESSAGE */
router.post(
  "/upload",
  protect,
  messageUpload.single("file"),
  uploadMessage
);

module.exports = router;
