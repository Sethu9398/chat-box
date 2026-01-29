const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const groupUpload = require("../middleware/groupUpload");
const { createGroup, getMyGroups, leaveGroup, deleteGroup, updateGroup, addMembers, removeMember } = require("../controllers/groupChatController");

router.post("/create", protect, groupUpload, createGroup);
router.get("/", protect, getMyGroups);
router.post("/:groupId/leave", protect, leaveGroup);
router.delete("/:groupId", protect, deleteGroup);
router.put("/:groupId", protect, groupUpload, updateGroup);
router.post("/:groupId/members/add", protect, addMembers);
router.delete("/:groupId/members/:memberId", protect, removeMember);

module.exports = router;
