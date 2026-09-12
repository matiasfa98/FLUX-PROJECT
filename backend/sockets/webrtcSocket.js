// backend/sockets/webrtcSocket.js
const Room = require("../models/Room");

/*
|--------------------------------------------------------------------------
| WEBRTC SIGNALING — DRIVER BROADCAST MODEL
|--------------------------------------------------------------------------
|
| One driver broadcasts to N observers. The driver is always the offerer.
| Observers are always the answerers. This is not a mesh.
|
| Events (client -> server):
|   webrtc:broadcast-started  { roomId }
|   webrtc:broadcast-stopped  { roomId }
|   webrtc:observer-ready     { roomId }
|   webrtc:offer              { targetSocketId, offer }
|   webrtc:answer             { targetSocketId, answer }
|   webrtc:ice-candidate      { targetSocketId, candidate }
|   webrtc:peer-closed        { targetSocketId }
|
| Events (server -> client):
|   webrtc:broadcast-started  { roomId, driverSocketId, driverUserId, driverUsername }
|   webrtc:broadcast-stopped  { roomId, driverSocketId }
|   webrtc:observer-joined    { roomId, observerSocketId, observerUserId, observerUsername }
|   webrtc:offer              { fromSocketId, fromUserId, fromUsername, offer }
|   webrtc:answer             { fromSocketId, answer }
|   webrtc:ice-candidate      { fromSocketId, candidate }
|   webrtc:peer-closed        { fromSocketId }
|   webrtc:error              { message }
|
|--------------------------------------------------------------------------
*/

