// backend/sockets/editorSocket.js
const File = require("../models/File");
const Room = require("../models/Room");
const fileService = require("../services/fileService");

module.exports = (io, socket) => {
  /*
  |--------------------------------------------------------------------------
  | CODE UPDATE (single-writer mutex, fileId-based, disk-first)
  |--------------------------------------------------------------------------
  |
  | Client payload:
  |   { roomId, fileId, code, version? }
  |
  | Flow:
  |   1. Validate socket is inside the room.
  |   2. Validate the room and the driver mutex.
  |   3. Find the File doc; it carries the canonical disk `path`.
  |   4. (Optional) Reject on stale version.
  |   5. Write buffer to disk FIRST.
  |   6. Bump index bookkeeping (size, version, updatedBy, language).
  |   7. Broadcast code:sync to peers; ack to sender.
  |
  | Disk is truth. If step 5 fails, nothing is persisted and the caller
  | receives editor:error. If step 6 fails, disk already has the correct
  | content; the index is stale until the next reconcile.
  |
  |--------------------------------------------------------------------------
  */

  socket.on("code:update", async (data) => {
    try {
      const { roomId, fileId, code, version, language } = data || {};

      // ---------------------------------------------------------------
      // Validation
      // ---------------------------------------------------------------
      if (!roomId || !fileId) {
        return socket.emit("editor:error", {
          message: "Room ID and file ID are required",
        });
      }

      if (typeof code !== "string") {
        return socket.emit("editor:error", {
          message: "Code payload must be a string",
        });
      }

      if (code.length > 1_000_000) {
        return socket.emit("editor:error", {
          message: "Buffer exceeds the 1 MB per-file limit",
        });
      }

      if (socket.currentRoom !== roomId) {
        return socket.emit("editor:error", {
          message: "You are not inside this room",
        });
      }

      // ---------------------------------------------------------------
      // Room + driver mutex
      // ---------------------------------------------------------------
      const room = await Room.findById(roomId);

      if (!room) {
        return socket.emit("editor:error", {
          message: "Room not found",
        });
      }

      if (
        !room.driver ||
        room.driver.toString() !== socket.user.id.toString()
      ) {
        return socket.emit("editor:error", {
          message: "You do not hold the active driver write-mutex",
        });
      }

      // ---------------------------------------------------------------
      // File lookup — `path` is the canonical disk location.
      // ---------------------------------------------------------------
      const file = await File.findOne({
        _id: fileId,
        room: roomId,
        type: "file",
      });

      if (!file) {
        return socket.emit("editor:error", {
          message: "File not found in this room",
        });
      }

      // ---------------------------------------------------------------
      // Optional optimistic concurrency guard.
      // ---------------------------------------------------------------
      if (
        version !== undefined &&
        Number(version) !== Number(file.version)
      ) {
        return socket.emit("editor:conflict", {
          fileId: String(file._id),
          currentVersion: file.version,
        });
      }

      // ---------------------------------------------------------------
      // DISK FIRST
      // ---------------------------------------------------------------
      try {
        await fileService.writeFile(roomId, file.path, code);
      } catch (fsErr) {
        console.error(
          "Failed to write live buffer to disk:",
          fsErr.message
        );
        return socket.emit("editor:error", {
          message: "Failed to persist buffer to disk",
        });
      }

      // ---------------------------------------------------------------
      // Index bookkeeping (non-authoritative)
      // ---------------------------------------------------------------
      file.size = Buffer.byteLength(code, "utf8");
      file.version = Number(file.version) + 1;
      file.updatedBy = socket.user.id;
      if (typeof language === "string" && language.trim()) {
        file.language = language.trim();
      }
      await file.save();

      // ---------------------------------------------------------------
      // Fan-out to observers
      // ---------------------------------------------------------------
      socket.to(roomId).emit("code:sync", {
        fileId: String(file._id),
        code,
        version: file.version,
        language: file.language,
        senderId: socket.user.id,
      });

      // ---------------------------------------------------------------
      // Ack to the driver
      // ---------------------------------------------------------------
      socket.emit("editor:saved", {
        roomId,
        fileId: String(file._id),
        version: file.version,
      });
    } catch (error) {
      console.error("CODE UPDATE ERROR:", error);
      socket.emit("editor:error", {
        message: "Failed to sync editor buffer",
      });
    }
  });
};