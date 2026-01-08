function ChatInfoDrawer({ user, onClose }) {
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
        style={{
          width: "320px",
          zIndex: 1060,
          overflowY: "auto"
        }}
      >
        {/* Header */}
        <div className="p-3 border-bottom d-flex align-items-center">
          <button
            className="btn btn-sm btn-outline-secondary me-2"
            onClick={onClose}
          >
            ←
          </button>
          <strong>Contact info</strong>
        </div>

        {/* Body */}
        <div className="p-3 text-center">
          <img
            src={user?.avatar || "https://via.placeholder.com/120"}
            className="rounded-circle mb-3"
            width="120"
            height="120"
            alt=""
            onError={(e) => { e.target.src = "https://via.placeholder.com/120"; }}
          />
          <h5 className="mb-1">{user?.name || "User"}</h5>
          <p className="text-muted small">{user?.isOnline ? "Online" : (user?.lastSeen ? `Last seen ${user.lastSeen}` : "Offline")}</p>
        </div>

        <hr />

        {/* About */}
        <div className="px-3 pb-3 text-start">
          <small className="text-muted">About</small>
          <p className="mb-0">
            {user?.about || "Hey there! I'm using ChatBox."}
          </p>
        </div>
        <hr />

        {/* Email */}
        <div className="px-3 pb-3 text-start">
          <small className="text-muted">Email</small>
          <p className="mb-0">
            {user?.email || "user@email.com"}
          </p>
        </div>
      </div>
    </>
  );
}

export default ChatInfoDrawer;