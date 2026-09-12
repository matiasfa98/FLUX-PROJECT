// backend/server.js
require("dotenv").config();
const getLanIp = require("../get-ip");
console.log("[cloudinary] configured for:", process.env.CLOUDINARY_CLOUD_NAME || "(MISSING)");

const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const reconcileService = require("./services/reconcileService");

const authRoutes = require("./routes/authRoutes");
const roomRoutes = require("./routes/roomRoutes");
const messageRoutes = require("./routes/messageRoutes");
const fileRoutes = require("./routes/fileRoutes");
const executionRoutes = require("./routes/executionRoutes");
const mediaRoutes = require("./routes/mediaRoutes");
// NOTE: documentRoutes removed. Documents are no longer a concept;
// files/folders are backed by disk and indexed via the File model.

const setupSocket = require("./sockets/socket");
const LAN_IP = getLanIp();
console.log(`[net] detected LAN IP: ${LAN_IP}`);
// Connect MongoDB
connectDB();

// Create Express app
const app = express();

// Parse CLIENT_URL from .env into clean origins (removing trailing slashes)
const allowedOrigins = (process.env.CLIENT_URL || "")
  .split(",")
  .map((url) => url.trim().replace(/\/$/, ""))
  .filter(Boolean);

const checkOrigin = (origin, callback) => {
  // Allow requests without Origin (curl, server-to-server, mobile native)
  if (!origin) return callback(null, true);

  const cleanOrigin = origin.replace(/\/$/, "");

  // Match against .env list or local development subnets
  const isAllowed =
    allowedOrigins.includes(cleanOrigin) ||
    cleanOrigin.includes("localhost") ||
    cleanOrigin.includes("127.0.0.1") ||
    cleanOrigin.includes(LAN_IP) ||
    cleanOrigin.startsWith("http://192.168.") ||
    cleanOrigin.startsWith("http://10.");

  if (isAllowed) {
    return callback(null, true);
  }

  // Pass false cleanly without throwing an uncaught exception.
  return callback(null, false);
};

// Middleware
app.use(
  cors({
    origin: checkOrigin,
    credentials: true,
  })
);

app.use(express.json({ limit: "15mb" }));

// Test route
app.get("/", (req, res) => {
  res.json({
    name: "Flux API",
    status: "running",
    version: "1.1.0",
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/execution", executionRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/chat", require("./routes/chatRoutes"));
app.use("/api/ai", require("./routes/aiRoutes"));
app.use("/api/ai", require("./routes/aiRoutes"));
app.use("/api/attachments", require("./routes/attachmentRoutes"));


// Create HTTP server
const server = http.createServer(app);

// Create Socket.IO server
const io = new Server(server, {
  cors: {
    origin: checkOrigin,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.set("io", io);

// Setup all Flux socket features
setupSocket(io);

// Start server (bind to 0.0.0.0 so external devices on LAN can connect)
const PORT = process.env.PORT || 4000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Flux server running on port ${PORT}`);

  /*
  |--------------------------------------------------------------------------
  | BOOT-TIME RECONCILIATION
  |--------------------------------------------------------------------------
  |
  | Disk is the source of truth. On every boot, walk each room folder
  | on disk and re-sync the MongoDB File index to match.
  |
  | This heals drift from:
  |   - manual SSH edits to room folders
  |   - crashes that left disk ahead of Mongo (or vice versa)
  |   - data migrations from older versions that used a different model
  |
  | Runs after `listen` so it never blocks incoming traffic. Errors are
  | logged but do not crash the server.
  |
  |--------------------------------------------------------------------------
  */
  reconcileService
    .reconcileAllRooms()
    .then(() => {
      console.log("[reconcile] boot-time reconciliation complete");
    })
    .catch((err) => {
      console.error("[reconcile] boot-time reconciliation failed:", err.message);
    });
});