import { useState, useRef } from "react";
import { FaSmile, FaPaperclip } from "react-icons/fa";
import EmojiPicker from "emoji-picker-react";

function ChatInput() {
  const [msg, setMsg] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);

  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  /* 😀 Emoji insert (multiple allowed) */
  const handleEmojiClick = (emojiData) => {
    if (!inputRef.current) return;

    const cursorPos = inputRef.current.selectionStart;
    const updated =
      msg.slice(0, cursorPos) +
      emojiData.emoji +
      msg.slice(cursorPos);

    setMsg(updated);

    // keep focus for multiple emojis
    setTimeout(() => {
      inputRef.current.focus();
      inputRef.current.selectionStart =
        inputRef.current.selectionEnd =
        cursorPos + emojiData.emoji.length;
    }, 0);
  };

  /* 📎 File picker */
  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    console.log("Selected files:", files);
    e.target.value = "";
  };

  return (
    <div
      className="border-top p-2 position-relative"
      style={{ backgroundColor: "#f0f2f5" }}
    >
      {/* Emoji Picker */}
      {showEmoji && (
        <div
          className="position-absolute bottom-100 mb-2"
          style={{ zIndex: 2000 }}
        >
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            height={350}
            width={300}
          />
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
        className="d-none"
        onChange={handleFileChange}
      />

      {/* INPUT BAR */}
      <div className="d-flex align-items-center gap-2">
        {/* WhatsApp input wrapper */}
        <div
          className="d-flex align-items-center flex-grow-1 px-3"
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "999px",
            height: "44px",
          }}
        >
          {/* Emoji icon */}
          <FaSmile
            className="text-muted me-3"
            style={{ cursor: "pointer", fontSize: "1.2rem" }}
            title="Emoji"
            onClick={() => setShowEmoji((prev) => !prev)}
          />

          {/* File icon */}
          <FaPaperclip
            className="text-muted me-3"
            style={{ cursor: "pointer", fontSize: "1.2rem" }}
            title="Attach file"
            onClick={handleFileClick}
          />

          {/* Text input */}
          <input
            ref={inputRef}
            className="border-0 bg-transparent flex-grow-1"
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            placeholder="Type a message"
            style={{
              outline: "none",
              fontSize: "0.95rem",
            }}
          />
        </div>

        {/* Send button */}
        <button
          className="btn btn-success"
          style={{
            borderRadius: "50%",
            width: "44px",
            height: "44px",
          }}
          onClick={() => setMsg("")}
          disabled={!msg.trim()}
        >
          ➤
        </button>
      </div>
    </div>
  );
}

export default ChatInput;
