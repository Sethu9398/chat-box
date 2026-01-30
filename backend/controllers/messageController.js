const mongoose = require("mongoose");
const Message = require("../models/Message");
const Chat = require("../models/Chat");
const GroupChat = require("../models/GroupChat");


const getChatContext = async (chatId) => {
  const group = await GroupChat.findById(chatId);
  if (group) {
    return { type: "group", data: group };
  }

  const chat = await Chat.findById(chatId);
  return { type: "private", data: chat };
};


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
}

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
   HELPER: CALCULATE GROUP MESSAGE STATUS
========================= */
const calculateGroupMessageStatus = async (messageId, chatId, senderId, io, onlineUsers) => {
  try {
    const group = await GroupChat.findById(chatId).populate("members", "_id");
    if (!group) return "sent";

    const members = group.members.filter(m => m._id.toString() !== senderId);
    if (members.length === 0) return "sent";

    // Check if any member is viewing the chat (has opened the group chat)
    // io.sockets.adapter.rooms.get(chatId) returns a Set of socket IDs in that room
    const viewingRoom = io.sockets.adapter.rooms.get(chatId.toString());
    const viewingMembers = members.filter(m => {
      const socketId = onlineUsers.get(m._id.toString());
      return socketId && viewingRoom && viewingRoom.has(socketId);
    });

    if (viewingMembers.length > 0) {
      return "read";
    }

    // Check if any member is online (but not viewing the chat)
    const onlineMembers = members.filter(m => onlineUsers.has(m._id.toString()));

    if (onlineMembers.length > 0) {
      return "delivered";
    }

    return "sent";
  } catch (err) {
    console.error("Error calculating group message status:", err);
    return "sent";
  }
};

/* =========================
   HELPER: UPDATE GROUP MESSAGE STATUSES
========================= */
const updateGroupMessageStatuses = async (chatId, io, onlineUsers) => {
  try {
    // Only check messages that are not already read
    const messages = await Message.find({
      chatId,
      status: { $ne: "read" }
    }).populate("sender", "_id");

    for (const message of messages) {
      const newStatus = await calculateGroupMessageStatus(
        message._id.toString(),
        chatId,
        message.sender._id.toString(),
        io,
        onlineUsers
      );
      
      if (newStatus !== message.status) {
        // Update database
        await Message.findByIdAndUpdate(message._id, { status: newStatus });
        
        // Emit status update to sender
        io.to(message.sender._id.toString()).emit("status-update", {
          messageId: message._id.toString(),
          status: newStatus
        });
      }
    }
  } catch (err) {
    console.error("Error updating group message statuses:", err);
  }
};

