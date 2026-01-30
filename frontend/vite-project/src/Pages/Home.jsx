import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow/ChatWindow";
import { useSelector, useDispatch } from "react-redux";
import { useEffect, useState } from "react";
import { setSelectedUser, setSelectedGroup } from "../features/chat/chatSlice";
import { useGetOrCreateChatMutation, chatApi } from "../features/chat/chatApi";
import { userApi } from "../features/users/userApi";
import socket from "../socketClient";

function Home() {
  const dispatch = useDispatch();
  const selectedUser = useSelector((state) => state.chat.selectedUser);
  const selectedGroup = useSelector((state) => state.chat.selectedGroup);
  const currentUser = useSelector((state) => state.auth.user);
  const [getOrCreateChat] = useGetOrCreateChatMutation();

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  /* RESPONSIVE LISTENER */
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /* SOCKET ONLINE */
  useEffect(() => {
    if (currentUser?._id) {
      socket.emit("user-online", currentUser._id);
    }
  }, [currentUser?._id]);

  /* USER STATUS UPDATE */
  useEffect(() => {
    const handler = (data) => {
      if (selectedUser && selectedUser._id === data.userId) {
        dispatch(
          setSelectedUser({
            ...selectedUser,
            isOnline: data.isOnline,
            lastSeen: data.lastSeen,
          })
        );
      }
    };
    socket.on("user-status-update", handler);
    return () => socket.off("user-status-update", handler);
  }, [selectedUser, dispatch]);

  /* GROUP UPDATE LISTENER */
  useEffect(() => {
    const handleGroupUpdated = (updatedGroup) => {
      if (selectedGroup && selectedGroup._id === updatedGroup._id) {
        dispatch(setSelectedGroup(updatedGroup));
      }
    };

    const handleMembersAdded = (data) => {
      if (selectedGroup && selectedGroup._id === data.groupId) {
        dispatch(setSelectedGroup(data.group));
      }
    };

    const handleMemberRemoved = (data) => {
      if (selectedGroup && selectedGroup._id === data.groupId) {
        dispatch(setSelectedGroup(data.group));
      }
    };

    const handleGroupDeleted = (data) => {
      // Close the group chat if currently viewing it
      if (selectedGroup && selectedGroup._id === data.groupId) {
        dispatch(setSelectedGroup(null));
      }
      // Invalidate the groups cache to refresh sidebar
      dispatch(chatApi.util.invalidateTags(['Groups']));
    };

    const handleMemberLeft = (data) => {
      // Update selectedGroup if currently viewing this group
      if (selectedGroup && selectedGroup._id === data.groupId) {
        dispatch(setSelectedGroup(data.group));
      }
      // Invalidate groups cache to refresh sidebar
      dispatch(chatApi.util.invalidateTags(['Groups']));
    };

    socket.on("group-updated", handleGroupUpdated);
    socket.on("members-added", handleMembersAdded);
    socket.on("member-removed", handleMemberRemoved);
    socket.on("group-deleted", handleGroupDeleted);
    socket.on("member-left", handleMemberLeft);

    return () => {
      socket.off("group-updated", handleGroupUpdated);
      socket.off("members-added", handleMembersAdded);
      socket.off("member-removed", handleMemberRemoved);
      socket.off("group-deleted", handleGroupDeleted);
      socket.off("member-left", handleMemberLeft);
    };
  }, [selectedGroup, dispatch]);

  /* CREATE CHAT */
  useEffect(() => {
    if (selectedUser && !selectedUser.chatId) {
      getOrCreateChat(selectedUser._id)
        .unwrap()
        .then((chat) => {
          dispatch(setSelectedUser({ ...selectedUser, chatId: chat._id }));
        });
    }
  }, [selectedUser, getOrCreateChat, dispatch]);

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        overflow: "hidden",
      }}
    >
      {/* SIDEBAR */}
      <div
        style={{
          width: isMobile && (selectedUser || selectedGroup) ? 0 : (isMobile ? "100%" : 320),
          height: "100vh",
          borderRight: "1px solid #ddd",
          flexShrink: 0,
          visibility: isMobile && (selectedUser || selectedGroup) ? "hidden" : "visible",
        }}
      >
        <Sidebar />
      </div>

      {/* CHAT */}
      {(!isMobile || selectedUser || selectedGroup) && (
        <div
          style={{
            flex: 1,
            height: "100vh",
            display: "flex",
            flexDirection: "column",
            width: "100%",
          }}
        >
          {selectedUser || selectedGroup ? (
            <ChatWindow
              user={selectedUser}
              group={selectedGroup}
              isMobile={isMobile}
              onBack={() => {
                if (selectedUser) dispatch(setSelectedUser(null));
                if (selectedGroup) dispatch(setSelectedGroup(null));
              }}
            />
          ) : (
            !isMobile && (
              <div className="h-100 d-flex align-items-center justify-content-center bg-light">
                <p className="text-muted fs-5">
                  Select a chat to start messaging
                </p>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

export default Home;
