import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow/ChatWindow";
import { useSelector, useDispatch } from "react-redux";
import { useEffect } from "react";
import { setSelectedUser } from "../features/chat/chatSlice";
import { useGetOrCreateChatMutation } from "../features/chat/chatApi";
import socket from "../socketClient";

function Home() {
  const dispatch = useDispatch();
  const selectedUser = useSelector(
    (state) => state.chat.selectedUser
  );
  const currentUser = useSelector((state) => state.auth.user);
  const [getOrCreateChat] = useGetOrCreateChatMutation();

  // Emit user-online to join socket room for real-time updates
  useEffect(() => {
    if (currentUser?._id) {
      socket.emit("user-online", currentUser._id);
    }
  }, [currentUser?._id]);

  useEffect(() => {
    if (selectedUser && !selectedUser.chatId) {
      getOrCreateChat(selectedUser._id).unwrap().then((chat) => {
        dispatch(setSelectedUser({ ...selectedUser, chatId: chat._id }));
      });
    }
  }, [selectedUser, getOrCreateChat, dispatch]);

  return (
    <div className="d-flex h-100 w-100" style={{ height: "100vh" }}>
      <div
        className="border-end bg-white shadow"
        style={{ width: 320 }}
      >
        <Sidebar />
      </div>

      <div className="flex-grow-1">
        {selectedUser ? (
          <ChatWindow user={selectedUser} />
        ) : (
          <div className="h-100 d-flex justify-content-center align-items-center bg-light">
            <p className="text-muted fs-5">
              Select a user to start chatting
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;
