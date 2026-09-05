const jwt = require("jsonwebtoken");

const roomSocket = require("./roomSocket");
const chatSocket = require("./chatSocket");
const editorSocket = require("./editorSocket");

module.exports = (io) => {
  /*
  ========================================
  SOCKET AUTHENTICATION
  ========================================
  */

  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token;

      if (!token) {
        return next(
          new Error("Authentication required")
        );
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );

      socket.user = {
        id: decoded.id,
        username: decoded.username,
        email: decoded.email,
      };

      next();
    } catch (error) {
      console.error(
        "SOCKET AUTH ERROR:",
        error.message
      );

      next(
        new Error("Invalid or expired token")
      );
    }
  });

  /*
  ========================================
  CONNECTION
  ========================================
  */

  io.on("connection", (socket) => {
    console.log(
      `🔌 Socket connected: ${socket.user.username} (${socket.user.id})`
    );

    /*
    ========================================
    CURRENT ROOM
    ========================================
    */

    socket.currentRoom = null;

    /*
    ========================================
    ROOM SOCKET EVENTS
    ========================================
    */

    roomSocket(io, socket);

    /*
    ========================================
    CHAT SOCKET EVENTS
    ========================================
    */

    chatSocket(io, socket);

    /*
    ========================================
    EDITOR SOCKET EVENTS
    ========================================
    */

    editorSocket(io, socket);

    /*
    ========================================
    GENERAL SOCKET EVENTS
    ========================================
    */

    socket.on("ping", () => {
      socket.emit("pong", {
        message: "Flux socket is alive",
        time: new Date(),
      });
    });

    /*
    ========================================
    DISCONNECT
    ========================================
    */

    socket.on("disconnect", (reason) => {
      console.log(
        `🔌 Socket disconnected: ${socket.user.username}`
      );

      console.log(
        `Reason: ${reason}`
      );

      socket.currentRoom = null;
    });
  });
};