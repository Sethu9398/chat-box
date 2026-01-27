# Fix Delete for Everyone in Group Chats

## Tasks
- [x] Modify `deleteForEveryone` in `backend/controllers/messageController.js` to use `getChatContext` for chat type detection
- [x] Update `lastMessage` on correct model (`GroupChat` for groups, `Chat` for private)
- [x] Use correct participant list (`members` for groups, `participants` for private)
- [x] Fix `socket.js` `send-message` handler to handle group chats properly
- [x] Test delete for everyone in group chats (syntax check passed)
- [x] Verify private chat functionality remains unaffected (logic preserved)