module.exports = (io, socket) => {
  // ---------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------
  const getUserId = () => socket.user.id.toString();

  const isDriver = async (roomId) => {
    const room = await Room.findById(roomId).select("driver");
    if (!room || !room.driver) return false;
    return room.driver.toString() === getUserId();
  };

  const emitError = (message) =>
    socket.emit("webrtc:error", { message });

  // ---------------------------------------------------------------
  // DRIVER: START BROADCAST
  // ---------------------------------------------------------------
  socket.on("webrtc:broadcast-started", async (data) => {
  console.log("═══════════════════════════════════════");
  console.log("[webrtc] broadcast-started RECEIVED");
  console.log("  socket.id:        ", socket.id);
  console.log("  userId:           ", socket.user.id);
  console.log("  payload:          ", data);
  console.log("  socket.currentRoom:", socket.currentRoom);

  try {
    const { roomId } = data || {};
    if (!roomId) {
      console.log("[webrtc] DROP: no roomId in payload");
      return;
    }

    if (socket.currentRoom !== String(roomId)) {
      console.log(
        "[webrtc] DROP: currentRoom",
        socket.currentRoom,
        "!== roomId",
        roomId
      );
      return;
    }

    const room = await Room.findById(roomId).select("driver");
    if (!room) {
      console.log("[webrtc] DROP: room not found");
      return;
    }

    const userId = socket.user.id.toString();
    const driverId = room.driver ? room.driver.toString() : null;

    console.log("[webrtc] driver check:");
    console.log("  room.driver:     ", driverId);
    console.log("  socket.user.id:  ", userId);
    console.log("  match:           ", driverId === userId);

    if (!driverId || driverId !== userId) {
      console.log("[webrtc] DROP: not the driver");
      return socket.emit("webrtc:error", {
        message: "Only the active driver can broadcast.",
      });
    }

    console.log("[webrtc] RELAYING to room:", roomId);
    socket.to(roomId).emit("webrtc:broadcast-started", {
      roomId,
      driverSocketId: socket.id,
      driverUserId: userId,
      driverUsername: socket.user.username,
    });
    console.log("[webrtc] RELAY SENT");
    console.log("═══════════════════════════════════════");
  } catch (err) {
    console.error("[webrtc] broadcast-started error:", err);
    socket.emit("webrtc:error", { message: "Broadcast failed" });
  }
});

  // ---------------------------------------------------------------
  // DRIVER: STOP BROADCAST
  // ---------------------------------------------------------------
  socket.on("webrtc:broadcast-stopped", (data) => {
    try {
      const { roomId } = data || {};
      if (!roomId) return;
      if (socket.currentRoom !== String(roomId)) return;

      socket.to(roomId).emit("webrtc:broadcast-stopped", {
        roomId,
        driverSocketId: socket.id,
      });
    } catch (err) {
      console.error("[webrtc] broadcast-stopped error:", err);
    }
  });

  // ---------------------------------------------------------------
  // OBSERVER: READY TO RECEIVE
  // ---------------------------------------------------------------
  //
  // Called by the observer when:
  //   a) they see `webrtc:broadcast-started`, or
  //   b) they join a room where a driver is already broadcasting.
  //
  // Tells the driver to send them an offer.
  //
  socket.on("webrtc:observer-ready", async (data) => {
    try {
      const { roomId } = data || {};
      if (!roomId) return;
      if (socket.currentRoom !== String(roomId)) return;

      const room = await Room.findById(roomId).select("driver");
      if (!room?.driver) return;

      const socketsInRoom = await io.in(roomId).fetchSockets();
      for (const s of socketsInRoom) {
        if (s.user?.id?.toString() === room.driver.toString()) {
          s.emit("webrtc:observer-joined", {
            roomId,
            observerSocketId: socket.id,
            observerUserId: getUserId(),
            observerUsername: socket.user.username,
          });
          break;
        }
      }
    } catch (err) {
      console.error("[webrtc] observer-ready error:", err);
    }
  });

  // ---------------------------------------------------------------
  // OFFER (driver -> observer)
  // ---------------------------------------------------------------
  socket.on("webrtc:offer", ({ targetSocketId, offer }) => {
    if (!targetSocketId || !offer) return;
    io.to(targetSocketId).emit("webrtc:offer", {
      fromSocketId: socket.id,
      fromUserId: getUserId(),
      fromUsername: socket.user.username,
      offer,
    });
  });

  // ---------------------------------------------------------------
  // ANSWER (observer -> driver)
  // ---------------------------------------------------------------
  socket.on("webrtc:answer", ({ targetSocketId, answer }) => {
    if (!targetSocketId || !answer) return;
    io.to(targetSocketId).emit("webrtc:answer", {
      fromSocketId: socket.id,
      answer,
    });
  });

  // ---------------------------------------------------------------
  // ICE CANDIDATE (both directions)
  // ---------------------------------------------------------------
  socket.on("webrtc:ice-candidate", ({ targetSocketId, candidate }) => {
    if (!targetSocketId || !candidate) return;
    io.to(targetSocketId).emit("webrtc:ice-candidate", {
      fromSocketId: socket.id,
      candidate,
    });
  });

  // ---------------------------------------------------------------
  // PEER CLOSED
  // ---------------------------------------------------------------
  socket.on("webrtc:peer-closed", ({ targetSocketId }) => {
    if (!targetSocketId) return;
    io.to(targetSocketId).emit("webrtc:peer-closed", {
      fromSocketId: socket.id,
    });
  });

  // ---------------------------------------------------------------
  // ON DISCONNECT: tell the room the broadcast stopped
  // ---------------------------------------------------------------
 socket.on("disconnect", async () => {
  try {
    const roomId = socket.currentRoom;
    if (!roomId) return;

    // Only emit broadcast-stopped if THIS socket was the current
    // driver of the room. Otherwise a random observer disconnecting
    // would tear down the driver's broadcast.
    const room = await Room.findById(roomId).select("driver");
    if (!room || !room.driver) return;

    const wasDriver =
      room.driver.toString() === socket.user.id.toString();

    if (!wasDriver) return;

    socket.to(roomId).emit("webrtc:broadcast-stopped", {
      roomId,
      driverSocketId: socket.id,
    });
  } catch (err) {
    console.error("[webrtc] disconnect error:", err);
  }
});
};