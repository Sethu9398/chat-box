# Fix Group Info Modal Real-time Member List Update

## Task
Fix the Group Info modal so that when a member leaves the group by themselves, the member list updates immediately in real time without page refresh. Use socket events to remove the user from the members list on all clients (including the user who left), update group state correctly, and keep admin logic intact. Also fix name and avatar updates for members.

## Analysis
- Backend was emitting 'member-left' event with old group data (not populated)
- Frontend was only invalidating sidebar cache, not updating selectedGroup in Redux
- GroupInfoModal uses selectedGroup from Redux to display members list
- Population of members with name/avatar was missing in leaveGroup socket emit

## Changes Made
- [x] Updated handleMemberLeft in Home.jsx to dispatch setSelectedGroup with updated group data when currently viewing the affected group
- [x] Fixed leaveGroup controller to populate updated group with members and admins before emitting socket event
- [x] Ensured socket event sends populated group data with correct member names and avatars

## Testing
- [ ] Test leaving group updates member list in real-time for all clients
- [ ] Verify member names and avatars are correctly displayed after leave
- [ ] Verify admin logic remains intact
- [ ] Ensure UI/UX remains same as WhatsApp
- [ ] Check no other features are affected
