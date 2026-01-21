const mongoose = require("mongoose");
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

  // Validate chatId is a valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(chatId)) {
    return res.status(400).json({ message: "Invalid chatId" });
  }

  const messages = await Message.find({ chatId, deletedBy: { $ne: req.user._id } })
    .populate("sender", "name avatar")
    .populate("replyTo")
    .sort({ createdAt: 1 });

  // Mark messages as delivered if receiver is online (messages not sent by current user)
  const onlineUsers = req.app.get("onlineUsers");
  const isReceiverOnline = onlineUsers.has(req.user._id.toString());

  if (isReceiverOnline) {
    await Message.updateMany(
      {
        chatId,
        sender: { $ne: req.user._id },
        status: "sent",
        deletedBy: { $ne: req.user._id },
        deletedForAll: false
      },
      { status: "delivered" }
    );

    // Emit status updates to senders
    const deliveredMessages = await Message.find({
      chatId,
      sender: { $ne: req.user._id },
      status: "delivered",
      deletedBy: { $ne: req.user._id },
      deletedForAll: false
    }).select("_id sender");

    for (const msg of deliveredMessages) {
      req.app.get("io").to(msg.sender.toString()).emit("status-update", {
        messageId: msg._id.toString(),
        status: "delivered"
      });
    }
  }

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

    // Mark message as delivered if receiver is online
    const onlineUsers = req.app.get("onlineUsers");
    const chat = await Chat.findById(chatId).populate("participants");
    for (const participant of chat.participants) {
      if (participant._id.toString() !== req.user._id.toString()) {
        const isReceiverOnline = onlineUsers.has(participant._id.toString());
        if (isReceiverOnline) {
          await Message.findByIdAndUpdate(message._id, { status: "delivered" });
          req.app.get("io").to(req.user._id.toString()).emit("status-update", {
            messageId: message._id.toString(),
            status: "delivered"
          });
        }
      }
    }

    // Update sidebar for all participants except sender (who will get direct update)
    const io = req.app.get("io");
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

    // Upload to Cloudinary
    const cloudinary = require("../config/cloudinary");
    const stream = require("stream");
    let result;
    try {
      const bufferStream = new stream.PassThrough();
      bufferStream.end(file.buffer);

      result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream({
          folder: "chat/messages",
          resource_type: "auto",
          public_id: `message-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timeout: 300000, // 300 seconds timeout (5 minutes)
        }, (error, result) => {
          if (error) reject(error);
          else resolve(result);
        });
        bufferStream.pipe(uploadStream);
      });
    } catch (cloudinaryError) {
      console.error("Cloudinary upload error:", cloudinaryError);
      return res.status(500).json({
        message: "File upload to cloud failed",
        error: cloudinaryError.message,
      });
    }

    // ✅ CORRECT CLOUDINARY URL
    const mediaUrl = result.secure_url;

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

    // Mark message as delivered if receiver is online
    const onlineUsers = req.app.get("onlineUsers");
    const chat = await Chat.findById(chatId).populate("participants");
    for (const participant of chat.participants) {
      if (participant._id.toString() !== req.user._id.toString()) {
        const isReceiverOnline = onlineUsers.has(participant._id.toString());
        if (isReceiverOnline) {
          await Message.findByIdAndUpdate(message._id, { status: "delivered" });
          req.app.get("io").to(req.user._id.toString()).emit("status-update", {
            messageId: message._id.toString(),
            status: "delivered"
          });
        }
      }
    }

    // Update sidebar for all participants except sender (who will get direct update)
    const io = req.app.get("io");
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

    // Get the updated message
    const updatedMessage = await Message.findById(req.params.id).populate("sender", "name avatar").populate("replyTo");

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
      // Use the same logic as getSidebarUsers: check the most recent message first
      const mostRecentMessage = await Message.findOne({
        chatId: message.chatId
      }).sort({ createdAt: -1 });

      let lastMessageText = "No messages yet";
      let lastMessageCreatedAt = null;

      if (mostRecentMessage) {
        lastMessageCreatedAt = mostRecentMessage.createdAt.toISOString();
        if (mostRecentMessage.deletedForAll) {
          lastMessageText = "This message was deleted";
        } else {
          // Check if this message is visible to the user
          const isVisible = !mostRecentMessage.deletedBy.includes(participant._id);
          if (isVisible) {
            if (mostRecentMessage.type === "text") lastMessageText = mostRecentMessage.text;
            else if (mostRecentMessage.type === "image") lastMessageText = "📷 Photo";
            else if (mostRecentMessage.type === "video") lastMessageText = "🎥 Video";
            else if (mostRecentMessage.type === "file") lastMessageText = "📎 File";
          } else {
            // If the most recent is not visible, find the last visible one
            const lastVisibleMessage = await getLastVisibleMessage(message.chatId, participant._id);
            if (lastVisibleMessage) {
              lastMessageText = getLastMessageText(lastVisibleMessage);
              lastMessageCreatedAt = lastVisibleMessage.createdAt.toISOString();
            } else {
              lastMessageText = "No messages yet";
              lastMessageCreatedAt = null;
            }
          }
        }
      }

      req.app.get("io").to(participant._id.toString()).emit("sidebar-message-update", {
        chatId: message.chatId.toString(),
        lastMessageText,
        lastMessageCreatedAt,
        scope: "for-everyone"
      });
    }

    // Emit to chat room for message update (so it shows deleted immediately)
    updatedMessage.chatId = updatedMessage.chatId.toString();
    req.app.get("io").to(message.chatId.toString()).emit("message-updated", updatedMessage);

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
   GET RECENT MESSAGES (for notifications)
========================= */
const getRecentMessages = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get all chats where user is a participant
    const chats = await Chat.find({ participants: userId }).select('_id');

    if (chats.length === 0) {
      return res.json([]);
    }

    const chatIds = chats.map(chat => chat._id);

    // Get last 10 messages from all chats, excluding deleted ones
    const recentMessages = await Message.find({
      chatId: { $in: chatIds },
      deletedForAll: false,
      deletedBy: { $ne: userId }
    })
    .populate("sender", "name avatar")
    .populate("chatId", "participants")
    .sort({ createdAt: -1 })
    .limit(10);

    // Filter to only include messages from other users (not sent by current user)
    const filteredMessages = recentMessages.filter(msg =>
      msg.sender._id.toString() !== userId.toString()
    );

    res.json(filteredMessages);
  } catch (err) {
    console.error("❌ GET RECENT MESSAGES ERROR:", err);
    res.status(500).json({ message: "Failed to get recent messages" });
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
  getRecentMessages,
};
