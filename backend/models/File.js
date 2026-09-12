// backend/models/File.js
const mongoose = require("mongoose");

/*
|--------------------------------------------------------------------------
| File (INDEX ENTRY — NOT SOURCE OF TRUTH)
|--------------------------------------------------------------------------
|
| Disk is the source of truth for the room workspace:
|
|   backend/storage/rooms/:roomId/
|
| This collection is a *derived index* that mirrors what's on disk so
| queries and UI don't have to hit the filesystem constantly.
|
| Rules:
|   - Every write goes to disk FIRST, then this index is reconciled.
|   - If this index drifts, reconcileService.reconcileRoom() rebuilds it
|     from disk. Disk always wins.
|   - Content is NEVER stored here. Only metadata.
|
|--------------------------------------------------------------------------
*/

const fileSchema = new mongoose.Schema(
  {
    // Every File doc belongs to exactly one room.
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      index: true,
    },

    /*
     * Canonical identity for this entry: the path of the file/folder
     * relative to the room root, using forward slashes.
     *
     * Examples:
     *   "main.js"
     *   "utils/helper.js"
     *   "utils/math/add.js"
     *
     * This MUST exactly match what's on disk. The reconciler enforces it.
     */
    path: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    /*
     * Last segment of `path`. Denormalized for convenience.
     * Example: "add.js"
     */
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },

    /*
     * Parent folder's File _id (or null for root-level entries).
     * Denormalized for tree rendering. Rebuilt by the reconciler
     * whenever the folder structure changes.
     */
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "File",
      default: null,
      index: true,
    },

    type: {
      type: String,
      enum: ["file", "folder"],
      required: true,
    },

    /*
     * Best-effort language hint, derived from the file extension.
     * The UI may override this per-file, but the reconciler will
     * reset it to the disk-derived value on resync.
     */
    language: {
      type: String,
      default: "plaintext",
    },

    /*
     * File size in bytes (0 for folders). Mirrors fs.stat().size.
     */
    size: {
      type: Number,
      default: 0,
    },

    /*
     * Monotonic counter incremented on every save over the socket.
     * Used by clients for optimistic concurrency.
     * NOT the source of truth for content — that's always disk.
     */
    version: {
      type: Number,
      default: 0,
    },

    /*
     * Who originally created this entry, if known.
     * May be null for files discovered by the reconciler from disk
     * (e.g. a file dropped in via SSH).
     */
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    /*
     * Who last modified this entry via the app, if known.
     */
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/*
 * A given room cannot have two entries with the same path.
 * `(room, path)` is the identity of an index entry.
 */
fileSchema.index({ room: 1, path: 1 }, { unique: true });

module.exports = mongoose.model("File", fileSchema);