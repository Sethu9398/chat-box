// models/Message.js
const mongoose=require('mongoose')

const messageSchema = new mongoose.Schema(
  {
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: ["text", "image", "video", "file", "system"],
      required: true,
    },

    // TEXT MESSAGE
    text: {
      type: String,
      default: "",
    },

    // MEDIA MESSAGE (image/video/file)
    mediaUrl: {
      type: String,
      default: "",
    },

    fileName: {
      type: String,
      default: "",
    },

    fileSize: {
      type: String,
      default: "",
    },

    // MESSAGE STATUS (for ✔✔ later)
    status: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent",
    },

    // REPLY AND FORWARD
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    isForwarded: {
      type: Boolean,
      default: false,
    },

    // DELETION
    deletedBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
    deletedForAll: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);
module.exports = mongoose.model("Message", messageSchema);
