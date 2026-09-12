// backend/list-room-members.js
require("dotenv").config();
const mongoose = require("mongoose");

// ── IMPORT ALL MODELS THE ROOM SCHEMA REFERENCES ──
require("./models/User");
const Room = require("./models/Room");

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const rooms = await Room.find({})
      .populate("members.user", "username email")
      .populate("owner", "username email")
      .lean();

    for (const room of rooms) {
      console.log(`\n=== Room: ${room.name} (${room._id}) ===`);
      console.log(`    Owner: ${room.owner?.username} (${room.owner?._id})`);
      console.log(`    Members:`);

      for (const m of room.members || []) {
        const u = m.user;
        if (u) {
          console.log(`      ${u._id}  →  ${u.username}  |  ${u.email}`);
        }
      }
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error("Failed:", err.message);
    process.exit(1);
  }
})();