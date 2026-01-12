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
});

socket.on("disconnect", () => {
  console.log("❌ Socket disconnected");
});

socket.on("connect_error", (error) => {
  console.log("❌ Socket connection error:", error);
});

export default socket;
