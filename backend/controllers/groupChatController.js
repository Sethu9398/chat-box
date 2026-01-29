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
  const GroupMessage = require("../models/Message"); // For unread count
  
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
    .populate("members", "name avatar isOnline")
    .populate("admins", "name avatar");

  // Format lastMessage as string for consistency with real-time updates and add unread count
  const formattedGroups = await Promise.all(groups.map(async (group) => {
    let lastMessageCreatedAt = null;

    if (group.lastMessage) {
      lastMessageCreatedAt = group.lastMessage.createdAt;

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

    // Calculate unread count for this group
    const unreadCount = await GroupMessage.countDocuments({
      chatId: group._id,
      sender: { $ne: req.user._id },
      status: { $ne: "read" },
      deletedBy: { $ne: req.user._id },
      deletedForAll: false
    });

    // Convert to plain object and add unreadCount and lastMessageCreatedAt
    const groupObj = group.toObject();
    groupObj.unreadCount = unreadCount;
    groupObj.lastMessageCreatedAt = lastMessageCreatedAt ? lastMessageCreatedAt.toISOString() : null;

    return groupObj;
  }));

  // Sort by lastMessageCreatedAt descending (most recent first)
  formattedGroups.sort((a, b) => {
    const aTime = a.lastMessageCreatedAt ? new Date(a.lastMessageCreatedAt) : new Date(0);
    const bTime = b.lastMessageCreatedAt ? new Date(b.lastMessageCreatedAt) : new Date(0);
    return bTime - aTime;
  });

  res.json(formattedGroups);
};

/* LEAVE GROUP */
const leaveGroup = async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user._id;

  try {
    const group = await GroupChat.findById(groupId);
    
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if user is a member
    const isMember = group.members.some(member => member.toString() === userId.toString());
    if (!isMember) {
      return res.status(400).json({ message: "User is not a member of this group" });
    }

    // Remove user from members
    group.members = group.members.filter(member => member.toString() !== userId.toString());
    
    // Remove user from admins if they are an admin
    group.admins = group.admins.filter(admin => admin.toString() !== userId.toString());

    await group.save();

    // Emit socket event
    const io = req.app.get('io');
    io.to(groupId).emit('member-left', {
      groupId,
      userId,
      group
    });

    res.json({ message: "Left group successfully", group });
  } catch (error) {
    res.status(500).json({ message: "Error leaving group", error: error.message });
  }
};

/* DELETE GROUP */
const deleteGroup = async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user._id;

  try {
    const group = await GroupChat.findById(groupId);
    
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if user is an admin
    const isAdmin = group.admins.some(admin => admin.toString() === userId.toString());
    if (!isAdmin) {
      return res.status(403).json({ message: "Only admins can delete the group" });
    }

    // Get all member IDs before deletion
    const memberIds = group.members.map(m => m.toString());

    // Delete all messages in this group
    const Message = require("../models/Message");
    await Message.deleteMany({ chatId: groupId });

    // Delete the group
    await GroupChat.findByIdAndDelete(groupId);

    // Emit socket event to all members
    const io = req.app.get('io');
    memberIds.forEach(memberId => {
      io.to(memberId).emit('group-deleted', {
        groupId,
        message: 'Group has been deleted'
      });
    });

    res.json({ message: "Group deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting group", error: error.message });
  }
};

/* UPDATE GROUP (NAME & AVATAR) */
const updateGroup = async (req, res) => {
  const { groupId } = req.params;
  const { name } = req.body;
  const userId = req.user._id;

  try {
    const group = await GroupChat.findById(groupId);
    
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if user is an admin
    const isAdmin = group.admins.some(admin => admin.toString() === userId.toString());
    if (!isAdmin) {
      return res.status(403).json({ message: "Only admins can update the group" });
    }

    // Update name
    if (name && name.trim()) {
      group.name = name.trim();
    }

    // Update avatar if file provided
    if (req.file) {
      const cloudinary = require("../config/cloudinary");
      const stream = require("stream");
      try {
        const bufferStream = new stream.PassThrough();
        bufferStream.end(req.file.buffer);

        const result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream({
            folder: "chat/groups",
            resource_type: "auto",
            public_id: `group-${groupId}-${Date.now()}`,
            timeout: 300000,
          }, (error, result) => {
            if (error) reject(error);
            else resolve(result);
          });
          bufferStream.pipe(uploadStream);
        });
        group.avatar = result.secure_url;
      } catch (cloudinaryError) {
        return res.status(500).json({
          message: "Avatar upload failed",
          error: cloudinaryError.message,
        });
      }
    }

    await group.save();

    const updated = await GroupChat.findById(groupId)
      .populate("members", "name avatar isOnline")
      .populate("admins", "name avatar");

    // Emit socket event
    const io = req.app.get('io');
    io.to(groupId).emit('group-updated', updated);

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Error updating group", error: error.message });
  }
};

/* ADD MEMBERS TO GROUP */
const addMembers = async (req, res) => {
  const { groupId } = req.params;
  const { memberIds } = req.body;
  const userId = req.user._id;

  try {
    const group = await GroupChat.findById(groupId);
    
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if user is an admin
    const isAdmin = group.admins.some(admin => admin.toString() === userId.toString());
    if (!isAdmin) {
      return res.status(403).json({ message: "Only admins can add members" });
    }

    // Add new members (avoid duplicates)
    const newMembers = memberIds.filter(
      memberId => !group.members.some(m => m.toString() === memberId.toString())
    );

    group.members = [...group.members, ...newMembers];
    await group.save();

    const updated = await GroupChat.findById(groupId)
      .populate("members", "name avatar isOnline")
      .populate("admins", "name avatar");

    // Emit socket event
    const io = req.app.get('io');
    io.to(groupId).emit('members-added', {
      groupId,
      newMembers,
      group: updated
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Error adding members", error: error.message });
  }
};

/* REMOVE MEMBER FROM GROUP */
const removeMember = async (req, res) => {
  const { groupId, memberId } = req.params;
  const userId = req.user._id;

  try {
    const group = await GroupChat.findById(groupId);
    
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if user is an admin
    const isAdmin = group.admins.some(admin => admin.toString() === userId.toString());
    if (!isAdmin) {
      return res.status(403).json({ message: "Only admins can remove members" });
    }

    // Remove member
    group.members = group.members.filter(m => m.toString() !== memberId.toString());
    group.admins = group.admins.filter(a => a.toString() !== memberId.toString());

    await group.save();

    const updated = await GroupChat.findById(groupId)
      .populate("members", "name avatar isOnline")
      .populate("admins", "name avatar");

    // Emit socket event
    const io = req.app.get('io');
    io.to(groupId).emit('member-removed', {
      groupId,
      memberId,
      group: updated
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Error removing member", error: error.message });
  }
};

module.exports = { createGroup, getMyGroups, leaveGroup, deleteGroup, updateGroup, addMembers, removeMember };