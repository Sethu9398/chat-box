const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const groupUpload = require("../middleware/groupUpload");
const { createGroup, getMyGroups } = require("../controllers/groupChatController");

router.post("/create", protect, groupUpload, createGroup);
router.get("/", protect, getMyGroups);

module.exports = router;
