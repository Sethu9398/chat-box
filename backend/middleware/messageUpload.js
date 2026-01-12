const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "chat/messages",
    resource_type: "auto", // image / video / raw
  },
});

const messageUpload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
});

module.exports = messageUpload;


