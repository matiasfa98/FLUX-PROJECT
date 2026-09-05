const Room = require("../models/Room");

const roomSocket = (io, socket) => {
  console.log(`Room socket registered for ${socket.user.username}`);

  /*
  ==========================================
  JOIN ROOM
  ==========================================
  */

  socket.on("room:join", async ({ roomId }) => {
    try {
      if (!roomId) {
        return socket.emit("room:error", {
          message: "Room ID is required",
        });
      }

      const room = await Room.findById(roomId);

      if (!room) {
        return socket.emit("room:error", {
          message: "Room not found",
        });
      }

      // Check membership
      const isMember = room.members.some(
        (member) =>
          member.user.toString() === socket.user.id
      );

      if (!isMember) {
        return socket.emit("room:error", {
          message: "You are not a member of this room",
        });
      }

      // Leave previous room if the socket was already inside one
      if (socket.currentRoom) {
        socket.leave(socket.currentRoom);
      }

      // Join new room
      socket.join(roomId);

      socket.currentRoom = roomId;

      console.log(
        `${socket.user.username} joined room ${roomId}`
      );

      /*
      IMPORTANT:

      We DO NOT automatically assign a driver here.

      If the room has no driver:
          driver = null

      The user must explicitly receive control.
      */

      await room.populate("driver", "username email avatar");

      socket.emit("room:joined", {
        roomId: room._id,
        message: "Joined room successfully",
        driver: room.driver || null,
      });

      // Tell everyone else
      socket.to(roomId).emit("room:user-joined", {
        user: {
          id: socket.user.id,
          username: socket.user.username,
        },
      });
    } catch (error) {
      console.error("room:join error:", error);

      socket.emit("room:error", {
        message: "Failed to join room",
      });
    }
  });

  /*
  ==========================================
  LEAVE ROOM
  ==========================================
  */

  socket.on("room:leave", async ({ roomId }) => {
    try {
      if (!roomId) {
        return socket.emit("room:error", {
          message: "Room ID is required",
        });
      }

      const room = await Room.findById(roomId);

      if (!room) {
        return socket.emit("room:error", {
          message: "Room not found",
        });
      }

      /*
      If the person leaving is the driver,
      release the driver slot.
      */

      if (
        room.driver &&
        room.driver.toString() === socket.user.id
      ) {
        room.driver = null;

        await room.save();

        io.to(roomId).emit("control:released", {
          roomId,
          driver: null,
          reason: "driver_left",
        });
      }

      socket.to(roomId).emit("room:user-left", {
        user: {
          id: socket.user.id,
          username: socket.user.username,
        },
      });

      socket.leave(roomId);

      socket.currentRoom = null;

      socket.emit("room:left", {
        roomId,
        message: "Left room successfully",
      });
    } catch (error) {
      console.error("room:leave error:", error);

      socket.emit("room:error", {
        message: "Failed to leave room",
      });
    }
  });

  /*
  ==========================================
  REQUEST CONTROL
  ==========================================
  */

  socket.on("control:request", async ({ roomId }) => {
    try {
      if (!roomId) {
        return socket.emit("control:error", {
          message: "Room ID is required",
        });
      }

      const room = await Room.findById(roomId);

      if (!room) {
        return socket.emit("control:error", {
          message: "Room not found",
        });
      }

      // Must be inside the Socket.IO room
      if (!socket.rooms.has(roomId)) {
        return socket.emit("control:error", {
          message: "You are not inside this room",
        });
      }

      // Check membership
      const isMember = room.members.some(
        (member) =>
          member.user.toString() === socket.user.id
      );

      if (!isMember) {
        return socket.emit("control:error", {
          message: "You are not a member of this room",
        });
      }

      // Already driver
      if (
        room.driver &&
        room.driver.toString() === socket.user.id
      ) {
        return socket.emit("control:error", {
          message: "You already have control",
        });
      }

      /*
      Nobody currently has control.

      In this situation we can give control directly
      to the requester because there is no driver to approve.
      */

      if (!room.driver) {
        room.driver = socket.user.id;

        await room.save();

        await room.populate(
          "driver",
          "username email avatar"
        );

        io.to(roomId).emit("control:changed", {
          roomId,
          driver: room.driver,
          reason: "control_requested_when_free",
        });

        return;
      }

      /*
      Someone already controls the room.

      The current driver must approve the request.
      */

      io.to(roomId).emit("control:requested", {
        roomId,

        requester: {
          id: socket.user.id,
          username: socket.user.username,
        },

        currentDriver: room.driver,
      });
    } catch (error) {
      console.error("control:request error:", error);

      socket.emit("control:error", {
        message: "Failed to request control",
      });
    }
  });

  /*
  ==========================================
  APPROVE CONTROL
  ==========================================
  */

  socket.on(
    "control:approve",
    async ({ roomId, userId }) => {
      try {
        if (!roomId || !userId) {
          return socket.emit("control:error", {
            message: "Room ID and user ID are required",
          });
        }

        const room = await Room.findById(roomId);

        if (!room) {
          return socket.emit("control:error", {
            message: "Room not found",
          });
        }

        /*
        ONLY CURRENT DRIVER CAN APPROVE
        */

        if (
          !room.driver ||
          room.driver.toString() !== socket.user.id
        ) {
          return socket.emit("control:error", {
            message:
              "Only the current driver can approve control",
          });
        }

        /*
        Target must be a room member.
        */

        const targetMember = room.members.find(
          (member) =>
            member.user.toString() === userId
        );

        if (!targetMember) {
          return socket.emit("control:error", {
            message: "User is not a member of this room",
          });
        }

        /*
        Prevent transferring control to yourself.
        */

        if (userId === socket.user.id) {
          return socket.emit("control:error", {
            message: "You already have control",
          });
        }

        /*
        TRANSFER DRIVER
        */

        const previousDriver = room.driver;

        room.driver = userId;

        await room.save();

        await room.populate(
          "driver",
          "username email avatar"
        );

        /*
        Tell EVERYONE the new driver.
        */

        io.to(roomId).emit("control:changed", {
          roomId,

          driver: room.driver,

          previousDriver,

          reason: "control_transferred",
        });
      } catch (error) {
        console.error("control:approve error:", error);

        socket.emit("control:error", {
          message: "Failed to approve control",
        });
      }
    }
  );

  /*
  ==========================================
  REJECT CONTROL
  ==========================================
  */

  socket.on(
    "control:reject",
    async ({ roomId, userId }) => {
      try {
        if (!roomId || !userId) {
          return socket.emit("control:error", {
            message: "Room ID and user ID are required",
          });
        }

        const room = await Room.findById(roomId);

        if (!room) {
          return socket.emit("control:error", {
            message: "Room not found",
          });
        }

        /*
        ONLY CURRENT DRIVER CAN REJECT
        */

        if (
          !room.driver ||
          room.driver.toString() !== socket.user.id
        ) {
          return socket.emit("control:error", {
            message:
              "Only the current driver can reject control",
          });
        }

        /*
        Verify requester is actually a member.
        */

        const isMember = room.members.some(
          (member) =>
            member.user.toString() === userId
        );

        if (!isMember) {
          return socket.emit("control:error", {
            message: "User is not a member of this room",
          });
        }

        io.to(roomId).emit("control:rejected", {
          roomId,
          userId,
        });
      } catch (error) {
        console.error("control:reject error:", error);

        socket.emit("control:error", {
          message: "Failed to reject control request",
        });
      }
    }
  );

  /*
  ==========================================
  RELEASE CONTROL
  ==========================================
  */

  socket.on("control:release", async ({ roomId }) => {
    try {
      if (!roomId) {
        return socket.emit("control:error", {
          message: "Room ID is required",
        });
      }

      const room = await Room.findById(roomId);

      if (!room) {
        return socket.emit("control:error", {
          message: "Room not found",
        });
      }

      /*
      ONLY CURRENT DRIVER CAN RELEASE
      */

      if (
        !room.driver ||
        room.driver.toString() !== socket.user.id
      ) {
        return socket.emit("control:error", {
          message: "You are not the current driver",
        });
      }

      room.driver = null;

      await room.save();

      /*
      Nobody automatically becomes driver.
      */

      io.to(roomId).emit("control:released", {
        roomId,
        driver: null,
        reason: "driver_released",
      });
    } catch (error) {
      console.error("control:release error:", error);

      socket.emit("control:error", {
        message: "Failed to release control",
      });
    }
  });

  /*
  ==========================================
  DISCONNECT
  ==========================================
  */

  socket.on("disconnect", async () => {
    try {
      const roomId = socket.currentRoom;

      if (!roomId) {
        return;
      }

      const room = await Room.findById(roomId);

      if (!room) {
        return;
      }

      /*
      If disconnected user was the driver,
      release the driver.
      */

      if (
        room.driver &&
        room.driver.toString() === socket.user.id
      ) {
        room.driver = null;

        await room.save();

        io.to(roomId).emit("control:released", {
          roomId,
          driver: null,
          reason: "driver_disconnected",
        });
      }

      socket.to(roomId).emit("room:user-left", {
        user: {
          id: socket.user.id,
          username: socket.user.username,
        },
      });
    } catch (error) {
      console.error("disconnect room cleanup error:", error);
    }
  });
};

module.exports = roomSocket;