import { useEffect, useState, useMemo } from "react";
import { useSelector } from "react-redux";
import socket from "../../socketClient";
import { useGetMessagesQuery } from "../../features/messages/messageApi";

function ChatMessages({ chatId }) {
  const { data = [], isLoading } = useGetMessagesQuery(chatId, {
    skip: !chatId,
  });

  const me = useSelector((state) => state.auth.user);
  const [socketMessages, setSocketMessages] = useState([]);

  /* RESET WHEN CHAT CHANGES */
  useEffect(() => {
    setSocketMessages([]);
  }, [chatId]);

  /* SOCKET RECEIVE */
  useEffect(() => {
    if (!chatId) return;

    const handler = (msg) => {
      if (msg.chatId === chatId) {
        setSocketMessages((prev) => [...prev, msg]);
      }
    };

    socket.on("new-message", handler);
    return () => socket.off("new-message", handler);
  }, [chatId]);

  /* COMBINE AND DEDUPLICATE MESSAGES */
  const messages = useMemo(() => {
    const allMessages = [...data, ...socketMessages];
    const uniqueMessages = allMessages.filter(
      (msg, index, self) => self.findIndex((m) => m._id === msg._id) === index
    );
    return uniqueMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }, [data, socketMessages]);

  if (isLoading) {
    return (
      <div className="text-center mt-3 text-muted">
        Loading messages...
      </div>
    );
  }

  /* ✅ WHATSAPP-LIKE MEDIA SIZE */
  const mediaStyle = {
    maxWidth: "260px",
    maxHeight: "260px",
    width: "auto",
    height: "auto",
    borderRadius: "8px",
    objectFit: "cover",
    cursor: "pointer",
  };

  return (
    <div
      className="flex-grow-1 overflow-auto"
      style={{ padding: "16px", backgroundColor: "#e5ddd5" }}
    >
      {messages.map((m) => {
        const isMe = m.sender?._id === me?._id;

        return (
          <div
            key={m._id}
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
              }}
            >
              {/* TEXT */}
              {m.type === "text" && <div>{m.text}</div>}

              {/* IMAGE */}
              {m.type === "image" && m.mediaUrl && (
                <img
                  src={m.mediaUrl}
                  alt={m.fileName}
                  style={mediaStyle}
                  onClick={() => window.open(m.mediaUrl, "_blank")}
                />
              )}

              {/* VIDEO */}
              {m.type === "video" && m.mediaUrl && (
                <video
                  src={m.mediaUrl}
                  controls
                  style={mediaStyle}
                />
              )}

              {/* FILE */}
              {m.type === "file" && m.mediaUrl && (
                <a
                  href={m.mediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "#007bff",
                    textDecoration: "none",
                  }}
                >
                  📄 {m.fileName} ({m.fileSize})
                </a>
              )}

              {/* TIME */}
              <div
                style={{
                  fontSize: "11px",
                  textAlign: "right",
                  marginTop: "4px",
                  color: "#666",
                }}
              >
                {new Date(m.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ChatMessages;
