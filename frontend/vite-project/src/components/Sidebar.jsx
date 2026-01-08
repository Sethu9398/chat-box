import {
  FaEllipsisV,
  FaMoon,
  FaSun,
  FaSignOutAlt,
} from "react-icons/fa";
import ProfileModal from "./ProfileModal";
import { useState } from "react";
import { useNavigate } from "react-router-dom";


/* ===============================
   🕒 LAST SEEN FORMATTER
   =============================== */
const formatLastSeen = (lastSeen) => {
  if (!lastSeen) return "";

  const now = new Date();
  const seen = new Date(lastSeen);
  const diffMs = now - seen;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return "Yesterday";

  return seen.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

function Sidebar({ onUserSelect }) {
  const [showProfile, setShowProfile] = useState(false);
  const [search, setSearch] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [theme, setTheme] = useState("light");

  const navigate = useNavigate();

  /* ===============================
     THEME TOGGLE
     =============================== */
  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      document.body.classList.toggle("dark", next === "dark");
      return next;
    });
    setShowMenu(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    navigate("/login");
  };

  /* ===============================
     CURRENT USER
     =============================== */
  const currentUser = JSON.parse(
    localStorage.getItem("currentUser") ||
      JSON.stringify({
        name: "Demo User",
        avatar: "https://i.pravatar.cc/150?img=10",
      })
  );

  /* ===============================
     USERS WITH REAL lastSeen TIME
     =============================== */
  const users = [
    {
      id: 1,
      name: "John",
      avatar: "https://i.pravatar.cc/100?img=1",
      lastMessage: "Hey! How are you?",
      unreadCount: 2,
      chatId: "chat-1",
      isOnline: true,
      lastSeen: null,
    },
    {
      id: 2,
      name: "Sarah",
      avatar: "https://i.pravatar.cc/100?img=2",
      lastMessage: "Let's meet tomorrow",
      unreadCount: 0,
      chatId: "chat-2",
      isOnline: false,
      lastSeen: Date.now() - 1000 * 60 * 45, // 45 mins ago
    },
    {
      id: 3,
      name: "Alex",
      avatar: "https://i.pravatar.cc/100?img=3",
      lastMessage: "Okay 👍",
      unreadCount: 1,
      chatId: "chat-3",
      isOnline: false,
      lastSeen: Date.now() - 1000 * 60 * 60 * 5, // 5 hrs ago
    },
  ];

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="d-flex flex-column h-100 bg-white">
      {/* HEADER */}
      <div className="bg-light border-bottom">
        <div className="d-flex justify-content-between align-items-center p-3">
          <strong>ChatBox</strong>

          <div className="d-flex align-items-center position-relative">
            <img
              src={currentUser.avatar}
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
                style={{
                  top: "100%",
                  marginTop: "8px",
                  width: "180px",
                  zIndex: 2000,
                }}
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
        {filteredUsers.map((u) => (
          <div
            key={u.id}
            className="d-flex align-items-center p-2 border-bottom"
            style={{ cursor: "pointer" }}
            onClick={() => onUserSelect(u)}
          >
            <img
              src={u.avatar}
              width="45"
              height="45"
              className="rounded-circle me-2"
              alt=""
            />

            <div className="flex-grow-1">
              <strong>{u.name}</strong>
              <div className="text-muted small text-truncate">
                {u.lastMessage}
              </div>
            </div>

            {/* ✅ WhatsApp-style RIGHT SIDE */}
            <div className="text-end ms-2" style={{ minWidth: "65px" }}>
              <div
                style={{
                  fontSize: "11px",
                  color: u.isOnline ? "#28a745" : "#999",
                }}
              >
                {u.isOnline ? "Online" : formatLastSeen(u.lastSeen)}
              </div>

              {u.unreadCount > 0 && (
                <span
                  className="badge bg-success rounded-circle mt-1"
                  style={{
                    width: "20px",
                    height: "20px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "11px",
                  }}
                >
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


