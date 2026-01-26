# TODO: Add Chat and Group Chat to Sidebar with Tabs

## Backend Updates
- [x] Backend already has GroupChat model, controllers, and routes.

## Frontend Updates
- [x] Update chatSlice.js to include selectedGroup state.
- [x] Add group endpoints (createGroup, getMyGroups) to chatApi.js.
- [x] Create UserSelectionModal component for new chat.
- [x] Create GroupCreationModal component for new group.
- [x] Update Sidebar.jsx to add tabs for "Chat" and "Groups" with counts, like WhatsApp.
- [x] Remove "New Chat" button; show "New Group" only in groups tab.
- [x] Modify Sidebar.jsx to display users in "Chat" tab and groups in "Groups" tab.
- [x] Update ChatWindow.jsx to handle group chats (display group name, members, etc.).
- [x] Ensure socket integration for group messages.
- [x] Test group creation, messaging, and real-time updates.

## Testing
- [x] Test creating a new group chat.
- [x] Test sending messages in group chat.
- [x] Test real-time updates for group chats.
- [x] Ensure no other functionalities are broken.
