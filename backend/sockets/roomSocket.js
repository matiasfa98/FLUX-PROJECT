const Room = require("../models/Room");

module.exports = (io, socket) => {
  /*
  |--------------------------------------------------------------------------
  | Helpers
  |--------------------------------------------------------------------------
  */

  const getUserId = () => socket.user.id.toString();

  const isMember = (room, userId) => {
    return room.members.some(
      (member) =>
        member.user.toString() === userId.toString()
    );
  };

  const isOwner = (room, userId) => {
    return (
      room.owner.toString() === userId.toString()
    );
  };

  const isOwnerOrAdmin = (room, userId) => {
    if (isOwner(room, userId)) {
      return true;
    }

    const member = room.members.find(
      (member) =>
        member.user.toString() === userId.toString()
    );

    return member?.role === "admin";
  };

  const isDriver = (room, userId) => {
    return (
      room.driver &&
      room.driver.toString() === userId.toString()
    );
  };

  const emitError = (event, message) => {
    socket.emit(event, {
      message,
    });
  };

  const populateRoom = async (room) => {
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

    return room;
  };

  /*
  |--------------------------------------------------------------------------
  | JOIN REALTIME ROOM
  |--------------------------------------------------------------------------
  |
  | IMPORTANT:
  | This does NOT make someone a database member.
  |
  | The REST endpoint:
  |
  | POST /api/rooms/:id/join
  |
  | must be used first.
  |
  |--------------------------------------------------------------------------
  */

  socket.on("room:join", async (data) => {
    try {
      const roomId =
        typeof data === "string"
          ? data
          : data?.roomId;

      if (!roomId) {
        return emitError(
          "room:error",
          "Room ID is required"
        );
      }

      const room = await Room.findById(roomId);

      if (!room) {
        return emitError(
          "room:error",
          "Room not found"
        );
      }

      const userId = getUserId();

      /*
       * User must already be an approved member.
       */

      if (!isMember(room, userId)) {
        return emitError(
          "room:error",
          "You are not a member of this room"
        );
      }

      /*
       * If already inside this room, don't join twice.
       */

      if (socket.currentRoom === roomId) {
        return socket.emit("room:joined", {
          roomId,
          message: "Already inside this room",
          driver: room.driver,
        });
      }

      /*
       * Leave previous realtime room.
       */

      if (socket.currentRoom) {
        const previousRoomId =
          socket.currentRoom;

        const previousRoom =
          await Room.findById(previousRoomId);

        if (previousRoom) {
          /*
           * If this socket's user was the driver,
           * release control.
           */

          if (
            isDriver(previousRoom, userId)
          ) {
            previousRoom.driver = null;
            await previousRoom.save();

            io.to(previousRoomId).emit(
              "control:released",
              {
                roomId: previousRoomId,
                previousDriver: userId,
                reason: "driver_left",
              }
            );
          }

          socket.leave(previousRoomId);

          io.to(previousRoomId).emit(
            "room:user-left",
            {
              roomId: previousRoomId,
              userId,
            }
          );
        }

        socket.currentRoom = null;
      }

      /*
       * Join new Socket.IO room.
       */

      socket.join(roomId);
      socket.currentRoom = roomId;

      await populateRoom(room);

      socket.emit("room:joined", {
        roomId,
        message: "Joined room successfully",
        driver: room.driver,
      });

      socket.to(roomId).emit(
        "room:user-joined",
        {
          roomId,
          user: {
            id: socket.user.id,
            username: socket.user.username,
          },
        }
      );
    } catch (error) {
      console.error(
        "SOCKET ROOM JOIN ERROR:",
        error
      );

      emitError(
        "room:error",
        "Failed to join room"
      );
    }
  });

  /*
  |--------------------------------------------------------------------------
  | LEAVE REALTIME ROOM
  |--------------------------------------------------------------------------
  */

  socket.on("room:leave", async (data) => {
    try {
      const roomId =
        typeof data === "string"
          ? data
          : data?.roomId;

      if (!roomId) {
        return emitError(
          "room:error",
          "Room ID is required"
        );
      }

      if (socket.currentRoom !== roomId) {
        return emitError(
          "room:error",
          "You are not inside this room"
        );
      }

      const room = await Room.findById(roomId);

      const userId = getUserId();

      if (room) {
        /*
         * Release driver if necessary.
         */

        if (isDriver(room, userId)) {
          room.driver = null;
          await room.save();

          io.to(roomId).emit(
            "control:released",
            {
              roomId,
              previousDriver: userId,
              reason: "driver_left",
            }
          );
        }

        socket.to(roomId).emit(
          "room:user-left",
          {
            roomId,
            userId,
          }
        );
      }

      socket.leave(roomId);
      socket.currentRoom = null;

      socket.emit("room:left", {
        roomId,
        message: "Left room successfully",
      });
    } catch (error) {
      console.error(
        "SOCKET ROOM LEAVE ERROR:",
        error
      );

      emitError(
        "room:error",
        "Failed to leave room"
      );
    }
  });

  /*
  |--------------------------------------------------------------------------
  | REQUEST CONTROL
  |--------------------------------------------------------------------------
  */

  socket.on("control:request", async (data) => {
    try {
      const { roomId } = data || {};

      if (!roomId) {
        return emitError(
          "control:error",
          "Room ID is required"
        );
      }

      if (socket.currentRoom !== roomId) {
        return emitError(
          "control:error",
          "You are not inside this room"
        );
      }

      const room = await Room.findById(roomId);

      if (!room) {
        return emitError(
          "control:error",
          "Room not found"
        );
      }

      const userId = getUserId();

      if (!isMember(room, userId)) {
        return emitError(
          "control:error",
          "You are not a member of this room"
        );
      }

      /*
       * Check room setting.
       */

      if (
        !room.settings.allowControlRequests
      ) {
        return emitError(
          "control:error",
          "Control requests are disabled by the room owner"
        );
      }

      /*
       * Already driver.
       */

      if (isDriver(room, userId)) {
        return emitError(
          "control:error",
          "You already have control"
        );
      }

      /*
       * No driver currently exists.
       */

      if (!room.driver) {
        room.driver = userId;

        await room.save();

        await room.populate(
          "driver",
          "username email avatar status"
        );

        io.to(roomId).emit(
          "control:changed",
          {
            roomId,
            driver: room.driver,
            previousDriver: null,
            reason:
              "control_requested_when_free",
          }
        );

        return;
      }

      /*
       * A driver already exists.
       *
       * Ask current driver for approval.
       */

      await room.populate(
        "driver",
        "username email avatar status"
      );

      const requester = {
        id: socket.user.id,
        username: socket.user.username,
      };

      io.to(roomId).emit(
        "control:requested",
        {
          roomId,
          requester,
          currentDriver: room.driver,
        }
      );
    } catch (error) {
      console.error(
        "CONTROL REQUEST ERROR:",
        error
      );

      emitError(
        "control:error",
        "Failed to request control"
      );
    }
  });

  /*
  |--------------------------------------------------------------------------
  | APPROVE CONTROL REQUEST
  |--------------------------------------------------------------------------
  */

  socket.on(
    "control:approve",
    async (data) => {
      try {
        const { roomId, userId } = data || {};

        if (!roomId || !userId) {
          return emitError(
            "control:error",
            "Room ID and user ID are required"
          );
        }

        if (socket.currentRoom !== roomId) {
          return emitError(
            "control:error",
            "You are not inside this room"
          );
        }

        const room =
          await Room.findById(roomId);

        if (!room) {
          return emitError(
            "control:error",
            "Room not found"
          );
        }

        const currentUserId =
          getUserId();

        /*
         * Only current driver can approve.
         */

        if (
          !isDriver(
            room,
            currentUserId
          )
        ) {
          return emitError(
            "control:error",
            "Only the current driver can approve control requests"
          );
        }

        /*
         * Cannot approve yourself.
         */

        if (
          currentUserId ===
          userId.toString()
        ) {
          return emitError(
            "control:error",
            "You already have control"
          );
        }

        /*
         * Target must be a member.
         */

        if (!isMember(room, userId)) {
          return emitError(
            "control:error",
            "User is not a member of this room"
          );
        }

        const previousDriver =
          room.driver;

        room.driver = userId;

        await room.save();

        await room.populate(
          "driver",
          "username email avatar status"
        );

        io.to(roomId).emit(
          "control:changed",
          {
            roomId,
            driver: room.driver,
            previousDriver,
            reason: "control_transferred",
          }
        );
      } catch (error) {
        console.error(
          "CONTROL APPROVE ERROR:",
          error
        );

        emitError(
          "control:error",
          "Failed to approve control request"
        );
      }
    }
  );

  /*
  |--------------------------------------------------------------------------
  | REJECT CONTROL REQUEST
  |--------------------------------------------------------------------------
  */

  socket.on(
    "control:reject",
    async (data) => {
      try {
        const { roomId, userId } = data || {};

        if (!roomId || !userId) {
          return emitError(
            "control:error",
            "Room ID and user ID are required"
          );
        }

        if (socket.currentRoom !== roomId) {
          return emitError(
            "control:error",
            "You are not inside this room"
          );
        }

        const room =
          await Room.findById(roomId);

        if (!room) {
          return emitError(
            "control:error",
            "Room not found"
          );
        }

        const currentUserId =
          getUserId();

        /*
         * Only current driver can reject.
         */

        if (
          !isDriver(
            room,
            currentUserId
          )
        ) {
          return emitError(
            "control:error",
            "Only the current driver can reject control requests"
          );
        }

        if (!isMember(room, userId)) {
          return emitError(
            "control:error",
            "User is not a member of this room"
          );
        }

        io.to(roomId).emit(
          "control:rejected",
          {
            roomId,
            userId,
            rejectedBy: currentUserId,
          }
        );
      } catch (error) {
        console.error(
          "CONTROL REJECT ERROR:",
          error
        );

        emitError(
          "control:error",
          "Failed to reject control request"
        );
      }
    }
  );

  /*
  |--------------------------------------------------------------------------
  | RELEASE CONTROL
  |--------------------------------------------------------------------------
  */

  socket.on(
    "control:release",
    async (data) => {
      try {
        const { roomId } = data || {};

        if (!roomId) {
          return emitError(
            "control:error",
            "Room ID is required"
          );
        }

        if (socket.currentRoom !== roomId) {
          return emitError(
            "control:error",
            "You are not inside this room"
          );
        }

        const room =
          await Room.findById(roomId);

        if (!room) {
          return emitError(
            "control:error",
            "Room not found"
          );
        }

        const userId = getUserId();

        if (!isDriver(room, userId)) {
          return emitError(
            "control:error",
            "Only the current driver can release control"
          );
        }

        room.driver = null;

        await room.save();

        io.to(roomId).emit(
          "control:released",
          {
            roomId,
            previousDriver: userId,
            reason: "driver_released",
          }
        );
      } catch (error) {
        console.error(
          "CONTROL RELEASE ERROR:",
          error
        );

        emitError(
          "control:error",
          "Failed to release control"
        );
      }
    }
  );

  /*
  |--------------------------------------------------------------------------
  | DISCONNECT
  |--------------------------------------------------------------------------
  */

  socket.on("disconnect", async () => {
    try {
      const roomId = socket.currentRoom;

      if (!roomId) {
        return;
      }

      const room =
        await Room.findById(roomId);

      if (!room) {
        return;
      }

      const userId = getUserId();

      /*
       * Release driver if disconnected user
       * was the current driver.
       */

      if (isDriver(room, userId)) {
        room.driver = null;

        await room.save();

        io.to(roomId).emit(
          "control:released",
          {
            roomId,
            previousDriver: userId,
            reason: "driver_disconnected",
          }
        );
      }

      io.to(roomId).emit(
        "room:user-left",
        {
          roomId,
          userId,
        }
      );
    } catch (error) {
      console.error(
        "SOCKET DISCONNECT ERROR:",
        error
      );
    }
  });
};