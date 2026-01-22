import {
  FaEllipsisV,
  FaMoon,
  FaSun,
  FaSignOutAlt,
  FaBell,
} from "react-icons/fa";
import ProfileModal from "./ProfileModal";
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logoutUser } from "../features/auth/authSlice";
import { useGetSidebarUsersQuery, userApi } from "../features/users/userApi";
import { setSelectedUser } from "../features/chat/chatSlice";
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

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const currentUser = useSelector((state) => state.auth.user);
  const selectedUser = useSelector((state) => state.chat.selectedUser);

  const {
    data: users = [],
    isLoading,
    isError,
    refetch,
  } = useGetSidebarUsersQuery();

  const { data: recentMessages = [] } = useGetRecentMessagesQuery();

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
    const handler = () => {
      console.log("🔄 Sidebar update received");
      dispatch(userApi.util.invalidateTags(["User"]));
    };

    const messageUpdateHandler = (data) => {
      console.log("📩 Sidebar message update received:", data);
      if (data.scope === "for-me") {
        // Update the specific user's lastMessage in cache and reorder
        dispatch(userApi.util.updateQueryData('getSidebarUsers', undefined, (draft) => {
          const chatUser = draft.find(u => u.chatId === data.chatId);
          if (chatUser) {
            chatUser.lastMessage = data.lastMessageText;
            chatUser.lastMessageCreatedAt = data.lastMessageCreatedAt || new Date().toISOString(); // Use provided or set to now
          }
          // Sort by lastMessageCreatedAt descending
          draft.sort((a, b) => {
            const aTime = a.lastMessageCreatedAt ? new Date(a.lastMessageCreatedAt) : new Date(0);
            const bTime = b.lastMessageCreatedAt ? new Date(b.lastMessageCreatedAt) : new Date(0);
            return bTime - aTime;
          });
        }));
      }
      else if (data.scope === "read-update") {
        // Update unread count to 0 for this chat
        dispatch(userApi.util.updateQueryData('getSidebarUsers', undefined, (draft) => {
          const chatUser = draft.find(u => u.chatId === data.chatId);
          if (chatUser) {
            chatUser.unreadCount = 0;
          }
        }));
      }
      else if (data.scope === "for-everyone") {
        // Directly update unreadCount in cache for real-time update
        dispatch(userApi.util.updateQueryData('getSidebarUsers', undefined, (draft) => {
          const chatUser = draft.find(u => u.chatId === data.chatId);
          if (chatUser) {
            chatUser.unreadCount = data.unreadCount || 0;
            chatUser.lastMessage = data.lastMessageText;
            chatUser.lastMessageCreatedAt = data.lastMessageCreatedAt || new Date().toISOString();
          }
          // Sort by lastMessageCreatedAt descending
          draft.sort((a, b) => {
            const aTime = a.lastMessageCreatedAt ? new Date(a.lastMessageCreatedAt) : new Date(0);
            const bTime = b.lastMessageCreatedAt ? new Date(b.lastMessageCreatedAt) : new Date(0);
            return bTime - aTime;
          });
        }));
      }
      else {
        // Fallback: invalidate to refetch
        dispatch(userApi.util.invalidateTags(["User"]));
      }
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

    const connectHandler = () => {
      console.log("🔌 Socket connected, refetching sidebar");
      refetch();
    };

    socket.on("sidebar-update", handler);
    socket.on("sidebar-message-update", messageUpdateHandler);
    socket.on("new-message", newMessageHandler);
    socket.on("online-users", onlineUsersHandler);
    socket.on("user-status-update", userStatusUpdateHandler);
    socket.on("connect", connectHandler);
    return () => {
      socket.off("sidebar-update", handler);
      socket.off("sidebar-message-update", messageUpdateHandler);
      socket.off("new-message", newMessageHandler);
      socket.off("online-users", onlineUsersHandler);
      socket.off("user-status-update", userStatusUpdateHandler);
      socket.off("connect", connectHandler);
    };
  }, [dispatch, refetch, currentUser?._id]);

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

  // Calculate total unread messages across all chats
  const totalUnreadCount = useMemo(() => {
    return users.reduce((total, user) => total + (Number(user.unreadCount) || 0), 0);
  }, [users]);

  const getLastMessage = (msg) => {
    if (!msg) return "No messages yet";
    if (typeof msg === "string") return msg;
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
      </div>

      {/* USERS */}
      <div className="flex-grow-1 overflow-auto">
        {isLoading && (
          <p className="text-center mt-3 text-muted">Loading chats…</p>
        )}

        {isError && (
          <p className="text-center mt-3 text-danger">
            Failed to load users
          </p>
        )}

        {filteredUsers.map((u) => (
          <div
            key={u._id}
            className="d-flex align-items-center p-2 border-bottom"
            style={{ cursor: "pointer" }}
            onClick={() => dispatch(setSelectedUser(u))}
                    >
            <img
              src={u.avatar || defaultprofile}
              width="45"
              height="45"
              className="rounded-circle me-2"
              alt=""
            />

            <div className="flex-grow-1">
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
                <span className="badge bg-success rounded-circle mt-1">
                  {u.unreadCount}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {showProfile && (
        <ProfileModal
          user={currentUser}
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  );
}

export default Sidebar;
