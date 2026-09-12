// backend/services/fileService.js
const fs = require("fs/promises");
const path = require("path");

/*
|--------------------------------------------------------------------------
| STORAGE ROOT
|--------------------------------------------------------------------------
|
| Disk is the source of truth. Everything under this directory is
| considered canonical for a given room.
|
|--------------------------------------------------------------------------
*/

const STORAGE_ROOT = path.resolve(
  process.env.FLUX_STORAGE_PATH || "./storage/rooms"
);

const getRoomRoot = (roomId) => {
  return path.join(STORAGE_ROOT, String(roomId));
};

const ensureRoomRoot = async (roomId) => {
  const roomRoot = getRoomRoot(roomId);
  await fs.mkdir(roomRoot, { recursive: true });
  return roomRoot;
};

/*
|--------------------------------------------------------------------------
| NAME VALIDATION
|--------------------------------------------------------------------------
*/

const validateName = (name) => {
  if (typeof name !== "string") {
    throw new Error("Invalid file name");
  }

  const clean = name.trim();

  if (!clean) {
    throw new Error("File name cannot be empty");
  }

  if (clean === "." || clean === "..") {
    throw new Error("Invalid file name");
  }

  if (
    clean.includes("/") ||
    clean.includes("\\") ||
    clean.includes("\0")
  ) {
    throw new Error("File name cannot contain path separators");
  }

  if (clean.length > 255) {
    throw new Error("File name is too long");
  }

  return clean;
};

/*
|--------------------------------------------------------------------------
| SAFE PATH RESOLUTION
|--------------------------------------------------------------------------
*/

const resolveSafePath = async (roomId, relativePath = "") => {
  const roomRoot = await ensureRoomRoot(roomId);
  const target = path.resolve(roomRoot, relativePath);

  if (
    target !== roomRoot &&
    !target.startsWith(roomRoot + path.sep)
  ) {
    throw new Error("Invalid path");
  }

  return target;
};

/*
|--------------------------------------------------------------------------
| PRIMITIVES
|--------------------------------------------------------------------------
*/

const createFolder = async (roomId, relativePath) => {
  const target = await resolveSafePath(roomId, relativePath);
  await fs.mkdir(target, { recursive: false });
  return target;
};

const ensureFolder = async (roomId, relativePath) => {
  const target = await resolveSafePath(roomId, relativePath);
  await fs.mkdir(target, { recursive: true });
  return target;
};

const ensureParentDir = async (roomId, relativePath) => {
  const dirname = path.dirname(relativePath);
  if (!dirname || dirname === ".") return;
  await ensureFolder(roomId, dirname);
};

const createFile = async (roomId, relativePath, content = "") => {
  await ensureParentDir(roomId, relativePath);
  const target = await resolveSafePath(roomId, relativePath);
  await fs.writeFile(target, content, { encoding: "utf8", flag: "wx" });
  return target;
};

const readFile = async (roomId, relativePath) => {
  const target = await resolveSafePath(roomId, relativePath);
  return fs.readFile(target, "utf8");
};

const writeFile = async (roomId, relativePath, content) => {
  await ensureParentDir(roomId, relativePath);
  const target = await resolveSafePath(roomId, relativePath);
  await fs.writeFile(target, content, "utf8");
  return target;
};

const rename = async (roomId, oldPath, newPath) => {
  const oldTarget = await resolveSafePath(roomId, oldPath);
  const newTarget = await resolveSafePath(roomId, newPath);

  const newDir = path.dirname(newTarget);
  await fs.mkdir(newDir, { recursive: true });

  await fs.rename(oldTarget, newTarget);
  return newTarget;
};

const move = async (roomId, oldPath, newPath) => {
  return rename(roomId, oldPath, newPath);
};

const remove = async (roomId, relativePath) => {
  const target = await resolveSafePath(roomId, relativePath);
  await fs.rm(target, { recursive: true, force: false });
};

const exists = async (roomId, relativePath) => {
  try {
    const target = await resolveSafePath(roomId, relativePath);
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
};

/*
|--------------------------------------------------------------------------
| DISCOVERY HELPERS
|--------------------------------------------------------------------------
*/

const statPath = async (roomId, relativePath) => {
  const target = await resolveSafePath(roomId, relativePath);
  const stat = await fs.stat(target);
  return {
    isFile: stat.isFile(),
    isDirectory: stat.isDirectory(),
    size: stat.size,
    mtime: stat.mtime,
  };
};

const listDir = async (roomId, relativePath = "") => {
  const target = await resolveSafePath(roomId, relativePath);
  const entries = await fs.readdir(target, { withFileTypes: true });

  const out = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      out.push({ name: entry.name, type: "folder" });
    } else if (entry.isFile()) {
      out.push({ name: entry.name, type: "file" });
    }
  }
  return out;
};

/**
 * Recursively walk a room's directory tree.
 *
 * Returns: [{ path, name, type, size }]
 *   - path is relative to room root, forward slashes
 *   - folders included with size 0
 */
const walkRoom = async (roomId) => {
  const root = await ensureRoomRoot(roomId);
  const results = [];

  const walk = async (dir, prefix) => {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const absPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        results.push({
          path: relPath,
          name: entry.name,
          type: "folder",
          size: 0,
        });
        await walk(absPath, relPath);
      } else if (entry.isFile()) {
        let size = 0;
        try {
          const stat = await fs.stat(absPath);
          size = stat.size;
        } catch {
          size = 0;
        }
        results.push({
          path: relPath,
          name: entry.name,
          type: "file",
          size,
        });
      }
    }
  };

  await walk(root, "");
  return results;
};

/**
 * List every room ID that has a folder on disk.
 * A "room ID" here is the name of a subdirectory of STORAGE_ROOT.
 */
const listRoomIds = async () => {
  await fs.mkdir(STORAGE_ROOT, { recursive: true });

  const entries = await fs.readdir(STORAGE_ROOT, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
};

module.exports = {
  STORAGE_ROOT,
  getRoomRoot,
  ensureRoomRoot,
  validateName,
  resolveSafePath,

  // primitives
  createFolder,
  ensureFolder,
  ensureParentDir,
  createFile,
  readFile,
  writeFile,
  rename,
  move,
  remove,
  exists,

  // discovery
  statPath,
  listDir,
  walkRoom,
  listRoomIds,
};