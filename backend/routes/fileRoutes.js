const express = require("express");

const protect = require("../middleware/authMiddleware");

const {
  getFileTree,
  createFile,
  createFolder,
  getFile,
  updateFile,
  renameFile,
  moveFile,
  deleteFile
} = require("../controllers/fileController");

const router = express.Router();

router.use(protect);

/*
 * Tree
 */
router.get("/rooms/:roomId/tree", getFileTree);

/*
 * Creation
 */
router.post("/rooms/:roomId/files", createFile);

router.post("/rooms/:roomId/folders", createFolder);

/*
 * File content
 */
router.get("/:fileId", getFile);

router.put("/:fileId", updateFile);

/*
 * File system operations
 */
router.patch("/:fileId/rename", renameFile);

router.patch("/:fileId/move", moveFile);

router.delete("/:fileId", deleteFile);

module.exports = router;