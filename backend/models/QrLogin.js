// backend/models/QrLogin.js
const mongoose = require("mongoose");

const qrLoginSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  code: {
    type: String,
    required: true,
    index: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  claimed: {
    type: Boolean,
    default: false,
  },
  claimedAt: {
    type: Date,
    default: null,
  },
  claimedByDevice: {
    type: String,
    default: null,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 }, // TTL index — Mongo auto-deletes
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("QrLogin", qrLoginSchema);