const Message = require("../models/Message");
const Room = require("../models/Room");

module.exports = (io, socket) => {
  /*
  |--------------------------------------------------------------------------
  | SEND CHAT MESSAGE
  |--------------------------------------------------------------------------
  */

  socket.on("chat:send", async (data) => {
    try {
      const { roomId, text } = data || {};

      /*
       * Validate input
       */

      if (!roomId) {
        return socket.emit("chat:error", {
          message: "Room ID is required",
        });
      }

      if (
        typeof text !== "string" ||
        !text.trim()
      ) {
        return socket.emit("chat:error", {
          message: "Message cannot be empty",
        });
      }

      if (text.trim().length > 5000) {
        return socket.emit("chat:error", {
          message:
            "Message cannot exceed 5000 characters",
        });
      }

      /*
       * User must actually be inside the
       * Socket.IO room.
       */

      if (socket.currentRoom !== roomId) {
        return socket.emit("chat:error", {
          message:
            "You are not inside this room",
        });
      }

      /*
       * Get room
       */

      const room =
        await Room.findById(roomId);

      if (!room) {
        return socket.emit("chat:error", {
          message: "Room not found",
        });
      }

      /*
       * Check database membership.
       */

      const isMember = room.members.some(
        (member) =>
          member.user.toString() ===
          socket.user.id.toString()
      );

      if (!isMember) {
        return socket.emit("chat:error", {
          message:
            "You are not a member of this room",
        });
      }

      /*
       * Check room chat setting.
       */

      if (!room.settings.allowChat) {
        return socket.emit("chat:error", {
          message:
            "Chat is disabled in this room",
        });
      }

      /*
       * Create message
       */

      const message =
        await Message.create({
          room: roomId,
          sender: socket.user.id,
          text: text.trim(),
        });

      /*
       * Populate sender information.
       */

      await message.populate(
        "sender",
        "username avatar"
      );

      /*
       * Message payload sent to clients.
       */

      const messageData = {
        id: message._id,
        roomId,
        sender: {
          id: message.sender._id,
          username:
            message.sender.username,
          avatar: message.sender.avatar,
        },
        text: message.text,
        createdAt: message.createdAt,
      };

      /*
       * Broadcast to everyone in room,
       * including sender.
       */

      io.to(roomId).emit(
        "chat:message",
        messageData
      );
    } catch (error) {
      console.error(
        "CHAT SEND ERROR:",
        error
      );

      socket.emit("chat:error", {
        message:
          "Failed to send message",
      });
    }
  });
};