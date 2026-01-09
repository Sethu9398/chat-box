const Message = require("../models/Message");
const Chat = require("../models/Chat");

const onlineUsers = new Map();

const socketServer = (io) => {
  io.on("connection", (socket) => {
    console.log("🔌 Socket connected:", socket.id);

    /* USER ONLINE */
    socket.on("user-online", (userId) => {
      onlineUsers.set(userId, socket.id);
      io.emit("online-users", Array.from(onlineUsers.keys()));
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

        const populated = await message.populate(
          "sender",
          "name avatar"
        );

        io.to(data.chatId).emit("new-message", populated);
      } catch (err) {
        console.error("❌ SOCKET MESSAGE ERROR:", err);
      }
    });

    /* DISCONNECT */
    socket.on("disconnect", () => {
      for (let [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
          onlineUsers.delete(userId);
          break;
        }
      }

      io.emit("online-users", Array.from(onlineUsers.keys()));
      console.log("❌ Socket disconnected:", socket.id);
    });
  });
};

module.exports = socketServer;
