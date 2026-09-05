const Room = require("../models/Room");
const Message = require("../models/Message");

module.exports = (io, socket) => {
  socket.on("chat:send", async ({ roomId, text }) => {
    try {
      if (!roomId || !text?.trim()) {
        return socket.emit("chat:error", {
          message: "Room ID and message are required"
        });
      }

      // Find room
      const room = await Room.findById(roomId);

      if (!room) {
        return socket.emit("chat:error", {
          message: "Room not found"
        });
      }

      // Check membership
      const isMember = room.members.some(
        (member) =>
          member.user.toString() === socket.user.id.toString()
      );

      if (!isMember) {
        return socket.emit("chat:error", {
          message: "You are not a member of this room"
        });
      }

      // Create message
      const message = await Message.create({
        room: roomId,
        sender: socket.user.id,
        text: text.trim()
      });

      // Get sender information
      await message.populate(
        "sender",
        "username avatar"
      );

      // Send to everyone in room
      io.to(roomId).emit("chat:message", {
        id: message._id,
        roomId,
        sender: {
          id: message.sender._id,
          username: message.sender.username,
          avatar: message.sender.avatar
        },
        text: message.text,
        createdAt: message.createdAt
      });

      console.log(
        `💬 ${socket.user.username}: ${message.text}`
      );

    } catch (error) {
      console.error("Chat send error:", error);

      socket.emit("chat:error", {
        message: "Failed to send message"
      });
    }
  });
};