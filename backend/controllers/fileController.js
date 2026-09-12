// backend/controllers/fileController.js
const mongoose = require("mongoose");

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

/*
|--------------------------------------------------------------------------
| GET FILE TREE
|--------------------------------------------------------------------------
|
| GET /api/files/rooms/:roomId/tree
|
| Returns the reconciled tree. Reading a tree = reconciling the tree,
| because disk is truth.
|
|--------------------------------------------------------------------------
*/

const getFileTree = async (req, res) => {
  try {
    const { roomId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({ message: "Invalid room ID" });
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    if (!isMember(room, req.user.id)) {
      return res
        .status(403)
        .json({ message: "You are not a member of this room" });
    }

    const fileTree = await reconcileService.reconcileRoom(roomId);

    return res.json({ files: fileTree });
  } catch (error) {
    console.error("Get file tree error:", error);
    return res.status(500).json({ message: "Failed to get file tree" });
  }
};

/*
|--------------------------------------------------------------------------
| CREATE FILE
|--------------------------------------------------------------------------
|
| POST /api/files/rooms/:roomId/files
|
|--------------------------------------------------------------------------
*/

const createFile = async (req, res) => {
  try {
    const { roomId } = req.params;
    const {
      name,
      parent = null,
      language = "plaintext",
      content = "",
    } = req.body || {};

    if (!name) {
      return res.status(400).json({ message: "File name is required" });
    }

    if (typeof content !== "string") {
      return res
        .status(400)
        .json({ message: "Content must be a string" });
    }

    if (content.length > 1_000_000) {
      return res
        .status(400)
        .json({ message: "File content is too large" });
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    if (!isMember(room, req.user.id)) {
      return res
        .status(403)
        .json({ message: "You are not a member of this room" });
    }

    // Driver mutex: only the driver writes.
    if (!isDriver(room, req.user.id)) {
      return res
        .status(403)
        .json({ message: "Only the active driver can create files" });
    }

    const cleanName = fileService.validateName(name);

    // Resolve parent path from the index.
    let parentPath = "";
    if (parent) {
      const parentDoc = await File.findOne({
        _id: parent,
        room: roomId,
        type: "folder",
      });

      if (!parentDoc) {
        return res
          .status(404)
          .json({ message: "Parent folder not found" });
      }
      parentPath = parentDoc.path;
    }

    const relativePath = parentPath
      ? `${parentPath}/${cleanName}`
      : cleanName;

    // -----------------------------------------------------------------
    // 1. DISK FIRST
    // -----------------------------------------------------------------
    try {
      await fileService.createFile(roomId, relativePath, content);
    } catch (fsErr) {
      // Common case: file already exists on disk.
      if (fsErr.code === "EEXIST") {
        return res
          .status(409)
          .json({ message: "A file with this name already exists" });
      }
      return res
        .status(500)
        .json({ message: fsErr.message || "Failed to write file to disk" });
    }

    // -----------------------------------------------------------------
    // 2. RECONCILE
    // -----------------------------------------------------------------
    const fileTree = await reconcileService.reconcileRoom(roomId);

    // -----------------------------------------------------------------
    // 3. Find the created doc to return its _id (convenience).
    // -----------------------------------------------------------------
    const created = fileTree.find((f) => f.path === relativePath);

    return res.status(201).json({
      message: "File created successfully",
      file: created || null,
      files: fileTree,
    });
  } catch (error) {
    console.error("Create file error:", error);
    return res.status(500).json({
      message: error.message || "Failed to create file",
    });
  }
};

/*
|--------------------------------------------------------------------------
| CREATE FOLDER
|--------------------------------------------------------------------------
|
| POST /api/files/rooms/:roomId/folders
|
|--------------------------------------------------------------------------
*/

const createFolder = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { name, parent = null } = req.body || {};

    if (!name) {
      return res.status(400).json({ message: "Folder name is required" });
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    if (!isMember(room, req.user.id)) {
      return res
        .status(403)
        .json({ message: "You are not a member of this room" });
    }

    if (!isDriver(room, req.user.id)) {
      return res
        .status(403)
        .json({ message: "Only the active driver can create folders" });
    }

    const cleanName = fileService.validateName(name);

    let parentPath = "";
    if (parent) {
      const parentDoc = await File.findOne({
        _id: parent,
        room: roomId,
        type: "folder",
      });

      if (!parentDoc) {
        return res
          .status(404)
          .json({ message: "Parent folder not found" });
      }
      parentPath = parentDoc.path;
    }

    const relativePath = parentPath
      ? `${parentPath}/${cleanName}`
      : cleanName;

    // -----------------------------------------------------------------
    // 1. DISK FIRST
    // -----------------------------------------------------------------
    try {
      await fileService.createFolder(roomId, relativePath);
    } catch (fsErr) {
      if (fsErr.code === "EEXIST") {
        return res
          .status(409)
          .json({ message: "A folder with this name already exists" });
      }
      return res.status(500).json({
        message: fsErr.message || "Failed to create folder on disk",
      });
    }

    // -----------------------------------------------------------------
    // 2. RECONCILE
    // -----------------------------------------------------------------
    const fileTree = await reconcileService.reconcileRoom(roomId);

    const created = fileTree.find((f) => f.path === relativePath);

    return res.status(201).json({
      message: "Folder created successfully",
      file: created || null,
      files: fileTree,
    });
  } catch (error) {
    console.error("Create folder error:", error);
    return res.status(500).json({
      message: error.message || "Failed to create folder",
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET FILE CONTENT
|--------------------------------------------------------------------------
|
| GET /api/files/:fileId
|
| Reads the content directly from disk. The Mongo doc only tells us
| where on disk the file lives.
|
|--------------------------------------------------------------------------
*/

const getFile = async (req, res) => {
  try {
    const { fileId } = req.params;

    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    const room = await Room.findById(file.room);
    if (!room || !isMember(room, req.user.id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (file.type !== "file") {
      return res
        .status(400)
        .json({ message: "Folders do not have file content" });
    }

    // Read straight from disk. Truth lives there.
    let content;
    try {
      content = await fileService.readFile(file.room, file.path);
    } catch (fsErr) {
      return res.status(404).json({
        message: "File exists in index but is missing on disk",
      });
    }

    return res.json({
      file: {
        id: String(file._id),
        name: file.name,
        path: file.path,
        type: file.type,
        language: file.language,
        version: file.version,
        size: file.size,
      },
      content,
    });
  } catch (error) {
    console.error("Get file error:", error);
    return res.status(500).json({ message: "Failed to read file" });
  }
};

/*
|--------------------------------------------------------------------------
| UPDATE FILE CONTENT
|--------------------------------------------------------------------------
|
| PUT /api/files/:fileId
|
|--------------------------------------------------------------------------
*/

const updateFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { content, language } = req.body || {};

    if (typeof content !== "string") {
      return res
        .status(400)
        .json({ message: "Content must be a string" });
    }

    if (content.length > 1_000_000) {
      return res
        .status(400)
        .json({ message: "File content is too large" });
    }

    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    if (file.type !== "file") {
      return res
        .status(400)
        .json({ message: "Cannot write content to a folder" });
    }

    const room = await Room.findById(file.room);
    if (!room || !isMember(room, req.user.id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (!isDriver(room, req.user.id)) {
      return res
        .status(403)
        .json({ message: "Only the active driver can save files" });
    }

    // -----------------------------------------------------------------
    // 1. DISK FIRST
    // -----------------------------------------------------------------
    await fileService.writeFile(file.room, file.path, content);

    // -----------------------------------------------------------------
    // 2. UPDATE INDEX BOOKKEEPING
    // -----------------------------------------------------------------
    file.size = Buffer.byteLength(content, "utf8");
    file.version = Number(file.version) + 1;
    file.updatedBy = req.user.id;
    if (language !== undefined) {
      file.language = language;
    }
    await file.save();

    return res.json({
      message: "File saved successfully",
      file: {
        id: String(file._id),
        name: file.name,
        path: file.path,
        version: file.version,
        size: file.size,
        language: file.language,
      },
    });
  } catch (error) {
    console.error("Update file error:", error);
    return res.status(500).json({ message: "Failed to save file" });
  }
};

/*
|--------------------------------------------------------------------------
| RENAME
|--------------------------------------------------------------------------
|
| PATCH /api/files/:fileId/rename
|
|--------------------------------------------------------------------------
*/

const renameFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { name } = req.body || {};

    if (!name) {
      return res.status(400).json({ message: "New name is required" });
    }

    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    const room = await Room.findById(file.room);
    if (!room || !isMember(room, req.user.id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (!isDriver(room, req.user.id)) {
      return res
        .status(403)
        .json({ message: "Only the active driver can rename entries" });
    }

    const cleanName = fileService.validateName(name);
    if (cleanName === file.name) {
      // No-op — return current tree.
      const fileTree = await reconcileService.reconcileRoom(file.room);
      return res.json({ message: "Unchanged", files: fileTree });
    }

    // Compute new path.
    let parentPath = "";
    if (file.parent) {
      const parentDoc = await File.findById(file.parent).select("path");
      parentPath = parentDoc?.path || "";
    }

    const newPath = parentPath
      ? `${parentPath}/${cleanName}`
      : cleanName;

    // -----------------------------------------------------------------
    // 1. DISK FIRST
    // -----------------------------------------------------------------
    await fileService.rename(file.room, file.path, newPath);

    // -----------------------------------------------------------------
    // 2. MINIMAL INDEX UPDATE (reconciler fixes descendants).
    // -----------------------------------------------------------------
    file.name = cleanName;
    file.path = newPath;
    file.updatedBy = req.user.id;
    await file.save();

    // -----------------------------------------------------------------
    // 3. RECONCILE + RETURN
    // -----------------------------------------------------------------
    const fileTree = await reconcileService.reconcileRoom(file.room);

    return res.json({
      message: "Renamed successfully",
      files: fileTree,
    });
  } catch (error) {
    console.error("Rename error:", error);
    return res.status(500).json({
      message: error.message || "Failed to rename",
    });
  }
};

/*
|--------------------------------------------------------------------------
| MOVE
|--------------------------------------------------------------------------
|
| PATCH /api/files/:fileId/move
|
|--------------------------------------------------------------------------
*/

const moveFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { parent = null } = req.body || {};

    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    const room = await Room.findById(file.room);
    if (!room || !isMember(room, req.user.id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (!isDriver(room, req.user.id)) {
      return res
        .status(403)
        .json({ message: "Only the active driver can move entries" });
    }

    if (parent && String(parent) === String(file._id)) {
      return res
        .status(400)
        .json({ message: "A file cannot be moved into itself" });
    }

    // Resolve destination path.
    let destinationPath = "";
    if (parent) {
      const destination = await File.findOne({
        _id: parent,
        room: file.room,
        type: "folder",
      });

      if (!destination) {
        return res
          .status(404)
          .json({ message: "Destination folder not found" });
      }
      destinationPath = destination.path;

      // Prevent moving a folder into one of its own descendants.
      if (file.type === "folder") {
        const descendantPrefix = `${file.path}/`;
        if (destinationPath.startsWith(descendantPrefix)) {
          return res.status(400).json({
            message: "Cannot move a folder into its own subfolder",
          });
        }
      }
    }

    const newPath = destinationPath
      ? `${destinationPath}/${file.name}`
      : file.name;

    // -----------------------------------------------------------------
    // 1. DISK FIRST
    // -----------------------------------------------------------------
    await fileService.move(file.room, file.path, newPath);

    // -----------------------------------------------------------------
    // 2. MINIMAL INDEX UPDATE
    // -----------------------------------------------------------------
    file.parent = parent || null;
    file.path = newPath;
    file.updatedBy = req.user.id;
    await file.save();

    // -----------------------------------------------------------------
    // 3. RECONCILE + RETURN
    // -----------------------------------------------------------------
    const fileTree = await reconcileService.reconcileRoom(file.room);

    return res.json({
      message: "Moved successfully",
      files: fileTree,
    });
  } catch (error) {
    console.error("Move error:", error);
    return res.status(500).json({
      message: error.message || "Failed to move",
    });
  }
};

/*
|--------------------------------------------------------------------------
| DELETE
|--------------------------------------------------------------------------
|
| DELETE /api/files/:fileId
|
| Owner/admin only (existing rule). Disk remove is recursive; the
| reconciler purges descendant index entries automatically.
|
|--------------------------------------------------------------------------
*/

const deleteFile = async (req, res) => {
  try {
    const { fileId } = req.params;

    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    const room = await Room.findById(file.room);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    if (!isOwnerOrAdmin(room, req.user.id)) {
      return res
        .status(403)
        .json({ message: "Only the owner or admin can delete files" });
    }

    // -----------------------------------------------------------------
    // 1. DISK FIRST — recursive.
    // -----------------------------------------------------------------
    await fileService.remove(file.room, file.path);

    // -----------------------------------------------------------------
    // 2. RECONCILE — drops the doc and all its descendants.
    // -----------------------------------------------------------------
    const fileTree = await reconcileService.reconcileRoom(file.room);

    return res.json({
      message: "Deleted successfully",
      files: fileTree,
    });
  } catch (error) {
    console.error("Delete file error:", error);
    return res.status(500).json({
      message: error.message || "Failed to delete",
    });
  }
};

module.exports = {
  getFileTree,
  createFile,
  createFolder,
  getFile,
  updateFile,
  renameFile,
  moveFile,
  deleteFile,
};