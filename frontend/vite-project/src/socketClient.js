import { io } from "socket.io-client";

const socket = io(import.meta.env.VITE_API_URL || "http://localhost:5000", {
  withCredentials: true,
  transports: ["websocket"],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

// Add connection logging
socket.on("connect", () => {
  console.log("🔌 Socket connected:", socket.id);
  // Emit user-online if user is authenticated on reconnect
  const user = localStorage.getItem("user");
  if (user) {
    const userData = JSON.parse(user);
    socket.emit("user-online", userData._id);
  }
});

socket.on("disconnect", () => {
  console.log("❌ Socket disconnected");
});

// Emit user-offline when user closes tab or navigates away
window.addEventListener('beforeunload', () => {
  const user = localStorage.getItem("user");
  if (user) {
    const userData = JSON.parse(user);
    socket.emit("user-offline", userData._id);
  }
});

socket.on("connect_error", (error) => {
  console.log("❌ Socket connection error:", error);
});

export default socket;
