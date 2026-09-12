// backend/services/conversationService.js
const Conversation = require("../models/Conversation");
const Room = require("../models/Room");

// ── Existing: room + workspace + DM ────────────────────────────
const getOrCreateRoomConversation = async (roomId) => {
  let conv = await Conversation.findOne({ room: roomId, type: "room" });
  if (conv) return conv;

  const room = await Room.findById(roomId).select("members");
  if (!room) throw new Error("Room not found");

  conv = await Conversation.create({
    type: "room",
    room: roomId,
    participants: room.members.map((m) => ({ user: m.user._id || m.user })),
  });

  return conv;
};

const getOrCreateWorkspaceConversation = async (roomId) => {
  let conv = await Conversation.findOne({ room: roomId, type: "workspace" });
  if (conv) return conv;

  const room = await Room.findById(roomId).select("members");
  if (!room) throw new Error("Room not found");

  conv = await Conversation.create({
    type: "workspace",
    room: roomId,
    participants: room.members.map((m) => ({ user: m.user._id || m.user })),
  });

  return conv;
};

const getOrCreateDM = async (roomId, userAId, userBId) => {
  if (String(userAId) === String(userBId)) {
    throw new Error("Cannot create a DM with yourself");
  }

  const pair = [userAId, userBId];

  let conv = await Conversation.findOne({
    room: roomId,
    type: "dm",
    "participants.user": { $all: pair },
    $expr: { $eq: [{ $size: "$participants" }, 2] },
  });

  if (conv) return conv;

  conv = await Conversation.create({
    type: "dm",
    room: roomId,
    participants: pair.map((u) => ({ user: u })),
    createdBy: userAId,
  });

  return conv;
};

// ── NEW: Discussions ───────────────────────────────────────────
/*
 * Create a discussion. Same shape as the old createGroup, but
 * accepts an optional `bots` array.
 */
const createDiscussion = async ({
  roomId,
  name,
  participantIds,
  bots = [],
  createdBy,
}) => {
  if (!name || !name.trim()) throw new Error("Discussion name is required");
  if (!Array.isArray(participantIds) || participantIds.length < 1) {
    throw new Error("A discussion needs at least one other participant");
  }

  const allHumans = Array.from(
    new Set([...participantIds.map(String), String(createdBy)])
  );

  // Validate bot shape.
  const cleanBots = bots
    .filter((b) => b && b.name && b.provider)
    .map((b) => ({
      name: String(b.name).trim().slice(0, 60),
      provider: b.provider,
      model: b.model || null,
      instructions: (b.instructions || "").slice(0, 500),
      avatar: b.avatar || "",
      createdBy,
    }));

  const conv = await Conversation.create({
    type: "discussion",
    room: roomId,
    name: name.trim(),
    participants: allHumans.map((u) => ({
      user: u,
      role: String(u) === String(createdBy) ? "admin" : "member",
    })),
    bots: cleanBots,
    createdBy,
  });

  return conv;
};

/*
 * Rename existing group → discussion is a no-op for the DB schema
 * (they already share structure), but this helper converts them if
 * you ever want to normalize.
 */
const normalizeGroupToDiscussion = async (conversationId) => {
  await Conversation.updateOne(
    { _id: conversationId, type: "group" },
    { $set: { type: "discussion" } }
  );
};

const populateConversation = async (conv) => {
  await conv.populate([
    { path: "participants.user", select: "username avatar status" },
    { path: "room", select: "name" },
    { path: "createdBy", select: "username avatar" },
  ]);
  return conv;
};

module.exports = {
  getOrCreateRoomConversation,
  getOrCreateWorkspaceConversation,
  getOrCreateDM,
  createDiscussion,
  normalizeGroupToDiscussion,
  populateConversation,
};