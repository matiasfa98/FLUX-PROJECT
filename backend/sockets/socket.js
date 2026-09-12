const jwt = require("jsonwebtoken");

const roomSocket = require("./roomSocket");
const chatSocket = require("./chatSocket");
const editorSocket = require("./editorSocket");
const setupFileSocket = require("./fileSocket");
const setupTerminalSocket = require("./terminalSocket");
const setupWebRTCSocket = require("./webrtcSocket");

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

socket.clientType = socket.handshake.auth?.clientType || "web";

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
       // Auto-join all conversations this user is a participant in.
    (async () => {
      try {
        const Conversation = require("../models/Conversation");
        const convs = await Conversation.find({
          "participants.user": socket.user.id,
        }).select("_id");
        for (const c of convs) {
          socket.join(`conv:${c._id}`);
        }
      } catch (err) {
        console.error("AUTO-JOIN CONVERSATIONS ERROR:", err.message);
      }
    })();

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



    setupFileSocket(io, socket);

    setupTerminalSocket(io, socket);

    setupWebRTCSocket(io, socket);   //

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