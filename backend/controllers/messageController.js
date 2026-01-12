const Message = require("../models/Message");
const Chat = require("../models/Chat");

/* =========================
   GET OR CREATE CHAT
========================= */
const getOrCreateChat = async (req, res) => {
  try {
    const myId = req.user._id;
    const { userId } = req.params;

    let chat = await Chat.findOne({
      participants: { $all: [myId, userId] },
    });

    if (!chat) {
      chat = await Chat.create({
        participants: [myId, userId],
      });
    }

    res.json(chat);
  } catch (err) {
    console.error("❌ GET OR CREATE CHAT ERROR:", err);
    res.status(500).json({ message: "Failed to get or create chat" });
  }
};

/* =========================
   GET MESSAGES
========================= */
const getMessages = async (req, res) => {
  const { chatId } = req.params;

  const messages = await Message.find({ chatId })
    .populate("sender", "name avatar")
    .sort({ createdAt: 1 });

  res.json(messages);
};

/* =========================
   SEND TEXT MESSAGE
========================= */
const sendMessage = async (req, res) => {
  try {
    const { chatId, text } = req.body;

    const message = await Message.create({
      chatId,
      sender: req.user._id,
      type: "text",
      text,
    });

    await Chat.findByIdAndUpdate(chatId, {
      lastMessage: message._id,
    });

    const populated = await message.populate(
      "sender",
      "name avatar"
    );

    // Convert chatId to string for socket emission
    populated.chatId = populated.chatId.toString();

    // 🔥 IMPORTANT: SEND TO SOCKET CLIENTS
    req.app.get("io").to(chatId.toString()).emit("new-message", populated);
    req.app.get("io").emit("sidebar-update");

    res.status(201).json(populated);
  } catch (err) {
    console.error("❌ SEND MESSAGE ERROR:", err);
    res.status(500).json({ message: "Message send failed" });
  }
};

/* =========================
   UPLOAD MEDIA MESSAGE
========================= */
const uploadMessage = async (req, res) => {
  try {
    const { chatId, type } = req.body;

    if (!req.file) {
      return res.status(400).json({
        message: "No file uploaded",
      });
    }

    // ✅ CORRECT CLOUDINARY URL
    const mediaUrl = req.file.path;

    const message = await Message.create({
      chatId,
      sender: req.user._id,
      type,
      mediaUrl,
      fileName: req.file.originalname,
      fileSize: `${(req.file.size / 1024 / 1024).toFixed(2)} MB`,
    });

    await Chat.findByIdAndUpdate(chatId, {
      lastMessage: message._id,
    });

    const populated = await message.populate(
      "sender",
      "name avatar"
    );

    // 🔥 REALTIME UPDATES
    req.app.get("io").to(chatId.toString()).emit("new-message", populated);
    req.app.get("io").emit("sidebar-update");

    res.status(201).json(populated);
  } catch (err) {
    console.error("❌ UPLOAD MESSAGE ERROR:", err);
    res.status(500).json({
      message: "File upload to Cloudinary failed",
    });
  }
};


module.exports = {
  getOrCreateChat,
  getMessages,
  sendMessage,
  uploadMessage,
};
