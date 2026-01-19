import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { addTypingUser, removeTypingUser } from "../../features/chat/chatSlice";
import ChatHeader from "./ChatHeader";
import ChatMessages from "./ChatMessages";
import ChatInput from "./ChatInput";
import ChatInfoDrawer from "./ChatIfoDrawer";
import AttachmentComposer from "./AttachmentComposer";
import socket from "../../socketClient";
import { useMarkAsReadMutation } from "../../features/messages/messageApi";

function ChatWindow({ user }) {
  const [showInfo, setShowInfo] = useState(false);
  const [showAttachment, setShowAttachment] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [previousChatId, setPreviousChatId] = useState(null);

  const dispatch = useDispatch();
  const [markAsRead] = useMarkAsReadMutation();

  // ✅ JOIN SOCKET ROOM AND MARK MESSAGES AS READ
  useEffect(() => {
    if (user?.chatId) {
      // Leave previous chat room if switching
      if (previousChatId && previousChatId !== user.chatId) {
        socket.emit("leave-chat", previousChatId);
      }

      socket.emit("join-chat", user.chatId);
      // Mark all messages in this chat as read
      markAsRead(user.chatId);
      setPreviousChatId(user.chatId);
    }
  }, [user?.chatId, markAsRead, previousChatId]);

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

  // ✅ TYPING INDICATOR LISTENERS
  useEffect(() => {
    const handleUserTyping = (data) => {
      dispatch(addTypingUser({ chatId: data.chatId, userId: data.userId }));
    };

    const handleUserStopTyping = (data) => {
      dispatch(removeTypingUser({ chatId: data.chatId, userId: data.userId }));
    };

    socket.on("user-typing", handleUserTyping);
    socket.on("user-stop-typing", handleUserStopTyping);

    return () => {
      socket.off("user-typing", handleUserTyping);
      socket.off("user-stop-typing", handleUserStopTyping);
    };
  }, [dispatch]);

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
