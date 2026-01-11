import { useState, useEffect } from "react";
import ChatHeader from "./ChatHeader";
import ChatMessages from "./ChatMessages";
import ChatInput from "./ChatInput";
import ChatInfoDrawer from "./ChatIfoDrawer";
import AttachmentComposer from "./AttachmentComposer";
import socket from "../../socketClient";

function ChatWindow({ user }) {
  const [showInfo, setShowInfo] = useState(false);
  const [showAttachment, setShowAttachment] = useState(false);

  // ✅ JOIN SOCKET ROOM
  useEffect(() => {
    if (user?.chatId) {
      socket.emit("join-chat", user.chatId);
    }
  }, [user?.chatId]);

  if (!user) return null;

  return (
    <div
      className="d-flex flex-column position-relative"
      style={{ height: "100vh" }}
    >
      {/* HEADER */}
      <div className="position-sticky top-0" style={{ zIndex: 1020 }}>
        <ChatHeader user={user} onOpenInfo={() => setShowInfo(true)} />
      </div>

      {/* MESSAGES */}
      <div
        className="flex-grow-1 overflow-auto"
        style={{ background: "#e5ddd5" }}
      >
        <ChatMessages chatId={user.chatId} />
      </div>

      {/* INPUT */}
      <div
        className="position-sticky bottom-0 bg-white border-top"
        style={{ zIndex: 1020 }}
      >
        <ChatInput
          chatId={user.chatId}
          onOpenAttachment={() => setShowAttachment(true)}
        />
      </div>

      {/* INFO DRAWER */}
      {showInfo && (
        <ChatInfoDrawer
          user={user}
          onClose={() => setShowInfo(false)}
        />
      )}

      {/* ✅ ATTACHMENT MODAL */}
      {showAttachment && (
        <AttachmentComposer
          chatId={user.chatId}
          onClose={() => setShowAttachment(false)}
        />
      )}
    </div>
  );
}

export default ChatWindow;
