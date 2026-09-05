const express = require("express");

const {
  getRoomMessages
} = require("../controllers/messageController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();


// Every message route requires authentication

router.use(protect);


// Get room chat history

router.get(
  "/:id",
  getRoomMessages
);


module.exports = router;