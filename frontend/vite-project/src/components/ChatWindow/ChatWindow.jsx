import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { addTypingUser, removeTypingUser } from "../../features/chat/chatSlice";
import ChatHeader from "./ChatHeader";
import ChatMessages from "./ChatMessages";
import ChatInput from "./ChatInput";
import ChatInfoDrawer from "./ChatIfoDrawer";
import GroupInfoModal from "./GroupInfoModal";
import AttachmentComposer from "./AttachmentComposer";
import socket from "../../socketClient";
import { useMarkAsReadMutation, useDeleteForMeMutation, useDeleteForEveryoneMutation } from "../../features/messages/messageApi";

function ChatWindow({ user, group, isMobile, onBack }) {
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

  // Determine chat entity (user or group)
  const chatEntity = user || group;
  const chatId = user ? user.chatId : group?._id;
  const chatType = user ? 'user' : 'group';

  // ✅ JOIN SOCKET ROOM AND MARK MESSAGES AS READ
  useEffect(() => {
    if (chatId) {
      // Leave previous chat room if switching
      if (previousChatId && previousChatId !== chatId) {
        socket.emit("leave-chat", previousChatId);
      }

      socket.emit("join-chat", chatId);
      // Mark all messages in this chat as read
      markAsRead(chatId);
      setPreviousChatId(chatId);
    }

    // ✅ CLEANUP: Leave chat room when component unmounts or chatId changes
    return () => {
      if (chatId) {
        socket.emit("leave-chat", chatId);
      }
    };
  }, [chatId, markAsRead, previousChatId]);

  // ✅ REJOIN ON RECONNECT
  useEffect(() => {
    const handleConnect = () => {
      if (chatId) {
        socket.emit("join-chat", chatId);
      }
    };

    socket.on("connect", handleConnect);
    return () => socket.off("connect", handleConnect);
  }, [chatId]);

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

  if (!chatEntity) return null;

  return (
   <div className="d-flex flex-column h-100" style={{ backgroundColor: '#f0f0f0', width: '100%' }}>
      <div className="position-sticky top-0 z-3">
        <ChatHeader
          user={user}
          group={group}
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

      <div className="flex-grow-1 overflow-auto" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width="100" height="100" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill-rule="evenodd"%3E%3Cg fill="%23f0f0f0" fill-opacity="0.1"%3E%3Cpath d="M96 95h4v1h-4v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h4v1h-4v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4H96v-1z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")', backgroundColor: '#e5ddd5' }}>
        <ChatMessages
          chatId={chatId}
          chatType={chatType}
          onReply={setReplyTo}
          selectionMode={selectionMode}
          selectedMessages={selectedMessages}
          onToggleSelection={toggleMessageSelection}
          onEnterSelection={enterSelectionMode}
        />
      </div>

      <div className="position-sticky bottom-0 bg-white border-top">
        <ChatInput
          chatId={chatId}
          isGroup={!!group}
          onOpenAttachment={() => setShowAttachment(true)}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
        />
      </div>

      {showAttachment && (
        <AttachmentComposer
          chatId={chatId}
          isGroup={!!group}
          replyTo={replyTo}
          onClose={() => setShowAttachment(false)}
        />
      )}

      {showInfo && user && (
        <ChatInfoDrawer
          user={user}
          onClose={() => setShowInfo(false)}
        />
      )}

      {showInfo && group && (
        <GroupInfoModal
          group={group}
          onClose={() => setShowInfo(false)}
        />
      )}
    </div>
  );
}

export default ChatWindow;
