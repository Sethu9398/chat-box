import { useState } from "react";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow/ChatWindow";

function Home() {
  const [selectedUser, setSelectedUser] = useState(null);
  const [showSidebar, setShowSidebar] = useState(true);

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setShowSidebar(false); 
  };

  return (
    <div className="d-flex h-100 w-100" style={{ height: "100vh", overflow: "hidden" }}>
      {/* Sidebar - Left side */}
      <div
        className={`border-end bg-white shadow d-flex flex-column ${
          showSidebar ? "d-block" : "d-none d-md-block"
        }`}
        style={{
          width: "320px",
          height: "100vh",
          zIndex: 1050,
          position: "relative",
          flexShrink: 0
        }}
      >
        <Sidebar onUserSelect={handleUserSelect} />
      </div>

      {/* Chat Area - Right side, full width on mobile */}
      <div className="flex-grow-1 d-flex flex-column" style={{ overflow: "hidden", minWidth: 0 }}>
        {/* Mobile header with menu button */}
        <div className="d-md-none d-flex align-items-center p-2 border-bottom bg-light">
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => setShowSidebar(!showSidebar)}
            title="Toggle sidebar"
          >
            ☰
          </button>
          <strong className="ms-2">ChatBox</strong>
        </div>

        {/* Chat content */}
        <div className="flex-grow-1 d-flex" style={{ overflow: "hidden" }}>
          {selectedUser ? (
            <div className="w-100 h-100">
              <ChatWindow user={selectedUser} />
            </div>
          ) : (
            <div className="w-100 d-flex justify-content-center align-items-center bg-light">
              <p className="text-muted fs-5">Select a user to start chatting</p>
            </div>
          )}
        </div>
      </div>

      {/* Overlay for mobile when sidebar is shown */}
      {showSidebar && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 bg-dark d-md-none"
          style={{ opacity: 0.4, zIndex: 1040 }}
          onClick={() => setShowSidebar(false)}
        />
      )}
    </div>
  );
}

export default Home;