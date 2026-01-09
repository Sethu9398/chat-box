import default_profile from "../../../../../Asset/userDB.avif";

function ChatInfoDrawer({ user, onClose }) {
  const email =
    typeof user?.email === "string" && user.email.trim()
      ? user.email
      : "user@email.com";

  const about =
    typeof user?.about === "string" && user.about.trim()
      ? user.about
      : "Hey there! I'm using ChatBox.";

  const avatar =
    typeof user?.avatar === "string" && user.avatar.trim()
      ? user.avatar
      : default_profile;

  return (
    <>
      {/* Overlay */}
      <div
        className="position-fixed top-0 start-0 w-100 h-100"
        style={{ backgroundColor: "rgba(0,0,0,0.4)", zIndex: 1050 }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="position-fixed top-0 end-0 h-100 bg-white shadow"
        style={{ width: 320, zIndex: 1060, overflowY: "auto" }}
      >
        <div className="p-3 border-bottom d-flex align-items-center">
          <button
            className="btn btn-sm btn-outline-secondary me-2"
            onClick={onClose}
          >
            ←
          </button>
          <strong>Contact info</strong>
        </div>

        <div className="p-3 text-center">
          <img
            src={avatar}
            className="rounded-circle mb-3"
            width="120"
            height="120"
            alt="Profile"
            onError={(e) => (e.currentTarget.src = default_profile)}
          />
          <h5 className="mb-1">{user?.name || "User"}</h5>
          <p className="text-muted small">
            {user?.isOnline
              ? "Online"
              : user?.lastSeen
              ? `Last seen ${new Date(user.lastSeen).toLocaleString()}`
              : "Offline"}
          </p>
        </div>

        <hr />

        <div className="px-3 pb-3 text-start">
          <small className="text-muted">About</small>
          <p className="mb-0">{about}</p>
        </div>

        <hr />

        <div className="px-3 pb-3 text-start">
          <small className="text-muted">Email</small>
          <p className="mb-0">{email}</p>
        </div>
      </div>
    </>
  );
}

export default ChatInfoDrawer;
