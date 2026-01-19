import { useState, useRef, useEffect } from "react";
import { useSelector } from "react-redux";
import { FaSmile, FaPaperclip } from "react-icons/fa";
import EmojiPicker from "emoji-picker-react";
import { useSendMessageMutation } from "../../features/messages/messageApi";
import socket from "../../socketClient";

function ChatInput({ chatId, onOpenAttachment, replyTo, onCancelReply }) {
  const [msg, setMsg] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const me = useSelector((state) => state.auth.user);
  const [sendMessageMutation] = useSendMessageMutation();

  const emitStopTyping = () => {
    socket.emit("stop-typing", { chatId, userId: me._id });
  };

  const handleInputChange = (e) => {
    setMsg(e.target.value);
    // Emit start typing
    socket.emit("start-typing", { chatId, userId: me._id });
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    // Set new timeout to stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(emitStopTyping, 2000);
  };

  const handleInputBlur = () => {
    setShowEmoji(false);
  };

  const sendMessage = async () => {
    if (!msg.trim() || !chatId) return;

    const messageText = msg.trim();
    setMsg(""); // Clear input immediately like WhatsApp
    onCancelReply?.();

    // Stop typing when sending message
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    emitStopTyping();

    // Use socket to send message for real-time updates
    socket.emit("send-message", {
      chatId,
      sender: me._id,
      text: messageText,
      type: "text",
      replyTo: replyTo?._id,
      isForwarded: false,
    });
  };

  return (
    <div className="border-top p-2 position-relative" style={{ backgroundColor: "#f0f2f5" }}>
      {showEmoji && (
        <div className="position-absolute bottom-100 mb-2" style={{ zIndex: 2000 }}>
          <EmojiPicker onEmojiClick={(e) => setMsg((p) => p + e.emoji)} />
        </div>
      )}

      {/* REPLY PREVIEW */}
      {replyTo && (
        <div
          className="mb-2 p-2 rounded"
          style={{
            backgroundColor: "#e3f2fd",
            borderLeft: "3px solid #2196f3",
            position: "relative",
          }}
        >
          <div className="d-flex justify-content-between align-items-start">
            <div className="flex-grow-1">
              <strong>{replyTo.sender?.name}:</strong>{" "}
              {replyTo.type === "text"
                ? replyTo.text
                : `Media: ${replyTo.type}`}
            </div>
            <button
              className="btn btn-sm btn-outline-secondary ms-2"
              onClick={onCancelReply}
              style={{ fontSize: "12px", padding: "2px 6px" }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="d-flex align-items-center gap-2">
        <div
          className="d-flex align-items-center flex-grow-1 px-3"
          style={{ backgroundColor: "#ffffff", borderRadius: "999px", height: "44px" }}
        >
          <FaSmile
            className="text-muted me-3"
            style={{ cursor: "pointer", fontSize: "1.2rem" }}
            onClick={() => setShowEmoji((p) => !p)}
          />

          {/* ✅ OPEN MODAL (NO ROUTE) */}
          <FaPaperclip
            className="text-muted me-3"
            style={{ cursor: "pointer", fontSize: "1.2rem" }}
            onClick={onOpenAttachment}
          />

          <input
            ref={inputRef}
            className="border-0 bg-transparent flex-grow-1"
            value={msg}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
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
