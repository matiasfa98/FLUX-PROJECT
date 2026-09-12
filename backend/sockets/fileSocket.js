// backend/sockets/fileSocket.js
const path = require("path");

const File = require("../models/File");
const Room = require("../models/Room");
const fileService = require("../services/fileService");
const reconcileService = require("../services/reconcileService");

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const isMember = (room, userId) => {
  return room.members.some((member) => {
    const memberId = member.user?._id || member.user;
    return memberId && String(memberId) === String(userId);
  });
};

const isOwnerOrAdmin = (room, userId) => {
  if (String(room.owner) === String(userId)) return true;
  return room.members.some((member) => {
    const memberId = member.user?._id || member.user;
    return (
      memberId &&
      String(memberId) === String(userId) &&
      ["owner", "admin"].includes(member.role)
    );
  });
};

const isDriver = (room, userId) => {
  if (!room.driver) return false;
  const driverId = room.driver?._id || room.driver;
  return driverId && String(driverId) === String(userId);
};

const emitError = (socket, message) => {
  socket.emit("fs:error", { message });
};

/*
|--------------------------------------------------------------------------
| RESOLVE PARENT PATH
|--------------------------------------------------------------------------
|
| Given a Mongo parent _id (or null), return the parent's disk-relative
| path. Used to compute the child's full relative path before writing.
|
|--------------------------------------------------------------------------
*/

const resolveParentPath = async (parentId, roomId) => {
  if (!parentId) return "";

  const parent = await File.findOne({
    _id: parentId,
    room: roomId,
    type: "folder",
  });

  if (!parent) {
    throw new Error("Parent folder not found");
  }

  return parent.path;
};

/*
|--------------------------------------------------------------------------
| BROADCAST RECONCILED TREE
|--------------------------------------------------------------------------
|
| Every write funnels through this: reconcile then emit the fresh tree
| to every peer in the room. One event, always consistent.
|
|--------------------------------------------------------------------------
*/

const broadcastTree = async (io, roomId) => {
  const fileTree = await reconcileService.reconcileRoom(roomId);
  io.to(roomId).emit("fs:tree", { fileTree });
  return fileTree;
};

/*
|--------------------------------------------------------------------------
| MAIN HANDLER
|--------------------------------------------------------------------------
*/

