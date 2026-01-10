// backend/controllers/userController.js
const User = require("../models/User");
const Chat = require("../models/Chat");
const cloudinary = require("../config/cloudinary");

/**
 * GET sidebar users with chat info
 * GET /users/sidebar
 */
const getSidebarUsers = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;

    // ✅ FIX: include email & about
    const users = await User.find({ _id: { $ne: loggedInUserId } })
      .select("name avatar email about isOnline lastSeen");

    const chats = await Chat.find({
      participants: { $in: [loggedInUserId] },
    }).populate("lastMessage", "text");

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
        email: user.email,
        about: user.about,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        chatId: chat?._id || null,
        lastMessage: chat?.lastMessage?.text || "No messages yet",
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

/**
 * UPDATE PROFILE
 * PUT /users/profile
 */
const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { name, about } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (name) user.name = name.trim();
    if (about) user.about = about.trim();

    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "chat_app/avatars",
      });
      user.avatar = result.secure_url;
    }

    await user.save();

    res.status(200).json({
      message: "Profile updated successfully",
      user,
    });
  } catch (error) {
    console.error("UPDATE PROFILE ERROR ❌", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getSidebarUsers, updateProfile };
