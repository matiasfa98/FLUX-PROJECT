const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const QrLogin = require("../models/QrLogin");
const cloudinaryService = require("../services/cloudinaryService");

// ======================================
// CREATE JWT
// ======================================

const createToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      username: user.username,
      email: user.email,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

// ======================================
// SIGNUP
// ======================================

const signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        message: "Username, email and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    const usernameExists = await User.findOne({ username });
    if (usernameExists) {
      return res.status(409).json({ message: "Username already exists" });
    }

    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
    });

    const token = createToken(user);

    res.status(201).json({
      message: "Account created successfully",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ======================================
// LOGIN
// ======================================

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    user.status = "online";
    await user.save();

    const token = createToken(user);

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ======================================
// GET CURRENT USER
// ======================================

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ======================================
// UPDATE PROFILE
// PATCH /api/auth/me
// Body: { username?, displayName?, bio?, pronouns?, timezone? }
// ======================================

const updateProfile = async (req, res) => {
  try {
    const { username, displayName, bio, pronouns, timezone } = req.body || {};

    const update = {};

    if (username !== undefined) {
      const trimmed = String(username).trim();
      if (trimmed.length < 3 || trimmed.length > 30) {
        return res
          .status(400)
          .json({ message: "Username must be 3-30 characters" });
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
        return res.status(400).json({
          message: "Username may only contain letters, numbers, _ and -",
        });
      }
      const existing = await User.findOne({
        username: trimmed,
        _id: { $ne: req.user.id },
      });
      if (existing) {
        return res.status(409).json({ message: "Username already taken" });
      }
      update.username = trimmed;
    }

    if (displayName !== undefined) {
      update.displayName = String(displayName).trim().slice(0, 60);
    }
    if (bio !== undefined) {
      update.bio = String(bio).trim().slice(0, 280);
    }
    if (pronouns !== undefined) {
      update.pronouns = String(pronouns).trim().slice(0, 20);
    }
    if (timezone !== undefined) {
      update.timezone = String(timezone).trim().slice(0, 60);
    }

    const user = await User.findByIdAndUpdate(req.user.id, update, {
      new: true,
    }).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "Profile updated", user });
  } catch (err) {
    console.error("UPDATE PROFILE ERROR:", err);
    res.status(500).json({ message: "Failed to update profile" });
  }
};

// ======================================
// UPDATE AVATAR
// PUT /api/auth/me/avatar
// Body: { avatar: "data:image/png;base64,..." }  OR  { avatar: "" }
//
// Uploads to Cloudinary under flux/avatars/<userId>.
// Returns the updated user object with the new avatar URL.
// ======================================

const updateAvatar = async (req, res) => {
  try {
    const { avatar } = req.body || {};

    if (typeof avatar !== "string") {
      return res.status(400).json({ message: "avatar must be a string" });
    }

    // Empty string = remove avatar.
    if (!avatar) {
      await User.updateOne({ _id: req.user.id }, { avatar: "" });
      const user = await User.findById(req.user.id).select("-password");
      return res.json({ message: "Avatar removed", user });
    }

    // Validate data URI format.
    if (!/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(avatar)) {
      return res.status(400).json({ message: "Invalid image format" });
    }

    // Strip the "data:image/png;base64," prefix and decode.
    const base64 = avatar.split(",")[1];
    const buffer = Buffer.from(base64, "base64");

    // Size guard — 500 KB before upload.
    if (buffer.length > 500_000) {
      return res
        .status(413)
        .json({ message: "Avatar too large (max 500 KB)" });
    }

    // Upload to Cloudinary under flux/avatars/<userId>.
    const uploaded = await cloudinaryService.uploadAvatar(
      buffer,
      req.user.id
    );

    await User.updateOne(
      { _id: req.user.id },
      { avatar: uploaded.url }
    );

    const user = await User.findById(req.user.id).select("-password");

    res.json({
      message: "Avatar updated",
      user,
      avatarUrl: uploaded.url,
    });
  } catch (err) {
    console.error("UPDATE AVATAR ERROR:", err);
    res.status(500).json({
      message: err.message || "Failed to update avatar",
    });
  }
};

// ======================================
// DELETE ACCOUNT
// DELETE /api/auth/me
// ======================================

const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;

    const Room = require("../models/Room");
    await Room.updateMany(
      { "members.user": userId },
      { $pull: { members: { user: userId } } }
    );

    await Room.deleteMany({ owner: userId });

    const Conversation = require("../models/Conversation");
    await Conversation.updateMany(
      { "participants.user": userId },
      { $pull: { participants: { user: userId } } }
    );

    await User.findByIdAndDelete(userId);

    res.json({ message: "Account deleted" });
  } catch (err) {
    console.error("DELETE ACCOUNT ERROR:", err);
    res.status(500).json({ message: "Failed to delete account" });
  }
};

// ======================================
// CREATE QR LOGIN SESSION
// ======================================

const createQrLogin = async (req, res) => {
  try {
    await QrLogin.deleteMany({
      user: req.user.id,
      claimed: false,
    });

    const token = crypto.randomBytes(24).toString("hex");
    const code = crypto.randomInt(100000, 999999).toString();

    const session = await QrLogin.create({
      token,
      code,
      user: req.user.id,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    const qrPayload = `flux://link?token=${token}`;

    res.json({
      token,
      code,
      qrPayload,
      expiresAt: session.expiresAt,
    });
  } catch (err) {
    console.error("CREATE QR LOGIN ERROR:", err);
    res.status(500).json({ message: "Failed to create QR session" });
  }
};

// ======================================
// CLAIM QR LOGIN (called by mobile)
// ======================================

const claimQrLogin = async (req, res) => {
  try {
    const { token, code, deviceName } = req.body || {};

    if (!token && !code) {
      return res.status(400).json({ message: "token or code required" });
    }

    const query = token ? { token } : { code };
    const session = await QrLogin.findOne(query);

    if (!session) {
      return res.status(404).json({ message: "Invalid or expired code" });
    }
    if (session.claimed) {
      return res.status(409).json({ message: "This code was already used" });
    }
    if (session.expiresAt < new Date()) {
      return res.status(410).json({ message: "Code expired" });
    }

    session.claimed = true;
    session.claimedAt = new Date();
    session.claimedByDevice = deviceName || "Mobile device";
    await session.save();

    const user = await User.findById(session.user);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.status = "online";
    await user.save();

    const jwt = createToken(user);

    res.json({
      message: "Device linked successfully",
      token: jwt,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        status: user.status,
      },
    });
  } catch (err) {
    console.error("CLAIM QR LOGIN ERROR:", err);
    res.status(500).json({ message: "Failed to claim QR session" });
  }
};

// ======================================
// POLL QR SESSION STATUS
// ======================================

const getQrStatus = async (req, res) => {
  try {
    const { token } = req.params;
    const session = await QrLogin.findOne({ token, user: req.user.id });

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    res.json({
      claimed: session.claimed,
      claimedAt: session.claimedAt,
      claimedByDevice: session.claimedByDevice,
      expiresAt: session.expiresAt,
    });
  } catch (err) {
    console.error("QR STATUS ERROR:", err);
    res.status(500).json({ message: "Failed to get session status" });
  }
};

// ======================================
// CANCEL QR SESSION
// ======================================

const cancelQrLogin = async (req, res) => {
  try {
    const { token } = req.params;
    await QrLogin.deleteOne({ token, user: req.user.id });
    res.json({ ok: true });
  } catch (err) {
    console.error("CANCEL QR ERROR:", err);
    res.status(500).json({ message: "Failed to cancel" });
  }
};

module.exports = {
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
};