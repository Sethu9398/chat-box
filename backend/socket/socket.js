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

        // Update sidebar for all participants except sender (who will get direct update)
        const chat = await Chat.findById(data.chatId).populate("participants");
        for (const participant of chat.participants) {
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
