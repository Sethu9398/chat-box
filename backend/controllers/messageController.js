const Message = require("../models/Message");
const Chat = require("../models/Chat");

/* =========================
   GET OR CREATE CHAT
========================= */
const getOrCreateChat = async (req, res) => {
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
   UPLOAD MEDIA MESSAGE
========================= */
const uploadMessage = async (req, res) => {
  try {
    const { chatId, type } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const message = await Message.create({
      chatId,
      sender: req.user._id,
      type, // image | video | file
      mediaUrl: req.file.path, // ✅ Cloudinary URL
      fileName: req.file.originalname,
      fileSize: `${(req.file.size / 1024 / 1024).toFixed(2)} MB`,
    });

    await Chat.findByIdAndUpdate(chatId, {
      lastMessage: message._id,
    });

    const populated = await message.populate("sender", "name avatar");

    res.status(201).json(populated);
  } catch (err) {
    console.error("❌ UPLOAD MESSAGE ERROR:", err);
    res.status(500).json({ message: "Message upload failed" });
  }
};

module.exports = {
  getOrCreateChat,
  getMessages,
  uploadMessage,
};