module.exports = (io, socket) => {
  /*
   |-------------------------------------------------------------------
   | CREATE FILE
   |-------------------------------------------------------------------
   */
  socket.on("fs:create-file", async (data) => {
    try {
      const {
        roomId,
        parent = null,
        name,
        content = "",
        language,
      } = data || {};

      const userId = socket.user?.id;

      if (!roomId || !name) {
        return emitError(socket, "roomId and name are required");
      }

      if (socket.currentRoom !== String(roomId)) {
        return emitError(socket, "You must join the room first");
      }

      const room = await Room.findById(roomId);
      if (!room || !isMember(room, userId)) {
        return emitError(socket, "You are not a member of this room");
      }

      // Only the driver writes.
      if (!isDriver(room, userId)) {
        return emitError(socket, "Only the active driver can create files");
      }

      if (typeof content !== "string" || content.length > 1_000_000) {
        return emitError(socket, "Invalid file content");
      }

      const cleanName = fileService.validateName(name);
      const parentPath = await resolveParentPath(parent, roomId);
      const relativePath = parentPath
        ? `${parentPath}/${cleanName}`
        : cleanName;

      // -----------------------------------------------------------
      // 1. DISK FIRST
      // -----------------------------------------------------------
      await fileService.createFile(roomId, relativePath, content);

      // -----------------------------------------------------------
      // 2. RECONCILE (index catches up)
      // -----------------------------------------------------------
      const fileTree = await broadcastTree(io, roomId);

      // -----------------------------------------------------------
      // 3. Personalize the created doc for the caller (optional)
      // -----------------------------------------------------------
      const createdDoc = fileTree.find((f) => f.path === relativePath);
      if (createdDoc) {
        socket.emit("fs:created", {
          fileId: String(createdDoc._id),
          type: "file",
        });
      }
    } catch (error) {
      console.error("Socket create file error:", error);
      emitError(socket, error.message || "Failed to create file");
    }
  });

  /*
   |-------------------------------------------------------------------
   | CREATE FOLDER
   |-------------------------------------------------------------------
   */
  socket.on("fs:create-folder", async (data) => {
    try {
      const { roomId, parent = null, name } = data || {};

      const userId = socket.user?.id;

      if (!roomId || !name) {
        return emitError(socket, "roomId and name are required");
      }

      if (socket.currentRoom !== String(roomId)) {
        return emitError(socket, "You must join the room first");
      }

      const room = await Room.findById(roomId);
      if (!room || !isMember(room, userId)) {
        return emitError(socket, "You are not a member of this room");
      }

      if (!isDriver(room, userId)) {
        return emitError(socket, "Only the active driver can create folders");
      }

      const cleanName = fileService.validateName(name);
      const parentPath = await resolveParentPath(parent, roomId);
      const relativePath = parentPath
        ? `${parentPath}/${cleanName}`
        : cleanName;

      // -----------------------------------------------------------
      // 1. DISK FIRST
      // -----------------------------------------------------------
      await fileService.createFolder(roomId, relativePath);

      // -----------------------------------------------------------
      // 2. RECONCILE + BROADCAST
      // -----------------------------------------------------------
      const fileTree = await broadcastTree(io, roomId);

      const createdDoc = fileTree.find((f) => f.path === relativePath);
      if (createdDoc) {
        socket.emit("fs:created", {
          fileId: String(createdDoc._id),
          type: "folder",
        });
      }
    } catch (error) {
      console.error("Socket create folder error:", error);
      emitError(socket, error.message || "Failed to create folder");
    }
  });

  /*
   |-------------------------------------------------------------------
   | SAVE FILE (buffer write from the driver)
   |-------------------------------------------------------------------
   */
  socket.on("fs:save", async (data) => {
    try {
      const { roomId, fileId, content, language } = data || {};

      const userId = socket.user?.id;

      if (!roomId || !fileId) {
        return emitError(socket, "roomId and fileId are required");
      }

      if (typeof content !== "string" || content.length > 1_000_000) {
        return emitError(socket, "Invalid file content");
      }

      if (socket.currentRoom !== String(roomId)) {
        return emitError(socket, "You must join the room first");
      }

      const room = await Room.findById(roomId);
      if (!room || !isMember(room, userId)) {
        return emitError(socket, "You are not a member of this room");
      }

      if (!isDriver(room, userId)) {
        return emitError(socket, "Only the active driver can save files");
      }

      const file = await File.findOne({
        _id: fileId,
        room: roomId,
        type: "file",
      });

      if (!file) {
        return emitError(socket, "File not found");
      }

      // -----------------------------------------------------------
      // 1. DISK FIRST — path is the indexed disk path.
      // -----------------------------------------------------------
      await fileService.writeFile(roomId, file.path, content);

      // -----------------------------------------------------------
      // 2. Update index bookkeeping (non-authoritative).
      // -----------------------------------------------------------
      file.size = Buffer.byteLength(content, "utf8");
      file.version = Number(file.version) + 1;
      file.updatedBy = userId;
      if (language !== undefined) {
        file.language = language;
      }
      await file.save();

      // -----------------------------------------------------------
      // 3. Notify peers of the content update (peers merge into
      //    their in-memory buffer; no need for full tree).
      // -----------------------------------------------------------
      const payload = {
        fileId: String(file._id),
        content,
        version: file.version,
        language: file.language,
        updatedBy: userId,
      };

      socket.to(roomId).emit("fs:file-saved", payload);
      socket.emit("fs:saved", payload);
    } catch (error) {
      console.error("Socket save error:", error);
      emitError(socket, error.message || "Failed to save file");
    }
  });

  /*
   |-------------------------------------------------------------------
   | RENAME
   |-------------------------------------------------------------------
   */
  socket.on("fs:rename", async (data) => {
    try {
      const { roomId, fileId, name } = data || {};

      const userId = socket.user?.id;

      if (!roomId || !fileId || !name) {
        return emitError(socket, "roomId, fileId and name are required");
      }

      if (socket.currentRoom !== String(roomId)) {
        return emitError(socket, "You must join the room first");
      }

      const room = await Room.findById(roomId);
      if (!room || !isMember(room, userId)) {
        return emitError(socket, "Access denied");
      }

      if (!isDriver(room, userId)) {
        return emitError(socket, "Only the active driver can rename entries");
      }

      const file = await File.findOne({ _id: fileId, room: roomId });
      if (!file) {
        return emitError(socket, "File not found");
      }

      const cleanName = fileService.validateName(name);
      if (cleanName === file.name) {
        return; // no-op
      }

      // Compute new path based on parent's current path.
      const parentPath = file.parent
        ? (await File.findById(file.parent).select("path"))?.path || ""
        : "";

      const newPath = parentPath
        ? `${parentPath}/${cleanName}`
        : cleanName;

      // -----------------------------------------------------------
      // 1. DISK FIRST
      // -----------------------------------------------------------
      await fileService.rename(roomId, file.path, newPath);

      // -----------------------------------------------------------
      // 2. Update index minimally; reconciler will fix descendants
      //    for folders. For files, one update suffices.
      // -----------------------------------------------------------
      file.name = cleanName;
      file.path = newPath;
      file.updatedBy = userId;
      await file.save();

      // -----------------------------------------------------------
      // 3. RECONCILE + BROADCAST
      //    (Reconciler will also fix any descendant paths for
      //    renamed folders, matching the new directory layout.)
      // -----------------------------------------------------------
      await broadcastTree(io, roomId);
    } catch (error) {
      console.error("Socket rename error:", error);
      emitError(socket, error.message || "Failed to rename");
    }
  });

  /*
   |-------------------------------------------------------------------
   | MOVE
   |-------------------------------------------------------------------
   */
  socket.on("fs:move", async (data) => {
    try {
      const { roomId, fileId, parent = null } = data || {};

      const userId = socket.user?.id;

      if (!roomId || !fileId) {
        return emitError(socket, "roomId and fileId are required");
      }

      if (socket.currentRoom !== String(roomId)) {
        return emitError(socket, "You must join the room first");
      }

      const room = await Room.findById(roomId);
      if (!room || !isMember(room, userId)) {
        return emitError(socket, "Access denied");
      }

      if (!isDriver(room, userId)) {
        return emitError(socket, "Only the active driver can move entries");
      }

      const file = await File.findOne({ _id: fileId, room: roomId });
      if (!file) {
        return emitError(socket, "File not found");
      }

      // Cannot move into itself.
      if (parent && String(parent) === String(fileId)) {
        return emitError(socket, "Cannot move into itself");
      }

      // Resolve destination path.
      let destinationPath = "";
      if (parent) {
        const destination = await File.findOne({
          _id: parent,
          room: roomId,
          type: "folder",
        });
        if (!destination) {
          return emitError(socket, "Destination folder not found");
        }
        destinationPath = destination.path;

        // Prevent moving a folder into one of its own descendants.
        if (file.type === "folder") {
          const descendantPrefix = `${file.path}/`;
          if (destinationPath.startsWith(descendantPrefix)) {
            return emitError(
              socket,
              "Cannot move a folder into its own subfolder"
            );
          }
        }
      }

      const newPath = destinationPath
        ? `${destinationPath}/${file.name}`
        : file.name;

      // -----------------------------------------------------------
      // 1. DISK FIRST
      // -----------------------------------------------------------
      await fileService.move(roomId, file.path, newPath);

      // -----------------------------------------------------------
      // 2. Update index minimal; reconciler fixes descendants.
      // -----------------------------------------------------------
      file.parent = parent || null;
      file.path = newPath;
      file.updatedBy = userId;
      await file.save();

      // -----------------------------------------------------------
      // 3. RECONCILE + BROADCAST
      // -----------------------------------------------------------
      await broadcastTree(io, roomId);
    } catch (error) {
      console.error("Socket move error:", error);
      emitError(socket, error.message || "Failed to move");
    }
  });

  /*
   |-------------------------------------------------------------------
   | DELETE
   |-------------------------------------------------------------------
   */
  socket.on("fs:delete", async (data) => {
    try {
      const { roomId, fileId } = data || {};

      const userId = socket.user?.id;

      if (!roomId || !fileId) {
        return emitError(socket, "roomId and fileId are required");
      }

      if (socket.currentRoom !== String(roomId)) {
        return emitError(socket, "You must join the room first");
      }

      const room = await Room.findById(roomId);
      if (!room) {
        return emitError(socket, "Room not found");
      }

      // Delete is owner/admin only (existing rule).
      if (!isOwnerOrAdmin(room, userId)) {
        return emitError(
          socket,
          "Only the owner or admin can delete files"
        );
      }

      const file = await File.findOne({ _id: fileId, room: roomId });
      if (!file) {
        return emitError(socket, "File not found");
      }

      // -----------------------------------------------------------
      // 1. DISK FIRST — recursive remove.
      // -----------------------------------------------------------
      await fileService.remove(roomId, file.path);

      // -----------------------------------------------------------
      // 2. RECONCILE + BROADCAST
      //    The reconciler will notice the descendants are gone
      //    from disk and purge their File docs automatically.
      // -----------------------------------------------------------
      await broadcastTree(io, roomId);
    } catch (error) {
      console.error("Socket delete error:", error);
      emitError(socket, error.message || "Failed to delete");
    }
  });
};