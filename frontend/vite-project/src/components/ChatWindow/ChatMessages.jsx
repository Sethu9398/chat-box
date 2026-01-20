import {
  useEffect,
  useState,
  useMemo,
  useRef,
  useLayoutEffect,
} from "react";
import { useSelector, useDispatch } from "react-redux";
import { createSelector } from "@reduxjs/toolkit";
import { FaPlay } from "react-icons/fa";
import socket from "../../socketClient";
import { useGetMessagesQuery, useDeleteForMeMutation, useDeleteForEveryoneMutation, useMarkAsDeliveredMutation, useMarkAsReadMutation, messageApi } from "../../features/messages/messageApi";
import ForwardModal from "./ForwardModal";

// Memoized selector for typing users
const selectTypingUsers = createSelector(
  [(state) => state.chat.typingUsers, (state, chatId) => chatId],
  (typingUsers, chatId) => typingUsers[chatId] || []
);

function ChatMessages({ chatId, onReply }) {
  const { data = [], isLoading, refetch } = useGetMessagesQuery(chatId, {
    skip: !chatId,
    refetchOnMountOrArgChange: true,
  });

  const dispatch = useDispatch();
  const me = useSelector((state) => state.auth.user);
  const typingUsers = useSelector((state) => selectTypingUsers(state, chatId));
  const [deleteForMeMutation] = useDeleteForMeMutation();
  const [deleteForEveryoneMutation] = useDeleteForEveryoneMutation();
  const [markAsDelivered] = useMarkAsDeliveredMutation();
  const [markAsRead] = useMarkAsReadMutation();
  const [socketMessages, setSocketMessages] = useState([]);
  const [preview, setPreview] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [forwardModal, setForwardModal] = useState(null);
  const [hoveredMessage, setHoveredMessage] = useState(null);
  const lastMessageRef = useRef(null);

  /* RESET */
  useEffect(() => {
    setSocketMessages([]);
  }, [chatId]);

  /* SOCKET */
  useEffect(() => {
    if (!chatId) return;

    const handler = (msg) => {
      if (msg?.chatId?.toString() === chatId) {
        setSocketMessages((prev) => [...prev, msg]);
        // Mark as read since the chat is open
        if (msg.sender?._id !== me?._id) {
          markAsRead(chatId);
        }
      }
    };

    const deletedHandler = (data) => {
      console.log("📩 Message deleted received:", data);
      if (data.messageId) {
        console.log("🗑️ Removing message from local state:", data.messageId);
        // Remove the message from socketMessages if it exists
        setSocketMessages((prev) => prev.filter(msg => msg._id !== data.messageId));
        // Also invalidate cache to ensure consistency
        dispatch(messageApi.util.invalidateTags(["Messages"]));
      }
    };

    const updatedHandler = (updatedMessage) => {
      console.log("📩 Message updated received:", updatedMessage);
      if (updatedMessage._id) {
        // Update the message in socketMessages if it exists
        setSocketMessages((prev) =>
          prev.map((msg) =>
            msg._id === updatedMessage._id ? { ...msg, ...updatedMessage } : msg
          )
        );
        // Invalidate cache to update from server
        dispatch(messageApi.util.invalidateTags(["Messages"]));
      }
    };

    const statusUpdateHandler = (data) => {
      console.log("📩 Status update received:", data);
      if (data.messageId && data.status) {
        // Update status in socketMessages
        setSocketMessages((prev) =>
          prev.map((msg) =>
            msg._id === data.messageId ? { ...msg, status: data.status } : msg
          )
        );
        // Update cached data directly
        dispatch(messageApi.util.updateQueryData('getMessages', chatId, (draft) => {
          const msg = draft.find(m => m._id === data.messageId);
          if (msg) {
            msg.status = data.status;
          }
        }));
      }
    };

    socket.on("new-message", handler);
    socket.on("message-deleted", deletedHandler);
    socket.on("message-updated", updatedHandler);
    socket.on("status-update", statusUpdateHandler);
    return () => {
      socket.off("new-message", handler);
      socket.off("message-deleted", deletedHandler);
      socket.off("message-updated", updatedHandler);
      socket.off("status-update", statusUpdateHandler);
    };
  }, [chatId, dispatch]);

  /* MERGE */
  const messages = useMemo(() => {
    const messageMap = new Map();

    // First, add data messages
    data.forEach(msg => messageMap.set(msg._id, msg));

    // Then, add/override with socketMessages (prioritize real-time updates)
    socketMessages.forEach(msg => messageMap.set(msg._id, msg));

    // Convert back to array and sort
    return Array.from(messageMap.values()).sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );
  }, [data, socketMessages]);

  /* SCROLL */
  useLayoutEffect(() => {
    lastMessageRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (isLoading) {
    return (
      <div className="text-center mt-3 text-muted">
        Loading messages...
      </div>
    );
  }

  const mediaStyle = {
    maxWidth: "260px",
    maxHeight: "260px",
    borderRadius: "8px",
    objectFit: "cover",
    cursor: "pointer",
  };

  let lastRenderedDate = null;

  return (
    <>
      {/* CHAT BODY */}
      <div
        className="flex-grow-1 overflow-auto"
        style={{ padding: "16px", backgroundColor: "#e5ddd5" }}
      >
        {messages.map((m, index) => {
          const isMe = m.sender?._id === me?._id;
          const dateKey = new Date(m.createdAt).toDateString();
          const showDate = lastRenderedDate !== dateKey;
          if (showDate) lastRenderedDate = dateKey;

          return (
            <div key={m._id}>
              {showDate && (
                <div className="text-center my-2">
                  <span
                    style={{
                      background: "#e1f3fb",
                      padding: "4px 12px",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                  >
                    {dateKey}
                  </span>
                </div>
              )}

              <div
                id={`msg-${m._id}`}
                ref={index === messages.length - 1 ? lastMessageRef : null}
                className={`mb-2 d-flex ${
                  isMe ? "justify-content-end" : "justify-content-start"
                }`}
              >
                <div
                  style={{
                    maxWidth: "75%",
                    padding: "8px",
                    borderRadius: isMe
                      ? "18px 18px 4px 18px"
                      : "18px 18px 18px 4px",
                    backgroundColor: isMe ? "#dcf8c6" : "#ffffff",
                    boxShadow: "0 1px 1px rgba(0,0,0,0.15)",
                    position: "relative",
                  }}
                  onMouseEnter={() => setHoveredMessage(m._id)}
                  onMouseLeave={() => setHoveredMessage(null)}
                >
                  {/* DROPDOWN BUTTON */}
                  {hoveredMessage === m._id && (
                    <div
                      style={{
                        position: "absolute",
                        top: "4px",
                        right: "4px",
                        cursor: "pointer",
                        fontSize: "14px",
                        color: "#666",
                      }}
                      onClick={() => setDropdownOpen(dropdownOpen === m._id ? null : m._id)}
                    >
                      ⌄
                    </div>
                  )}

                  {/* DROPDOWN MENU */}
                  {dropdownOpen === m._id && (
                    <div
                      style={{
                        position: "absolute",
                        top: "20px",
                        right: "4px",
                        background: "#fff",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                        zIndex: 1000,
                        minWidth: "80px",
                      }}
                    >
                      <div
                        style={{
                          padding: "8px 12px",
                          cursor: "pointer",
                          fontSize: "14px",
                        }}
                        onClick={() => {
                          onReply(m);
                          setDropdownOpen(null);
                        }}
                      >
                        Reply
                      </div>
                      <div
                        style={{
                          padding: "8px 12px",
                          cursor: "pointer",
                          fontSize: "14px",
                        }}
                        onClick={() => {
                          setForwardModal(m);
                          setDropdownOpen(null);
                        }}
                      >
                        Forward
                      </div>
                      {m.type === "text" && (
                        <div
                          style={{
                            padding: "8px 12px",
                            cursor: "pointer",
                            fontSize: "14px",
                          }}
                          onClick={() => {
                            navigator.clipboard.writeText(m.text);
                            setDropdownOpen(null);
                          }}
                        >
                          Copy
                        </div>
                      )}
                      <div
                        style={{
                          padding: "8px 12px",
                          cursor: "pointer",
                          fontSize: "14px",
                        }}
                        onClick={() => {
                          deleteForMeMutation(m._id);
                          setDropdownOpen(null);
                        }}
                      >
                        Delete for me
                      </div>
                      {isMe && (
                        <div
                          style={{
                            padding: "8px 12px",
                            cursor: "pointer",
                            fontSize: "14px",
                          }}
                          onClick={() => {
                            deleteForEveryoneMutation(m._id);
                            setDropdownOpen(null);
                          }}
                        >
                          Delete for everyone
                        </div>
                      )}
                    </div>
                  )}

                  {m.deletedForAll ? (
                    <div>
                      {isMe ? "You deleted this message" : "This message was deleted"}
                      <div
                        style={{
                          fontSize: "11px",
                          textAlign: "right",
                          marginTop: 4,
                          color: "#666",
                        }}
                      >
                        {new Date(m.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* FORWARDED LABEL */}
                      {m.isForwarded && (
                        <div
                          style={{
                            fontSize: "11px",
                            color: "#666",
                            marginBottom: "2px",
                            fontStyle: "italic",
                          }}
                        >
                          Forwarded
                        </div>
                      )}

                  {/* REPLY PREVIEW */}
                  {m.replyTo && (
                    <div
                      style={{
                        background: "#f0f0f0",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        marginBottom: "4px",
                        borderLeft: "3px solid #007bff",
                        cursor: "pointer",
                        fontSize: "12px",
                        color: "#666",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                      onClick={() => {
                        const el = document.getElementById(`msg-${m.replyTo._id}`);
                        el?.scrollIntoView({ behavior: "smooth", block: "center" });
                      }}
                    >
                      {m.replyTo.type === "image" && m.replyTo.mediaUrl && (
                        <img
                          src={m.replyTo.mediaUrl}
                          alt="reply thumbnail"
                          style={{
                            width: "40px",
                            height: "40px",
                            objectFit: "cover",
                            borderRadius: "4px",
                          }}
                        />
                      )}
                      {m.replyTo.type === "video" && m.replyTo.mediaUrl && (
                        <video
                          src={m.replyTo.mediaUrl}
                          style={{
                            width: "40px",
                            height: "40px",
                            objectFit: "cover",
                            borderRadius: "4px",
                          }}
                        />
                      )}
                      <div style={{ flex: 1 }}>
                        <strong>{m.replyTo.sender?.name}:</strong>{" "}
                        {m.replyTo.type === "text"
                          ? m.replyTo.text
                          : m.replyTo.type === "file"
                          ? `📄 ${m.replyTo.fileName}`
                          : `Media: ${m.replyTo.type}`}
                      </div>
                    </div>
                  )}

                  {/* TEXT */}
                  {m.type === "text" && <div>{m.text}</div>}

                  {/* IMAGE */}
                  {m.type === "image" && m.mediaUrl && (
                    <img
                      src={m.mediaUrl}
                      alt="image"
                      style={mediaStyle}
                      onClick={() => setPreview(m)}
                    />
                  )}

                  {/* VIDEO */}
                  {m.type === "video" && m.mediaUrl && (
                    <div
                      style={{ position: "relative", display: "inline-block" }}
                      onClick={() => setPreview(m)}
                    >
                      <video src={m.mediaUrl} style={mediaStyle} />
                      <FaPlay
                        style={{
                          position: "absolute",
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%, -50%)",
                          fontSize: 42,
                          color: "rgba(255,255,255,0.9)",
                          pointerEvents: "none",
                        }}
                      />
                    </div>
                  )}

                  {/* FILE */}
                  {m.type === "file" && (
                    <div
                      style={{ cursor: "pointer", color: "#007bff" }}
                      onClick={() => setPreview(m)}
                    >
                      📄 {m.fileName}
                    </div>
                  )}

                  {/* TIME */}
                  <div
                    style={{
                      fontSize: "11px",
                      textAlign: "right",
                      marginTop: 4,
                      color: "#666",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      gap: "4px",
                    }}
                  >
                    {new Date(m.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {isMe && (
<span style={{ fontSize: "9px", color: m.status === "read" ? "#007bff" : m.status === "delivered" ? "#999" : "#666" }}>
                        {m.status === "sent" && "✓"}
                        {m.status === "delivered" && "✓✓"}
                        {m.status === "read" && "✓✓"}
                      </span>
                    )}
                  </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* TYPING INDICATOR */}
        {typingUsers.length > 0 && (
          <div className="d-flex justify-content-start mb-2">
            <div
              style={{
                padding: "8px 12px",
                borderRadius: "18px 18px 18px 4px",
                backgroundColor: "#ffffff",
                boxShadow: "0 1px 1px rgba(0,0,0,0.15)",
                fontSize: "14px",
                color: "#666",
                fontStyle: "italic",
              }}
            >
              {typingUsers.length === 1 ? "Typing..." : `${typingUsers.length} people typing...`}
            </div>
          </div>
        )}
      </div>

      {/* PREVIEW MODAL (FIXED SIZE + CENTERED) */}
      {preview && preview.mediaUrl && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
          style={{ background: "rgba(0,0,0,0.85)", zIndex: 2000 }}
          onClick={() => setPreview(null)}
        >
          {preview.type === "image" && (
            <img
              src={preview.mediaUrl}
              alt="preview"
              style={{
                maxWidth: "90vw",
                maxHeight: "85vh",
                objectFit: "contain",
              }}
            />
          )}

          {preview.type === "video" && (
            <video
              src={preview.mediaUrl}
              controls
              autoPlay
              style={{
                maxWidth: "90vw",
                maxHeight: "85vh",
                objectFit: "contain",
              }}
            />
          )}

          {preview.type === "file" && (
            <a
              href={preview.mediaUrl}
              download
              className="btn btn-success"
            >
              Download
            </a>
          )}
        </div>
      )}

      {/* FORWARD MODAL */}
      {forwardModal && (
        <ForwardModal
          message={forwardModal}
          onClose={() => setForwardModal(null)}
        />
      )}
    </>
  );
}

export default ChatMessages;
