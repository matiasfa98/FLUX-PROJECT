const jwt = require("jsonwebtoken");

const chatSocket = require("./chatSocket");
const roomSocket = require("./roomSocket");
const editorSocket = require("./editorSocket");

const setupSocket = (io) => {

  // ======================================
  // SOCKET AUTHENTICATION
  // ======================================

  io.use((socket, next) => {

    try {

      const token = socket.handshake.auth.token;

      if (!token) {
        return next(
          new Error("Authentication required")
        );
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );

      socket.user = decoded;

      next();

    } catch (error) {

      console.error(
        "Socket authentication error:",
        error.message
      );

      next(
        new Error("Invalid or expired token")
      );
    }
  });


  // ======================================
  // CONNECTION
  // ======================================

  io.on("connection", (socket) => {

    console.log(
      `Socket connected: ${socket.user.username}`
    );


    // ======================================
    // ROOM EVENTS
    // ======================================

    console.log("REGISTERING ROOM SOCKET");

    roomSocket(io, socket);
    socket.on("room:join", (roomId) => {
  console.log("🔥 DIRECT ROOM JOIN RECEIVED:", roomId);
});
     console.log("ROOM SOCKET REGISTERED");


    // ======================================
    // CHAT EVENTS
    // ======================================

    chatSocket(io, socket);


    // ======================================
    // EDITOR EVENTS
    // ======================================

    editorSocket(io, socket);


    // ======================================
    // DISCONNECT
    // ======================================

    socket.on("disconnect", () => {

      console.log(
        `Socket disconnected: ${socket.user.username}`
      );

    });

  });

};


module.exports = setupSocket;