// backend/routes/executionRoutes.js
const express = require("express");
const protect = require("../middleware/authMiddleware");
const {
  runCode,
  runPlaygroundCode,
} = require("../controllers/executionController");

const router = express.Router();

router.use(protect);

// Collaborative room execution: POST /api/execution/rooms/:roomId/run
router.post("/rooms/:roomId/run", runCode);

// Personal playground execution: POST /api/execution/run
router.post("/run", runPlaygroundCode);

module.exports = router;