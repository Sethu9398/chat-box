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
  const [replyTo, setReplyTo] = useState(null);

  // ✅ JOIN SOCKET ROOM
  useEffect(() => {
    if (user?.chatId) {
      socket.emit("join-chat", user.chatId);
    }
  }, [user?.chatId]);

  // ✅ REJOIN ON RECONNECT
  useEffect(() => {
    const handleConnect = () => {
      if (user?.chatId) {
        socket.emit("join-chat", user.chatId);
      }
    };

    socket.on("connect", handleConnect);
    return () => socket.off("connect", handleConnect);
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
        <ChatMessages chatId={user.chatId} onReply={setReplyTo} />
      </div>

      {/* INPUT */}
      <div
        className="position-sticky bottom-0 bg-white border-top"
        style={{ zIndex: 1020 }}
      >
        <ChatInput
          chatId={user.chatId}
          onOpenAttachment={() => setShowAttachment(true)}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
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
          replyTo={replyTo}
          onClose={() => {
            setShowAttachment(false);
            setReplyTo(null); // Clear reply when closing attachment modal
          }}
        />
      )}
    </div>
  );
}

export default ChatWindow;
