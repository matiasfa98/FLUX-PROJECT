const Room = require("../models/Room");

// Check if a user is a member of a room
const isMember = (room, userId) => {
  return room.members.some(
    (member) => member.user.toString() === userId.toString()
  );
};

// Check if a user is owner
const isOwner = (room, userId) => {
  return room.owner.toString() === userId.toString();
};

// Check if a user is owner or admin
const isOwnerOrAdmin = (room, userId) => {
  if (isOwner(room, userId)) {
    return true;
  }

  const member = room.members.find(
    (member) => member.user.toString() === userId.toString()
  );

  return member?.role === "admin";
};

/*
|--------------------------------------------------------------------------
| CREATE ROOM
|--------------------------------------------------------------------------
*/

const createRoom = async (req, res) => {
  try {
    const {
      name,
      description,
      language,
      isPrivate,
      settings,
    } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "Room name is required",
      });
    }

    // Support old frontend using isPrivate
    let roomSettings = {
      access: "public",
      requireJoinApproval: false,
      allowChat: true,
      allowControlRequests: true,
      allowMultipleDrivers: false,
      autoAssignDriver: false,
      allowMembersToInvite: false,
    };

    if (isPrivate === true) {
      roomSettings.access = "private";
      roomSettings.requireJoinApproval = true;
    }

    // New settings override defaults
    if (settings) {
      roomSettings = {
        ...roomSettings,
        ...settings,
      };
    }

    // Private rooms should require approval
    if (roomSettings.access === "private") {
      roomSettings.requireJoinApproval = true;
    }

    const room = await Room.create({
      name,
      description: description || "",
      owner: req.user.id,

      // Creator automatically becomes driver
      driver: req.user.id,

      // Creator automatically becomes member
      members: [
        {
          user: req.user.id,
          role: "owner",
        },
      ],

      language: language || "javascript",

      settings: roomSettings,
    });

    await room.populate([
      {
        path: "owner",
        select: "username email avatar status",
      },
      {
        path: "members.user",
        select: "username email avatar status",
      },
      {
        path: "driver",
        select: "username email avatar status",
      },
    ]);

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
    const rooms = await Room.find({
      "members.user": req.user.id,
    })
      .populate("owner", "username email avatar status")
      .populate("members.user", "username email avatar status")
      .populate("driver", "username email avatar status")
      .sort({ updatedAt: -1 });

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
| GET ROOM
|--------------------------------------------------------------------------
*/

const getRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id)
      .populate("owner", "username email avatar status")
      .populate("members.user", "username email avatar status")
      .populate("driver", "username email avatar status");

    if (!room) {
      return res.status(404).json({
        message: "Room not found",
      });
    }

    // Private rooms should not expose room details
    // to users who are not members.
    if (
      room.settings.access === "private" &&
      !isMember(room, req.user.id)
    ) {
      return res.status(403).json({
        message: "This is a private room",
      });
    }

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
|
| PUBLIC:
|   User becomes a member immediately.
|
| PRIVATE:
|   User creates a join request.
|   Owner/admin must approve.
|
|--------------------------------------------------------------------------
*/

const joinRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        message: "Room not found",
      });
    }

    // Already a member
    if (isMember(room, req.user.id)) {
      return res.status(400).json({
        message: "You are already a member of this room",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | PRIVATE ROOM
    |--------------------------------------------------------------------------
    */

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
      });

      await room.save();

      return res.status(202).json({
        message: "Join request sent. Waiting for approval.",
        status: "pending",
        roomId: room._id,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | PUBLIC ROOM
    |--------------------------------------------------------------------------
    */

    room.members.push({
      user: req.user.id,
      role: "member",
    });

    await room.save();

    await room.populate([
      {
        path: "owner",
        select: "username email avatar status",
      },
      {
        path: "members.user",
        select: "username email avatar status",
      },
      {
        path: "driver",
        select: "username email avatar status",
      },
    ]);

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
|
| Only owner/admin can see these.
|
|--------------------------------------------------------------------------
*/

const getJoinRequests = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id)
      .populate(
        "joinRequests.user",
        "username email avatar status"
      )
      .populate(
        "joinRequests.reviewedBy",
        "username email avatar"
      );

    if (!room) {
      return res.status(404).json({
        message: "Room not found",
      });
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
      return res.status(404).json({
        message: "Room not found",
      });
    }

    if (!isOwnerOrAdmin(room, req.user.id)) {
      return res.status(403).json({
        message: "Only the owner or admin can approve users",
      });
    }

    // Check if already member
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

    // Add user to members
    room.members.push({
      user: userId,
      role: "member",
    });

    // Update request
    request.status = "approved";
    request.reviewedAt = new Date();
    request.reviewedBy = req.user.id;

    await room.save();

    await room.populate([
      {
        path: "owner",
        select: "username email avatar status",
      },
      {
        path: "members.user",
        select: "username email avatar status",
      },
      {
        path: "driver",
        select: "username email avatar status",
      },
    ]);

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
      return res.status(404).json({
        message: "Room not found",
      });
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

    res.json({
      message: "Join request rejected",
    });
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
      return res.status(404).json({
        message: "Room not found",
      });
    }

    if (!isOwnerOrAdmin(room, req.user.id)) {
      return res.status(403).json({
        message: "Only the owner or admin can change room settings",
      });
    }

    const {
      access,
      requireJoinApproval,
      allowChat,
      allowControlRequests,
      allowMultipleDrivers,
      autoAssignDriver,
      allowMembersToInvite,
    } = req.body;

    /*
     * Validate access
     */

    if (
      access !== undefined &&
      !["public", "private"].includes(access)
    ) {
      return res.status(400).json({
        message: "Invalid room access type",
      });
    }

    /*
     * Update only fields that were provided.
     */

    if (access !== undefined) {
      room.settings.access = access;
    }

    if (requireJoinApproval !== undefined) {
      room.settings.requireJoinApproval = Boolean(
        requireJoinApproval
      );
    }

    if (allowChat !== undefined) {
      room.settings.allowChat = Boolean(allowChat);
    }

    if (allowControlRequests !== undefined) {
      room.settings.allowControlRequests = Boolean(
        allowControlRequests
      );
    }

    if (allowMultipleDrivers !== undefined) {
      room.settings.allowMultipleDrivers = Boolean(
        allowMultipleDrivers
      );
    }

    if (autoAssignDriver !== undefined) {
      room.settings.autoAssignDriver = Boolean(
        autoAssignDriver
      );
    }

    if (allowMembersToInvite !== undefined) {
      room.settings.allowMembersToInvite = Boolean(
        allowMembersToInvite
      );
    }

    /*
     * Private rooms automatically require approval.
     */

    if (room.settings.access === "private") {
      room.settings.requireJoinApproval = true;
    }

    /*
     * Flux MVP currently supports one driver.
     *
     * If multiple drivers are disabled, we keep only
     * the current driver.
     */

    if (!room.settings.allowMultipleDrivers && room.driver) {
      // Nothing else needed because Room.driver already
      // stores only one driver.
    }

    await room.save();

    await room.populate([
      {
        path: "owner",
        select: "username email avatar status",
      },
      {
        path: "members.user",
        select: "username email avatar status",
      },
      {
        path: "driver",
        select: "username email avatar status",
      },
    ]);

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
      return res.status(404).json({
        message: "Room not found",
      });
    }

    if (!isMember(room, req.user.id)) {
      return res.status(400).json({
        message: "You are not a member of this room",
      });
    }

    // Owner cannot leave
    if (isOwner(room, req.user.id)) {
      return res.status(400).json({
        message: "Room owner cannot leave the room. Delete the room instead.",
      });
    }

    /*
     * If the leaving member is currently the driver,
     * release control.
     */

    if (
      room.driver &&
      room.driver.toString() === req.user.id.toString()
    ) {
      room.driver = null;
    }

    room.members = room.members.filter(
      (member) =>
        member.user.toString() !== req.user.id.toString()
    );

    await room.save();

    res.json({
      message: "Left room successfully",
    });
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
      return res.status(404).json({
        message: "Room not found",
      });
    }

    if (!isOwner(room, req.user.id)) {
      return res.status(403).json({
        message: "Only the owner can delete the room",
      });
    }

    await room.deleteOne();

    res.json({
      message: "Room deleted successfully",
    });
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
  getRoom,
  joinRoom,
  getJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
  updateRoomSettings,
  leaveRoom,
  deleteRoom,
};