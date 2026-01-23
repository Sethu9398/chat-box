import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { addTypingUser, removeTypingUser } from "../../features/chat/chatSlice";
import ChatHeader from "./ChatHeader";
import ChatMessages from "./ChatMessages";
import ChatInput from "./ChatInput";
import ChatInfoDrawer from "./ChatIfoDrawer";
import AttachmentComposer from "./AttachmentComposer";
import socket from "../../socketClient";
import { useMarkAsReadMutation, useDeleteForMeMutation, useDeleteForEveryoneMutation } from "../../features/messages/messageApi";

function ChatWindow({ user, isMobile, onBack }) {
  const [showInfo, setShowInfo] = useState(false);
  const [showAttachment, setShowAttachment] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [previousChatId, setPreviousChatId] = useState(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState([]);

  const dispatch = useDispatch();
  const [markAsRead] = useMarkAsReadMutation();
  const [deleteForMeMutation] = useDeleteForMeMutation();
  const [deleteForEveryoneMutation] = useDeleteForEveryoneMutation();

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

  // Selection handlers
  const enterSelectionMode = () => {
    setSelectionMode(true);
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedMessages([]);
  };

  const toggleMessageSelection = (messageId) => {
    setSelectedMessages(prev =>
      prev.includes(messageId)
        ? prev.filter(id => id !== messageId)
        : [...prev, messageId]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedMessages.length === 0) return;

    // For simplicity, delete for me. In a real app, you might want to choose delete for everyone if all are your messages
    for (const messageId of selectedMessages) {
      await deleteForMeMutation(messageId);
    }
    exitSelectionMode();
  };

  if (!user) return null;

  return (
   <div className="d-flex flex-column h-100" style={{ backgroundColor: '#f0f0f0', width: '100%' }}>
      <div className="position-sticky top-0 z-3">
        <ChatHeader
          user={user}
          isMobile={isMobile}
          onBack={onBack}
          onOpenInfo={() => setShowInfo(true)}
          selectionMode={selectionMode}
          selectedMessages={selectedMessages}
          onExitSelection={exitSelectionMode}
          onDeleteSelected={handleDeleteSelected}
          onEnterSelection={enterSelectionMode}
        />
      </div>

      <div className="flex-grow-1 overflow-auto">
        <ChatMessages
          chatId={user.chatId}
          onReply={setReplyTo}
          selectionMode={selectionMode}
          selectedMessages={selectedMessages}
          onToggleSelection={toggleMessageSelection}
          onEnterSelection={enterSelectionMode}
        />
      </div>

      <div className="position-sticky bottom-0 bg-white border-top">
        <ChatInput
          chatId={user.chatId}
          onOpenAttachment={() => setShowAttachment(true)}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
        />
      </div>
    </div>
  );
}

export default ChatWindow;
