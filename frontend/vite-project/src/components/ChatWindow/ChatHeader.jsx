import DEFAULT_AVATAR from "../../../../../Asset/userDB.avif";

/* ⏱ FORMAT LAST SEEN */
const formatLastSeen = (lastSeen) => {
  if (!lastSeen) return "Last seen recently";

  const diff = Date.now() - new Date(lastSeen);
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);

  if (mins < 1) return "Last seen just now";
  if (mins < 60) return `Last seen ${mins} minutes ago`;
  if (hrs < 24) return `Last seen ${hrs} hours ago`;

  return `Last seen ${new Date(lastSeen).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}`;
};

function ChatHeader({ user, onOpenInfo }) {
  const avatar =
    typeof user?.avatar === "string" && user.avatar.trim()
      ? user.avatar
      : DEFAULT_AVATAR;

  const isOnline = user?.isOnline === true;
  const lastSeen = user?.lastSeen ?? null;

  return (
    <div className="d-flex align-items-center p-3 bg-light border-bottom justify-content-between">
      <div
        className="d-flex align-items-center flex-grow-1"
        style={{ cursor: "pointer" }}
        onClick={onOpenInfo}
      >
        <div className="position-relative">
          <img
            src={avatar}
            className="rounded-circle me-2"
            width="45"
            height="45"
            alt="Profile"
            onError={(e) => (e.currentTarget.src = DEFAULT_AVATAR)}
          />
          <div
            className="position-absolute"
            style={{
              bottom: 0,
              right: 8,
              width: 12,
              height: 12,
              borderRadius: "50%",
              backgroundColor: isOnline ? "#25D366" : "#adb5bd",
              border: "2px solid white",
            }}
          />
        </div>

        <div>
          <strong>{user?.name || "User"}</strong>
          <div className="text-muted" style={{ fontSize: "0.9rem" }}>
            {isOnline ? "Online" : formatLastSeen(lastSeen)}
          </div>
        </div>
      </div>

      <button
        onClick={onOpenInfo}
        className="btn btn-sm btn-link text-dark"
        title="Show chat info"
        style={{ padding: "8px 12px" }}
      >
        <i className="bi bi-info-circle" style={{ fontSize: 20 }} />
      </button>
    </div>
  );
}

export default ChatHeader;
