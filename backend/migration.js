// backend/scripts/migrate-messages.js  (run manually: node scripts/migrate-messages.js)
require("dotenv").config();
const mongoose = require("mongoose");
const Message = require("./models/Message");
const Conversation = require("./models/Conversation");

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected. Migrating...");

  const oldMessages = await mongoose.connection
    .collection("messages")
    .find({ conversation: { $exists: false } })
    .toArray();

  console.log(`Found ${oldMessages.length} legacy messages`);

  for (const old of oldMessages) {
    // Find or create the conversation this message belongs to.
    let conv;

    if (old.kind === "room") {
      conv = await Conversation.findOne({
        room: old.room,
        type: "room",
      });
      if (!conv) {
        conv = await Conversation.create({
          type: "room",
          room: old.room,
          name: null,
          participants: [], // filled lazily when members load
        });
      }
    } else {
      // DM: find by the two participants.
      const pair = [old.sender, old.recipient].sort();
      conv = await Conversation.findOne({
        room: old.room,
        type: "dm",
        "participants.user": { $all: pair, $size: 2 },
      });
      if (!conv) {
        conv = await Conversation.create({
          type: "dm",
          room: old.room,
          participants: pair.map((u) => ({ user: u })),
        });
      }
    }

    await mongoose.connection.collection("messages").updateOne(
      { _id: old._id },
      {
        $set: {
          conversation: conv._id,
          readBy: old.readAt ? [{ user: old.recipient, at: old.readAt }] : [],
        },
        $unset: { recipient: "", kind: "", readAt: "" },
      }
    );

    await Conversation.updateOne(
      { _id: conv._id },
      {
        $set: {
          lastMessageAt: old.createdAt,
          lastMessagePreview: old.text?.slice(0, 80) || "",
        },
      }
    );
  }

  console.log("Migration complete");
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});