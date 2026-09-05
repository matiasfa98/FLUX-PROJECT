const Document = require("../models/Document");
const Room = require("../models/Room");

// Check if user is a member of the room
const isMember = (room, userId) => {
  return room.members.some(
    (member) =>
      member.user.toString() === userId.toString()
  );
};

// Check if user is owner or admin
const isOwnerOrAdmin = (room, userId) => {
  return room.members.some(
    (member) =>
      member.user.toString() === userId.toString() &&
      (member.role === "owner" || member.role === "admin")
  );
};

/*
========================================
CREATE DOCUMENT
POST /api/documents/rooms/:roomId
========================================
*/

const createDocument = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { name, language, content } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: "Document name is required",
      });
    }

    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({
        message: "Room not found",
      });
    }

    if (!isMember(room, req.user.id)) {
      return res.status(403).json({
        message: "You are not a member of this room",
      });
    }

    // Check duplicate document name
    const existingDocument = await Document.findOne({
      room: roomId,
      name: name.trim(),
    });

    if (existingDocument) {
      return res.status(409).json({
        message: "A document with this name already exists",
      });
    }

    const document = await Document.create({
      room: roomId,
      name: name.trim(),
      language: language || room.language || "javascript",
      content: content || "",
      createdBy: req.user.id,
      updatedBy: req.user.id,
    });

    await document.populate([
      {
        path: "createdBy",
        select: "username avatar",
      },
      {
        path: "updatedBy",
        select: "username avatar",
      },
    ]);

    res.status(201).json({
      message: "Document created successfully",
      document,
    });
  } catch (error) {
    console.error("CREATE DOCUMENT ERROR:", error);

    res.status(500).json({
      message: "Failed to create document",
      error: error.message,
    });
  }
};

/*
========================================
GET ROOM DOCUMENTS
GET /api/documents/rooms/:roomId
========================================
*/

const getRoomDocuments = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({
        message: "Room not found",
      });
    }

    if (!isMember(room, req.user.id)) {
      return res.status(403).json({
        message: "You are not a member of this room",
      });
    }

    const documents = await Document.find({
      room: roomId,
    })
      .select("-content")
      .populate("createdBy", "username avatar")
      .populate("updatedBy", "username avatar")
      .sort({
        createdAt: 1,
      });

    res.json(documents);
  } catch (error) {
    console.error("GET ROOM DOCUMENTS ERROR:", error);

    res.status(500).json({
      message: "Failed to get room documents",
      error: error.message,
    });
  }
};

/*
========================================
GET SINGLE DOCUMENT
GET /api/documents/:documentId
========================================
*/

const getDocument = async (req, res) => {
  try {
    const { documentId } = req.params;

    const document = await Document.findById(documentId)
      .populate("createdBy", "username avatar")
      .populate("updatedBy", "username avatar");

    if (!document) {
      return res.status(404).json({
        message: "Document not found",
      });
    }

    const room = await Room.findById(document.room);

    if (!room) {
      return res.status(404).json({
        message: "Room not found",
      });
    }

    if (!isMember(room, req.user.id)) {
      return res.status(403).json({
        message: "You are not a member of this room",
      });
    }

    res.json(document);
  } catch (error) {
    console.error("GET DOCUMENT ERROR:", error);

    res.status(500).json({
      message: "Failed to get document",
      error: error.message,
    });
  }
};

/*
========================================
UPDATE DOCUMENT
PUT /api/documents/:documentId
========================================

This endpoint is for normal REST updates.

Realtime editing is still handled by editorSocket.js,
where ONLY the current driver can edit.
*/

const updateDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { content, language, name } = req.body;

    const document = await Document.findById(documentId);

    if (!document) {
      return res.status(404).json({
        message: "Document not found",
      });
    }

    const room = await Room.findById(document.room);

    if (!room) {
      return res.status(404).json({
        message: "Room not found",
      });
    }

    if (!isMember(room, req.user.id)) {
      return res.status(403).json({
        message: "You are not a member of this room",
      });
    }

    /*
    ========================================
    CONTENT
    ========================================
    */

    if (content !== undefined) {
      if (typeof content !== "string") {
        return res.status(400).json({
          message: "Content must be a string",
        });
      }

      if (content.length > 1000000) {
        return res.status(400).json({
          message: "Document content is too large",
        });
      }

      document.content = content;
    }

    /*
    ========================================
    LANGUAGE
    ========================================
    */

    if (language !== undefined) {
      if (
        typeof language !== "string" ||
        !language.trim()
      ) {
        return res.status(400).json({
          message: "Invalid language",
        });
      }

      document.language = language.trim();
    }

    /*
    ========================================
    NAME
    ========================================
    */

    if (name !== undefined) {
      if (
        typeof name !== "string" ||
        !name.trim()
      ) {
        return res.status(400).json({
          message: "Invalid document name",
        });
      }

      const trimmedName = name.trim();

      if (trimmedName.length > 100) {
        return res.status(400).json({
          message:
            "Document name cannot exceed 100 characters",
        });
      }

      // Check if another document already uses this name
      const duplicate = await Document.findOne({
        room: room._id,
        name: trimmedName,
        _id: {
          $ne: document._id,
        },
      });

      if (duplicate) {
        return res.status(409).json({
          message:
            "A document with this name already exists",
        });
      }

      document.name = trimmedName;
    }

    document.updatedBy = req.user.id;

    document.version += 1;

    await document.save();

    await document.populate([
      {
        path: "createdBy",
        select: "username avatar",
      },
      {
        path: "updatedBy",
        select: "username avatar",
      },
    ]);

    res.json({
      message: "Document updated successfully",
      document,
    });
  } catch (error) {
    console.error("UPDATE DOCUMENT ERROR:", error);

    res.status(500).json({
      message: "Failed to update document",
      error: error.message,
    });
  }
};

/*
========================================
DELETE DOCUMENT
DELETE /api/documents/:documentId
========================================
*/

const deleteDocument = async (req, res) => {
  try {
    const { documentId } = req.params;

    const document = await Document.findById(documentId);

    if (!document) {
      return res.status(404).json({
        message: "Document not found",
      });
    }

    const room = await Room.findById(document.room);

    if (!room) {
      return res.status(404).json({
        message: "Room not found",
      });
    }

    if (!isOwnerOrAdmin(room, req.user.id)) {
      return res.status(403).json({
        message:
          "Only the owner or admin can delete documents",
      });
    }

    await Document.findByIdAndDelete(documentId);

    res.json({
      message: "Document deleted successfully",
    });
  } catch (error) {
    console.error("DELETE DOCUMENT ERROR:", error);

    res.status(500).json({
      message: "Failed to delete document",
      error: error.message,
    });
  }
};

module.exports = {
  createDocument,
  getRoomDocuments,
  getDocument,
  updateDocument,
  deleteDocument,
};