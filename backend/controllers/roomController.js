// backend/controllers/roomController.js
const mongoose = require("mongoose");
const Room = require("../models/Room");

const DRIVER_GRACE_PERIOD_MS = 2 * 60 * 1000;

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const isMember = (room, userId) => {
  return room.members.some((member) => {
    const memberId = member.user?._id || member.user;
    return memberId && memberId.toString() === userId.toString();
  });
};

const isOwner = (room, userId) => {
  const ownerId = room.owner?._id || room.owner;
  return ownerId && ownerId.toString() === userId.toString();
};

const isOwnerOrAdmin = (room, userId) => {
  if (isOwner(room, userId)) return true;

  const member = room.members.find((member) => {
    const memberId = member.user?._id || member.user;
    return memberId && memberId.toString() === userId.toString();
  });

  return member?.role === "admin";
};

const isDriver = (room, userId) => {
  if (!room.driver) return false;
  const driverId = room.driver?._id || room.driver;
  return driverId && driverId.toString() === userId.toString();
};

/*
|--------------------------------------------------------------------------
| EXPIRE DISCONNECTED DRIVER
|--------------------------------------------------------------------------
*/

const expireDisconnectedDriver = async (room) => {
  if (!room.driver || !room.driverDisconnectedAt) return false;

  const elapsed =
    Date.now() - new Date(room.driverDisconnectedAt).getTime();

  if (elapsed < DRIVER_GRACE_PERIOD_MS) return false;

  room.driver = null;
  room.driverDisconnectedAt = null;
  await room.save();
  return true;
};

/*
|--------------------------------------------------------------------------
| POPULATE ROOM
|--------------------------------------------------------------------------
*/

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
| BROADCAST ROOM LIST CHANGE
|--------------------------------------------------------------------------
|
| Notifies every connected socket that the public room list changed.
| The lobby listens for this and refreshes its search results.
|
|--------------------------------------------------------------------------
*/

const broadcastRoomListChange = (req, payload) => {
  const io = req.app.get("io");
  if (io) {
    io.emit("rooms:list-changed", payload);
  }
};

/*
|--------------------------------------------------------------------------
| CREATE ROOM
|--------------------------------------------------------------------------
*/

