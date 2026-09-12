// client/src/lib/socket.js
import { io } from "socket.io-client";
import { getAuthToken, WS_BASE } from "./api";

let socket = null;

export const connectSocket = () => {
  const token = getAuthToken();

  if (!socket || !socket.connected) {
    socket = io(WS_BASE, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => {
      console.log("✔ Global Socket connected:", socket.id);
    });

    socket.on("connect_error", (err) => {
      console.error("❌ Global Socket Error:", err.message);
    });

    socket.on("disconnect", (reason) => {
      console.warn("⚠️ Global Socket disconnected:", reason);
    });
  }

  return socket;
};

export const getSocket = () => {
  if (!socket) return connectSocket();
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export default {
  connectSocket,
  getSocket,
  disconnectSocket,
};