// backend/models/Conversation.js
const mongoose = require("mongoose");

const participantSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    joinedAt: { type: Date, default: Date.now },
    lastReadAt: { type: Date, default: null },
    role: {
      type: String,
      enum: ["member", "admin"],
      default: "member",
    },
  },
  { _id: false }
);

/*
|--------------------------------------------------------------------------
| BOT PARTICIPANT
|--------------------------------------------------------------------------
| A bot is not a User — it has no account, no auth. It's a named agent
| bound to an AI provider + model. When a user mentions it, the backend
| calls the provider and inserts a message from this bot.
|--------------------------------------------------------------------------
*/
const botSchema = new mongoose.Schema(
  {
    // Display name shown in the feed: "Code Reviewer", "Groq 70B", etc.
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },

    // Provider key from aiService: "groq" | "cerebras"
    provider: {
      type: String,
      required: true,
      enum: ["groq", "cerebras"],
    },

    // Optional: pin a specific model. If null, uses provider default.
    model: {
      type: String,
      default: null,
    },

    // Optional short instruction that shapes this bot's replies.
    // Prepended to the system prompt when generating.
    instructions: {
      type: String,
      default: "",
      maxlength: 500,
    },

    // Optional avatar URL (could be a Cloudinary upload later).
    avatar: { type: String, default: "" },

    // Who added this bot.
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    addedAt: { type: Date, default: Date.now },
  },
  { _id: true } // bots have their own _id so we can reference/remove them
);

const conversationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      // "group" and "discussion" are treated as the same thing.
      // Existing group conversations continue to work.
      enum: ["dm", "group", "discussion", "room", "workspace"],
      required: true,
      index: true,
    },

    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      index: true,
    },

    name: {
      type: String,
      trim: true,
      maxlength: 100,
      default: null,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    participants: {
      type: [participantSchema],
      default: [],
    },

    // AI bots in this discussion.
    bots: {
      type: [botSchema],
      default: [],
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    lastMessagePreview: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

conversationSchema.index({ room: 1, "participants.user": 1, lastMessageAt: -1 });
conversationSchema.index({ room: 1, type: 1, "participants.user": 1 });

module.exports = mongoose.model("Conversation", conversationSchema);