const createRoom = async (req, res) => {
  try {
    const { name, description, language, isPrivate, settings } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Room name is required" });
    }

    let roomSettings = {
      access: "public",
      requireJoinApproval: false,
      allowChat: true,
      allowControlRequests: true,
      allowMultipleDrivers: false,
      autoAssignDriver: false,
      allowMembersToInvite: false,
    };

    // Backward compatibility.
    if (isPrivate === true) {
      roomSettings.access = "private";
      roomSettings.requireJoinApproval = true;
    }

    if (settings && typeof settings === "object") {
      roomSettings = { ...roomSettings, ...settings };
    }

    if (roomSettings.access === "private") {
      roomSettings.requireJoinApproval = true;
    }

    const room = await Room.create({
      name: name.trim(),
      description: description || "",
      owner: req.user.id,
      driver: req.user.id,
      driverDisconnectedAt: null,
      members: [{ user: req.user.id, role: "owner" }],
      language: language || "javascript",
      settings: roomSettings,
    });

    await populateRoom(room);

    // Notify the lobby — new public room is available.
    if (room.settings.access === "public") {
      broadcastRoomListChange(req, {
        reason: "created",
        roomId: String(room._id),
        room: room.toObject ? room.toObject() : room,
      });
    }

    res.status(201).json({
      message: "Room created successfully",
      room,
    });
  } catch (error) {
    console.error("CREATE ROOM ERROR:", error);
    res.status(500).json({
      message: "Failed to create room",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET MY ROOMS
|--------------------------------------------------------------------------
*/

const getMyRooms = async (req, res) => {
  try {
    const rooms = await Room.find({ "members.user": req.user.id })
      .populate("owner", "username email avatar status")
      .populate("members.user", "username email avatar status")
      .populate("driver", "username email avatar status")
      .sort({ updatedAt: -1 });

    for (const room of rooms) {
      await expireDisconnectedDriver(room);
    }

    res.json(rooms);
  } catch (error) {
    console.error("GET MY ROOMS ERROR:", error);
    res.status(500).json({
      message: "Failed to get rooms",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| SEARCH ROOMS
|--------------------------------------------------------------------------
|
| Public discoverable rooms. Substring match on name and description.
|
|--------------------------------------------------------------------------
*/

const searchRooms = async (req, res) => {
  try {
    const q = (req.query.q || "").trim();

    const filter = { "settings.access": "public" };

    if (q) {
      // Escape regex special characters so a user searching for "a.b" doesn't
      // accidentally trigger regex semantics.
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rx = new RegExp(escaped, "i");
      filter.$or = [{ name: rx }, { description: rx }];
    }

    const rooms = await Room.find(filter)
      .populate("owner", "username avatar status")
      .populate("members.user", "username avatar status")
      .populate("driver", "username avatar status")
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();

    res.json(rooms);
  } catch (error) {
    console.error("SEARCH ROOMS ERROR:", error);
    res.status(500).json({
      message: "Failed to search rooms",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| PEEK ROOM (public, no membership required)
|--------------------------------------------------------------------------
|
| Used by the /join/:roomId invite page to render "You're invited to X"
| before the user has authenticated or become a member.
|
|--------------------------------------------------------------------------
*/

const peekRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id)
      .select("name description language settings.access owner")
      .populate("owner", "username avatar")
      .lean();

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    res.json({
      _id: room._id,
      name: room.name,
      description: room.description,
      language: room.language,
      access: room.settings?.access || "public",
      owner: room.owner,
    });
  } catch (error) {
    console.error("PEEK ROOM ERROR:", error);
    res.status(500).json({ message: "Failed to peek room" });
  }
};

/*
|--------------------------------------------------------------------------
| GET ROOM
|--------------------------------------------------------------------------
*/

const getRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    await expireDisconnectedDriver(room);

    if (
      room.settings.access === "private" &&
      !isMember(room, req.user.id)
    ) {
      return res.status(403).json({ message: "This is a private room" });
    }

    await populateRoom(room);
    res.json(room);
  } catch (error) {
    console.error("GET ROOM ERROR:", error);
    res.status(500).json({
      message: "Failed to get room",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| JOIN ROOM
|--------------------------------------------------------------------------
*/

const joinRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    await expireDisconnectedDriver(room);

    if (isMember(room, req.user.id)) {
      return res.status(400).json({
        message: "You are already a member of this room",
      });
    }

    if (
      room.settings.access === "private" ||
      room.settings.requireJoinApproval
    ) {
      const existingRequest = room.joinRequests.find(
        (request) =>
          request.user.toString() === req.user.id.toString() &&
          request.status === "pending"
      );

      if (existingRequest) {
        return res.status(400).json({
          message: "You already have a pending join request",
        });
      }

      room.joinRequests.push({
        user: req.user.id,
        status: "pending",
        requestedAt: new Date(),
      });

      await room.save();

      return res.status(202).json({
        message: "Join request sent. Waiting for approval.",
        status: "pending",
        roomId: room._id,
      });
    }

    room.members.push({
      user: req.user.id,
      role: "member",
      joinedAt: new Date(),
    });

    await room.save();
    await populateRoom(room);

    res.status(200).json({
      message: "Joined room successfully",
      room,
    });
  } catch (error) {
    console.error("JOIN ROOM ERROR:", error);
    res.status(500).json({
      message: "Failed to join room",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET JOIN REQUESTS
|--------------------------------------------------------------------------
*/

const getJoinRequests = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id)
      .populate("joinRequests.user", "username email avatar status")
      .populate("joinRequests.reviewedBy", "username email avatar");

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    if (!isOwnerOrAdmin(room, req.user.id)) {
      return res.status(403).json({
        message: "Only the owner or admin can view join requests",
      });
    }

    const pendingRequests = room.joinRequests.filter(
      (request) => request.status === "pending"
    );

    res.json(pendingRequests);
  } catch (error) {
    console.error("GET JOIN REQUESTS ERROR:", error);
    res.status(500).json({
      message: "Failed to get join requests",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| APPROVE JOIN REQUEST
|--------------------------------------------------------------------------
*/

const approveJoinRequest = async (req, res) => {
  try {
    const { id, userId } = req.params;
    const room = await Room.findById(id);

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    if (!isOwnerOrAdmin(room, req.user.id)) {
      return res.status(403).json({
        message: "Only the owner or admin can approve users",
      });
    }

    if (isMember(room, userId)) {
      return res.status(400).json({
        message: "User is already a member of this room",
      });
    }

    const request = room.joinRequests.find(
      (request) =>
        request.user.toString() === userId.toString() &&
        request.status === "pending"
    );

    if (!request) {
      return res.status(404).json({
        message: "Pending join request not found",
      });
    }

    room.members.push({
      user: new mongoose.Types.ObjectId(userId),
      role: "member",
      joinedAt: new Date(),
    });

    request.status = "approved";
    request.reviewedAt = new Date();
    request.reviewedBy = req.user.id;

    await room.save();
    await populateRoom(room);

    // Notify the requester's client that they were approved.
    // (Requester can listen for this and redirect to the workspace.)
    const io = req.app.get("io");
    if (io) {
      io.emit("room:join-approved", {
        roomId: String(room._id),
        userId: String(userId),
      });
    }

    res.json({
      message: "User approved successfully",
      room,
    });
  } catch (error) {
    console.error("APPROVE JOIN REQUEST ERROR:", error);
    res.status(500).json({
      message: "Failed to approve join request",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| REJECT JOIN REQUEST
|--------------------------------------------------------------------------
*/

const rejectJoinRequest = async (req, res) => {
  try {
    const { id, userId } = req.params;
    const room = await Room.findById(id);

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    if (!isOwnerOrAdmin(room, req.user.id)) {
      return res.status(403).json({
        message: "Only the owner or admin can reject users",
      });
    }

    const request = room.joinRequests.find(
      (request) =>
        request.user.toString() === userId.toString() &&
        request.status === "pending"
    );

    if (!request) {
      return res.status(404).json({
        message: "Pending join request not found",
      });
    }

    request.status = "rejected";
    request.reviewedAt = new Date();
    request.reviewedBy = req.user.id;

    await room.save();

    // Notify the requester.
    const io = req.app.get("io");
    if (io) {
      io.emit("room:join-rejected", {
        roomId: String(room._id),
        userId: String(userId),
      });
    }

    res.json({ message: "Join request rejected" });
  } catch (error) {
    console.error("REJECT JOIN REQUEST ERROR:", error);
    res.status(500).json({
      message: "Failed to reject join request",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| UPDATE ROOM SETTINGS
|--------------------------------------------------------------------------
*/

const updateRoomSettings = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const isAuthorized =
      isOwnerOrAdmin(room, req.user.id) || isDriver(room, req.user.id);

    if (!isAuthorized) {
      return res.status(403).json({
        message:
          "Only the active driver, owner, or admin can change room settings",
      });
    }

    const previousAccess = room.settings.access;

    const {
      access,
      requireJoinApproval,
      allowChat,
      allowControlRequests,
      allowMultipleDrivers,
      autoAssignDriver,
      allowMembersToInvite,
      language,
    } = req.body;

    if (
      access !== undefined &&
      !["public", "private"].includes(access)
    ) {
      return res.status(400).json({
        message: "Invalid room access type",
      });
    }

    if (
      language !== undefined &&
      typeof language === "string" &&
      language.trim()
    ) {
      room.language = language.trim().toLowerCase();
    }

    if (access !== undefined) room.settings.access = access;
    if (requireJoinApproval !== undefined) {
      room.settings.requireJoinApproval = Boolean(requireJoinApproval);
    }
    if (allowChat !== undefined) {
      room.settings.allowChat = Boolean(allowChat);
    }
    if (allowControlRequests !== undefined) {
      room.settings.allowControlRequests = Boolean(allowControlRequests);
    }
    if (allowMultipleDrivers !== undefined) {
      room.settings.allowMultipleDrivers = Boolean(allowMultipleDrivers);
    }
    if (autoAssignDriver !== undefined) {
      room.settings.autoAssignDriver = Boolean(autoAssignDriver);
    }
    if (allowMembersToInvite !== undefined) {
      room.settings.allowMembersToInvite = Boolean(allowMembersToInvite);
    }

    if (room.settings.access === "private") {
      room.settings.requireJoinApproval = true;
    }

    await room.save();
    await populateRoom(room);

    // Notify the lobby if the room's visibility changed.
    if (
      previousAccess !== room.settings.access ||
      room.settings.access === "public"
    ) {
      broadcastRoomListChange(req, {
        reason:
          previousAccess !== room.settings.access
            ? "access-changed"
            : "updated",
        roomId: String(room._id),
        room: room.toObject ? room.toObject() : room,
      });
    }

    res.json({
      message: "Room settings updated successfully",
      room,
    });
  } catch (error) {
    console.error("UPDATE ROOM SETTINGS ERROR:", error);
    res.status(500).json({
      message: "Failed to update room settings",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| LEAVE ROOM
|--------------------------------------------------------------------------
*/

const leaveRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    if (!isMember(room, req.user.id)) {
      return res.status(400).json({
        message: "You are not a member of this room",
      });
    }

    if (isOwner(room, req.user.id)) {
      return res.status(400).json({
        message: "Room owner cannot leave the room. Delete the room instead.",
      });
    }

    if (isDriver(room, req.user.id)) {
      room.driver = null;
      room.driverDisconnectedAt = null;
    }

    room.members = room.members.filter(
      (member) =>
        member.user.toString() !== req.user.id.toString()
    );

    await room.save();
    res.json({ message: "Left room successfully" });
  } catch (error) {
    console.error("LEAVE ROOM ERROR:", error);
    res.status(500).json({
      message: "Failed to leave room",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| DELETE ROOM
|--------------------------------------------------------------------------
*/

const deleteRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    if (!isOwner(room, req.user.id)) {
      return res.status(403).json({
        message: "Only the owner can delete the room",
      });
    }

    const roomId = String(room._id);
    const wasPublic = room.settings.access === "public";

    await room.deleteOne();

    if (wasPublic) {
      broadcastRoomListChange(req, {
        reason: "deleted",
        roomId,
      });
    }

    res.json({ message: "Room deleted successfully" });
  } catch (error) {
    console.error("DELETE ROOM ERROR:", error);
    res.status(500).json({
      message: "Failed to delete room",
      error: error.message,
    });
  }
};

module.exports = {
  createRoom,
  getMyRooms,
  searchRooms,
  peekRoom,
  getRoom,
  joinRoom,
  getJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
  updateRoomSettings,
  leaveRoom,
  deleteRoom,

  // Used by roomSocket
  isMember,
  isOwner,
  isOwnerOrAdmin,
  isDriver,
  expireDisconnectedDriver,
  populateRoom,
  DRIVER_GRACE_PERIOD_MS,
};