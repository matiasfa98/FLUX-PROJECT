// backend/routes/mediaRoutes.js
const express = require("express");
const protect = require("../middleware/authMiddleware");
const { getIceServers } = require("../controllers/mediaController");

const router = express.Router();

router.use(protect);

// GET /api/media/ice-servers
router.get("/ice-servers", getIceServers);

module.exports = router;