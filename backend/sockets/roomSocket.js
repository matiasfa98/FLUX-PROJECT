// backend/sockets/roomSocket.js
const mongoose = require("mongoose");

const Room = require("../models/Room");
const File = require("../models/File");
const fileService = require("../services/fileService");
const reconcileService = require("../services/reconcileService");

const DRIVER_GRACE_PERIOD_MS = 2 * 60 * 1000;

/*
|--------------------------------------------------------------------------
| Module-level timers
|--------------------------------------------------------------------------
|
| roomId -> timeout handle.
|
| These are an optimization. The Room.driverDisconnectedAt field is the
| actual source of truth. If the process restarts, timers are lost but
| the next connection to a room will re-evaluate staleness via
| cleanStaleDriver().
|
|--------------------------------------------------------------------------
*/

const driverTimers = new Map();

module.exports = (io, socket) => {
  /*
  |--------------------------------------------------------------------------
  | UTILITIES
  |--------------------------------------------------------------------------
  */

  const getUserId = () => socket.user.id.toString();

  const isMember = (room, userId) =>
    room.members.some((member) => {
      const memberId = member.user?._id || member.user;
      return memberId && memberId.toString() === userId.toString();
    });

  const isOwner = (room, userId) => {
    const ownerId = room.owner?._id || room.owner;
    return ownerId && ownerId.toString() === userId.toString();
  };

  const isOwnerOrAdmin = (room, userId) => {
    if (isOwner(room, userId)) return true;
    const member = room.members.find((m) => {
      const memberId = m.user?._id || m.user;
      return memberId && memberId.toString() === userId.toString();
    });
    return member?.role === "admin";
  };

  const isDriver = (room, userId) => {
    if (!room.driver) return false;
    const driverId = room.driver?._id || room.driver;
    return driverId && driverId.toString() === userId.toString();
  };

  const emitError = (event, message) => {
    socket.emit(event, { message });
  };

  const populateRoom = async (room) => {
    await room.populate([
      { path: "owner", select: "username email avatar status" },
      { path: "members.user", select: "username email avatar status" },
      { path: "driver", select: "username email avatar status" },
    ]);
    return room;
  };

  /*
  |--------------------------------------------------------------------------
  | BUILD FILE CONTENT MAP
  |--------------------------------------------------------------------------
  |
  | Given a reconciled fileTree (File docs from disk), read each file's
  | content from disk and return a map keyed by _id. Folders are skipped.
  |
  |--------------------------------------------------------------------------
  */
  const buildContentMap = async (roomId, fileTree) => {
    const filesMap = {};

    await Promise.all(
      fileTree
        .filter((n) => n.type === "file")
        .map(async (n) => {
          let content = "";
          try {
            content = await fileService.readFile(roomId, n.path);
          } catch {
            // File exists in the index but is missing on disk.
            // The reconciler will clean this up. Send "" for now.
            content = "";
          }
          filesMap[String(n._id)] = { ...n, content };
        })
    );

    return filesMap;
  };

  /*
  |--------------------------------------------------------------------------
  | DRIVER TIMER MANAGEMENT
  |--------------------------------------------------------------------------
  */

  const cancelDriverTimer = (roomId) => {
    const key = roomId.toString();
    const timer = driverTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      driverTimers.delete(key);
    }
  };

  const emitDriverReleased = (roomId, previousDriver, reason) => {
    io.to(roomId).emit("control:released", {
      roomId,
      previousDriver,
      reason,
    });

    io.to(roomId).emit("driver:handoff", {
      nextDriverId: null,
      nextDriverName: "Unclaimed",
      _id: null,
      id: null,
      username: "Unclaimed",
    });
  };

  const expireDriver = async (roomId, expectedDriverId = null) => {
    try {
      const room = await Room.findById(roomId);
      if (!room || !room.driver) {
        cancelDriverTimer(roomId);
        return;
      }

      if (expectedDriverId && !isDriver(room, expectedDriverId)) {
        cancelDriverTimer(roomId);
        return;
      }

      if (!room.driverDisconnectedAt) {
        cancelDriverTimer(roomId);
        return;
      }

      const elapsed =
        Date.now() - new Date(room.driverDisconnectedAt).getTime();

      if (elapsed < DRIVER_GRACE_PERIOD_MS) {
        scheduleDriverExpiration(room);
        return;
      }

      const previousDriver = room.driver.toString();
      room.driver = null;
      room.driverDisconnectedAt = null;
      await room.save();

      cancelDriverTimer(roomId);
      emitDriverReleased(roomId, previousDriver, "driver_disconnect_timeout");
    } catch (err) {
      console.error("EXPIRE DRIVER ERROR:", err);
    }
  };

  const scheduleDriverExpiration = (room) => {
    if (!room.driver || !room.driverDisconnectedAt) return;

    const roomId = room._id.toString();
    cancelDriverTimer(roomId);

    const elapsed =
      Date.now() - new Date(room.driverDisconnectedAt).getTime();
    const remaining = Math.max(0, DRIVER_GRACE_PERIOD_MS - elapsed);
    const expectedDriverId = room.driver.toString();

    const timer = setTimeout(async () => {
      driverTimers.delete(roomId);
      await expireDriver(roomId, expectedDriverId);
    }, remaining);

    driverTimers.set(roomId, timer);
  };

  /*
  |--------------------------------------------------------------------------
  | CLEAN STALE DRIVER
  |--------------------------------------------------------------------------
  |
  | Called before any seat-critical operation. If the current driver has
  | been disconnected past the grace window, release the seat now.
  |
  |--------------------------------------------------------------------------
  */
  const cleanStaleDriver = async (room) => {
    if (!room.driver || !room.driverDisconnectedAt) return false;

    const elapsed =
      Date.now() - new Date(room.driverDisconnectedAt).getTime();

    if (elapsed < DRIVER_GRACE_PERIOD_MS) {
      scheduleDriverExpiration(room);
      return false;
    }

    const previousDriver = room.driver.toString();
    room.driver = null;
    room.driverDisconnectedAt = null;
    await room.save();

    cancelDriverTimer(room._id.toString());
    emitDriverReleased(
      room._id.toString(),
      previousDriver,
      "driver_disconnect_timeout"
    );

    return true;
  };

  /*
  |--------------------------------------------------------------------------
  | ROOM JOIN
  |--------------------------------------------------------------------------
  |
  | Contract:
  |   1. Auto-enroll public rooms if the joiner isn't a member.
  |   2. Expire a stale driver.
  |   3. Leave the previous realtime room (without releasing its seat).
  |   4. Join the new realtime room.
  |   5. If the joiner IS the current driver and had a disconnect timer
  |      running, clear it (they've reconnected).
  |   6. NEVER auto-claim the seat. Observers stay observers.
  |   7. Reconcile the disk tree and send it.
  |   8. Broadcast driver identity + roster to the room.
  |
  |--------------------------------------------------------------------------
  */
 socket.on("room:join", async (data) => {
  try {
    const roomId = typeof data === "string" ? data : data?.roomId;
    if (!roomId) return emitError("room:error", "Room ID is required");

    // ═══════════════════════════════════════════════════════════════
    // Set currentRoom SYNCHRONOUSLY, before any await.
    //
    // Socket.IO delivers events in order but does NOT serialize
    // async handlers. If socket.currentRoom is set after an await,
    // the next queued event (chat:history, terminal:init, ...) may
    // run while it is still null and its guard will drop the request.
    //
    // Once set here, it is NEVER reset for the lifetime of this socket.
    // If the client needs to switch rooms, it disconnects and
    // reconnects — the workspace hook already does exactly that.
    // ═══════════════════════════════════════════════════════════════
    socket.join(roomId);
    socket.currentRoom = roomId;

    const room = await Room.findById(roomId);
    if (!room) return emitError("room:error", "Room not found");

    const userId = getUserId();

    // 1. Auto-enroll public rooms.
    if (!isMember(room, userId)) {
      if (
        room.settings?.access === "public" ||
        !room.settings?.requireJoinApproval
      ) {
        room.members.push({
          user: new mongoose.Types.ObjectId(userId),
          role: "member",
          joinedAt: new Date(),
        });
        await room.save();
      } else {
        return emitError("room:error", "You are not a member of this room");
      }
    }

    // 2. Expire stale driver.
    await cleanStaleDriver(room);

    // 3. Driver seat resolution.
    //
    //    Joining NEVER auto-claims the seat. The seat is set by:
    //      - roomController.createRoom   (creator is initial driver)
    //      - driver:request_seat + control:approve
    //
    //    Here we only clear a stale disconnect timer if the joiner
    //    IS the current driver and their grace period is still running.
    if (isDriver(room, userId) && room.driverDisconnectedAt) {
      room.driverDisconnectedAt = null;
      await room.save();
      cancelDriverTimer(roomId);
    }

    // 4. Populate + reconcile disk tree.
    await populateRoom(room);
    const fileTree = await reconcileService.reconcileRoom(roomId);
    const files = await buildContentMap(roomId, fileTree);

    // 5. Send full state to the joiner.
    socket.emit("room:state", {
      room,
      members: room.members,
      driver: room.driver,
      fileTree,
      files,
      activeFileId: null,
    });

    socket.emit("room:joined", {
      roomId,
      message: "Joined room successfully",
      driver: room.driver,
    });

    // 6. Notify peers in the room.
    socket.to(roomId).emit("room:members", room.members);
    socket.to(roomId).emit("room:user-joined", {
      roomId,
      user: {
        id: socket.user.id,
        username: socket.user.username,
      },
    });

    // 7. Broadcast driver identity to everyone so all clients agree.
    if (room.driver) {
      const driverIdStr = (room.driver._id || room.driver).toString();
      const driverNameStr = room.driver.username || "Driver";
      io.to(roomId).emit("driver:handoff", {
        nextDriverId: driverIdStr,
        nextDriverName: driverNameStr,
        _id: driverIdStr,
        id: driverIdStr,
        username: driverNameStr,
      });
    } else {
      io.to(roomId).emit("driver:handoff", {
        nextDriverId: null,
        nextDriverName: "Unclaimed",
        _id: null,
        id: null,
        username: "Unclaimed",
      });
    }
  } catch (error) {
    console.error("SOCKET ROOM JOIN ERROR:", error);
    emitError("room:error", "Failed to join room");
  }
});

  /*
  |--------------------------------------------------------------------------
  | ROOM LEAVE (explicit — releases the seat if you held it)
  |--------------------------------------------------------------------------
  */
  socket.on("room:leave", async (data) => {
    try {
      const roomId = typeof data === "string" ? data : data?.roomId;
      if (!roomId) return emitError("room:error", "Room ID is required");
      if (socket.currentRoom !== roomId) {
        return emitError("room:error", "You are not inside this room");
      }

      const room = await Room.findById(roomId);
      const userId = getUserId();

      if (room) {
        if (isDriver(room, userId)) {
          room.driver = null;
          room.driverDisconnectedAt = null;
          await room.save();
          cancelDriverTimer(roomId);
          emitDriverReleased(roomId, userId, "driver_left");
        }
        socket.to(roomId).emit("room:user-left", { roomId, userId });
      }

      socket.leave(roomId);
      socket.currentRoom = null;

      socket.emit("room:left", {
        roomId,
        message: "Left room successfully",
      });
    } catch (error) {
      console.error("SOCKET ROOM LEAVE ERROR:", error);
      emitError("room:error", "Failed to leave room");
    }
  });

  /*
  |--------------------------------------------------------------------------
  | REQUEST SEAT (observer -> server -> possibly current driver)
  |--------------------------------------------------------------------------
  |
  | Three outcomes:
  |   1. Requester already holds the seat -> error.
  |   2. Seat is empty -> claim immediately (no one to ask).
  |   3. Seat is taken -> relay control:requested to the room.
  |      The current driver will see a modal and can approve or reject.
  |
  |--------------------------------------------------------------------------
  */
  socket.on("driver:request_seat", async (data) => {
    try {
      const roomId = typeof data === "string" ? data : data?.roomId;
      if (!roomId) return emitError("control:error", "Room ID is required");

     /*
     * Mobile clients cannot hold the driver seat.
     * They're observers by design: no code editing, no terminal input.
     */
    if (socket.clientType === "mobile") {
  return emitError(
    "control:error",
    "Mobile clients cannot hold the driver seat. Open Flux on desktop to drive this session."
  );
}

      const room = await Room.findById(roomId);
      if (!room) return emitError("control:error", "Room not found");

      const userId = getUserId();

      if (!isMember(room, userId)) {
        room.members.push({
          user: new mongoose.Types.ObjectId(userId),
          role: "member",
          joinedAt: new Date(),
        });
        await room.save();
      }


      const targetSockets = await io.in(`user:${userId}`).fetchSockets();
if (targetSockets.length > 0 && targetSockets.every((s) => s.clientType === "mobile")) {
  return emitError(
    "control:error",
    "That user is on mobile. They can't hold the driver seat."
  );
}

      await cleanStaleDriver(room);

      // Case 1: already the driver.
      if (isDriver(room, userId)) {
        return socket.emit("control:error", {
          message: "You already hold the driver seat",
        });
      }

      // Case 2: seat is empty -> claim.
      if (!room.driver) {
        room.driver = new mongoose.Types.ObjectId(userId);
        room.driverDisconnectedAt = null;
        await room.save();
        cancelDriverTimer(roomId);
        await populateRoom(room);

        const idStr = room.driver._id.toString();
        const nameStr = room.driver.username;

        io.to(roomId).emit("driver:handoff", {
          nextDriverId: idStr,
          nextDriverName: nameStr,
          _id: idStr,
          id: idStr,
          username: nameStr,
        });

        io.to(roomId).emit("control:changed", {
          roomId,
          driver: room.driver,
          previousDriver: null,
          reason: "seat_claimed_when_free",
        });

        return;
      }

      // Case 3: seat is taken -> relay the request.
      await room.populate("driver", "username email avatar status");

      io.to(roomId).emit("control:requested", {
        roomId,
        requester: {
          id: socket.user.id,
          username: socket.user.username,
          email: socket.user.email,
        },
        currentDriver: {
          id: room.driver._id.toString(),
          username: room.driver.username,
          avatar: room.driver.avatar,
        },
      });
    } catch (error) {
      console.error("DRIVER REQUEST SEAT ERROR:", error);
      emitError("control:error", "Failed to request driver seat");
    }
  });

  /*
  |--------------------------------------------------------------------------
  | RELEASE SEAT (current driver -> seat becomes empty)
  |--------------------------------------------------------------------------
  */
  socket.on("driver:release_seat", async (data) => {
    try {
      const roomId = typeof data === "string" ? data : data?.roomId;
      if (!roomId) return emitError("control:error", "Room ID is required");

      const room = await Room.findById(roomId);
      const userId = getUserId();

      if (!room || !isDriver(room, userId)) return;

      room.driver = null;
      room.driverDisconnectedAt = null;
      await room.save();
      cancelDriverTimer(roomId);

      emitDriverReleased(roomId, userId, "driver_released");
    } catch (error) {
      console.error("DRIVER RELEASE SEAT ERROR:", error);
      emitError("control:error", "Failed to release driver seat");
    }
  });

  /*
  |--------------------------------------------------------------------------
  | APPROVE REQUEST (current driver -> transfer to requester)
  |--------------------------------------------------------------------------
  */
  socket.on("control:approve", async (data) => {
    try {
      const { roomId, userId } = data || {};

      if (!roomId || !userId) {
        return emitError("control:error", "Room ID and user ID are required");
      }

      if (socket.currentRoom !== roomId) {
        return emitError("control:error", "You are not inside this room");
      }


      /*
     * Refuse to transfer the seat to a mobile socket.
     * We look up the target user's sockets and check if any are mobile.
     */
    const targetSockets = await io.in(`user:${userId}`).fetchSockets();
    const mobileOnly = targetSockets.length > 0
      && targetSockets.every((s) => s.clientType === "mobile");

    if (mobileOnly) {
      return emitError(
        "control:error",
        "That user is on mobile. They can't hold the driver seat."
      );
    }


      const room = await Room.findById(roomId);
      if (!room) return emitError("control:error", "Room not found");

      await cleanStaleDriver(room);
      const currentUserId = getUserId();

      if (!isDriver(room, currentUserId)) {
        return emitError(
          "control:error",
          "Only the current driver can approve control requests"
        );
      }

      if (currentUserId === userId.toString()) {
        return emitError("control:error", "You already have control");
      }

      if (!isMember(room, userId)) {
        return emitError(
          "control:error",
          "User is not a member of this room"
        );
      }

      const previousDriver = room.driver;

      room.driver = new mongoose.Types.ObjectId(userId);
      room.driverDisconnectedAt = null;
      await room.save();
      cancelDriverTimer(roomId);

      await room.populate("driver", "username email avatar status");

      const idStr = room.driver._id.toString();
      const nameStr = room.driver.username;

      io.to(roomId).emit("driver:handoff", {
        nextDriverId: idStr,
        nextDriverName: nameStr,
        _id: idStr,
        id: idStr,
        username: nameStr,
      });

      io.to(roomId).emit("control:changed", {
        roomId,
        driver: room.driver,
        previousDriver,
        reason: "control_transferred",
      });
    } catch (error) {
      console.error("CONTROL APPROVE ERROR:", error);
      emitError("control:error", "Failed to approve control request");
    }
  });

  /*
  |--------------------------------------------------------------------------
  | REJECT REQUEST (current driver -> notify the requester)
  |--------------------------------------------------------------------------
  */
  socket.on("control:reject", async (data) => {
    try {
      const { roomId, userId } = data || {};

      if (!roomId || !userId) {
        return emitError("control:error", "Room ID and user ID are required");
      }

      if (socket.currentRoom !== roomId) {
        return emitError("control:error", "You are not inside this room");
      }

      const room = await Room.findById(roomId);
      if (!room) return emitError("control:error", "Room not found");

      await cleanStaleDriver(room);
      const currentUserId = getUserId();

      if (!isDriver(room, currentUserId)) {
        return emitError(
          "control:error",
          "Only the current driver can reject control requests"
        );
      }

      io.to(roomId).emit("control:rejected", {
        roomId,
        userId,
        rejectedBy: currentUserId,
      });
    } catch (error) {
      console.error("CONTROL REJECT ERROR:", error);
      emitError("control:error", "Failed to reject control request");
    }
  });

  /*
  |--------------------------------------------------------------------------
  | FILE FOCUS (driver -> room relay)
  |--------------------------------------------------------------------------
  |
  | Pure presence. No DB writes. Observers follow the driver's active file.
  |
  |--------------------------------------------------------------------------
  */
  socket.on("file:focus", (data) => {
    try {
      const { roomId, fileId } = data || {};
      if (!roomId) return;
      if (socket.currentRoom !== String(roomId)) return;

      socket.to(roomId).emit("file:focus", {
        fileId: fileId ? String(fileId) : null,
        fromUserId: socket.user.id,
        fromUsername: socket.user.username,
        at: Date.now(),
      });
    } catch {
      // best-effort
    }
  });

  /*
  |--------------------------------------------------------------------------
  | DISCONNECT (grace period for driver only)
  |--------------------------------------------------------------------------
  |
  | Disconnect != leave. The driver gets 2 minutes to reconnect before
  | their seat is released. Non-drivers just drop presence.
  |
  |--------------------------------------------------------------------------
  */
  socket.on("disconnect", async () => {
    try {
      const roomId = socket.currentRoom;
      if (!roomId) return;

      const room = await Room.findById(roomId);
      if (!room) return;

      const userId = getUserId();

      if (isDriver(room, userId)) {
        room.driverDisconnectedAt = new Date();
        await room.save();
        scheduleDriverExpiration(room);

        io.to(roomId).emit("control:driver-disconnected", {
          roomId,
          driver: userId,
          gracePeriod: DRIVER_GRACE_PERIOD_MS,
        });
      }

      io.to(roomId).emit("room:user-left", {
        roomId,
        userId,
        temporary: true,
      });
    } catch (error) {
      console.error("SOCKET DISCONNECT ERROR:", error);
    }
  });
};