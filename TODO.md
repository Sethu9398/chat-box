# TODO: Fix lastSeen Update Issue

## Issue
- lastSeen in sidebar was not updating in real-time
- Only updated after page refresh

## Root Cause
- The `onlineUsersHandler` in Sidebar.jsx was invalidating cache, but RTK Query might not refetch immediately
- Cache invalidation doesn't guarantee immediate re-execution of the query
- No direct socket event for individual user status updates
- selectedUser in chatSlice was not updated when user status changed, causing chat window components to show stale lastSeen
- No client-side emission of "user-offline" on tab close/navigate away

## Solution
- Added new socket event "user-status-update" emitted from backend when users go online/offline
- Frontend listens to this event and updates cache directly for instant UI updates
- Added listener in Home.jsx to update selectedUser in real-time for chat window components
- Added beforeunload event in socketClient.js to emit "user-offline" when user closes tab
- Kept refetch as fallback for online-users event

## Changes Made
- [x] Backend: Added "user-status-update" socket emission in socket.js for user online/offline events
- [x] Frontend: Added userStatusUpdateHandler in Sidebar.jsx to listen for "user-status-update" and update cache directly
- [x] Added `refetch` to the destructured query hook for fallback
- [x] Added beforeunload event in socketClient.js to emit "user-offline" on tab close
- [x] Added user-status-update listener in Home.jsx to update selectedUser for real-time chat window updates

## Testing
- Verify that when a user goes offline, their lastSeen status updates immediately in the sidebar and chat window for other users without needing a page refresh
- Test with multiple users going online/offline to ensure real-time updates across all components
- Ensure UI/UX remains unchanged
