// backend/models/Message.js
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },

    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      index: true,
    },

    // Human sender. Null when senderBot is set.
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    /*
     * When set, this message came from a bot, not a human.
     * Shape: { id: botId, name: "Code Reviewer", provider, model, avatar }
     */
    senderBot: {
      type: {
        id: { type: mongoose.Schema.Types.ObjectId, required: true },
        name: { type: String, required: true },
        provider: { type: String, required: true },
        model: { type: String, default: null },
        avatar: { type: String, default: "" },
      },
      default: null,
    },

    // If this is a bot reply, the human message it responded to.
    inReplyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 8000, // bot replies can be long
    },

    readBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        at: { type: Date, default: Date.now },
      },
    ],

    attachments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Attachment",
      },
    ],

    deletedAt: { type: Date, default: null },
    editedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ conversation: 1, "readBy.user": 1 });

module.exports = mongoose.model("Message", messageSchema);