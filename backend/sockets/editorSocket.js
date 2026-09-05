const Document = require("../models/Document");
const Room = require("../models/Room");

module.exports = (io, socket) => {
  /*
  |--------------------------------------------------------------------------
  | EDITOR CHANGE
  |--------------------------------------------------------------------------
  */

  socket.on("editor:change", async (data) => {
    try {
      const {
        roomId,
        documentId,
        content,
        language,
        version,
      } = data || {};

      /*
       * Validate input
       */

      if (!roomId || !documentId) {
        return socket.emit("editor:error", {
          message:
            "Room ID and document ID are required",
        });
      }

      if (typeof content !== "string") {
        return socket.emit("editor:error", {
          message: "Content must be a string",
        });
      }

      if (content.length > 1000000) {
        return socket.emit("editor:error", {
          message:
            "Document content is too large",
        });
      }

      /*
       * Socket must actually be inside this room.
       */

      if (socket.currentRoom !== roomId) {
        return socket.emit("editor:error", {
          message:
            "You are not inside this room",
        });
      }

      /*
       * Get room
       */

      const room =
        await Room.findById(roomId);

      if (!room) {
        return socket.emit("editor:error", {
          message: "Room not found",
        });
      }

      /*
       * Check membership.
       */

      const isMember = room.members.some(
        (member) =>
          member.user.toString() ===
          socket.user.id.toString()
      );

      if (!isMember) {
        return socket.emit("editor:error", {
          message:
            "You are not a member of this room",
        });
      }

      /*
       * There must be a driver.
       */

      if (!room.driver) {
        return socket.emit("editor:error", {
          message:
            "Nobody currently has control of the editor",
        });
      }

      /*
       * ONLY the current driver can edit.
       */

      if (
        room.driver.toString() !==
        socket.user.id.toString()
      ) {
        return socket.emit("editor:error", {
          message:
            "You do not have control of the shared editor",
        });
      }

      /*
       * Find document.
       */

      const document =
        await Document.findById(documentId);

      if (!document) {
        return socket.emit("editor:error", {
          message: "Document not found",
        });
      }

      /*
       * Document must belong to this room.
       */

      if (
        document.room.toString() !==
        roomId.toString()
      ) {
        return socket.emit("editor:error", {
          message:
            "This document does not belong to this room",
        });
      }

      /*
       * Version conflict protection.
       *
       * If the client is editing an old version,
       * reject the update.
       */

      if (
        version !== undefined &&
        Number(version) !==
          Number(document.version)
      ) {
        return socket.emit("editor:conflict", {
          message:
            "Document version conflict",
          currentVersion:
            document.version,
        });
      }

      /*
       * Update document.
       */

      document.content = content;

      if (language) {
        document.language = language;
      }

      document.updatedBy = socket.user.id;

      document.version =
        Number(document.version) + 1;

      await document.save();

      /*
       * Send change to everyone else in room.
       */

      socket.to(roomId).emit(
        "editor:change",
        {
          roomId,
          documentId,
          content: document.content,
          language: document.language,
          version: document.version,
          updatedBy: {
            id: socket.user.id,
            username:
              socket.user.username,
          },
        }
      );

      /*
       * Confirm save to driver.
       */

      socket.emit("editor:saved", {
        roomId,
        documentId,
        version: document.version,
      });
    } catch (error) {
      console.error(
        "EDITOR CHANGE ERROR:",
        error
      );

      socket.emit("editor:error", {
        message:
          "Failed to save editor change",
      });
    }
  });
};