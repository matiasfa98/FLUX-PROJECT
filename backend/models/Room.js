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

const joinRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    requestedAt: {
      type: Date,
      default: Date.now,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
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

    // Only ONE driver can exist in the room.
    // null = nobody currently has control.
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    members: {
      type: [memberSchema],
      default: [],
    },

    // Users waiting for permission to join.
    joinRequests: {
      type: [joinRequestSchema],
      default: [],
    },

    language: {
      type: String,
      default: "javascript",
      trim: true,
    },

    /*
     * Room configuration.
     *
     * These settings are controlled by the owner/admin
     * and MUST also be enforced by the backend.
     */
    settings: {
      // public  = anyone can join
      // private = owner/admin must approve
      access: {
        type: String,
        enum: ["public", "private"],
        default: "public",
      },

      // If true, users must be approved before becoming members.
      requireJoinApproval: {
        type: Boolean,
        default: false,
      },

      // Whether members can use room chat.
      allowChat: {
        type: Boolean,
        default: true,
      },

      // Whether members can request editor control.
      allowControlRequests: {
        type: Boolean,
        default: true,
      },

      // Keep false for Flux MVP.
      // If false, only one driver can exist.
      allowMultipleDrivers: {
        type: Boolean,
        default: false,
      },

      // If true, a driver can automatically be selected
      // when the room has no driver.
      autoAssignDriver: {
        type: Boolean,
        default: false,
      },

      // Whether normal members can invite other users.
      allowMembersToInvite: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Room", roomSchema);