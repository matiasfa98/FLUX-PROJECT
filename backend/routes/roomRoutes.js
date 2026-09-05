const express = require("express");

const {
  createRoom,
  getMyRooms,
  getRoom,
  joinRoom,
  leaveRoom,
  deleteRoom
} = require("../controllers/roomController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();


// Every room route requires authentication

router.use(protect);


// Create room

router.post("/", createRoom);


// Get my rooms

router.get("/", getMyRooms);


// Get one room

router.get("/:id", getRoom);


// Join room

router.post("/:id/join", joinRoom);


// Leave room

router.post("/:id/leave", leaveRoom);


// Delete room

router.delete("/:id", deleteRoom);


module.exports = router;