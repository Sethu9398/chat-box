# Group Chat Message Status Fix

## Required Behavior (GROUP CHAT ONLY):
- Single gray tick (sent): message is sent, and all group members are offline or not viewing the chat
- Double gray tick (delivered): at least one group member is online/logged in, but has not opened the group chat
- Double blue tick (read): at least one group member has opened the group chat and seen the message

## Issues Identified:
1. `calculateGroupMessageStatus` function logic is incorrect
2. Socket handling for group chat viewing status needs improvement
3. Status updates not properly triggered when users join/leave group chats

## Plan:
1. ✅ Fix `calculateGroupMessageStatus` function in `backend/controllers/messageController.js`
2. ✅ Update socket handling in `backend/socket/socket.js` for proper group chat status tracking
3. ✅ Ensure status updates are emitted correctly when users join/leave chats
4. Test the implementation

## Files Edited:
- `backend/controllers/messageController.js` - Fixed status calculation logic
- `backend/socket/socket.js` - Improved group chat socket handling

## Changes Made:
1. Updated `calculateGroupMessageStatus` to properly check if members are viewing the chat vs just online
2. Fixed function signatures and calls to remove unused parameters
3. Added proper status updates when users join/leave group chats
4. Ensured status updates are triggered correctly for group messages
