// backend/controllers/userController.js
const User = require("../models/User");
const Chat = require("../models/Chat");
const Message = require("../models/Message");
const cloudinary = require("../config/cloudinary");

/**
 * GET sidebar users with chat info
 * GET /users/sidebar
 */
const getSidebarUsers = async (req, res) => {
  try {
    const myId = req.user._id;

    const users = await User.find({ _id: { $ne: myId } })
      .select("name avatar isOnline lastSeen");

    const chats = await Chat.find({
      participants: myId,
    })
      .populate({
        path: "lastMessage",
        select: "text type fileName",
      });

    const sidebarUsers = await Promise.all(users.map(async (user) => {
      const chat = chats.find((c) =>
        c.participants.some(
          (id) => id.toString() === user._id.toString()
        )
      );

      let lastMessageText = "No messages yet";

      if (chat) {
        // Find the most recent message in the chat (regardless of deletion)
        const mostRecentMessage = await Message.findOne({
          chatId: chat._id
        }).sort({ createdAt: -1 });

        if (mostRecentMessage) {
          if (mostRecentMessage.deletedForAll) {
            lastMessageText = "This message was deleted";
          } else {
            // Check if this message is visible to the user
            const isVisible = !mostRecentMessage.deletedBy.includes(myId);
            if (isVisible) {
              if (mostRecentMessage.type === "text") lastMessageText = mostRecentMessage.text;
              else if (mostRecentMessage.type === "image") lastMessageText = "📷 Photo";
              else if (mostRecentMessage.type === "video") lastMessageText = "🎥 Video";
              else if (mostRecentMessage.type === "file") lastMessageText = "📎 File";
            } else {
              // If the most recent is not visible, find the last visible one
              const lastVisibleMessage = await Message.findOne({
                chatId: chat._id,
                deletedForAll: false,
                deletedBy: { $ne: myId }
              }).sort({ createdAt: -1 });

              if (lastVisibleMessage) {
                if (lastVisibleMessage.type === "text") lastMessageText = lastVisibleMessage.text;
                else if (lastVisibleMessage.type === "image") lastMessageText = "📷 Photo";
                else if (lastVisibleMessage.type === "video") lastMessageText = "🎥 Video";
                else if (lastVisibleMessage.type === "file") lastMessageText = "📎 File";
              }
            }
          }
        }
      }

      return {
        _id: user._id,
        name: user.name,
        avatar: user.avatar,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,

        chatId: chat?._id || null,
        lastMessage: lastMessageText,

        // ✅ TEMP unread logic (0 for now)
        unreadCount: 0,
      };
    }));

    res.status(200).json(sidebarUsers);
  } catch (err) {
    console.error("SIDEBAR ERROR ❌", err);
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

/**
 * GET user details by ID
 * GET /users/:id
 */
const getUserDetails = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId).select("name email about avatar isOnline lastSeen");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (err) {
    console.error("GET USER DETAILS ERROR ❌", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getSidebarUsers, updateProfile, getUserDetails };
