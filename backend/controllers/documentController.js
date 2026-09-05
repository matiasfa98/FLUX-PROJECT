const Document = require("../models/Document");
const Room = require("../models/Room");

// ======================================
// CHECK ROOM MEMBERSHIP
// ======================================

const isMember = (room, userId) => {
  return room.members.some(
    (member) => member.user.toString() === userId
  );
};


// ======================================
// CREATE DOCUMENT
// ======================================

const createDocument = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { name, language, content } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "Document name is required"
      });
    }

    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({
        message: "Room not found"
      });
    }

    if (!isMember(room, req.user.id)) {
      return res.status(403).json({
        message: "You are not a member of this room"
      });
    }

    const existingDocument = await Document.findOne({
      room: roomId,
      name: name.trim()
    });

    if (existingDocument) {
      return res.status(409).json({
        message: "A document with this name already exists"
      });
    }

    const document = await Document.create({
      room: roomId,
      name: name.trim(),
      content: content || "",
      language: language || "javascript",
      createdBy: req.user.id,
      updatedBy: req.user.id
    });

    res.status(201).json({
      message: "Document created successfully",
      document
    });

  } catch (error) {
    console.error("Create document error:", error);

    res.status(500).json({
      message: "Failed to create document"
    });
  }
};


// ======================================
// GET ROOM DOCUMENTS
// ======================================

const getRoomDocuments = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({
        message: "Room not found"
      });
    }

    if (!isMember(room, req.user.id)) {
      return res.status(403).json({
        message: "You are not a member of this room"
      });
    }

    const documents = await Document.find({
      room: roomId
    })
      .select("-content")
      .populate("createdBy", "username avatar")
      .populate("updatedBy", "username avatar")
      .sort({ name: 1 });

    res.json({
      documents
    });

  } catch (error) {
    console.error("Get documents error:", error);

    res.status(500).json({
      message: "Failed to get documents"
    });
  }
};


// ======================================
// GET SINGLE DOCUMENT
// ======================================

const getDocument = async (req, res) => {
  try {
    const document = await Document.findById(
      req.params.documentId
    )
      .populate("createdBy", "username avatar")
      .populate("updatedBy", "username avatar");

    if (!document) {
      return res.status(404).json({
        message: "Document not found"
      });
    }

    const room = await Room.findById(document.room);

    if (!room || !isMember(room, req.user.id)) {
      return res.status(403).json({
        message: "You do not have access to this document"
      });
    }

    res.json({
      document
    });

  } catch (error) {
    console.error("Get document error:", error);

    res.status(500).json({
      message: "Failed to get document"
    });
  }
};


// ======================================
// UPDATE DOCUMENT
// ======================================

const updateDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { content, language } = req.body;

    const document = await Document.findById(documentId);

    if (!document) {
      return res.status(404).json({
        message: "Document not found"
      });
    }

    const room = await Room.findById(document.room);

    if (!room || !isMember(room, req.user.id)) {
      return res.status(403).json({
        message: "You do not have access to this document"
      });
    }

    if (content !== undefined) {
      if (typeof content !== "string") {
        return res.status(400).json({
          message: "Content must be a string"
        });
      }

      if (content.length > 1000000) {
        return res.status(400).json({
          message: "Document is too large"
        });
      }

      document.content = content;
    }

    if (language !== undefined) {
      document.language = language;
    }

    document.updatedBy = req.user.id;
    document.version += 1;

    await document.save();

    res.json({
      message: "Document updated successfully",
      document
    });

  } catch (error) {
    console.error("Update document error:", error);

    res.status(500).json({
      message: "Failed to update document"
    });
  }
};


// ======================================
// DELETE DOCUMENT
// ======================================

const deleteDocument = async (req, res) => {
  try {
    const document = await Document.findById(
      req.params.documentId
    );

    if (!document) {
      return res.status(404).json({
        message: "Document not found"
      });
    }

    const room = await Room.findById(document.room);

    if (!room || !isMember(room, req.user.id)) {
      return res.status(403).json({
        message: "You do not have access to this document"
      });
    }

    await document.deleteOne();

    res.json({
      message: "Document deleted successfully"
    });

  } catch (error) {
    console.error("Delete document error:", error);

    res.status(500).json({
      message: "Failed to delete document"
    });
  }
};


module.exports = {
  createDocument,
  getRoomDocuments,
  getDocument,
  updateDocument,
  deleteDocument
};