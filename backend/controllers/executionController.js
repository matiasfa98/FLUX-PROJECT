// backend/controllers/executionController.js
const fs = require("fs/promises");
const path = require("path");
const os = require("os");

const Room = require("../models/Room");
const File = require("../models/File");
const dockerService = require("../services/dockerService");
const fileService = require("../services/fileService");

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

function isMember(room, userId) {
  return room.members.some((member) => {
    const memberId = member.user?._id || member.user;
    return memberId && memberId.toString() === userId.toString();
  });
}

/*
|--------------------------------------------------------------------------
| RUN CODE INSIDE A COLLABORATIVE ROOM
|--------------------------------------------------------------------------
|
| POST /api/execution/rooms/:roomId/run
|
| Body: { fileId, code?, language? }
|
| Broadcasts:
|   execution:started   (metadata)
|   terminal:data       (header, stdout, stderr, exit footer)
|   execution:finished  (result)
|
|--------------------------------------------------------------------------
*/

const runCode = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { fileId, code, language, filename } = req.body || {};

    // ---------------------------------------------------------------
    // Room + membership
    // ---------------------------------------------------------------
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    if (!isMember(room, req.user.id)) {
      return res
        .status(403)
        .json({ message: "You are not a member of this room" });
    }

    // ---------------------------------------------------------------
    // Resolve target file
    // ---------------------------------------------------------------
    let targetFile = null;

    if (fileId) {
      targetFile = await File.findOne({
        _id: fileId,
        room: roomId,
        type: "file",
      });

      if (!targetFile) {
        return res
          .status(404)
          .json({ message: "File not found in this room" });
      }
    }

    // ---------------------------------------------------------------
    // Resolve code / name / language
    // ---------------------------------------------------------------
    let codeToRun = typeof code === "string" ? code : "";
    let activeName = filename || null;
    let targetLanguage =
      language ||
      targetFile?.language ||
      room.language ||
      "javascript";

    if (targetFile) {
      if (!activeName) {
        activeName = targetFile.name;
      }

      if (!codeToRun) {
        try {
          codeToRun = await fileService.readFile(roomId, targetFile.path);
        } catch (fsErr) {
          console.error(
            "Failed to read file from disk:",
            fsErr.message
          );
          return res.status(404).json({
            message:
              "File exists in index but is missing on disk. Try refreshing the workspace.",
          });
        }
      }
    }

    // ---------------------------------------------------------------
    // Guard
    // ---------------------------------------------------------------
    if (!codeToRun) {
      return res.status(400).json({
        message:
          "No runnable content. Create a file and open it before executing.",
      });
    }

    if (!activeName) {
      activeName = "scratch.js";
    }

    const normalizedLanguage =
      dockerService.normalizeLanguage(targetLanguage);

    const roomRoot = await fileService.ensureRoomRoot(roomId);

    // ---------------------------------------------------------------
    // Socket.IO handle — declared ONCE for the whole function.
    // ---------------------------------------------------------------
    const io = req.app.get("io");

    // ---------------------------------------------------------------
    // Notify peers: execution started + push header into terminal
    // ---------------------------------------------------------------
    if (io) {
      io.to(roomId).emit("execution:started", {
        language: normalizedLanguage,
        filename: activeName,
        fileId: targetFile ? String(targetFile._id) : null,
        triggeredBy: req.user.username || "Peer",
      });

      const header =
        `\r\n\x1b[36m[runner] ${activeName} ` +
        `(by ${req.user.username || "Peer"})\x1b[0m\r\n`;
      io.to(roomId).emit("terminal:data", header);
    }

    // ---------------------------------------------------------------
    // Dispatch to Docker
    // ---------------------------------------------------------------
    let result;
    try {
      result = await dockerService.runDockerContainer(
        roomRoot,
        normalizedLanguage,
        codeToRun,
        activeName
      );
    } catch (dockerErr) {
      if (io) {
        io.to(roomId).emit(
          "terminal:data",
          `\r\n\x1b[31m[runner] Docker error: ${dockerErr.message}\x1b[0m\r\n`
        );
      }
      throw dockerErr;
    }

    // ---------------------------------------------------------------
    // Stream output to every peer's terminal
    // ---------------------------------------------------------------
    if (io) {
      const body = `${result.stdout || ""}${result.stderr || ""}`;
      const footer =
        result.exitCode === 0
          ? `\r\n\x1b[32m[exit 0]\x1b[0m\r\n`
          : `\r\n\x1b[31m[exit ${result.exitCode}]\x1b[0m\r\n`;

      io.to(roomId).emit("terminal:data", body + footer);

      io.to(roomId).emit("execution:finished", {
        ...result,
        language: normalizedLanguage,
        filename: activeName,
        fileId: targetFile ? String(targetFile._id) : null,
      });
    }

    return res.json(result);
  } catch (error) {
    console.error("Run code error:", error);
    return res.status(500).json({
      message: error.message || "Execution failed",
    });
  }
};

/*
|--------------------------------------------------------------------------
| RUN CODE IN PERSONAL PLAYGROUND
|--------------------------------------------------------------------------
|
| POST /api/execution/run
|
| No room. No collaborators. No broadcast.
|
|--------------------------------------------------------------------------
*/

const runPlaygroundCode = async (req, res) => {
  let tempDir = null;

  try {
    const { language, code, filename } = req.body || {};

    if (typeof code !== "string") {
      return res.status(400).json({ message: "Code buffer is required" });
    }

    if (!code.trim()) {
      return res.status(400).json({ message: "Code buffer is empty" });
    }

    const targetLanguage = language || "javascript";
    const activeName = filename || "main.js";

    tempDir = path.join(
      os.tmpdir(),
      `flux-playground-${Date.now()}-${Math.random()
        .toString(36)
        .substring(7)}`
    );
    await fs.mkdir(tempDir, { recursive: true });

    const result = await dockerService.runDockerContainer(
      tempDir,
      targetLanguage,
      code,
      activeName
    );

    return res.json(result);
  } catch (error) {
    console.error("Playground run error:", error);
    return res.status(500).json({
      message: error.message || "Playground execution failed",
    });
  } finally {
    if (tempDir) {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {
        // best-effort cleanup
      }
    }
  }
};

module.exports = {
  runCode,
  runPlaygroundCode,
};