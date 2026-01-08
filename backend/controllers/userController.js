// backend/controllers/userController.js
const User = require("../models/User");
const Chat = require("../models/Chat");

/**
 * GET sidebar users with chat info
 * GET /users/sidebar
 */
const getSidebarUsers = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;

    // 1️⃣ Get all users except logged-in user
    const users = await User.find({ _id: { $ne: loggedInUserId } })
      .select("name avatar isOnline lastSeen");

    // 2️⃣ Get chats involving logged-in user
    const chats = await Chat.find({
      participants: loggedInUserId,
    });

    // 3️⃣ Merge chat info into users
    const sidebarUsers = users.map((user) => {
      const chat = chats.find((c) =>
        c.participants.some(
          (id) => id.toString() === user._id.toString()
        )
      );

      return {
        _id: user._id,
        name: user.name,
        avatar: user.avatar,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,

        // chat info
        chatId: chat?._id || null,
        lastMessage: chat?.lastMessage || "",
        unreadCount:
          chat?.unreadCount?.get(loggedInUserId.toString()) || 0,
      };
    });

    res.status(200).json(sidebarUsers);
  } catch (error) {
    console.error("SIDEBAR USERS ERROR ❌", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getSidebarUsers };
