// backend/services/reconcileService.js
const path = require("path");

const File = require("../models/File");
const fileService = require("./fileService");

/*
|--------------------------------------------------------------------------
| LANGUAGE HINT
|--------------------------------------------------------------------------
|
| Best-effort mapping from file extension to language identifier.
| The UI can override this per-file, but the reconciler will reset it
| on resync so the index stays predictable.
|
|--------------------------------------------------------------------------
*/

const EXTENSION_TO_LANGUAGE = {
  ".js": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".jsx": "javascript",
  ".ts": "typescript",
  ".tsx": "typescript",
  ".py": "python",
  ".rs": "rust",
  ".go": "go",
  ".lua": "lua",
  ".cpp": "cpp",
  ".cc": "cpp",
  ".cxx": "cpp",
  ".h": "cpp",
  ".hpp": "cpp",
  ".c": "cpp",
  ".json": "json",
  ".md": "markdown",
  ".markdown": "markdown",
  ".html": "html",
  ".htm": "html",
  ".css": "css",
  ".scss": "css",
  ".sh": "shell",
  ".bash": "shell",
  ".zsh": "shell",
  ".yml": "yaml",
  ".yaml": "yaml",
  ".toml": "toml",
  ".xml": "xml",
  ".txt": "plaintext",
};

const guessLanguage = (name) => {
  const ext = path.extname(name || "").toLowerCase();
  return EXTENSION_TO_LANGUAGE[ext] || "plaintext";
};

/*
|--------------------------------------------------------------------------
| RECONCILE ROOM
|--------------------------------------------------------------------------
|
| Walks the disk tree for a given room and patches the MongoDB File
| index to match. Disk always wins.
|
| Steps:
|   1. Snapshot disk entries via fileService.walkRoom(roomId).
|   2. Snapshot Mongo entries via File.find({ room }).
|   3. Delete Mongo docs whose path is no longer on disk.
|   4. Update Mongo docs whose name/type/size drifted.
|   5. Insert new Mongo docs for disk entries Mongo doesn't know about,
|      processing folders shallow-to-deep so parent _ids resolve.
|   6. Return the reconciled, populated tree.
|
| Idempotent. Safe to call on every room join, after every write, or
| on a timer.
|
|--------------------------------------------------------------------------
*/

const reconcileRoom = async (roomId) => {
  const roomIdStr = String(roomId);

  // ---------------------------------------------------------------
  // 1. Ground truth from disk.
  // ---------------------------------------------------------------
  const diskEntries = await fileService.walkRoom(roomIdStr);

  const diskByPath = new Map();
  for (const entry of diskEntries) {
    diskByPath.set(entry.path, entry);
  }

  // ---------------------------------------------------------------
  // 2. Current index state from Mongo.
  // ---------------------------------------------------------------
  const mongoEntries = await File.find({ room: roomId }).lean();
  const mongoByPath = new Map();
  for (const entry of mongoEntries) {
    mongoByPath.set(entry.path, entry);
  }

  // ---------------------------------------------------------------
  // 3. Determine deletions and updates.
  // ---------------------------------------------------------------
  const idsToDelete = [];
  for (const entry of mongoEntries) {
    if (!diskByPath.has(entry.path)) {
      idsToDelete.push(entry._id);
    }
  }

  const updates = [];
  for (const entry of diskEntries) {
    const existing = mongoByPath.get(entry.path);
    if (!existing) continue;

    const drifted =
      existing.name !== entry.name ||
      existing.type !== entry.type ||
      existing.size !== entry.size;

    if (drifted) {
      updates.push({
        updateOne: {
          filter: { _id: existing._id },
          update: {
            $set: {
              name: entry.name,
              type: entry.type,
              size: entry.size,
              language:
                entry.type === "file"
                  ? existing.language && existing.language !== "plaintext"
                    ? existing.language
                    : guessLanguage(entry.name)
                  : "plaintext",
            },
          },
        },
      });
    }
  }

  // ---------------------------------------------------------------
  // 4. Apply deletions + updates in one pass.
  // ---------------------------------------------------------------
  if (idsToDelete.length > 0) {
    await File.deleteMany({ _id: { $in: idsToDelete } });
  }

  if (updates.length > 0) {
    await File.bulkWrite(updates, { ordered: false });
  }

  // ---------------------------------------------------------------
  // 5. Determine inserts (disk entries Mongo doesn't know about).
  //    Sort shallow-to-deep so parents exist when children reference them.
  // ---------------------------------------------------------------
  const toInsert = [];
  for (const entry of diskEntries) {
    if (!mongoByPath.has(entry.path)) {
      toInsert.push(entry);
    }
  }

  if (toInsert.length > 0) {
    toInsert.sort(
      (a, b) =>
        a.path.split("/").length - b.path.split("/").length
    );

    // Re-read the current index so we have fresh _ids after
    // deleteMany/bulkWrite above.
    const refreshed = await File.find({ room: roomId })
      .select("_id path")
      .lean();

    const pathToId = new Map();
    for (const doc of refreshed) {
      pathToId.set(doc.path, doc._id);
    }

    for (const entry of toInsert) {
      const parentPath = path.posix.dirname(entry.path);
      const parentId =
        parentPath && parentPath !== "." && parentPath !== ""
          ? pathToId.get(parentPath) || null
          : null;

      try {
        const created = await File.create({
          room: roomId,
          path: entry.path,
          name: entry.name,
          parent: parentId,
          type: entry.type,
          size: entry.size,
          language:
            entry.type === "file"
              ? guessLanguage(entry.name)
              : "plaintext",
          // createdBy/updatedBy intentionally null: this entry
          // was discovered on disk, not created via the app.
        });

        pathToId.set(entry.path, created._id);
      } catch (err) {
        // Race: another reconcile may have inserted this path already.
        // The unique (room, path) index makes that safe to swallow.
        if (err && err.code !== 11000) {
          console.error(
            `[reconcile] failed to insert ${entry.path}:`,
            err.message
          );
        }
      }
    }
  }

  // ---------------------------------------------------------------
  // 6. Return the reconciled, populated tree.
  // ---------------------------------------------------------------
  const tree = await File.find({ room: roomId })
    .populate("createdBy", "username avatar")
    .populate("updatedBy", "username avatar")
    .sort({ path: 1 })
    .lean();

  return tree;
};

/*
|--------------------------------------------------------------------------
| RECONCILE ALL ROOMS
|--------------------------------------------------------------------------
|
| Startup helper. Walk every room folder on disk and reconcile each.
| Heals any drift that accumulated before this change shipped.
|
|--------------------------------------------------------------------------
*/

const reconcileAllRooms = async () => {
  const roomIds = await fileService.listRoomIds();

  for (const roomId of roomIds) {
    try {
      await reconcileRoom(roomId);
      console.log(`[reconcile] room ${roomId} synced`);
    } catch (err) {
      console.error(
        `[reconcile] room ${roomId} failed:`,
        err.message
      );
    }
  }
};

module.exports = {
  reconcileRoom,
  reconcileAllRooms,
  guessLanguage,
};