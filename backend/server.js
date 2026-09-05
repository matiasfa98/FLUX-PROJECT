require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const roomRoutes = require("./routes/roomRoutes");
const messageRoutes = require("./routes/messageRoutes");
const documentRoutes = require("./routes/documentRoutes");

const setupSocket = require("./sockets/socket");

// Connect MongoDB
connectDB();

// Create Express app
const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true
  })
);

app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.json({
    name: "Flux API",
    status: "running",
    version: "1.0.0"
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/documents", documentRoutes);

// Create HTTP server
const server = http.createServer(app);

// Create Socket.IO server
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Setup all Flux socket features
setupSocket(io);

// Start server
const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`Flux server running on port ${PORT}`);
});