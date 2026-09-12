// mobile/src/lib/socket.ts
import { io, Socket } from "socket.io-client";
import { getAuthToken, WS_BASE } from "./api";

let socket: Socket | null = null;

/*
|--------------------------------------------------------------------------
| MOBILE CLIENT FLAG
|--------------------------------------------------------------------------
| The backend reads `socket.handshake.auth.clientType` and refuses driver
| seat requests from sockets declaring "mobile". This is the MVP
| enforcement mechanism (server-side, no JWT changes needed).
|--------------------------------------------------------------------------
*/
export const connectSocket = async (): Promise<Socket> => {
  const token = await getAuthToken();

  if (!socket || !socket.connected) {
    socket = io(WS_BASE, {
      auth: {
        token,
        clientType: "mobile",
      },
      transports: ["websocket"],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    socket.on("connect", () => {
      console.log("[socket] connected:", socket?.id);
    });

    socket.on("connect_error", (err) => {
      console.error("[socket] connect_error:", err.message);
    });

    socket.on("disconnect", (reason) => {
      console.warn("[socket] disconnected:", reason);
    });
  }

  return socket;
};

export const getSocket = (): Socket => {
  if (!socket) {
    // Kick off an async connect but return the socket immediately.
    // Socket.io buffers emits until connected.
    void connectSocket();
    // The line above sets `socket`, so we can safely non-null assert.
  }
  return socket as Socket;
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};