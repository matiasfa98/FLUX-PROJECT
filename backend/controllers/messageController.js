const Message = require("../models/Message");
const Room = require("../models/Room");


// ======================================
// GET ROOM MESSAGES
// ======================================

const getRoomMessages = async (req, res) => {
  try {

    const roomId = req.params.id;


    // Find room

    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({
        message: "Room not found"
      });
    }


    // Check membership

    const isMember = room.members.some(
      member =>
        member.user.toString() === req.user.id
    );


    if (!isMember) {
      return res.status(403).json({
        message: "You are not a member of this room"
      });
    }


    // Get messages

    const messages = await Message
      .find({ room: roomId })
      .populate(
        "sender",
        "username avatar"
      )
      .sort({
        createdAt: 1
      });


    res.status(200).json({
      messages
    });

  } catch (error) {

    console.error(
      "Get messages error:",
      error
    );

    res.status(500).json({
      message: "Server error"
    });
  }
};


module.exports = {
  getRoomMessages
};