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

  // Mark messages as read (messages not sent by current user)
  await Message.updateMany(
    {
      chatId,
      sender: { $ne: req.user._id },
      status: { $ne: "read" },
      deletedBy: { $ne: req.user._id },
      deletedForAll: false
    },
    { status: "read" }
  );

  // Emit sidebar update to mark unread count as 0 for this chat
  req.app.get("io").to(req.user._id.toString()).emit("sidebar-message-update", {
    chatId: chatId.toString(),
    unreadCount: 0,
    scope: "read-update"
  });

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

    // Update sidebar for all participants except sender (who will get direct update)
    const chat = await Chat.findById(chatId).populate("participants");
    const io = req.app.get("io");
    const onlineUsers = req.app.get("onlineUsers");
    for (const participant of chat.participants) {
      if (participant._id.toString() !== req.user._id.toString()) {
        // Check if participant is currently viewing the chat
        const socketId = onlineUsers.get(participant._id.toString());
        const isViewingChat = socketId && io.sockets.adapter.rooms.get(chatId.toString())?.has(socketId);
        let unreadCount = 0;
        if (!isViewingChat) {
          // Calculate unread count for this participant
          unreadCount = await Message.countDocuments({
            chatId,
            sender: { $ne: participant._id },
            status: { $ne: "read" },
            deletedBy: { $ne: participant._id },
            deletedForAll: false
          });
        }

        req.app.get("io").to(participant._id.toString()).emit("sidebar-message-update", {
          chatId: chatId.toString(),
          lastMessageText: populated.type === "text" ? populated.text : (populated.type === "image" ? "📷 Photo" : populated.type === "video" ? "🎥 Video" : populated.type === "file" ? "📎 File" : "Message"),
          lastMessageCreatedAt: populated.createdAt.toISOString(),
          unreadCount,
          scope: "for-everyone"
        });
      }
    }

    // Update sidebar for sender
    req.app.get("io").to(req.user._id.toString()).emit("sidebar-message-update", {
      chatId: chatId.toString(),
      lastMessageText: populated.type === "text" ? populated.text : (populated.type === "image" ? "📷 Photo" : populated.type === "video" ? "🎥 Video" : populated.type === "file" ? "📎 File" : "Message"),
      lastMessageCreatedAt: populated.createdAt.toISOString(),
      scope: "for-me"
    });

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

    const file = req.file;

    // ✅ CORRECT CLOUDINARY URL
    const mediaUrl = file.path;

    const message = await Message.create({
      chatId,
      sender: req.user._id,
      type,
      mediaUrl,
      fileName: file.originalname,
      fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
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

    // 🔥 REALTIME UPDATES
    req.app.get("io").to(chatId.toString()).emit("new-message", populated);

    // Update sidebar for all participants except sender (who will get direct update)
    const chat = await Chat.findById(chatId).populate("participants");
    const io = req.app.get("io");
    const onlineUsers = req.app.get("onlineUsers");
    for (const participant of chat.participants) {
      if (participant._id.toString() !== req.user._id.toString()) {
        // Check if participant is currently viewing the chat
        const socketId = onlineUsers.get(participant._id.toString());
        const isViewingChat = socketId && io.sockets.adapter.rooms.get(chatId.toString())?.has(socketId);
        let unreadCount = 0;
        if (!isViewingChat) {
          // Calculate unread count for this participant
          unreadCount = await Message.countDocuments({
            chatId,
            sender: { $ne: participant._id },
            status: { $ne: "read" },
            deletedBy: { $ne: participant._id },
            deletedForAll: false
          });
        }

        req.app.get("io").to(participant._id.toString()).emit("sidebar-message-update", {
          chatId: chatId.toString(),
          lastMessageText: populated.type === "text" ? populated.text : (populated.type === "image" ? "📷 Photo" : populated.type === "video" ? "🎥 Video" : populated.type === "file" ? "📎 File" : "Message"),
          lastMessageCreatedAt: populated.createdAt.toISOString(),
          unreadCount,
          scope: "for-everyone"
        });
      }
    }

    // Update sidebar for sender
    req.app.get("io").to(req.user._id.toString()).emit("sidebar-message-update", {
      chatId: chatId.toString(),
      lastMessageText: populated.type === "text" ? populated.text : (populated.type === "image" ? "📷 Photo" : populated.type === "video" ? "🎥 Video" : populated.type === "file" ? "📎 File" : "Message"),
          lastMessageCreatedAt: populated.createdAt.toISOString(),
          scope: "for-me"
    });

    res.status(201).json(populated);
  } catch (err) {
    console.error("❌ UPLOAD MESSAGE ERROR:", err);
    res.status(500).json({
      message: "File upload failed",
      error: err.message,
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
        lastMessageCreatedAt: newLastVisibleMessage ? newLastVisibleMessage.createdAt.toISOString() : null,
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
        lastMessageCreatedAt: lastVisibleMessage ? lastVisibleMessage.createdAt.toISOString() : null,
        scope: "for-everyone"
      });
    }

    // Emit to chat room for message deletion
    req.app.get("io").to(message.chatId.toString()).emit("message-deleted", { messageId: req.params.id });

    res.json({ success: true })
  } catch (err) {
    console.error("❌ DELETE FOR EVERYONE ERROR:", err);
    res.status(500).json({ message: "Failed to delete message for everyone" });
  }
};

/* =========================
   MARK AS READ
========================= */
const markAsRead = async (req, res) => {
  try {
    const { id: chatId } = req.params;

    // Mark all unread messages in the chat as read (messages not sent by current user)
    await Message.updateMany(
      {
        chatId,
        sender: { $ne: req.user._id },
        status: { $ne: "read" },
        deletedBy: { $ne: req.user._id },
        deletedForAll: false
      },
      { status: "read" }
    );

    // Emit status updates to senders
    const updatedMessages = await Message.find({
      chatId,
      sender: { $ne: req.user._id },
      status: "read",
      deletedBy: { $ne: req.user._id },
      deletedForAll: false
    }).select("_id sender");

    for (const msg of updatedMessages) {
      req.app.get("io").to(msg.sender.toString()).emit("status-update", {
        messageId: msg._id.toString(),
        status: "read"
      });
    }

    // Emit sidebar update to mark unread count as 0 for this chat
    req.app.get("io").to(req.user._id.toString()).emit("sidebar-message-update", {
      chatId: chatId.toString(),
      unreadCount: 0,
      scope: "read-update"
    });

    res.json({ success: true });
  } catch (err) {
    console.error("❌ MARK AS READ ERROR:", err);
    res.status(500).json({ message: "Failed to mark messages as read" });
  }
};

/* =========================
   MARK AS DELIVERED
========================= */
const markAsDelivered = async (req, res) => {
  try {
    const { id } = req.params;

    const message = await Message.findById(id);
    if (!message) return res.status(404).json({ message: "Message not found" });

    // Only update if status is "sent"
    if (message.status === "sent") {
      await Message.findByIdAndUpdate(id, { status: "delivered" });

      // Emit status update to sender
      req.app.get("io").to(message.sender.toString()).emit("status-update", {
        messageId: id,
        status: "delivered"
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("❌ MARK AS DELIVERED ERROR:", err);
    res.status(500).json({ message: "Failed to mark message as delivered" });
  }
};

module.exports = {
  getOrCreateChat,
  getMessages,
  sendMessage,
  uploadMessage,
  deleteForMe,
  deleteForEveryone,
  markAsRead,
  markAsDelivered,
};
