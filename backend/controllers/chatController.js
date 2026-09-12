// backend/controllers/chatController.js
const mongoose = require("mongoose");

const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const Room = require("../models/Room");
const conversationService = require("../services/conversationService");

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/
const isMember = (room, userId) =>
  room.members.some((m) => {
    const id = m.user?._id || m.user;
    return id && String(id) === String(userId);
  });

const isParticipant = (conv, userId) =>
  conv.participants.some((p) => {
    const id = p.user?._id || p.user;
    return id && String(id) === String(userId);
  });

const shapeConversation = (c) => ({
  id: String(c._id),
  type: c.type,
  name: c.name,
  description: c.description || "",
  room: c.room ? { id: String(c.room._id), name: c.room.name } : null,
  participants: (c.participants || []).map((p) => ({
    id: String(p.user._id),
    username: p.user.username,
    avatar: p.user.avatar,
    status: p.user.status,
    role: p.role,
  })),
  bots: (c.bots || []).map((b) => ({
    id: String(b._id),
    name: b.name,
    provider: b.provider,
    model: b.model,
    instructions: b.instructions,
    avatar: b.avatar,
    addedAt: b.addedAt,
  })),
  lastMessageAt: c.lastMessageAt,
  lastMessagePreview: c.lastMessagePreview,
  unreadCount: c.unreadCount || 0,
});

/*
|--------------------------------------------------------------------------
| GET INBOX
|--------------------------------------------------------------------------
*/
const getInbox = async (req, res) => {
  try {
    const userId = req.user.id;

    const conversations = await Conversation.find({
      "participants.user": userId,
      // The workspace conversation is not part of the /chat inbox.
      type: { $ne: "workspace" },
    })
      .populate("participants.user", "username avatar status")
      .populate("room", "name")
      .sort({ lastMessageAt: -1 })
      .limit(200)
      .lean();

    const convIds = conversations.map((c) => c._id);

    // Compute unread counts in one aggregation pass.
    const unreadAgg = await Message.aggregate([
      {
        $match: {
          conversation: { $in: convIds },
          sender: { $ne: new mongoose.Types.ObjectId(userId) },
          senderBot: null,
          deletedAt: null,
        },
      },
      {
        $lookup: {
          from: "conversations",
          localField: "conversation",
          foreignField: "_id",
          as: "conv",
        },
      },
      { $unwind: "$conv" },
      {
        $addFields: {
          me: {
            $arrayElemAt: [
              {
                $filter: {
                  input: "$conv.participants",
                  cond: {
                    $eq: ["$$this.user", new mongoose.Types.ObjectId(userId)],
                  },
                },
              },
              0,
            ],
          },
        },
      },
      {
        $match: {
          $expr: {
            $or: [
              { $eq: ["$me.lastReadAt", null] },
              { $gt: ["$createdAt", "$me.lastReadAt"] },
            ],
          },
        },
      },
      {
        $group: {
          _id: "$conversation",
          count: { $sum: 1 },
        },
      },
    ]);

    const unreadMap = {};
    for (const row of unreadAgg) {
      unreadMap[String(row._id)] = row.count;
    }

    const shaped = conversations.map((c) =>
      shapeConversation({
        ...c,
        unreadCount: unreadMap[String(c._id)] || 0,
      })
    );

    return res.json({ conversations: shaped });
  } catch (err) {
    console.error("GET INBOX ERROR:", err);
    return res.status(500).json({ message: "Failed to load inbox" });
  }
};

