import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow/ChatWindow";
import { useSelector, useDispatch } from "react-redux";
import { useEffect, useState } from "react";
import { setSelectedUser, setSelectedGroup } from "../features/chat/chatSlice";
import { useGetOrCreateChatMutation } from "../features/chat/chatApi";
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
      {(!isMobile || !selectedUser) && (
        <div
          style={{
            width: isMobile ? "100%" : 320,
            height: "100vh",
            borderRight: "1px solid #ddd",
            flexShrink: 0,
          }}
        >
          <Sidebar />
        </div>
      )}

      {/* CHAT */}
      {(!isMobile || selectedUser) && (
        <div
          style={{
            flex: 1,
            height: "100vh",
            display: "flex",
            flexDirection: "column",
            width: "100%",
          }}
        >
          {selectedUser ? (
            <ChatWindow
              user={selectedUser}
              isMobile={isMobile}
              onBack={() => dispatch(setSelectedUser(null))}
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
