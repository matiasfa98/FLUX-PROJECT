const Message = require("../models/Message");
const Room = require("../models/Room");

/*
|--------------------------------------------------------------------------
| GET ROOM MESSAGES
|--------------------------------------------------------------------------
*/

const getRoomMessages = async (req, res) => {
  try {
    const roomId = req.params.id;

    /*
     * Find room
     */

    const room =
      await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({
        message: "Room not found",
      });
    }

    /*
     * Check membership
     */

    const isMember = room.members.some(
      (member) =>
        member.user.toString() ===
        req.user.id.toString()
    );

    if (!isMember) {
      return res.status(403).json({
        message:
          "You are not a member of this room",
      });
    }

    /*
     * Check whether chat is enabled.
     */

    if (!room.settings.allowChat) {
      return res.status(403).json({
        message:
          "Chat is disabled in this room",
      });
    }

    /*
     * Get messages.
     */

    const messages =
      await Message.find({
        room: roomId,
      })
        .populate(
          "sender",
          "username avatar"
        )
        .sort({
          createdAt: 1,
        });

    res.json(messages);
  } catch (error) {
    console.error(
      "GET ROOM MESSAGES ERROR:",
      error
    );

    res.status(500).json({
      message:
        "Failed to get room messages",
      error: error.message,
    });
  }
};

module.exports = {
  getRoomMessages,
};