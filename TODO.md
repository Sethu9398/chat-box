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
