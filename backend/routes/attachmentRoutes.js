// backend/routes/attachmentRoutes.js
const express = require("express");
const protect = require("../middleware/authMiddleware");
const {
  uploadAttachment,
  getAttachment,
  deleteAttachment,
} = require("../controllers/attachmentController");

const router = express.Router();

router.use(protect);

router.post("/rooms/:roomId", uploadAttachment);
router.get("/:attachmentId", getAttachment);
router.delete("/:attachmentId", deleteAttachment);

module.exports = router;