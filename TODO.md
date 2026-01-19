# Fix Unread Notification Issue

## Problem
Unread notifications do not update in real-time when viewing a different user chat page. The unread count only updates after refreshing the website.

## Root Cause
When switching to a different chat, the socket does not leave the previous chat room, causing the backend to incorrectly think the user is still viewing the old chat, leading to wrong unread counts.

## Plan
1. Add a "leave-chat" event in the frontend ChatWindow.jsx when switching chats.
2. Handle the "leave-chat" event in the backend socket.js to leave the room.
3. Ensure proper sidebar updates when leaving a chat.

## Steps
- [ ] Modify ChatWindow.jsx to emit "leave-chat" for previous chat when switching
- [ ] Update socket.js to handle "leave-chat" event
- [ ] Test the fix to ensure unread counts update properly when switching chats
