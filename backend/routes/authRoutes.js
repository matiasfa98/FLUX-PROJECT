// backend/routes/authRoutes.js
const express = require("express");
const {
  signup,
  login,
  getMe,
  updateProfile,
  updateAvatar,
  deleteAccount,
  createQrLogin,
  claimQrLogin,
  getQrStatus,
  cancelQrLogin,
} = require("../controllers/authController");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

// Public
router.post("/signup", signup);
router.post("/login", login);
router.post("/qr/claim", claimQrLogin); // mobile calls this — no JWT yet

// Protected (desktop calls these)
router.use(protect);
router.get("/me", protect, getMe);
router.post("/qr/create", protect, createQrLogin);
router.get("/qr/status/:token", protect, getQrStatus);
router.delete("/qr/cancel/:token", protect, cancelQrLogin);
router.patch("/me", protect, updateProfile);
router.delete("/me", protect, deleteAccount);
router.put("/me/avatar", updateAvatar);

module.exports = router;