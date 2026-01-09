import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import socket from "../../socket";
import { useGetMessagesQuery } from "../../features/messages/messageApi";

function ChatMessages({ chatId }) {
  const { data = [], isLoading } = useGetMessagesQuery(chatId, {
    skip: !chatId,
  });

  const me = useSelector((state) => state.auth.user);
  const [messages, setMessages] = useState([]);

  /* LOAD INITIAL MESSAGES */
  useEffect(() => {
    if (data.length) {
      setMessages(data);
    }
  }, [chatId]);

  /* SOCKET RECEIVE */
  useEffect(() => {
    const handler = (msg) => {
      setMessages((prev) => [...prev, msg]);
    };

    socket.on("new-message", handler);
    return () => socket.off("new-message", handler);
  }, []);

  if (isLoading) {
    return (
      <div className="text-center mt-3 text-muted">
        Loading messages...
      </div>
    );
  }

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
              {m.text && <div>{m.text}</div>}

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
