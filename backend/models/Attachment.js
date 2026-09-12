// backend/models/Attachment.js
const mongoose = require("mongoose");

const attachmentSchema = new mongoose.Schema(
  {
    // Which room this upload belongs to. Enforces access control:
    // you can only download attachments from rooms you're a member of.
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      index: true,
    },

    // Who uploaded it.
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Original filename as the user saw it (e.g. "screenshot.png").
    originalName: {
      type: String,
      required: true,
      maxlength: 255,
    },

    // Cloudinary's public_id. Needed to delete the file later.
    publicId: {
      type: String,
      required: true,
      index: true,
    },

    // Full secure URL to fetch the file from Cloudinary.
    url: {
      type: String,
      required: true,
    },

    // MIME type as reported by the browser.
    mimeType: {
      type: String,
      default: "application/octet-stream",
    },

    // File size in bytes.
    size: {
      type: Number,
      required: true,
    },

    // Cloudinary's resource_type ("image", "video", "raw").
    // Needed for deletion — Cloudinary requires the same type you uploaded with.
    resourceType: {
      type: String,
      enum: ["image", "video", "raw"],
      default: "image",
    },

    // Optional: link the attachment to the message it was posted in.
    // Set by the socket handler when the message is created.
    message: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Attachment", attachmentSchema);