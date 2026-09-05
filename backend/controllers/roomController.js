const Room = require("../models/Room");
const User = require("../models/User");


// ======================================
// CREATE ROOM
// ======================================

const createRoom = async (req, res) => {
  try {

    const {
      name,
      description,
      language,
      isPrivate
    } = req.body;


    if (!name) {
      return res.status(400).json({
        message: "Room name is required"
      });
    }


    const room = await Room.create({
  name,
  description,
  owner: req.user.id,

  // Room creator starts as the driver
  driver: req.user.id,

  members: [
    {
      user: req.user.id,
      role: "owner"
    }
  ],

  language,
  isPrivate
});


    const populatedRoom = await Room
      .findById(room._id)
      .populate("owner", "username email avatar")
      .populate("members.user", "username email avatar");


    res.status(201).json({
      message: "Room created successfully",
      room: populatedRoom
    });

  } catch (error) {

    console.error("Create room error:", error);

    res.status(500).json({
      message: "Server error"
    });
  }
};


// ======================================
// GET MY ROOMS
// ======================================

const getMyRooms = async (req, res) => {
  try {

    const rooms = await Room
      .find({
        "members.user": req.user.id
      })
      .populate("owner", "username email avatar")
      .populate("members.user", "username email avatar")
      .sort({
        updatedAt: -1
      });


    res.status(200).json({
      rooms
    });

  } catch (error) {

    console.error("Get rooms error:", error);

    res.status(500).json({
      message: "Server error"
    });
  }
};


// ======================================
// GET SINGLE ROOM
// ======================================

const getRoom = async (req, res) => {
  try {

    const room = await Room
      .findById(req.params.id)
      .populate("owner", "username email avatar")
      .populate("members.user", "username email avatar");


    if (!room) {
      return res.status(404).json({
        message: "Room not found"
      });
    }


    // Check membership

    const isMember = room.members.some(
      member =>
        member.user._id.toString() === req.user.id
    );


    if (!isMember) {
      return res.status(403).json({
        message: "You are not a member of this room"
      });
    }


    res.status(200).json({
      room
    });

  } catch (error) {

    console.error("Get room error:", error);

    res.status(500).json({
      message: "Server error"
    });
  }
};


// ======================================
// JOIN ROOM
// ======================================

const joinRoom = async (req, res) => {
  try {

    const room = await Room.findById(
      req.params.id
    );


    if (!room) {
      return res.status(404).json({
        message: "Room not found"
      });
    }


    // Check if already member

    const alreadyMember = room.members.some(
      member =>
        member.user.toString() === req.user.id
    );


    if (alreadyMember) {
      return res.status(400).json({
        message: "You are already a member of this room"
      });
    }


    room.members.push({
      user: req.user.id,
      role: "member"
    });


    await room.save();


    const updatedRoom = await Room
      .findById(room._id)
      .populate("owner", "username email avatar")
      .populate("members.user", "username email avatar");


    res.status(200).json({
      message: "Joined room successfully",
      room: updatedRoom
    });

  } catch (error) {

    console.error("Join room error:", error);

    res.status(500).json({
      message: "Server error"
    });
  }
};


// ======================================
// LEAVE ROOM
// ======================================

const leaveRoom = async (req, res) => {
  try {

    const room = await Room.findById(
      req.params.id
    );


    if (!room) {
      return res.status(404).json({
        message: "Room not found"
      });
    }


    // Owner cannot leave

    if (room.owner.toString() === req.user.id) {
      return res.status(400).json({
        message: "Room owner cannot leave the room"
      });
    }


    room.members = room.members.filter(
      member =>
        member.user.toString() !== req.user.id
    );


    await room.save();


    res.status(200).json({
      message: "Left room successfully"
    });

  } catch (error) {

    console.error("Leave room error:", error);

    res.status(500).json({
      message: "Server error"
    });
  }
};


// ======================================
// DELETE ROOM
// ======================================

const deleteRoom = async (req, res) => {
  try {

    const room = await Room.findById(
      req.params.id
    );


    if (!room) {
      return res.status(404).json({
        message: "Room not found"
      });
    }


    // Only owner

    if (room.owner.toString() !== req.user.id) {
      return res.status(403).json({
        message: "Only the room owner can delete it"
      });
    }


    await Room.findByIdAndDelete(
      room._id
    );


    res.status(200).json({
      message: "Room deleted successfully"
    });

  } catch (error) {

    console.error("Delete room error:", error);

    res.status(500).json({
      message: "Server error"
    });
  }
};


module.exports = {
  createRoom,
  getMyRooms,
  getRoom,
  joinRoom,
  leaveRoom,
  deleteRoom
};