// backend/sockets/terminalSocket.js
const pty = require("node-pty");
const path = require("path");
const fileService = require("../services/fileService");
const Room = require("../models/Room");

/*
|--------------------------------------------------------------------------
| ROOM-LEVEL TERMINAL SESSIONS
|--------------------------------------------------------------------------
|
| One PTY per room, shared by every socket in that room.
|
|   roomSessions: Map<roomId, {
|     ptyProcess,
|     scrollback: string,
|     cols: number,
|     rows: number,
|   }>
|
| Input is gated to the current driver at write time (checked against
| the live Room doc so seat handoffs take effect instantly).
|
| Output is broadcast to everyone in the room.
|
|--------------------------------------------------------------------------
*/

const roomSessions = new Map();
const SCROLLBACK_LIMIT = 32 * 1024; // 32 KB

function appendScrollback(session, chunk) {
  session.scrollback = (session.scrollback + chunk).slice(-SCROLLBACK_LIMIT);
}

async function getOrCreateSession(io, roomId) {
  let session = roomSessions.get(roomId);
  if (session) return session;

  const roomDir = await fileService.ensureRoomRoot(roomId);
  const isWin = process.platform === "win32";
  const shell = isWin ? "powershell.exe" : "bash";
  const args = isWin ? ["-NoLogo"] : [];

  const ptyProcess = pty.spawn(shell, args, {
    name: "xterm-color",
    cols: 80,
    rows: 24,
    cwd: path.resolve(roomDir),
    env: process.env,
  });

  const newSession = {
    ptyProcess,
    scrollback: "",
    cols: 80,
    rows: 24,
  };

  ptyProcess.onData((incoming) => {
    appendScrollback(newSession, incoming);
    io.to(roomId).emit("terminal:data", incoming);
  });

  ptyProcess.onExit(({ exitCode }) => {
    io.to(roomId).emit(
      "terminal:data",
      `\r\n\x1b[33m[Session closed with code ${exitCode}]\x1b[0m\r\n`
    );
    roomSessions.delete(roomId);
  });

  roomSessions.set(roomId, newSession);
  return newSession;
}

async function isCurrentDriver(roomId, userId) {
  const room = await Room.findById(roomId).select("driver");
  if (!room || !room.driver) return false;
  return room.driver.toString() === userId.toString();
}

module.exports = (io, socket) => {
  /*
  |--------------------------------------------------------------------------
  | INIT
  |--------------------------------------------------------------------------
  */
  socket.on("terminal:init", async (data) => {
    const roomId = typeof data === "string" ? data : data?.roomId;
    if (!roomId) return;

    try {
      const room = await Room.findById(roomId);
      if (!room) return;

      const session = await getOrCreateSession(io, roomId);

      // Replay the recent scrollback to this socket only.
      if (session.scrollback) {
        socket.emit("terminal:data", session.scrollback);
      }

      // Tell the client whether their input will be accepted.
      const writable = await isCurrentDriver(roomId, socket.user.id);
      socket.emit("terminal:ready", {
        roomId,
        writable,
      });
    } catch (err) {
      console.error("[Terminal Error]:", err.message);
      socket.emit(
        "terminal:data",
        `\r\n\x1b[31mTerminal error: ${err.message}\x1b[0m\r\n`
      );
    }
  });

  /*
  |--------------------------------------------------------------------------
  | WRITE (driver-only)
  |--------------------------------------------------------------------------
  */
  socket.on("terminal:write", async (data) => {
    try {
      const roomId = socket.currentRoom;
      if (!roomId) return;

      const session = roomSessions.get(roomId);
      if (!session) return;

      const isDriver = await isCurrentDriver(roomId, socket.user.id);
      if (!isDriver) {
        // Silently drop; clients already know they're read-only.
        return;
      }

      session.ptyProcess.write(data);
    } catch (err) {
      console.error("[Terminal write error]:", err.message);
    }
  });

  /*
  |--------------------------------------------------------------------------
  | RESIZE
  |--------------------------------------------------------------------------
  |
  | Any peer can resize; last writer wins. This keeps xterm happy on
  | both sides without a lot of coordination overhead.
  |
  |--------------------------------------------------------------------------
  */
  socket.on("terminal:resize", (size) => {
    const roomId = socket.currentRoom;
    if (!roomId) return;
    const session = roomSessions.get(roomId);
    if (!session) return;
    if (size?.cols && size?.rows) {
      try {
        session.ptyProcess.resize(size.cols, size.rows);
        session.cols = size.cols;
        session.rows = size.rows;
      } catch {
        // xterm may not be ready; ignore
      }
    }
  });

  /*
  |--------------------------------------------------------------------------
  | KILL (driver-only reset)
  |--------------------------------------------------------------------------
  */
  socket.on("terminal:kill", async () => {
    const roomId = socket.currentRoom;
    if (!roomId) return;

    const isDriver = await isCurrentDriver(roomId, socket.user.id);
    if (!isDriver) return;

    const session = roomSessions.get(roomId);
    if (!session) return;

    try {
      session.ptyProcess.kill();
    } catch {}
    roomSessions.delete(roomId);

    io.to(roomId).emit(
      "terminal:data",
      `\r\n\x1b[33m[Session reset by driver]\x1b[0m\r\n`
    );
  });

  /*
  |--------------------------------------------------------------------------
  | DISCONNECT
  |--------------------------------------------------------------------------
  |
  | Keep the room PTY alive even if a socket drops, so the driver can
  | refresh without losing shell state. Cleanup is deferred to an
  | empty-room sweep (see below).
  |
  |--------------------------------------------------------------------------
  */
  socket.on("disconnect", () => {
    const roomId = socket.currentRoom;
    if (!roomId) return;

    // If no sockets remain in the room after a short delay, tear down
    // the session so we don't leak PTYs.
    setTimeout(async () => {
      const remaining = await io.in(roomId).fetchSockets();
      if (remaining.length === 0) {
        const session = roomSessions.get(roomId);
        if (session) {
          try {
            session.ptyProcess.kill();
          } catch {}
          roomSessions.delete(roomId);
        }
      }
    }, 5000);
  });
};