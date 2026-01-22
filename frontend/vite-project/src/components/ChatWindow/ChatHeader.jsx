import { useState, useEffect } from "react";
import { MdCheckBox } from "react-icons/md";
import { FaArrowLeft } from "react-icons/fa";
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

function ChatHeader({
  user,
  isMobile,
  onBack,
  onOpenInfo,
  selectionMode,
  selectedMessages,
  onExitSelection,
  onDeleteSelected,
  onEnterSelection,
}) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const avatar =
    typeof user?.avatar === "string" && user.avatar.trim()
      ? user.avatar
      : DEFAULT_AVATAR;

  return (
    <div className="d-flex align-items-center justify-content-between px-2 px-sm-3 py-2 bg-light border-bottom">
      {/* LEFT */}
      {selectionMode ? (
        <div className="d-flex align-items-center">
          <button
            className="btn btn-link p-0 me-2"
            onClick={onExitSelection}
            style={{ fontSize: "1.2rem" }}
          >
            ✕
          </button>
          <strong>{selectedMessages.length} selected</strong>
        </div>
      ) : (
        <div
          className="d-flex align-items-center flex-grow-1"
          style={{ cursor: "pointer", minWidth: 0 }}
          onClick={onOpenInfo}
        >
          {isMobile && (
            <button
              className="btn btn-link p-0 me-2"
              onClick={(e) => {
                e.stopPropagation();
                onBack();
              }}
            >
              <FaArrowLeft size={20} />
            </button>
          )}

          <img
            src={avatar}
            alt="avatar"
            width="42"
            height="42"
            className="rounded-circle me-2 flex-shrink-0"
            onError={(e) => (e.currentTarget.src = DEFAULT_AVATAR)}
          />

          <div className="text-truncate">
            <strong className="d-block text-truncate">
              {user?.name || "User"}
            </strong>
            <small className="text-muted">
              {user?.isOnline ? "Online" : formatLastSeen(user?.lastSeen)}
            </small>
          </div>
        </div>
      )}

      {/* RIGHT */}
      {selectionMode ? (
        <button
          className="btn btn-link text-danger"
          onClick={onDeleteSelected}
          disabled={!selectedMessages.length}
        >
          Delete
        </button>
      ) : (
        <button
          className="btn btn-link"
          onClick={onEnterSelection}
          title="Select messages"
        >
          <MdCheckBox size={22} />
        </button>
      )}
    </div>
  );
}

export default ChatHeader;
