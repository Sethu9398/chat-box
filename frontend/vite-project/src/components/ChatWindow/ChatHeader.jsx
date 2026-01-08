import UserStatus from "../UserStatus";

/* ===============================
   ⏱ FORMAT LAST SEEN (WhatsApp)
   =============================== */
const formatLastSeen = (lastSeen) => {
  if (!lastSeen) return "Last seen recently";

  const now = new Date();
  const seen = new Date(lastSeen);
  const diffMs = now - seen;

  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "Last seen just now";
  if (diffMin < 60) return `Last seen ${diffMin} minutes ago`;
  if (diffHr < 24) return `Last seen ${diffHr} hours ago`;
  if (diffDay === 1) return "Last seen Yesterday";

  return `Last seen ${seen.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}`;
};

function ChatHeader({ user, onOpenInfo }) {
  // Safely resolve userId
  const userId = user?.userId || user?._id || user?.id || null;

  // ✅ Safe defaults
  const isOnline = user?.isOnline === true;
  const lastSeen = user?.lastSeen || null;

  return (
    <div
      className="d-flex align-items-center p-3 bg-light border-bottom justify-content-between"
      style={{ cursor: "pointer" }}
    >
      <div
        className="d-flex align-items-center flex-grow-1"
        onClick={onOpenInfo}
      >
        {/* AVATAR */}
        <div className="position-relative">
          <img
            src={user?.avatar || "https://via.placeholder.com/45"}
            className="rounded-circle me-2"
            width="45"
            height="45"
            alt="Profile"
            onError={(e) => {
              e.target.src = "https://via.placeholder.com/45";
            }}
          />

          {/* ONLINE DOT (WhatsApp-style) */}
          <div
            className="position-absolute"
            style={{
              bottom: "0",
              right: "8px",
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              backgroundColor: isOnline ? "#25D366" : "#adb5bd",
              border: "2px solid white",
            }}
          />
        </div>

        {/* NAME + STATUS */}
        <div>
          <strong>{user?.name || "User"}</strong>

          {/* ✅ WhatsApp-style text */}
          <div className="text-muted" style={{ fontSize: "0.9rem" }}>
            {isOnline ? "Online" : formatLastSeen(lastSeen)}
          </div>
        </div>
      </div>

      {/* INFO BUTTON */}
      <button
        onClick={onOpenInfo}
        className="btn btn-sm btn-link text-dark"
        title="Show chat info"
        style={{ padding: "8px 12px" }}
      >
        <i className="bi bi-info-circle" style={{ fontSize: "20px" }} />
      </button>
    </div>
  );
}

export default ChatHeader;
