const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    role: {
      type: String,
      enum: ["owner", "admin", "member"],
      default: "member",
    },

    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Only ONE driver can exist for the entire room.
    // null means nobody currently has control.
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    members: {
      type: [memberSchema],
      default: [],
    },

    language: {
      type: String,
      default: "javascript",
      trim: true,
    },

    isPrivate: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Room", roomSchema);