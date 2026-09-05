const Room = require("../models/Room");
const Document = require("../models/Document");

const editorSocket = (io, socket) => {
  socket.on("editor:change", async (data) => {
    try {
      const {
        roomId,
        documentId,
        content,
        language,
        version
      } = data;

      // -------------------------
      // Validate input
      // -------------------------

      if (!roomId) {
        return socket.emit("editor:error", {
          message: "Room ID is required"
        });
      }

      if (!documentId) {
        return socket.emit("editor:error", {
          message: "Document ID is required"
        });
      }

      if (typeof content !== "string") {
        return socket.emit("editor:error", {
          message: "Invalid editor content"
        });
      }

      if (content.length > 1000000) {
        return socket.emit("editor:error", {
          message: "Code is too large"
        });
      }

      // -------------------------
      // Find room
      // -------------------------

      const room = await Room.findById(roomId);

      if (!room) {
        return socket.emit("editor:error", {
          message: "Room not found"
        });
      }

      // -------------------------
// Check membership
// -------------------------

const isMember = room.members.some(
  (member) =>
    member.user.toString() === socket.user.id
);

if (!isMember) {
  return socket.emit("editor:error", {
    message: "You are not a member of this room"
  });
}


// -------------------------
// Check driver
// -------------------------

if (
  !room.driver ||
  room.driver.toString() !== socket.user.id
) {
  return socket.emit("editor:error", {
    message: "You do not have control of the shared editor"
  });
}

      // -------------------------
      // Check socket room
      // -------------------------

      if (!socket.rooms.has(roomId)) {
        return socket.emit("editor:error", {
          message: "You are not connected to this room"
        });
      }

      // -------------------------
      // Find document
      // -------------------------

      const document = await Document.findById(documentId);

      if (!document) {
        return socket.emit("editor:error", {
          message: "Document not found"
        });
      }

      // Make sure document belongs to this room
      if (document.room.toString() !== roomId) {
        return socket.emit("editor:error", {
          message: "Document does not belong to this room"
        });
      }

      // -------------------------
      // Version check
      // -------------------------

      if (
        version !== undefined &&
        version !== document.version
      ) {
        return socket.emit("editor:error", {
          message: "Document version conflict",
          currentVersion: document.version
        });
      }

      // -------------------------
      // Update document
      // -------------------------

      document.content = content;

      if (language) {
        document.language = language;
      }

      document.updatedBy = socket.user.id;
      document.version += 1;

      await document.save();

      // -------------------------
      // Broadcast change
      // -------------------------

      socket.to(roomId).emit("editor:change", {
        roomId,
        documentId,
        content: document.content,
        language: document.language,
        version: document.version,
        user: {
          id: socket.user.id,
          username: socket.user.username
        }
      });

      // -------------------------
      // Tell sender the saved version
      // -------------------------

      socket.emit("editor:saved", {
        documentId,
        version: document.version
      });

    } catch (error) {
      console.error("Editor change error:", error);

      socket.emit("editor:error", {
        message: "Failed to sync editor"
      });
    }
  });
};

module.exports = editorSocket;