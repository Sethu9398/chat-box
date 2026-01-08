const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "chatbox/users",
    allowedFormats: ["jpg", "jpeg", "png", "webp"],
    public_id: () => `user-${Date.now()}`,
  },
});


const upload = multer({storage});

module.exports = upload;


