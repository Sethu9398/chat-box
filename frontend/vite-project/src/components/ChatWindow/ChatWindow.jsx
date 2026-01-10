import { useState, useEffect } from "react";
import ChatHeader from "./ChatHeader";
import ChatMessages from "./ChatMessages";
import ChatInput from "./ChatInput";
import ChatInfoDrawer from "./ChatIfoDrawer";
import socket from "../../socketClient"; //

function ChatWindow({ user }) {
  const [showInfo, setShowInfo] = useState(false);

  // ✅ JOIN SOCKET ROOM
  useEffect(() => {
    if (user?.chatId) {
      socket.emit("join-chat", user.chatId);
    }
  }, [user?.chatId]);

  if (!user) return null;

  return (
    <div className="d-flex flex-column position-relative" style={{ height: "100vh" }}>
      <div className="position-sticky top-0" style={{ zIndex: 1020 }}>
        <ChatHeader user={user} onOpenInfo={() => setShowInfo(true)} />
      </div>

      <div className="flex-grow-1 overflow-auto" style={{ background: "#e5ddd5" }}>
        <ChatMessages chatId={user.chatId} />
      </div>

      <div className="position-sticky bottom-0 bg-white border-top" style={{ zIndex: 1020 }}>
        <ChatInput chatId={user.chatId} />
      </div>

      {showInfo && (
        <ChatInfoDrawer user={user} onClose={() => setShowInfo(false)} />
      )}
    </div>
  );
}

export default ChatWindow;