/* =========================
   GET MESSAGES
========================= */
const getMessages = async (req, res) => {
  const { chatId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(chatId)) {
    return res.status(400).json({ message: "Invalid chatId" });
  }

  const { type } = await getChatContext(chatId);

  const messages = await Message.find({
    chatId,
    deletedBy: { $ne: req.user._id }
  })
    .populate("sender", "name avatar")
    .populate("replyTo")
    .sort({ createdAt: 1 });

  // ✅ GROUP CHAT - Mark as read only for the current user viewing
  if (type === "group") {
    // Mark messages as read for the current user (they are viewing the chat)
    await Message.updateMany(
      {
        chatId,
        sender: { $ne: req.user._id },
        deletedBy: { $ne: req.user._id },
        deletedForAll: false
      },
      { status: "read" }
    );

    // Update statuses for all messages in the group based on current state
    const io = req.app.get("io");
    const onlineUsers = req.app.get("onlineUsers");
    await updateGroupMessageStatuses(chatId, io, onlineUsers);

    // Get last message for sidebar update
    const lastMessage = await Message.findOne({
      chatId,
      deletedForAll: false,
      deletedBy: { $ne: req.user._id }
    }).sort({ createdAt: -1 }).populate("sender", "name");

    let lastMessageText = "No messages yet";
    let lastMessageCreatedAt = null;

    if (lastMessage) {
      lastMessageCreatedAt = lastMessage.createdAt.toISOString();
      const senderName = lastMessage.sender._id.toString() === req.user._id.toString() ? "You" : lastMessage.sender.name;
      if (lastMessage.type === "text") {
        lastMessageText = `${senderName}: ${lastMessage.text}`;
      } else if (lastMessage.type === "image") {
        lastMessageText = `${senderName}: 📷 Photo`;
      } else if (lastMessage.type === "video") {
        lastMessageText = `${senderName}: 🎥 Video`;
      } else if (lastMessage.type === "file") {
        lastMessageText = `${senderName}: 📎 File`;
      } else {
        lastMessageText = `${senderName}: Message`;
      }
    }

    req.app.get("io").to(req.user._id.toString()).emit("sidebar-message-update", {
      chatId: chatId.toString(),
      lastMessageText,
      lastMessageCreatedAt,
      unreadCount: 0,
      scope: "read-update",
      isGroup: true
    });

    return res.json(messages);
  }

  // ✅ PRIVATE CHAT (UNCHANGED)
  const onlineUsers = req.app.get("onlineUsers");

  if (onlineUsers.has(req.user._id.toString())) {
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
  }

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

  // Get last message for sidebar update
  const lastMessagePrivate = await Message.findOne({
    chatId,
    deletedForAll: false,
    deletedBy: { $ne: req.user._id }
  }).sort({ createdAt: -1 });

  let lastMessageText = "No messages yet";
  let lastMessageCreatedAt = null;

  if (lastMessagePrivate) {
    lastMessageCreatedAt = lastMessagePrivate.createdAt.toISOString();
    if (lastMessagePrivate.type === "text") {
      lastMessageText = lastMessagePrivate.text;
    } else if (lastMessagePrivate.type === "image") {
      lastMessageText = "📷 Photo";
    } else if (lastMessagePrivate.type === "video") {
      lastMessageText = "🎥 Video";
    } else if (lastMessagePrivate.type === "file") {
      lastMessageText = "📎 File";
    } else {
      lastMessageText = "Message";
    }
  }

  req.app.get("io").to(req.user._id.toString()).emit("sidebar-message-update", {
    chatId: chatId.toString(),
    lastMessageText,
    lastMessageCreatedAt,
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

    const { type: chatType, data } = await getChatContext(chatId);

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

    const populated = await message.populate([
      { path: "sender", select: "name avatar" },
      { path: "replyTo" }
    ]);

    populated.chatId = populated.chatId.toString();

    // ✅ GROUP CHAT
    if (chatType === "group") {
      await GroupChat.findByIdAndUpdate(chatId, { lastMessage: message._id });

      for (const member of data.members) {
        req.app.get("io").to(member.toString()).emit("new-message", populated);
      }

      // Emit sidebar updates for group chat
      for (const member of data.members) {
        let lastMessageText;
        if (member.toString() === req.user._id.toString()) {
          // For sender
          const msgType = populated.type === "text" ? populated.text :
                         populated.type === "image" ? "📷 Photo" :
                         populated.type === "video" ? "🎥 Video" :
                         populated.type === "file" ? "📎 File" : "Message";
          lastMessageText = `You: ${msgType}`;
        } else {
          // For other members
          const senderName = populated.sender.name;
          const msgType = populated.type === "text" ? populated.text :
                         populated.type === "image" ? "📷 Photo" :
                         populated.type === "video" ? "🎥 Video" :
                         populated.type === "file" ? "📎 File" : "Message";
          lastMessageText = `${senderName}: ${msgType}`;
        }

        req.app.get("io").to(member.toString()).emit("sidebar-message-update", {
          chatId: chatId.toString(),
          lastMessageText,
          lastMessageCreatedAt: populated.createdAt.toISOString(),
          unreadCount: member.toString() === req.user._id.toString() ? 0 : 0, // For now, set to 0; can be calculated later
          scope: member.toString() === req.user._id.toString() ? "for-me" : "for-everyone"
        });
      }

      return res.status(201).json(populated);
    }

    // ✅ PRIVATE CHAT (UNCHANGED)
    await Chat.findByIdAndUpdate(chatId, { lastMessage: message._id });
    req.app.get("io").to(chatId.toString()).emit("new-message", populated);

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

    const { type: chatType, data } = await getChatContext(chatId);

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

    // ✅ GROUP CHAT
    if (chatType === "group") {
      await GroupChat.findByIdAndUpdate(chatId, { lastMessage: message._id });

      const populated = await message.populate([
        { path: "sender", select: "name avatar" },
        { path: "replyTo" }
      ]);

      populated.chatId = populated.chatId.toString();

      for (const member of data.members) {
        req.app.get("io").to(member.toString()).emit("new-message", populated);
      }

      // Emit sidebar updates for group chat
      for (const member of data.members) {
        let lastMessageText;
        if (member.toString() === req.user._id.toString()) {
          // For sender
          const msgType = populated.type === "text" ? populated.text :
                         populated.type === "image" ? "📷 Photo" :
                         populated.type === "video" ? "🎥 Video" :
                         populated.type === "file" ? "📎 File" : "Message";
          lastMessageText = `You: ${msgType}`;
        } else {
          // For other members
          const senderName = populated.sender.name;
          const msgType = populated.type === "text" ? populated.text :
                         populated.type === "image" ? "📷 Photo" :
                         populated.type === "video" ? "🎥 Video" :
                         populated.type === "file" ? "📎 File" : "Message";
          lastMessageText = `${senderName}: ${msgType}`;
        }

        req.app.get("io").to(member.toString()).emit("sidebar-message-update", {
          chatId: chatId.toString(),
          lastMessageText,
          lastMessageCreatedAt: populated.createdAt.toISOString(),
          unreadCount: member.toString() === req.user._id.toString() ? 0 : 0, // For now, set to 0; can be calculated later
          scope: member.toString() === req.user._id.toString() ? "for-me" : "for-everyone"
        });
      }

      return res.status(201).json(populated);
    }

    // ✅ PRIVATE CHAT
    await Chat.findByIdAndUpdate(chatId, { lastMessage: message._id });

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
        // Emit new-message to each participant for real-time sidebar updates
        req.app.get("io").to(participant._id.toString()).emit("new-message", populated);
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

        // Format lastMessageText with sender name for groups
        let lastMessageText = populated.type === "text" ? populated.text : (populated.type === "image" ? "📷 Photo" : populated.type === "video" ? "🎥 Video" : populated.type === "file" ? "📎 File" : "Message");
        if (chatType === "group") {
          const senderName = populated.sender._id.toString() === participant._id.toString() ? "You" : populated.sender.name;
          lastMessageText = `${senderName}: ${lastMessageText}`;
        }

        req.app.get("io").to(participant._id.toString()).emit("sidebar-message-update", {
          chatId: chatId.toString(),
          lastMessageText,
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

    // Get chat context to determine if it's group or private
    const { type: chatType, data: chatData } = await getChatContext(message.chatId);

    // Recalculate lastMessage based on chat type
    const newLastMessage = await Message.findOne({
      chatId: message.chatId,
      deletedForAll: false
    }).sort({ createdAt: -1 });

    if (chatType === "group") {
      await GroupChat.findByIdAndUpdate(message.chatId, {
        lastMessage: newLastMessage ? newLastMessage._id : null
      });
    } else {
      await Chat.findByIdAndUpdate(message.chatId, {
        lastMessage: newLastMessage ? newLastMessage._id : null
      });
    }

    // Get chat participants/members
    const participants = chatType === "group" ? chatData.members : chatData.participants;

    // Emit sidebar updates to all participants
    for (const participant of participants) {
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

            // Format with sender name for groups
            if (chatType === "group") {
              const senderName = mostRecentMessage.sender._id.toString() === participant._id.toString() ? "You" : mostRecentMessage.sender.name;
              lastMessageText = `${senderName}: ${lastMessageText}`;
            }
          } else {
            // If the most recent is not visible, find the last visible one
            const lastVisibleMessage = await getLastVisibleMessage(message.chatId, participant._id);
            if (lastVisibleMessage) {
              lastMessageText = getLastMessageText(lastVisibleMessage);
              lastMessageCreatedAt = lastVisibleMessage.createdAt.toISOString();

              // Format with sender name for groups
              if (chatType === "group") {
                const senderName = lastVisibleMessage.sender._id.toString() === participant._id.toString() ? "You" : lastVisibleMessage.sender.name;
                lastMessageText = `${senderName}: ${lastMessageText}`;
              }
            } else {
              lastMessageText = "No messages yet";
              lastMessageCreatedAt = chatType === "group" ? chatData.updatedAt.toISOString() : null;
            }
          }
        }
      } else {
        // No messages at all
        lastMessageCreatedAt = chatType === "group" ? chatData.updatedAt.toISOString() : null;
      }

      req.app.get("io").to(participant._id.toString()).emit("sidebar-message-update", {
        chatId: message.chatId.toString(),
        lastMessageText,
        lastMessageCreatedAt,
        scope: "for-everyone",
        isGroup: chatType === "group",
        groupUpdatedAt: chatType === "group" ? chatData.updatedAt.toISOString() : null
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
  calculateGroupMessageStatus,
  updateGroupMessageStatuses,
};
