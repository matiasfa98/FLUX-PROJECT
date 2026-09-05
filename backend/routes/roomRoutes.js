const express = require("express");

const {
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
} = require("../controllers/roomController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| All room routes require authentication
|--------------------------------------------------------------------------
*/

router.use(authMiddleware);

/*
|--------------------------------------------------------------------------
| Room creation
|--------------------------------------------------------------------------
*/

router.post("/", createRoom);

/*
|--------------------------------------------------------------------------
| Get rooms belonging to current user
|--------------------------------------------------------------------------
*/

router.get("/", getMyRooms);

/*
|--------------------------------------------------------------------------
| Join requests
|--------------------------------------------------------------------------
|
| IMPORTANT:
| These routes must come BEFORE "/:id"
| so Express doesn't accidentally interpret
| "join-requests" as a room ID.
|
|--------------------------------------------------------------------------
*/

router.get("/:id/join-requests", getJoinRequests);

router.post(
  "/:id/join-requests/:userId/approve",
  approveJoinRequest
);

router.post(
  "/:id/join-requests/:userId/reject",
  rejectJoinRequest
);

/*
|--------------------------------------------------------------------------
| Room settings
|--------------------------------------------------------------------------
*/

router.patch("/:id/settings", updateRoomSettings);

/*
|--------------------------------------------------------------------------
| Join room
|--------------------------------------------------------------------------
*/

router.post("/:id/join", joinRoom);

/*
|--------------------------------------------------------------------------
| Leave room
|--------------------------------------------------------------------------
*/

router.post("/:id/leave", leaveRoom);

/*
|--------------------------------------------------------------------------
| Delete room
|--------------------------------------------------------------------------
*/

router.delete("/:id", deleteRoom);

/*
|--------------------------------------------------------------------------
| Get single room
|--------------------------------------------------------------------------
|
| Keep this AFTER the more specific routes above.
|
|--------------------------------------------------------------------------
*/

router.get("/:id", getRoom);

module.exports = router;