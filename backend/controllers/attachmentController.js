// backend/controllers/attachmentController.js
const Attachment = require("../models/Attachment");
const Room = require("../models/Room");
const cloudinaryService = require("../services/cloudinaryService");

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

const isMember = (room, userId) =>
  room.members.some((m) => {
    const id = m.user?._id || m.user;
    return id && String(id) === String(userId);
  });

/*
|--------------------------------------------------------------------------
| UPLOAD
|--------------------------------------------------------------------------
| POST /api/attachments/rooms/:roomId
| Body (JSON): { filename, mimeType, data: "base64 string" }
|--------------------------------------------------------------------------
*/
const uploadAttachment = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { filename, mimeType, data } = req.body || {};

    if (!filename || typeof filename !== "string") {
      return res.status(400).json({ message: "filename is required" });
    }
    if (!data || typeof data !== "string") {
      return res.status(400).json({ message: "data (base64) is required" });
    }

    // Estimate size from base64 length (~4/3 overhead).
    const approxBytes = Math.floor((data.length * 3) / 4);
    if (approxBytes > MAX_FILE_BYTES) {
      return res.status(413).json({
        message: `File too large. Max ${MAX_FILE_BYTES / 1024 / 1024} MB.`,
      });
    }

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });
    if (!isMember(room, req.user.id)) {
      return res
        .status(403)
        .json({ message: "You are not a member of this room" });
    }

    // Convert base64 to buffer.
    const buffer = Buffer.from(data, "base64");

    console.log(">>> [controller] about to call uploadBuffer, room:", roomId);

const uploaded = await cloudinaryService.uploadBuffer(buffer, {
  folder: `flux/rooms/${roomId}`,
  filename,
});

console.log(">>> [controller] uploadBuffer returned:", uploaded);
    // Save metadata in Mongo.
    const attachment = await Attachment.create({
      room: roomId,
      uploadedBy: req.user.id,
      originalName: filename.slice(0, 255),
      publicId: uploaded.publicId,
      url: uploaded.url,
      mimeType: mimeType || "application/octet-stream",
      size: buffer.length,
      resourceType: uploaded.resourceType,
    });

    return res.status(201).json({
      attachment: {
        id: String(attachment._id),
        originalName: attachment.originalName,
        mimeType: attachment.mimeType,
        size: attachment.size,
        url: attachment.url,
      },
    });
  } catch (err) {
    console.error("UPLOAD ATTACHMENT ERROR:", err);
    return res.status(500).json({ message: "Upload failed" });
  }
};

/*
|--------------------------------------------------------------------------
| GET ONE
|--------------------------------------------------------------------------
| GET /api/attachments/:attachmentId
|
| Cloudinary already serves the file. This endpoint is only here so
| older clients can still resolve URLs — it 302-redirects to Cloudinary.
|--------------------------------------------------------------------------
*/
const getAttachment = async (req, res) => {
  try {
    const { attachmentId } = req.params;

    const attachment = await Attachment.findById(attachmentId);
    if (!attachment) {
      return res.status(404).json({ message: "Attachment not found" });
    }

    const room = await Room.findById(attachment.room);
    if (!room || !isMember(room, req.user.id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Redirect to Cloudinary.
    return res.redirect(attachment.url);
  } catch (err) {
    console.error("GET ATTACHMENT ERROR:", err);
    return res.status(500).json({ message: "Failed to load attachment" });
  }
};

/*
|--------------------------------------------------------------------------
| DELETE
|--------------------------------------------------------------------------
| DELETE /api/attachments/:attachmentId
|--------------------------------------------------------------------------
*/
const deleteAttachment = async (req, res) => {
  try {
    const { attachmentId } = req.params;

    const attachment = await Attachment.findById(attachmentId);
    if (!attachment) {
      return res.status(404).json({ message: "Attachment not found" });
    }

    // Only the uploader or a room owner/admin can delete.
    const room = await Room.findById(attachment.room);
    if (!room) return res.status(404).json({ message: "Room not found" });

    const isUploader = String(attachment.uploadedBy) === String(req.user.id);
    const isOwnerOrAdmin = room.members.some((m) => {
      const id = m.user?._id || m.user;
      return (
        id &&
        String(id) === String(req.user.id) &&
        ["owner", "admin"].includes(m.role)
      );
    });

    if (!isUploader && !isOwnerOrAdmin) {
      return res.status(403).json({ message: "Not allowed to delete this file" });
    }

    // Remove from Cloudinary.
    await cloudinaryService.deleteFile(
      attachment.publicId,
      attachment.resourceType
    );

    // Remove from Mongo.
    await attachment.deleteOne();

    return res.json({ message: "Attachment deleted" });
  } catch (err) {
    console.error("DELETE ATTACHMENT ERROR:", err);
    return res.status(500).json({ message: "Failed to delete attachment" });
  }
};

module.exports = {
  uploadAttachment,
  getAttachment,
  deleteAttachment,
};