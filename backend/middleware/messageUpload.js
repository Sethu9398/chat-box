// middleware/messageUpload.js
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: "chat/messages",
    resource_type: "auto", // image | video | raw
    public_id: `msg-${Date.now()}`,
    secure: true, // Force HTTPS URLs
  }),
});

const messageUpload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
});

module.exports = messageUpload;
