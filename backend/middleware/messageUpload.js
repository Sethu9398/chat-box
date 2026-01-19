const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "chat/messages",
    resource_type: "auto", // image / video / raw
    public_id: () => `message-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  },
});

const messageUpload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
}).single("file");

module.exports = messageUpload;


