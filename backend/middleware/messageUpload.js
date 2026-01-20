const multer = require("multer");

const messageUpload = (req, res, next) => {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 },
  }).single("file");

  upload(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
};

module.exports = messageUpload;


