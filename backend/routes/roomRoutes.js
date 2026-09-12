// backend/routes/roomRoutes.js
const express = require("express");

const {
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
} = require("../controllers/roomController");

const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();

router.use(authMiddleware);

// Room creation and my rooms
router.post("/", createRoom);
router.get("/", getMyRooms);

// Public discovery (must come before /:id)
router.get("/search", searchRooms);

// Invite peek — MUST be public (no auth required) for the invite page.
// Move this above `router.use(authMiddleware)` if you want anonymous peek.
// For now, it's protected to keep the surface small.
router.get("/:id/peek", peekRoom);

// Join requests
router.get("/:id/join-requests", getJoinRequests);
router.post("/:id/join-requests/:userId/approve", approveJoinRequest);
router.post("/:id/join-requests/:userId/reject", rejectJoinRequest);

// Room settings
router.patch("/:id/settings", updateRoomSettings);

// Join / leave / delete
router.post("/:id/join", joinRoom);
router.post("/:id/leave", leaveRoom);
router.delete("/:id", deleteRoom);

// Get single room (keep last)
router.get("/:id", getRoom);

module.exports = router;