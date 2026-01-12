import { useState, useMemo } from "react";
import default_profile from "../../../../../Asset/userDB.avif";
import { useGetMessagesQuery } from "../../features/messages/messageApi";
import { useGetUserDetailsQuery } from "../../features/users/userApi";

function ChatInfoDrawer({ user, onClose }) {
  /* ================= USER DETAILS ================= */
  const { data: userDetails } = useGetUserDetailsQuery(user?._id, {
    skip: !user?._id,
  });

  const email =
    typeof userDetails?.email === "string" && userDetails.email.trim()
      ? userDetails.email
      : "user@email.com";

  const about =
    typeof userDetails?.about === "string" && userDetails.about.trim()
      ? userDetails.about
      : "Hey there! I'm using ChatBox.";

  const avatar =
    typeof userDetails?.avatar === "string" && userDetails.avatar.trim()
      ? userDetails.avatar
      : default_profile;

  /* ================= CHAT MESSAGES ================= */
  const { data: messageResponse } = useGetMessagesQuery(user?.chatId, {
    skip: !user?.chatId,
  });

  const messages = Array.isArray(messageResponse)
    ? messageResponse
    : Array.isArray(messageResponse?.messages)
      ? messageResponse.messages
      : [];

  /* ================= MEDIA EXTRACTION ================= */
  const {
    allMedia,
    previewMedia,
    documents,
  } = useMemo(() => {
    if (!messages.length) {
      return { allMedia: [], previewMedia: [], documents: [] };
    }

    const sorted = [...messages].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    const media = sorted.filter(
      (m) =>
        (m.type === "image" || m.type === "video") &&
        typeof m.mediaUrl === "string" &&
        m.mediaUrl.trim()
    );

    return {
      allMedia: media,
      previewMedia: media.slice(0, 3), // 👈 only 3 for contact info
      documents: sorted.filter(
        (m) => m.type === "file" && m.mediaUrl
      ),
    };
  }, [messages]);

  const hasMedia = allMedia.length || documents.length;

  /* ================= UI STATE ================= */
  const [isMediaView, setIsMediaView] = useState(false);
  const [activeTab, setActiveTab] = useState("media");
  const [preview, setPreview] = useState(null);

  return (
    <>
      {/* OVERLAY */}
      <div
        className="position-fixed top-0 start-0 w-100 h-100"
        style={{ background: "rgba(0,0,0,0.4)", zIndex: 1050 }}
        onClick={onClose}
      />

      {/* DRAWER */}
      <div
        className="position-fixed top-0 end-0 h-100 bg-white shadow"
        style={{ width: 320, zIndex: 1060, overflowY: "auto" }}
      >
        {/* HEADER */}
        <div className="p-3 border-bottom d-flex align-items-center">
          <button
            className="btn btn-sm btn-outline-secondary me-2"
            onClick={isMediaView ? () => setIsMediaView(false) : onClose}
          >
            ←
          </button>
          <strong>
            {isMediaView ? "Media and docs" : "Contact info"}
          </strong>
        </div>

        {/* ================= CONTACT INFO ================= */}
        {!isMediaView && (
          <>
            <div className="p-3 text-center">
              <img
                src={avatar}
                width="120"
                height="120"
                className="rounded-circle mb-3"
                alt="Profile"
                onError={(e) => (e.currentTarget.src = default_profile)}
              />
              <h5>{user?.name || "User"}</h5>
              <p className="text-muted small">
                {user?.isOnline
                  ? "Online"
                  : user?.lastSeen
                    ? `Last seen ${new Date(user.lastSeen).toLocaleString()}`
                    : "Offline"}
              </p>
            </div>

            <hr />

            <div className="px-3">
              <small className="text-muted">About</small>
              <p>{about}</p>
            </div>

            <hr />

            <div className="px-3">
              <small className="text-muted">Email</small>
              <p>{email}</p>
            </div>

            {hasMedia && (
              <>
                <hr />
                <div
                  className="px-3 text-muted small mb-2"
                  style={{ cursor: "pointer" }}
                  onClick={() => setIsMediaView(true)}
                >
                  Media, links and docs
                </div>

                {/* 👇 PREVIEW ROW (3 items only) */}
                <div className="px-3 d-flex gap-2 mb-3">
                  {previewMedia.map((m) =>
                    m.type === "image" ? (
                      <img
                        key={m._id}
                        src={m.mediaUrl}
                        className="rounded"
                        style={{
                          width: 70,
                          height: 70,
                          objectFit: "cover",
                          cursor: "pointer",
                        }}
                        onClick={() => {
                          setIsMediaView(true);
                          setPreview(m);
                        }}
                      />
                    ) : (
                      <div
                        key={m._id}
                        className="position-relative"
                        style={{ width: 70, height: 70, cursor: "pointer" }}
                        onClick={() => {
                          setIsMediaView(true);
                          setPreview(m);
                        }}
                      >
                        <video
                          src={m.mediaUrl}
                          muted
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            borderRadius: 8,
                          }}
                        />
                        <div className="position-absolute top-50 start-50 translate-middle text-white">
                          ▶
                        </div>
                      </div>
                    )
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* ================= MEDIA VIEW ================= */}
        {isMediaView && (
          <>
            {/* TABS (NO LINKS TAB) */}
            <div className="d-flex border-bottom">
              {["media", "docs"].map((t) => (
                <button
                  key={t}
                  className={`flex-fill py-2 border-0 bg-transparent ${activeTab === t
                      ? "border-bottom border-primary border-2"
                      : ""
                    }`}
                  onClick={() => setActiveTab(t)}
                >
                  {t === "media" ? "Media" : "Docs"}
                </button>
              ))}
            </div>

            <div className="p-3">
              {/* ALL MEDIA */}
              {activeTab === "media" && (
                <div className="d-flex flex-wrap gap-2">
                  {allMedia.length ? (
                    allMedia.map((m) =>
                      m.type === "image" ? (
                        <img
                          key={m._id}
                          src={m.mediaUrl}
                          className="rounded"
                          style={{
                            width: 80,
                            height: 80,
                            objectFit: "cover",
                            cursor: "pointer",
                          }}
                          onClick={() => setPreview(m)}
                        />
                      ) : (
                        <div
                          key={m._id}
                          className="position-relative"
                          style={{ width: 80, height: 80 }}
                          onClick={() => setPreview(m)}
                        >
                          <video
                            src={m.mediaUrl}
                            muted
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              borderRadius: 8,
                            }}
                          />
                          <div className="position-absolute top-50 start-50 translate-middle text-white">
                            ▶
                          </div>
                        </div>
                      )
                    )
                  ) : (
                    <p className="text-muted text-center w-100">
                      No media available
                    </p>
                  )}
                </div>
              )}

              {/* ALL DOCS */}
              {activeTab === "docs" && (
                <>
                  {documents.length ? (
                    documents.map((m) => (
                      <div
                        key={m._id}
                        className="d-flex align-items-center mb-2"
                      >
                        {/* FILE NAME */}
                        <div
                          className="flex-grow-1 me-2 text-truncate"
                          style={{ minWidth: 0 }}
                          title={m.fileName}
                        >
                          {m.fileName}
                        </div>

                        {/* DOWNLOAD */}
                        <a
                          href={m.mediaUrl}
                          download
                          className="btn btn-sm btn-outline-primary flex-shrink-0"
                        >
                          Download
                        </a>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted text-center">No documents</p>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* ================= PREVIEW ================= */}
      {preview && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
          style={{ background: "rgba(0,0,0,0.85)", zIndex: 1070 }}
          onClick={() => setPreview(null)}
        >
          {preview.type === "image" ? (
            <img
              src={preview.mediaUrl}
              alt=""
              style={{ maxWidth: "90%", maxHeight: "90%" }}
            />
          ) : (
            <video
              src={preview.mediaUrl}
              controls
              style={{ maxWidth: "90%", maxHeight: "90%" }}
            />
          )}
        </div>
      )}
    </>
  );
}

export default ChatInfoDrawer;
