# TODO: WhatsApp-like Notification Dropdown

## Backend Changes
- [x] Add new API endpoint `/messages/recent` in messageController.js to get last 10 messages from all chats
- [x] Add route for the new endpoint in messageRoutes.js
- [x] Add RTK Query endpoint in messageApi.js for fetching recent messages

## Frontend Changes
- [x] Add notification icon (FaBell) from react-icons to Sidebar header left of profile image
- [x] Add state for notification dropdown visibility and recent messages
- [x] Add green dot indicator on notification icon when there are unread messages
- [x] Implement dropdown UI with list of last 10 messages (sender name, preview, time ago)
- [x] Add click handler to show/hide dropdown and clear notifications on click
- [x] Integrate with existing socket events to update notification state
- [x] Ensure dropdown closes when clicking outside or on other elements

## Testing
- [x] Test notification appears when new messages arrive
- [x] Test green dot shows/hides correctly
- [x] Test dropdown lists correct messages with proper formatting
- [x] Test clicking notification clears the indicator
- [x] Ensure no breaking changes to existing chat, unread count, sidebar order logic

---

# TODO: Fix Media Messages Real-Time Updates

## Issue
- Media messages (photo/video/file) sent from chat are not updating in the sidebar header notification dropdown in real time and only appear after refresh.

## Root Cause
- For media messages sent via HTTP (uploadMessage), the "new-message" event is only emitted to the chat room, not to individual participants.
- The Sidebar listens for "new-message" to update notifications in real time, but since it's not in the chat room, it doesn't receive it for media messages.
- For text messages, the socket handler emits "new-message" to participants, so it works.

## Solution
- [x] Modify uploadMessage and sendMessage functions in backend/controllers/messageController.js to emit "new-message" to each participant for real-time sidebar updates.
- This ensures notifications update immediately for both text and media messages via sockets.

## Testing
- [ ] Test that media messages now update notifications in real time without refresh.
- [ ] Ensure no breaking changes to existing functionality.
