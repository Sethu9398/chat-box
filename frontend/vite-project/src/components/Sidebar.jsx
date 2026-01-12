import {
  FaEllipsisV,
  FaMoon,
  FaSun,
  FaSignOutAlt,
} from "react-icons/fa";
import ProfileModal from "./ProfileModal";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logoutUser } from "../features/auth/authSlice";
import { useGetSidebarUsersQuery, userApi } from "../features/users/userApi";
import { setSelectedUser } from "../features/chat/chatSlice";
import socket from "../socketClient";
import defaultprofile from "../../../../Asset/userDB.avif";

/* LAST SEEN FORMATTER */
const formatLastSeen = (lastSeen) => {
  if (!lastSeen) return "";
  const diff = Date.now() - new Date(lastSeen);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return new Date(lastSeen).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

function Sidebar() {
  const [showProfile, setShowProfile] = useState(false);
  const [search, setSearch] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [theme, setTheme] = useState("light");

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const currentUser = useSelector((state) => state.auth.user);

  const {
    data: users = [],
    isLoading,
    isError,
  } = useGetSidebarUsersQuery();

  /* REAL-TIME SIDEBAR UPDATES */
  useEffect(() => {
    const handler = () => {
      dispatch(userApi.util.invalidateTags(["User"]));
    };

    socket.on("sidebar-update", handler);
    return () => socket.off("sidebar-update", handler);
  }, [dispatch]);

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

  const getLastMessage = (msg) => {
  if (!msg) return "No messages yet";
  if (typeof msg === "string") return msg;
  return "Message";
};

  return (
    <div className="d-flex flex-column h-100 bg-white">
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

              {Number(u.unreadCount) > 0 && (
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
