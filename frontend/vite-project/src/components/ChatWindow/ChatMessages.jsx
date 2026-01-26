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
import {
  useGetMessagesQuery,
  useDeleteForMeMutation,
  useDeleteForEveryoneMutation,
  useMarkAsReadMutation,
  messageApi,
} from "../../features/messages/messageApi";
import ForwardModal from "./ForwardModal";

/* TYPING USERS */
const selectTypingUsers = createSelector(
  [(state) => state.chat.typingUsers, (state, chatId) => chatId],
  (typingUsers, chatId) => typingUsers[chatId] || []
);

function ChatMessages({
  chatId,
  onReply,
  selectionMode,
  selectedMessages,
  onToggleSelection,
}) {
  const { data = [], isLoading } = useGetMessagesQuery(chatId, {
    skip: !chatId,
  });

  const dispatch = useDispatch();
  const me = useSelector((state) => state.auth.user);
  const typingUsers = useSelector((state) =>
    selectTypingUsers(state, chatId)
  );

  const [deleteForMe] = useDeleteForMeMutation();
  const [deleteForEveryone] = useDeleteForEveryoneMutation();
  const [markAsRead] = useMarkAsReadMutation();

  const [socketMessages, setSocketMessages] = useState([]);
  const [statusUpdates, setStatusUpdates] = useState({});
  const [preview, setPreview] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [forwardModal, setForwardModal] = useState(null);

  const lastMessageRef = useRef(null);

  /* DOWNLOAD FILE HELPER */
  const downloadFile = (url, filename) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /* SOCKET */
  useEffect(() => {
    if (!chatId) return;

    const onNew = (msg) => {
      if (msg.chatId === chatId) {
        setSocketMessages((p) => [...p, msg]);
        if (msg.sender?._id !== me?._id) markAsRead(chatId);
      }
    };

    const onStatusUpdate = (update) => {
      setStatusUpdates((prev) => ({
        ...prev,
        [update.messageId]: update.status,
      }));
    };

    socket.on("new-message", onNew);
    socket.on("status-update", onStatusUpdate);
    return () => {
      socket.off("new-message", onNew);
      socket.off("status-update", onStatusUpdate);
    };
  }, [chatId, me?._id, markAsRead]);

  /* MERGE */
  const messages = useMemo(() => {
    const map = new Map();
    data.forEach((m) => map.set(m._id, m));
    socketMessages.forEach((m) => map.set(m._id, m));
    return [...map.values()].map((m) => ({
      ...m,
      status: statusUpdates[m._id] || m.status,
    })).sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );
  }, [data, socketMessages, statusUpdates]);

  /* GROUP MESSAGES BY DATE */
  const messagesWithDates = useMemo(() => {
    const grouped = [];
    let currentDate = null;

    messages.forEach((m) => {
      const messageDate = new Date(m.createdAt).toDateString();
      if (messageDate !== currentDate) {
        grouped.push({ type: 'date', date: messageDate });
        currentDate = messageDate;
      }
      grouped.push(m);
    });

    return grouped;
  }, [messages]);

  /* SCROLL */
  useLayoutEffect(() => {
    lastMessageRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* FORMAT DATE SEPARATOR */
  const formatDateSeparator = (dateString) => {
    const messageDate = new Date(dateString);
    const now = new Date();
    const diffTime = now - messageDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays <= 7) {
      return messageDate.toLocaleDateString('en-US', { weekday: 'short' });
    }
    return messageDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  /* GET TICKS */
  const getTicks = (status, isMe) => {
    if (!isMe) return "";
    switch (status) {
      case "sent":
        return <span style={{ color: "#999" }}>✓</span>;
      case "delivered":
        return <span style={{ color: "#999" }}>✓✓</span>;
      case "read":
        return <span style={{ color: "#34B7F1" }}>✓✓</span>;
      default:
        return "";
    }
  };

  if (isLoading) {
    return <p className="text-center text-muted mt-3">Loading messages…</p>;
  }

  const bubbleBase = {
    maxWidth: "90%",
    padding: "10px",
    paddingLeft: "12px",
    borderRadius: "18px",
    boxShadow: "0 1px 1px rgba(0,0,0,.15)",
    wordBreak: "break-word",
  };

  const mediaStyle = {
    width: "100%",
    maxWidth: 260,
    maxHeight: 260,
    borderRadius: 8,
    objectFit: "cover",
  };

  return (
    <>
      <div className="flex-grow-1 overflow-auto px-2 px-sm-3 py-3" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width="100" height="100" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill-rule="evenodd"%3E%3Cg fill="%23f0f0f0" fill-opacity="0.1"%3E%3Cpath d="M96 95h4v1h-4v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h4v1h-4v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4H96v-1z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")', backgroundColor: '#e5ddd5' }}>
        {messagesWithDates.map((item, i) => {
          if (item.type === 'date') {
            return (
              <div key={`date-${item.date}`} className="d-flex justify-content-center my-3">
                <div className="bg-light text-muted px-3 py-1 rounded-pill small">
                  {formatDateSeparator(item.date)}
                </div>
              </div>
            );
          }

          const m = item;
          const isMe = m.sender?._id === me?._id;

          return (
            <div
              key={m._id}
              ref={i === messagesWithDates.length - 1 ? lastMessageRef : null}
              className={`d-flex mb-2 ${isMe ? "justify-content-end" : "justify-content-start"
                }`}
            >
              <div className={`d-flex align-items-center ${isMe ? 'flex-row-reverse' : ''}`}>
                <div
                  style={{ ...bubbleBase, background: selectedMessages.includes(m._id) ? "#ffcccc" : (isMe ? "#dcf8c6" : "#fff") }}
                  onClick={() =>
                    selectionMode && onToggleSelection(m._id)
                  }
                  className="position-relative"
                >
                  {/* DROPDOWN TRIGGER */}
                  <div
                    className="position-absolute top-0 end-0 p-1"
                    style={{ cursor: "pointer" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDropdownOpen(dropdownOpen === m._id ? null : m._id);
                    }}
                  >
                    ⋮
                  </div>

                  {/* FORWARDED INDICATOR */}
                  {m.isForwarded && (
                    <div style={{
                      fontSize: '12px',
                      color: '#999',
                      marginBottom: '4px',
                      fontStyle: 'italic'
                    }}>
                      Forwarded
                    </div>
                  )}

                  {/* REPLY PREVIEW */}
                  {m.replyTo && (
                    <div
                      style={{
                        backgroundColor: isMe ? '#ffffff20' : '#00000010',
                        borderLeft: '3px solid #2196f3',
                        padding: '6px 8px',
                        marginBottom: '6px',
                        borderRadius: '4px',
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        // Scroll to replied message if it exists in current messages
                        const repliedMessageElement = document.getElementById(`message-${m.replyTo._id}`);
                        if (repliedMessageElement) {
                          repliedMessageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          // Add temporary highlight
                          repliedMessageElement.style.backgroundColor = '#ffff0050';
                          setTimeout(() => {
                            repliedMessageElement.style.backgroundColor = '';
                          }, 2000);
                        }
                      }}
                    >
                      <div style={{ fontWeight: 'bold', color: '#2196f3', marginBottom: '2px' }}>
                        {m.replyTo.sender?.name}
                      </div>
                      <div style={{
                        color: '#666',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {m.replyTo.type === "text"
                          ? m.replyTo.text
                          : m.replyTo.type === "image"
                            ? "📷 Photo"
                            : m.replyTo.type === "video"
                              ? "🎥 Video"
                              : m.replyTo.type === "file"
                                ? `📎 ${m.replyTo.fileName}`
                                : "Media"}
                      </div>
                    </div>
                  )}

                  {/* TEXT */}
                  {m.type === "text" && (
                    <div style={{ position: 'relative' }} id={`message-${m._id}`}>
                      {m.text}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '11px', color: '#999', whiteSpace: 'nowrap' }}>
                        {new Date(m.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {getTicks(m.status, isMe)}
                      </div>
                    </div>
                  )}

                  {/* IMAGE */}
                  {m.type === "image" && m.mediaUrl && (
                    <div style={{ position: 'relative' }} id={`message-${m._id}`}>
                      <div className="d-flex justify-content-center">
                        <img
                          src={m.mediaUrl}
                          alt="Image"
                          style={{ ...mediaStyle, cursor: 'pointer' }}
                          onClick={() => setPreview(m)}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '11px', color: '#999', whiteSpace: 'nowrap' }}>
                        {new Date(m.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {getTicks(m.status, isMe)}
                      </div>
                    </div>
                  )}

                  {/* VIDEO */}
                  {m.type === "video" && m.mediaUrl && (
                    <div style={{ position: 'relative' }} id={`message-${m._id}`}>
                      <div
                        className="position-relative d-flex justify-content-center"
                        onClick={() => setPreview(m)}
                      >
                        <video src={m.mediaUrl} style={mediaStyle} />
                        <FaPlay
                          style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%,-50%)",
                            fontSize: 42,
                            color: "#fff",
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '11px', color: '#999', whiteSpace: 'nowrap' }}>
                        {new Date(m.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {getTicks(m.status, isMe)}
                      </div>
                    </div>
                  )}

                  {/* FILE */}
                  {m.type === "file" && (
                    <div style={{ position: 'relative' }} id={`message-${m._id}`}>
                      <div
                        className="text-primary text-truncate"
                        style={{ maxWidth: 240, cursor: "pointer" }}
                        onClick={() => downloadFile(m.mediaUrl, m.fileName)}
                      >
                        📄 {m.fileName}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '11px', color: '#999', whiteSpace: 'nowrap' }}>
                        {new Date(m.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {getTicks(m.status, isMe)}
                      </div>
                    </div>
                  )}

                  {/* DROPDOWN MENU */}
                  {dropdownOpen === m._id && (
                    <div
                      className="position-absolute bg-white border rounded shadow-sm p-2"
                      style={{
                        top: "100%",
                        [isMe ? 'right' : 'left']: 0,
                        zIndex: 100,
                        minWidth: "120px",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="btn btn-sm btn-link text-decoration-none d-block w-100 text-start"
                        onClick={() => {
                          onReply(m);
                          setDropdownOpen(null);
                        }}
                      >
                        Reply
                      </button>
                      <button
                        className="btn btn-sm btn-link text-decoration-none d-block w-100 text-start"
                        onClick={() => {
                          deleteForMe(m._id);
                          setDropdownOpen(null);
                        }}
                      >
                        Delete for me
                      </button>
                      {isMe && (
                        <button
                          className="btn btn-sm btn-link text-decoration-none d-block w-100 text-start"
                          onClick={() => {
                            deleteForEveryone(m._id);
                            setDropdownOpen(null);
                          }}
                        >
                          Delete for everyone
                        </button>
                      )}
                      <button
                        className="btn btn-sm btn-link text-decoration-none d-block w-100 text-start"
                        onClick={() => {
                          setForwardModal(m);
                          setDropdownOpen(null);
                        }}
                      >
                        Forward
                      </button>
                    </div>
                  )}
                </div>
                {selectionMode && (
                  <input
                    type="checkbox"
                    checked={selectedMessages.includes(m._id)}
                    onChange={() => onToggleSelection(m._id)}
                    className="ms-2"
                  />
                )}
              </div>
            </div>
          );
        })}

        {/* TYPING */}
        {typingUsers.length > 0 && (
          <div className="text-muted fst-italic small">
            Typing…
          </div>
        )}
      </div>

      {/* PREVIEW */}
      {preview && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ background: "rgba(0,0,0,.85)", zIndex: 2000 }}
          onClick={() => setPreview(null)}
        >
          {preview.type === "image" ? (
            <img
              src={preview.mediaUrl}
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
