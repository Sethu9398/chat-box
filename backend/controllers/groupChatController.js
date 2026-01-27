const mongoose = require("mongoose");
const GroupChat = require("../models/GroupChat");

/* CREATE GROUP */
const createGroup = async (req, res) => {
  const { name, members: membersStr } = req.body;
  const members = JSON.parse(membersStr);

  if (!name || !members || members.length < 2) {
    return res.status(400).json({ message: "Minimum 3 users required" });
  }

  let avatarUrl = null;
  if (req.file) {
    // Upload to Cloudinary
    const cloudinary = require("../config/cloudinary");
    const stream = require("stream");
    try {
      const bufferStream = new stream.PassThrough();
      bufferStream.end(req.file.buffer);

      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream({
          folder: "chat/groups",
          resource_type: "auto",
          public_id: `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timeout: 300000,
        }, (error, result) => {
          if (error) reject(error);
          else resolve(result);
        });
        bufferStream.pipe(uploadStream);
      });
      avatarUrl = result.secure_url;
    } catch (cloudinaryError) {
      console.error("Cloudinary upload error:", cloudinaryError);
      return res.status(500).json({
        message: "Avatar upload failed",
        error: cloudinaryError.message,
      });
    }
  }

  const group = await GroupChat.create({
    name,
    members: [...members.map(id => new mongoose.Types.ObjectId(id)), req.user._id],
    admins: [req.user._id],
    avatar: avatarUrl,
  });

  const populated = await GroupChat.findById(group._id)
    .populate("members", "name avatar isOnline")
    .populate("admins", "name avatar");

  // Emit socket event to all members for real-time sidebar update
  const io = req.app.get('io');
  populated.members.forEach(member => {
    io.to(member._id.toString()).emit('group-created', populated);
  });

  res.status(201).json(populated);
};

/* GET MY GROUPS */
const getMyGroups = async (req, res) => {
  const groups = await GroupChat.find({
    members: req.user._id,
  })
    .populate({
      path: "lastMessage",
      populate: {
        path: "sender",
        select: "name"
      }
    })
    .populate("members", "name avatar isOnline");

  // Format lastMessage as string for consistency with real-time updates
  groups.forEach(group => {
    if (group.lastMessage) {
      if (group.lastMessage.deletedForAll) {
        group.lastMessage = "This message was deleted";
      } else {
        const senderName = group.lastMessage.sender._id.toString() === req.user._id.toString() ? "You" : group.lastMessage.sender.name;
        let messageText = "";
        if (group.lastMessage.type === "text") {
          messageText = group.lastMessage.text;
        } else if (group.lastMessage.type === "image") {
          messageText = "📷 Photo";
        } else if (group.lastMessage.type === "video") {
          messageText = "🎥 Video";
        } else if (group.lastMessage.type === "file") {
          messageText = "📎 File";
        } else {
          messageText = "Message";
        }
        group.lastMessage = `${senderName}: ${messageText}`;
      }
    } 
    else {
      group.lastMessage = "No messages yet";
    }
  });

  res.json(groups);
};

module.exports = { createGroup, getMyGroups };