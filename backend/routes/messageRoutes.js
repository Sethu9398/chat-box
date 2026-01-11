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

router.post("/", protect, attachIO, sendMessage);

router.post(
  "/upload",
  protect,attachIO,
  messageUpload.single("file"),
  uploadMessage
);

module.exports = router;
