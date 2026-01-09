import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow/ChatWindow";
import { useSelector } from "react-redux";

function Home() {
  const selectedUser = useSelector(
    (state) => state.chat.selectedUser
  );

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
