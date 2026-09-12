
// backend/routes/chatRoutes.js
const express = require("express");
const protect = require("../middleware/authMiddleware");
const {
  getInbox,
  getConversation,
  createConversation,
  getMessages,
  markRead,
  leaveGroup,
  addBot,
  removeBot,
} = require("../controllers/chatController");

const router = express.Router();

router.use(protect);

router.get("/inbox", getInbox);
router.post("/conversations", createConversation);
router.get("/conversations/:id", getConversation);
router.get("/conversations/:id/messages", getMessages);
router.post("/conversations/:id/read", markRead);
router.delete("/conversations/:id/leave", leaveGroup);


router.post("/conversations/:id/bots", addBot);
router.delete("/conversations/:id/bots/:botId", removeBot);

module.exports = router;