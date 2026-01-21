const Message = require("../models/Message");
const Chat = require("../models/Chat");
const User = require("../models/User");

const socketServer = (io, onlineUsers) => {
  io.on("connection", (socket) => {
    console.log("🔌 Socket connected:", socket.id);

    /* USER ONLINE */
    socket.on("user-online", async (userId) => {
      try {
        // Update user status in DB
        await User.findByIdAndUpdate(userId, {
          isOnline: true,
          lastSeen: null // Clear last seen when coming online
        });

        onlineUsers.set(userId, socket.id);
        socket.join(userId); // Join socket to user room for targeted emits
        io.emit("online-users", Array.from(onlineUsers.keys()));
        // Emit individual status update
        io.emit("user-status-update", { userId, isOnline: true, lastSeen: null });

        // Mark pending messages as delivered
        const chats = await Chat.find({ participants: userId });
        for (const chat of chats) {
          const pendingMessages = await Message.find({
            chatId: chat._id,
            sender: { $ne: userId },
            status: "sent",
            deletedForAll: false,
            deletedBy: { $ne: userId }
          }).select("_id sender");

          if (pendingMessages.length > 0) {
            // Update messages to delivered
            await Message.updateMany(
              {
                chatId: chat._id,
                sender: { $ne: userId },
                status: "sent",
                deletedForAll: false,
                deletedBy: { $ne: userId }
              },
              { status: "delivered" }
            );

            // Emit status updates to senders
            for (const msg of pendingMessages) {
              io.to(msg.sender.toString()).emit("status-update", {
                messageId: msg._id.toString(),
                status: "delivered"
              });
            }
          }
        }

        // Also check for messages sent by this user that can be marked as delivered
        const sentMessages = await Message.find({
          sender: userId,
          status: "sent",
          deletedForAll: false,
          deletedBy: { $ne: userId }
        }).populate('chatId');

        for (const msg of sentMessages) {
          const chat = msg.chatId;
          const otherParticipants = chat.participants.filter(p => p.toString() !== userId);
          const anyOnline = otherParticipants.some(p => onlineUsers.has(p.toString()));
          if (anyOnline) {
            await Message.findByIdAndUpdate(msg._id, { status: "delivered" });
            io.to(userId).emit("status-update", {
              messageId: msg._id.toString(),
              status: "delivered"
            });
          }
        }

        // Emit status updates for messages sent by this user that are already delivered or read
        const deliveredOrReadMessages = await Message.find({
          sender: userId,
          status: { $in: ["delivered", "read"] },
          deletedForAll: false,
          deletedBy: { $ne: userId }
        }).select("_id status");

        for (const msg of deliveredOrReadMessages) {
          io.to(userId).emit("status-update", {
            messageId: msg._id.toString(),
            status: msg.status
          });
        }
      } catch (err) {
        console.error("❌ USER ONLINE UPDATE ERROR:", err);
      }
    });

    /* USER OFFLINE */
    socket.on("user-offline", async (userId) => {
      try {
        onlineUsers.delete(userId);
        // Update user status in DB
        await User.findByIdAndUpdate(userId, {
          isOnline: false,
          lastSeen: new Date()
        });
        io.emit("online-users", Array.from(onlineUsers.keys()));
      } catch (err) {
        console.error("❌ USER OFFLINE UPDATE ERROR:", err);
      }
    });

    /* JOIN CHAT */
    socket.on("join-chat", (chatId) => {
      socket.join(chatId);
    });

    /* LEAVE CHAT */
    socket.on("leave-chat", (chatId) => {
      socket.leave(chatId);
    });

    /* TYPING INDICATOR */
    socket.on("start-typing", (data) => {
      const { chatId, userId } = data;
      socket.to(chatId).emit("user-typing", { chatId, userId });
    });

    socket.on("stop-typing", (data) => {
      const { chatId, userId } = data;
      socket.to(chatId).emit("user-stop-typing", { chatId, userId });
    });

    /* TEXT MESSAGE ONLY */
    socket.on("send-message", async (data) => {
      try {
        const message = await Message.create(data);

        await Chat.findByIdAndUpdate(data.chatId, {
          lastMessage: message._id,
        });

        const populated = await message.populate([
          { path: "sender", select: "name avatar" },
          { path: "replyTo" }
        ]);

        // Convert chatId to string for socket emission
        populated.chatId = populated.chatId.toString();

        // 🔥 IMPORTANT: SEND TO SOCKET CLIENTS
        io.to(data.chatId).emit("new-message", populated);

        // Get chat participants for delivery check and sidebar update
        const chatDoc = await Chat.findById(data.chatId).populate("participants");

        // Mark message as delivered if receiver is online
        for (const participant of chatDoc.participants) {
          if (participant._id.toString() !== data.sender.toString()) {
            const isReceiverOnline = onlineUsers.has(participant._id.toString());
            if (isReceiverOnline) {
              await Message.findByIdAndUpdate(message._id, { status: "delivered" });
              io.to(data.sender.toString()).emit("status-update", {
                messageId: message._id.toString(),
                status: "delivered"
              });
            }
            // Emit new-message to each participant for real-time sidebar updates
            io.to(participant._id.toString()).emit("new-message", populated);
          }
        }

        // Update sidebar for all participants except sender (who will get direct update)
        for (const participant of chatDoc.participants) {
          if (participant._id.toString() !== data.sender.toString()) {
            // Check if participant is currently viewing the chat
            const socketId = onlineUsers.get(participant._id.toString());
            const isViewingChat = socketId && io.sockets.adapter.rooms.get(data.chatId.toString())?.has(socketId);
            let unreadCount = 0;
            if (!isViewingChat) {
              // Calculate unread count for this participant
              unreadCount = await Message.countDocuments({
                chatId: data.chatId,
                sender: { $ne: participant._id },
                status: { $ne: "read" },
                deletedBy: { $ne: participant._id },
                deletedForAll: false
              });
            }

            io.to(participant._id.toString()).emit("sidebar-message-update", {
              chatId: data.chatId.toString(),
              lastMessageText: populated.type === "text" ? populated.text : (populated.type === "image" ? "📷 Photo" : populated.type === "video" ? "🎥 Video" : populated.type === "file" ? "📎 File" : "Message"),
              lastMessageCreatedAt: populated.createdAt.toISOString(),
              unreadCount,
              scope: "for-everyone"
            });
          }
        }

        // Update sidebar for sender
        io.to(data.sender.toString()).emit("sidebar-message-update", {
          chatId: data.chatId.toString(),
          lastMessageText: populated.type === "text" ? populated.text : (populated.type === "image" ? "📷 Photo" : populated.type === "video" ? "🎥 Video" : populated.type === "file" ? "📎 File" : "Message"),
          lastMessageCreatedAt: populated.createdAt.toISOString(),
          scope: "for-me"
        });
      } catch (err) {
        console.error("❌ SOCKET MESSAGE ERROR:", err);
      }
    });

    /* DISCONNECT */
    socket.on("disconnect", async () => {
      for (let [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
          onlineUsers.delete(userId);
          try {
            // Update user status in DB
            const updatedUser = await User.findByIdAndUpdate(userId, {
              isOnline: false,
              lastSeen: new Date()
            }, { new: true });
            // Emit individual status update with lastSeen
            io.emit("user-status-update", {
              userId,
              isOnline: false,
              lastSeen: updatedUser.lastSeen.toISOString()
            });
          } catch (err) {
            console.error("❌ USER OFFLINE UPDATE ERROR:", err);
          }
          break;
        }
      }

      io.emit("online-users", Array.from(onlineUsers.keys()));
      console.log("❌ Socket disconnected:", socket.id);
    });
  });
};

module.exports = socketServer;
