import { useState, useRef, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { FaSmile, FaPaperclip } from "react-icons/fa";
import EmojiPicker from "emoji-picker-react";
import { useSendMessageMutation } from "../../features/messages/messageApi";
import { chatApi } from "../../features/chat/chatApi";
import { userApi } from "../../features/users/userApi";
import socket from "../../socketClient";

function ChatInput({ chatId, isGroup, onOpenAttachment, replyTo, onCancelReply }) {
  const [msg, setMsg] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const me = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
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

    // Update sidebar cache immediately for instant UI feedback
    if (isGroup) {
      dispatch(chatApi.util.updateQueryData('getMyGroups', undefined, (draft) => {
        const group = draft.find(g => g._id === chatId);
        if (group) {
          group.lastMessage = `You: ${messageText}`;
          group.lastMessageCreatedAt = new Date().toISOString();
        }
      }));
    } else {
      // Update sidebar cache for private chats
      dispatch(userApi.util.updateQueryData('getSidebarUsers', undefined, (draft) => {
        const chatUser = draft.find(u => u.chatId === chatId);
        if (chatUser) {
          chatUser.lastMessage = messageText;
          chatUser.lastMessageCreatedAt = new Date().toISOString();
        }
        // Sort by lastMessageCreatedAt descending
        draft.sort((a, b) => {
          const aTime = a.lastMessageCreatedAt ? new Date(a.lastMessageCreatedAt) : new Date(0);
          const bTime = b.lastMessageCreatedAt ? new Date(b.lastMessageCreatedAt) : new Date(0);
          return bTime - aTime;
        });
      }));
    }
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

      <div className="d-flex align-items-center gap-1 gap-sm-2">
        <div
          className="d-flex align-items-center flex-grow-1 px-2 px-sm-3"
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
