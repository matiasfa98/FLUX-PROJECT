const express = require("express");

const {
  createDocument,
  getRoomDocuments,
  getDocument,
  updateDocument,
  deleteDocument
} = require("../controllers/documentController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

// Room documents
router.post(
  "/rooms/:roomId",
  createDocument
);

router.get(
  "/rooms/:roomId",
  getRoomDocuments
);

// Individual document
router.get(
  "/:documentId",
  getDocument
);

router.put(
  "/:documentId",
  updateDocument
);

router.delete(
  "/:documentId",
  deleteDocument
);

module.exports = router;