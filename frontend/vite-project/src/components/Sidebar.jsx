import {
  FaEllipsisV,
  FaMoon,
  FaSun,
  FaSignOutAlt,
  FaBell,
  FaPlus,
  FaUsers,
} from "react-icons/fa";
import ProfileModal from "./ProfileModal";
import UserSelectionModal from "./UserSelectionModal";
import GroupCreationModal from "./GroupCreationModal";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logoutUser } from "../features/auth/authSlice";
import { useGetSidebarUsersQuery, userApi } from "../features/users/userApi";
import { setSelectedUser, setSelectedGroup } from "../features/chat/chatSlice";
import { useGetMyGroupsQuery, chatApi } from "../features/chat/chatApi";
import { useGetRecentMessagesQuery, messageApi } from "../features/messages/messageApi";
import socket from "../socketClient";
import defaultprofile from "../../../../Asset/userDB.avif";

/* LAST SEEN FORMATTER */
const formatLastSeen = (lastSeen) => {
  if (!lastSeen) return "";
  const now = new Date();
  const lastSeenDate = new Date(lastSeen);
  const diff = now - lastSeenDate;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;

  // For same day, show time
  if (days === 0) {
    return lastSeenDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  // For yesterday, show "Yesterday"
  if (days === 1) {
    return `Yesterday ${lastSeenDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })}`;
  }

  // For older dates, show date and time
  if (days < 7) {
    return lastSeenDate.toLocaleDateString("en-US", {
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  // For very old dates, show full date and time
  return lastSeenDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: lastSeenDate.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

function Sidebar() {
  const [showProfile, setShowProfile] = useState(false);
  const [search, setSearch] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [theme, setTheme] = useState("light");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const currentUser = useSelector((state) => state.auth.user);
  const selectedUser = useSelector((state) => state.chat.selectedUser);
  const selectedGroup = useSelector((state) => state.chat.selectedGroup);

  const {
    data: users = [],
    isLoading,
    isError,
    refetch,
  } = useGetSidebarUsersQuery();

  const { data: recentMessages = [] } = useGetRecentMessagesQuery();
  const { data: groups = [], refetch: refetchGroups } = useGetMyGroupsQuery();

  // Update current time every 60 seconds for lastSeen display
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.position-relative')) {
        setShowMenu(false);
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /* REAL-TIME SIDEBAR UPDATES */
  useEffect(() => {
    const messageUpdateHandler = (data) => {
      console.log("📨 Received sidebar-message-update:", data.chatId, "unreadCount:", data.unreadCount, "scope:", data.scope);
      
      // Check if it's a group message
      if (data.isGroup) {
        dispatch(chatApi.util.updateQueryData('getMyGroups', undefined, (draft) => {
          const group = draft.find(g => String(g._id) === String(data.chatId));
          if (group) {
            console.log("✏️ Updating group:", group.name, "lastMessage:", data.lastMessageText?.substring(0, 30));
            
            // Update lastMessage and timestamp
            if (data.lastMessageText) {
              group.lastMessage = data.lastMessageText;
            }
            if (data.lastMessageCreatedAt) {
              group.lastMessageCreatedAt = data.lastMessageCreatedAt;
            }
            
            // Update unread count only if provided
            if (typeof data.unreadCount === "number") {
              group.unreadCount = data.unreadCount;
            }
          }
          // Sort by lastMessageCreatedAt descending
          draft.sort((a, b) => {
            const aTime = a.lastMessageCreatedAt ? new Date(a.lastMessageCreatedAt) : new Date(0);
            const bTime = b.lastMessageCreatedAt ? new Date(b.lastMessageCreatedAt) : new Date(0);
            return bTime - aTime;
          });
        }));
        return;
      }

      // Handle private chats
      dispatch(userApi.util.updateQueryData('getSidebarUsers', undefined, (draft) => {
        const chatUser = draft.find(u => String(u.chatId) === String(data.chatId));
        if (chatUser) {
          // Update lastMessage and timestamp
          if (data.lastMessageText) {
            chatUser.lastMessage = data.lastMessageText;
          }
          if (data.lastMessageCreatedAt) {
            chatUser.lastMessageCreatedAt = data.lastMessageCreatedAt;
          }
          
          // Update unread count only if provided
          if (typeof data.unreadCount === "number") {
            chatUser.unreadCount = data.unreadCount;
          }
        }
        // Sort by lastMessageCreatedAt descending
        draft.sort((a, b) => {
          const aTime = a.lastMessageCreatedAt ? new Date(a.lastMessageCreatedAt) : new Date(0);
          const bTime = b.lastMessageCreatedAt ? new Date(b.lastMessageCreatedAt) : new Date(0);
          return bTime - aTime;
        });
      }));
    };

    const handler = () => {
      console.log("🔄 Sidebar update received");
      dispatch(userApi.util.invalidateTags(["User"]));
    };

    const newMessageHandler = (message) => {
      console.log("📨 New message received for notifications:", message);
      // Invalidate recent messages to trigger real-time refetch
      // Only for messages not sent by current user
      if (message.sender._id.toString() !== currentUser?._id.toString()) {
        dispatch(messageApi.util.invalidateTags(["Messages"]));
      }
    };

    const onlineUsersHandler = (onlineUserIds) => {
      console.log("🟢 Online users update:", onlineUserIds);
      // Invalidate to refetch sidebar data to ensure lastSeen is updated from DB
      dispatch(userApi.util.invalidateTags(["User"]));
    };

    const userStatusUpdateHandler = (data) => {
      console.log("👤 User status update:", data);
      // Update cache directly for instant UI updates
      dispatch(userApi.util.updateQueryData('getSidebarUsers', undefined, (draft) => {
        const user = draft.find(u => u._id === data.userId);
        if (user) {
          user.isOnline = data.isOnline;
          if (!data.isOnline && data.lastSeen) {
            user.lastSeen = data.lastSeen;
          }
        }
      }));
    };

    const groupCreatedHandler = (group) => {
      console.log("👥 Group created:", group);
      // Invalidate groups cache to refetch and show the new group
      dispatch(chatApi.util.invalidateTags(["Groups"]));
    };

    const groupAddedHandler = (group) => {
      console.log("➕ Group added received:", group);
      // Add the group to the cache
      dispatch(chatApi.util.updateQueryData('getMyGroups', undefined, (draft) => {
        // Check if group already exists
        const existingIndex = draft.findIndex(g => g._id === group._id);
        if (existingIndex === -1) {
          console.log("➕ Adding group to cache:", group.name);
          draft.push(group);
          // Sort by lastMessageCreatedAt descending
          draft.sort((a, b) => {
            const aTime = a.lastMessageCreatedAt ? new Date(a.lastMessageCreatedAt) : new Date(0);
            const bTime = b.lastMessageCreatedAt ? new Date(b.lastMessageCreatedAt) : new Date(0);
            return bTime - aTime;
          });
        } else {
          console.log("➕ Group already exists in cache");
        }
      }));
    };

    const groupRemovedHandler = (data) => {
      console.log("➖ Group removed:", data.groupId);
      // Remove the group from the cache
      dispatch(chatApi.util.updateQueryData('getMyGroups', undefined, (draft) => {
        const index = draft.findIndex(g => String(g._id) === String(data.groupId));
        if (index !== -1) {
          console.log("✅ Removed group from sidebar:", draft[index].name);
          draft.splice(index, 1);
        }
      }));
      // Deselect group if it was selected
      if (selectedGroup?._id === data.groupId) {
        dispatch(setSelectedGroup(null));
      }
    };

    const groupUpdatedHandler = (updatedGroup) => {
      console.log("🔄 Group updated:", updatedGroup);
      // Update the group in the cache
      dispatch(chatApi.util.updateQueryData('getMyGroups', undefined, (draft) => {
        const group = draft.find(g => g._id === updatedGroup._id);
        if (group) {
          Object.assign(group, updatedGroup);
        }
      }));
    };

    const groupDeletedHandler = (data) => {
      console.log("🗑️ Group deleted:", data);
      // Remove the group from the cache
      dispatch(chatApi.util.updateQueryData('getMyGroups', undefined, (draft) => {
        const index = draft.findIndex(g => g._id === data.groupId);
        if (index !== -1) {
          draft.splice(index, 1);
        }
      }));
    };

    const connectHandler = () => {
      console.log("🔌 Socket connected, refetching sidebar");
      refetch();
      refetchGroups();
    };

    const handleSidebarMessageUpdate = (data) => {
      console.log("🔔 SOCKET EVENT RECEIVED: sidebar-message-update", data);
      messageUpdateHandler(data);
    };

    const profileUpdatedHandler = (data) => {
      console.log("👤 Profile updated:", data);
      // Update users cache and propagate name changes to group last messages
      dispatch(userApi.util.updateQueryData('getSidebarUsers', undefined, (draft) => {
        const user = draft.find(u => u._id === data.userId);
        if (user) {
          const oldName = user.name;
          user.name = data.name;
          user.avatar = data.avatar;
          // Update groups lastMessage if it contains the old name
          dispatch(chatApi.util.updateQueryData('getMyGroups', undefined, (draftGroups) => {
            draftGroups.forEach(group => {
              if (group.lastMessage && group.lastMessage.startsWith(`${oldName}: `)) {
                group.lastMessage = group.lastMessage.replace(`${oldName}: `, `${data.name}: `);
              }
            });
          }));
        }
      }));
    };

    console.log("🎧 Setting up socket listeners for sidebar updates");
    socket.on("sidebar-update", handler);
    socket.on("sidebar-message-update", handleSidebarMessageUpdate);
    socket.on("new-message", newMessageHandler);
    socket.on("online-users", onlineUsersHandler);
    socket.on("user-status-update", userStatusUpdateHandler);
    socket.on("group-created", groupCreatedHandler);
    socket.on("group-added", groupAddedHandler);
    socket.on("group-removed", groupRemovedHandler);
    socket.on("group-updated", groupUpdatedHandler);
    socket.on("group-deleted", groupDeletedHandler);
    socket.on("profile-updated", profileUpdatedHandler);
    socket.on("connect", connectHandler);
    return () => {
      socket.off("sidebar-update", handler);
      socket.off("sidebar-message-update", handleSidebarMessageUpdate);
      socket.off("new-message", newMessageHandler);
      socket.off("online-users", onlineUsersHandler);
      socket.off("user-status-update", userStatusUpdateHandler);
      socket.off("group-created", groupCreatedHandler);
      socket.off("group-added", groupAddedHandler);
      socket.off("group-removed", groupRemovedHandler);
      socket.off("group-updated", groupUpdatedHandler);
      socket.off("group-deleted", groupDeletedHandler);
      socket.off("profile-updated", profileUpdatedHandler);
      socket.off("connect", connectHandler);
    };
  }, [dispatch, refetch, refetchGroups, currentUser?._id, groups]);

  /* RESET UNREAD COUNT WHEN USER VIEWS A GROUP/CHAT */
  useEffect(() => {
    if (selectedGroup) {
      console.log("👀 User viewing group:", selectedGroup.name, "- resetting unread count");
      dispatch(chatApi.util.updateQueryData('getMyGroups', undefined, (draft) => {
        const group = draft.find(g => String(g._id) === String(selectedGroup._id));
        if (group) {
          group.unreadCount = 0;
          console.log("✅ Unread count reset for group:", group.name);
        }
      }));
    } else if (selectedUser) {
      console.log("👀 User viewing private chat:", selectedUser.name, "- resetting unread count");
      dispatch(userApi.util.updateQueryData('getSidebarUsers', undefined, (draft) => {
        const user = draft.find(u => String(u._id) === String(selectedUser._id));
        if (user) {
          user.unreadCount = 0;
          console.log("✅ Unread count reset for user:", user.name);
        }
      }));
    }
  }, [selectedGroup?._id, selectedUser?._id, dispatch]);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    document.body.classList.toggle("dark", next === "dark");
    setTheme(next);
    setShowMenu(false);
  };

  const handleLogout = () => {
    dispatch(logoutUser());
    dispatch(userApi.util.invalidateTags(["User"]));
    navigate("/login");
  };

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  // Calculate total unread messages across all chats
  const totalUnreadCount = useMemo(() => {
    return users.reduce((total, user) => total + (Number(user.unreadCount) || 0), 0);
  }, [users]);

  const getLastMessage = (msg, isGroup = false) => {
    if (!msg) return "No messages yet";
    if (typeof msg === "string") {
      // String messages come from sidebar-message-update events
      // Could be:
      // 1. System messages: "Vishnu FSD removed John Wick" (already has full text)
      // 2. Regular messages: "Sender: text" format
      if (isGroup) {
        // Check if this is a system message or regular message
        // System messages contain: " added ", " removed ", " left the group"
        if (msg.includes(" added ") || msg.includes(" removed ") || msg.includes(" left the group")) {
          // System message - display as-is
          return msg.length > 60 ? msg.substring(0, 60) + "…" : msg;
        }
        // Regular message with "Sender: text" format
        const colonIndex = msg.indexOf(': ');
        if (colonIndex !== -1) {
          const text = msg.substring(colonIndex + 2);
          const truncatedText = text.length > 55 ? text.substring(0, 55) + "…" : text;
          const sender = msg.substring(0, colonIndex + 2);
          return sender + truncatedText;
        } else {
          return msg.length > 60 ? msg.substring(0, 60) + "…" : msg;
        }
      } else {
        return msg;
      }
    }

    // For group chats, format with sender name
    if (isGroup) {
      if (msg.deletedForAll) return "This message was deleted";

      // Handle system messages
      if (msg.type === "system") {
        return msg.text.length > 60 ? msg.text.substring(0, 60) + "…" : msg.text;
      }

      const senderName = msg.sender._id === currentUser._id ? "You" : msg.sender.name;
      let messageText = "";

      if (msg.type === "text") {
        messageText = msg.text.length > 30 ? msg.text.substring(0, 30) + "…" : msg.text;
      } else if (msg.type === "image") {
        messageText = "📷 Photo";
      } else if (msg.type === "video") {
        messageText = "🎥 Video";
      } else if (msg.type === "file") {
        messageText = "📎 File";
      } else {
        messageText = "Message";
      }

      return `${senderName}: ${messageText}`;
    }

    // For private chats (existing logic)
    return "Message";
  };

  return (
    <div className="d-flex flex-column h-100" style={{ backgroundColor: '#f8f9fa' }}>
      {/* HEADER */}
      <div className="bg-light border-bottom">
        <div className="d-flex justify-content-between align-items-center p-3">
          <strong>ChatBox</strong>

          <div className="d-flex align-items-center position-relative">
            <img
              src={currentUser?.avatar || defaultprofile}
              className="rounded-circle"
              width="40"
              height="40"
              alt="Profile"
              style={{ cursor: "pointer" }}
              onClick={() => setShowProfile(true)}
            />

            <div className="position-relative ms-3" style={{ cursor: "pointer" }} onClick={() => setShowNotifications((p) => !p)}>
              <FaBell />
              {totalUnreadCount > 0 && (
                <span
                  className="position-absolute bg-success rounded-circle"
                  style={{
                    top: -2,
                    right: -2,
                    width: 8,
                    height: 8,
                    border: "1px solid white",
                  }}
                ></span>
              )}
            </div>

            <FaEllipsisV
              className="ms-3"
              style={{ cursor: "pointer" }}
              onClick={() => setShowMenu((p) => !p)}
            />

            {showMenu && (
              <div
                className="position-absolute end-0 bg-white shadow rounded"
                style={{ top: "100%", marginTop: 8, width: 180, zIndex: 2000 }}
              >
                <div
                  className="px-3 py-2 d-flex align-items-center"
                  style={{ cursor: "pointer" }}
                  onClick={toggleTheme}
                >
                  {theme === "light" ? <FaMoon /> : <FaSun />}
                  <span className="ms-2">
                    {theme === "light" ? "Dark mode" : "Light mode"}
                  </span>
                </div>

                <div
                  className="px-3 py-2 d-flex align-items-center text-danger"
                  style={{ cursor: "pointer" }}
                  onClick={handleLogout}
                >
                  <FaSignOutAlt className="me-2" />
                  Logout
                </div>
              </div>
            )}

            {showNotifications && (
              <div
                className="position-absolute end-0 bg-white shadow rounded"
                style={{
                  top: "100%",
                  marginTop: 8,
                  width: 280,
                  maxHeight: 300,
                  overflowY: "auto",
                  zIndex: 2000
                }}
              >
                {recentMessages.length === 0 ? (
                  <div className="p-3 text-muted text-center">
                    No recent messages
                  </div>
                ) : (
                  recentMessages.slice(0, 10).map((msg) => (
                    <div
                      key={msg._id}
                      className="d-flex align-items-center p-2 border-bottom"
                      style={{ cursor: "pointer" }}
                      onClick={() => {
                        // Find the user from the chat participants
                        const chatParticipants = msg.chatId.participants;
                        const otherUserId = chatParticipants.find(p => p !== currentUser._id);
                        if (otherUserId) {
                          // Find the full user object from the users list
                          const userToSelect = users.find(u => u._id === otherUserId);
                          if (userToSelect) {
                            dispatch(setSelectedUser(userToSelect));
                            dispatch(setSelectedGroup(null));
                          }
                        }
                        setShowNotifications(false);
                      }}
                    >
                      <div className="flex-grow-1">
                        <div className="d-flex justify-content-between align-items-start">
                          <strong className="text-truncate" style={{ maxWidth: 150 }}>
                            {msg.sender.name}
                          </strong>
                          <small className="text-muted ms-2">
                            {formatLastSeen(msg.createdAt)}
                          </small>
                        </div>
                        <div className="text-muted small text-truncate">
                          {msg.type === "text" ? msg.text :
                           msg.type === "image" ? "📷 Photo" :
                           msg.type === "video" ? "🎥 Video" :
                           msg.type === "file" ? "📎 File" : "Message"}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* SEARCH */}
        <div className="px-3 pb-3">
          <input
            className="form-control"
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* TABS */}
        <ul className="nav nav-tabs px-3">
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              Chat ({users.length})
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'groups' ? 'active' : ''}`}
              onClick={() => setActiveTab('groups')}
            >
              Groups ({groups.length})
            </button>
          </li>
        </ul>
      </div>

      {/* CHATS AND GROUPS */}
      <div className="flex-grow-1 overflow-auto">
        {isLoading && (
          <p className="text-center mt-3 text-muted">Loading chats…</p>
        )}

        {isError && (
          <p className="text-center mt-3 text-danger">
            Failed to load users
          </p>
        )}

        {activeTab === 'chat' && (
          <>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((u) => (
                <div
                  key={u._id}
                  className="d-flex align-items-center p-2 border-bottom"
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    dispatch(setSelectedUser(u));
                    dispatch(setSelectedGroup(null));
                  }}
                >
                  <img
                    src={u.avatar || defaultprofile}
                    width="45"
                    height="45"
                    className="rounded-circle me-2"
                    alt=""
                  />

                  <div className="flex-grow-1" style={{ minWidth: 0 }}>
                    <strong>{u.name}</strong>
                    <div className="text-muted small text-truncate">
                      {getLastMessage(u.lastMessage)}
                    </div>
                  </div>

                  <div className="text-end ms-2" style={{ minWidth: 65 }}>
                    <div
                      style={{
                        fontSize: 11,
                        color: u.isOnline ? "#28a745" : "#999",
                      }}
                    >
                      {u.isOnline ? "Online" : formatLastSeen(u.lastSeen)}
                    </div>

                    {Number(u.unreadCount) > 0 && selectedUser?._id !== u._id && (
                      <span
                        className="badge bg-success rounded-circle mt-1"
                        style={{
                          width: '20px',
                          height: '20px',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          padding: '5px',
                        }}
                      >
                        {u.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center mt-3 text-muted">No chats yet</p>
            )}
          </>
        )}

        {activeTab === 'groups' && (
          <>
            <div className="px-3 py-3">
              <button
                className="btn btn-outline-success w-100"
                onClick={() => setShowNewGroup(true)}
              >
                <FaUsers className="me-1" />
                New Group
              </button>
            </div>
            {filteredGroups.length > 0 ? (
              filteredGroups.map((g) => (
                <div
                  key={g._id}
                  className="d-flex align-items-center p-2 border-bottom"
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    dispatch(setSelectedGroup(g));
                    dispatch(setSelectedUser(null));
                  }}
                >
                  <img
                    src={g.avatar || defaultprofile}
                    width="45"
                    height="45"
                    className="rounded-circle me-2"
                    alt=""
                  />

                  <div className="flex-grow-1" style={{ minWidth: 0 }}>
                    <strong>{g.name}</strong>
                    <div className="text-muted small text-truncate">
                      {getLastMessage(g.lastMessage, true)}
                    </div>
                  </div>

                  <div className="text-end ms-2" style={{ minWidth: 65 }}>
                    <div>
                      <small className="text-muted">
                        {g.members.length} members
                      </small>
                    </div>
                    {Number(g.unreadCount) > 0 && selectedGroup?._id !== g._id && (
                      <span
                        className="badge bg-success rounded-circle mt-1"
                        style={{
                          width: '20px',
                          height: '20px',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          padding: '5px',
                        }}
                      >
                        {g.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center mt-3 text-muted">No groups yet</p>
            )}
          </>
        )}
      </div>

      {showProfile && (
        <ProfileModal
          user={currentUser}
          onClose={() => setShowProfile(false)}
        />
      )}

      <GroupCreationModal
        isOpen={showNewGroup}
        onClose={() => setShowNewGroup(false)}
      />
    </div>
  );
}

export default Sidebar;
