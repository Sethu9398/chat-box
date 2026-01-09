import { useState, useRef } from "react";
import { useSelector } from "react-redux";
import { FaSmile, FaPaperclip } from "react-icons/fa";
import EmojiPicker from "emoji-picker-react";
import socket from "../../socket";

function ChatInput({ chatId }) {
  const [msg, setMsg] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const inputRef = useRef(null);

  const me = useSelector((state) => state.auth.user);

  const sendMessage = () => {
    if (!msg.trim() || !chatId) return;

    const message = {
      chatId,
      sender: me._id,
      text: msg,
      type: "text",
      createdAt: new Date().toISOString(),
    };

    socket.emit("send-message", message);
    setMsg("");
  };

  return (
    <div
      className="border-top p-2 position-relative"
      style={{ backgroundColor: "#f0f2f5" }}
    >
      {showEmoji && (
        <div className="position-absolute bottom-100 mb-2" style={{ zIndex: 2000 }}>
          <EmojiPicker
            onEmojiClick={(e) => setMsg((p) => p + e.emoji)}
            height={350}
            width={300}
          />
        </div>
      )}

      <div className="d-flex align-items-center gap-2">
        <div
          className="d-flex align-items-center flex-grow-1 px-3"
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "999px",
            height: "44px",
          }}
        >
          <FaSmile
            className="text-muted me-3"
            style={{ cursor: "pointer", fontSize: "1.2rem" }}
            onClick={() => setShowEmoji((p) => !p)}
          />

          <FaPaperclip
            className="text-muted me-3"
            style={{ cursor: "pointer", fontSize: "1.2rem" }}
          />

          <input
            ref={inputRef}
            className="border-0 bg-transparent flex-grow-1"
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            placeholder="Type a message"
            style={{ outline: "none", fontSize: "0.95rem" }}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
        </div>

        <button
          className="btn btn-success"
          style={{ borderRadius: "50%", width: "44px", height: "44px" }}
          onClick={sendMessage}
          disabled={!msg.trim()}
        >
          ➤
        </button>
      </div>
    </div>
  );
}

export default ChatInput;