/*
|--------------------------------------------------------------------------
| GET ONE CONVERSATION
|--------------------------------------------------------------------------
*/
const getConversation = async (req, res) => {
  try {
    const conv = await Conversation.findById(req.params.id)
      .populate("participants.user", "username avatar status")
      .populate("room", "name");

    if (!conv) return res.status(404).json({ message: "Conversation not found" });
    if (!isParticipant(conv, req.user.id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    return res.json({ conversation: shapeConversation(conv.toObject()) });
  } catch (err) {
    console.error("GET CONVERSATION ERROR:", err);
    return res.status(500).json({ message: "Failed to load conversation" });
  }
};

/*
|--------------------------------------------------------------------------
| CREATE CONVERSATION
|--------------------------------------------------------------------------
| Body: { roomId, type: "dm"|"discussion", peerId?, name?, participantIds?, bots? }
*/
const createConversation = async (req, res) => {
  try {
    const { roomId, type, peerId, name, participantIds, bots } = req.body || {};
    const userId = req.user.id;

    if (!roomId) return res.status(400).json({ message: "roomId is required" });

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });
    if (!isMember(room, userId)) {
      return res.status(403).json({ message: "You are not a member of this room" });
    }

    let conv;

    if (type === "dm") {
      if (!peerId) return res.status(400).json({ message: "peerId is required for DM" });
      if (!isMember(room, peerId)) {
        return res.status(400).json({ message: "Peer is not a member of this room" });
      }
      conv = await conversationService.getOrCreateDM(roomId, userId, peerId);
    } else if (type === "discussion" || type === "group") {
      if (!Array.isArray(participantIds) || participantIds.length < 1) {
        return res.status(400).json({
          message: "Discussion needs at least 1 other participant",
        });
      }

      for (const pid of participantIds) {
        if (!isMember(room, pid)) {
          return res
            .status(400)
            .json({ message: `User ${pid} is not a member of this room` });
        }
      }

      conv = await conversationService.createDiscussion({
        roomId,
        name,
        participantIds,
        bots: Array.isArray(bots) ? bots : [],
        createdBy: userId,
      });
    } else {
      return res.status(400).json({ message: "Invalid conversation type" });
    }

    await conversationService.populateConversation(conv);

    const io = req.app.get("io");
    if (io) {
      io.emit("conversation:created", {
        conversationId: String(conv._id),
        participantIds: conv.participants.map((p) =>
          String(p.user._id || p.user)
        ),
      });
    }

    return res.status(201).json({ conversation: shapeConversation(conv.toObject()) });
  } catch (err) {
    console.error("CREATE CONVERSATION ERROR:", err);
    return res.status(500).json({
      message: err.message || "Failed to create conversation",
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET MESSAGES (paginated)
|--------------------------------------------------------------------------
*/
const getMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const { before, limit = 50 } = req.query;

    const conv = await Conversation.findById(id);
    if (!conv) return res.status(404).json({ message: "Conversation not found" });
    if (!isParticipant(conv, req.user.id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const query = {
      conversation: id,
      deletedAt: null,
    };

    if (before) {
      const pivot = await Message.findById(before).select("createdAt").lean();
      if (pivot) query.createdAt = { $lt: pivot.createdAt };
    }

    const max = Math.min(Number(limit) || 50, 100);

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(max)
      .populate("sender", "username avatar")
      .populate("attachments")
      .populate("inReplyTo", "text sender")
      .lean();

    messages.reverse();

    const shaped = messages.map((m) => ({
      id: String(m._id),
      conversationId: String(m.conversation),
      sender: m.sender
        ? {
            id: String(m.sender._id),
            username: m.sender.username,
            avatar: m.sender.avatar,
          }
        : null,
      senderBot: m.senderBot
        ? {
            id: String(m.senderBot.id),
            name: m.senderBot.name,
            provider: m.senderBot.provider,
            model: m.senderBot.model,
            avatar: m.senderBot.avatar,
          }
        : null,
      text: m.text,
      createdAt: m.createdAt,
      editedAt: m.editedAt,
      readBy: (m.readBy || []).map((r) => String(r.user)),
      attachments: (m.attachments || []).map((a) => ({
        id: String(a._id),
        originalName: a.originalName,
        mimeType: a.mimeType,
        size: a.size,
        url: a.url,
      })),
      replyTo: m.replyTo
        ? { id: String(m.replyTo._id), text: m.replyTo.text }
        : null,
    }));

    return res.json({ messages: shaped, hasMore: messages.length === max });
  } catch (err) {
    console.error("GET MESSAGES ERROR:", err);
    return res.status(500).json({ message: "Failed to load messages" });
  }
};

/*
|--------------------------------------------------------------------------
| MARK AS READ
|--------------------------------------------------------------------------
*/
const markRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const conv = await Conversation.findById(id);
    if (!conv) return res.status(404).json({ message: "Conversation not found" });
    if (!isParticipant(conv, userId)) {
      return res.status(403).json({ message: "Access denied" });
    }

    await Conversation.updateOne(
      { _id: id, "participants.user": userId },
      { $set: { "participants.$.lastReadAt": new Date() } }
    );

    await Message.updateMany(
      {
        conversation: id,
        sender: { $ne: userId },
        "readBy.user": { $ne: userId },
        deletedAt: null,
      },
      { $push: { readBy: { user: userId, at: new Date() } } }
    );

    const io = req.app.get("io");
    if (io) {
      io.to(`conv:${id}`).emit("chat:read", {
        conversationId: id,
        userId: String(userId),
      });
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error("MARK READ ERROR:", err);
    return res.status(500).json({ message: "Failed to mark as read" });
  }
};

/*
|--------------------------------------------------------------------------
| LEAVE DISCUSSION
|--------------------------------------------------------------------------
*/
const leaveGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const conv = await Conversation.findById(id);
    if (!conv) return res.status(404).json({ message: "Conversation not found" });
    if (conv.type !== "discussion" && conv.type !== "group") {
      return res
        .status(400)
        .json({ message: "Can only leave discussion conversations" });
    }
    if (!isParticipant(conv, userId)) {
      return res.status(403).json({ message: "You are not in this discussion" });
    }

    conv.participants = conv.participants.filter(
      (p) => String(p.user?._id || p.user) !== String(userId)
    );
    await conv.save();

    return res.json({ ok: true });
  } catch (err) {
    console.error("LEAVE DISCUSSION ERROR:", err);
    return res.status(500).json({ message: "Failed to leave discussion" });
  }
};

/*
|--------------------------------------------------------------------------
| ADD BOT TO DISCUSSION (REST fallback)
|--------------------------------------------------------------------------
| Body: { name, provider, model?, instructions?, avatar? }
*/
const addBot = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, provider, model, instructions, avatar } = req.body || {};
    const userId = req.user.id;

    if (!name || !provider) {
      return res.status(400).json({ message: "name and provider are required" });
    }

    const conv = await Conversation.findById(id);
    if (!conv) return res.status(404).json({ message: "Conversation not found" });
    if (!isParticipant(conv, userId)) {
      return res.status(403).json({ message: "Access denied" });
    }
    if (conv.type !== "discussion" && conv.type !== "group") {
      return res
        .status(400)
        .json({ message: "Bots can only be added to discussions" });
    }

    conv.bots.push({
      name: String(name).trim().slice(0, 60),
      provider,
      model: model || null,
      instructions: (instructions || "").slice(0, 500),
      avatar: avatar || "",
      createdBy: userId,
    });

    await conv.save();

    const newBot = conv.bots[conv.bots.length - 1];

    const io = req.app.get("io");
    if (io) {
      io.to(`conv:${conv._id}`).emit("discussion:bot-added", {
        conversationId: String(conv._id),
        bot: {
          id: String(newBot._id),
          name: newBot.name,
          provider: newBot.provider,
          model: newBot.model,
          instructions: newBot.instructions,
          avatar: newBot.avatar,
          addedAt: newBot.addedAt,
        },
      });
    }

    return res.status(201).json({
      bot: {
        id: String(newBot._id),
        name: newBot.name,
        provider: newBot.provider,
        model: newBot.model,
        instructions: newBot.instructions,
        avatar: newBot.avatar,
      },
    });
  } catch (err) {
    console.error("ADD BOT ERROR:", err);
    return res.status(500).json({ message: "Failed to add bot" });
  }
};

/*
|--------------------------------------------------------------------------
| REMOVE BOT FROM DISCUSSION (REST fallback)
|--------------------------------------------------------------------------
*/
const removeBot = async (req, res) => {
  try {
    const { id, botId } = req.params;
    const userId = req.user.id;

    const conv = await Conversation.findById(id);
    if (!conv) return res.status(404).json({ message: "Conversation not found" });
    if (!isParticipant(conv, userId)) {
      return res.status(403).json({ message: "Access denied" });
    }

    conv.bots = conv.bots.filter((b) => String(b._id) !== String(botId));
    await conv.save();

    const io = req.app.get("io");
    if (io) {
      io.to(`conv:${conv._id}`).emit("discussion:bot-removed", {
        conversationId: String(conv._id),
        botId: String(botId),
      });
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error("REMOVE BOT ERROR:", err);
    return res.status(500).json({ message: "Failed to remove bot" });
  }
};

module.exports = {
  getInbox,
  getConversation,
  createConversation,
  getMessages,
  markRead,
  leaveGroup,
  addBot,
  removeBot,
};