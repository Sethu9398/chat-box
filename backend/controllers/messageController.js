const Message = require("../models/Message");
const Chat = require("../models/Chat");

/* =========================
   HELPER: GET LAST VISIBLE MESSAGE
========================= */
const getLastVisibleMessage = async (chatId, userId) => {
  const lastMessage = await Message.findOne({
    chatId,
    deletedForAll: false,
    deletedBy: { $ne: userId }
  }).sort({ createdAt: -1 });

  return lastMessage;
};

/* =========================
   HELPER: GET LAST MESSAGE TEXT
========================= */
const getLastMessageText = (message) => {
  if (!message) return "No messages yet";

  if (message.type === "text") return message.text;
  if (message.type === "image") return "📷 Photo";
  if (message.type === "video") return "🎥 Video";
  if (message.type === "file") return "📎 File";

  return "Message";
};

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

  const messages = await Message.find({ chatId, deletedBy: { $ne: req.user._id } })
    .populate("sender", "name avatar")
    .populate("replyTo")
    .sort({ createdAt: 1 });

  res.json(messages);
};

/* =========================
   SEND TEXT MESSAGE
========================= */
const sendMessage = async (req, res) => {
  try {
    const { chatId, text, replyTo, isForwarded, mediaUrl, fileName, fileSize, type } = req.body;

    const message = await Message.create({
      chatId,
      sender: req.user._id,
      type: type || "text",
      text,
      mediaUrl,
      fileName,
      fileSize,
      replyTo: replyTo || null,
      isForwarded: isForwarded || false,
    });

    await Chat.findByIdAndUpdate(chatId, {
      lastMessage: message._id,
    });

    const populated = await message.populate([
      { path: "sender", select: "name avatar" },
      { path: "replyTo" }
    ]);

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
    const { chatId, type, replyTo, isForwarded } = req.body;

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
      replyTo: replyTo || null,
      isForwarded: isForwarded || false,
    });

    await Chat.findByIdAndUpdate(chatId, {
      lastMessage: message._id,
    });

    const populated = await message.populate([
      { path: "sender", select: "name avatar" },
      { path: "replyTo" }
    ]);

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


/* =========================
   DELETE FOR ME
========================= */
const deleteForMe = async (req, res) => {
  try {
    const { id } = req.params;
    const message = await Message.findById(id);
    if (!message) return res.status(404).json({ message: "Message not found" });

    // Check if this is the last visible message for this user before deletion
    const lastVisibleMessage = await getLastVisibleMessage(message.chatId, req.user._id);
    const isLastVisible = lastVisibleMessage && lastVisibleMessage._id.toString() === id;

    // Add user to deletedBy
    await Message.findByIdAndUpdate(id, { $addToSet: { deletedBy: req.user._id } });

    // Emit to chat room for message deletion (for real-time chat update)
    console.log("🗑️ Emitting message-deleted to chat room:", message.chatId.toString(), "messageId:", id);
    req.app.get("io").to(message.chatId.toString()).emit("message-deleted", { messageId: id });

    if (isLastVisible) {
      // Find the new last visible message after deletion
      const newLastVisibleMessage = await Message.findOne({
        chatId: message.chatId,
        deletedForAll: false,
        deletedBy: { $ne: req.user._id },
        _id: { $ne: id } // Exclude the deleted one
      }).sort({ createdAt: -1 });

      // Update Chat.lastMessage in backend
      await Chat.findByIdAndUpdate(message.chatId, {
        lastMessage: newLastVisibleMessage ? newLastVisibleMessage._id : null
      });

      const lastMessageText = newLastVisibleMessage ? getLastMessageText(newLastVisibleMessage) : "No messages yet";

      // Emit sidebar update only to this user
      req.app.get("io").to(req.user._id.toString()).emit("sidebar-message-update", {
        chatId: message.chatId.toString(),
        lastMessageText,
        scope: "for-me"
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("❌ DELETE FOR ME ERROR:", err);
    res.status(500).json({ message: "Failed to delete message for you" });
  }
};

/* =========================
   DELETE FOR EVERYONE
========================= */
const deleteForEveryone = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: "Message not found" });
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only sender can delete for everyone" });
    }

    // Set deletedForAll
    await Message.findByIdAndUpdate(req.params.id, { deletedForAll: true });

    // Recalculate Chat.lastMessage
    const newLastMessage = await Message.findOne({
      chatId: message.chatId,
      deletedForAll: false
    }).sort({ createdAt: -1 });
    await Chat.findByIdAndUpdate(message.chatId, {
      lastMessage: newLastMessage ? newLastMessage._id : null
    });

    // Get chat participants
    const chat = await Chat.findById(message.chatId).populate("participants");

    // Emit sidebar updates to all participants
    for (const participant of chat.participants) {
      const lastVisibleMessage = await getLastVisibleMessage(message.chatId, participant._id);
      let lastMessageText;
      if (lastVisibleMessage) {
        lastMessageText = getLastMessageText(lastVisibleMessage);
      } else {
        lastMessageText = "This message was deleted"; // If no visible messages, it means the deleted one was the last
      }

      req.app.get("io").to(participant._id.toString()).emit("sidebar-message-update", {
        chatId: message.chatId.toString(),
        lastMessageText,
        scope: "for-everyone"
      });
    }

    // Emit to chat room for message deletion
    req.app.get("io").to(message.chatId.toString()).emit("message-deleted", { messageId: req.params.id });

    res.json({ success: true });
  } catch (err) {
    console.error("❌ DELETE FOR EVERYONE ERROR:", err);
    res.status(500).json({ message: "Failed to delete message for everyone" });
  }
};

module.exports = {
  getOrCreateChat,
  getMessages,
  sendMessage,
  uploadMessage,
  deleteForMe,
  deleteForEveryone,
};
