// backend/sockets/chatSocket.js
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const Room = require("../models/Room");
const Attachment = require("../models/Attachment");
const conversationService = require("../services/conversationService");
const botService = require("../services/botService");

module.exports = (io, socket) => {
  const userId = String(socket.user.id);

  /*
  |--------------------------------------------------------------------------
  | HELPERS
  |--------------------------------------------------------------------------
  */

  const isMember = (room, uid) =>
    room.members.some((m) => {
      const memberId = m.user?._id || m.user;
      return memberId && String(memberId) === String(uid);
    });

  const isParticipant = (conv, uid) =>
    conv.participants.some((p) => {
      const id = p.user?._id || p.user;
      return id && String(id) === String(uid);
    });

  const emitError = (message) => socket.emit("chat:error", { message });

  /*
  |--------------------------------------------------------------------------
  | AUTO-JOIN USER ROOM
  |--------------------------------------------------------------------------
  */
  socket.join(`user:${userId}`);

  /*
  |--------------------------------------------------------------------------
  | AUTO-JOIN ALL CONVERSATIONS
  |--------------------------------------------------------------------------
  */
  (async () => {
    try {
      const convs = await Conversation.find({
        "participants.user": userId,
      }).select("_id");

      for (const c of convs) {
        socket.join(`conv:${c._id}`);
      }

      console.log(
        `[chat] socket ${socket.id} auto-joined ${convs.length} conversations`
      );
    } catch (err) {
      console.error("[chat] auto-join conversations error:", err.message);
    }
  })();

  /*
  |==========================================================================
  | CHAT:SEND
  |==========================================================================
  |
  | Two payload shapes:
  |   { conversationId, text, replyTo?, attachmentIds? }  → DM / discussion
  |   { roomId, text, attachmentIds? }                    → room broadcast
  |
  | Emits ONE destination per message:
  |   room broadcast  → io.to(roomId)
  |   DM / discussion → io.to(`conv:${conversationId}`)
  |
  |--------------------------------------------------------------------------
  */
  socket.on("chat:send", async (data) => {
    try {
      const { conversationId, roomId, text, replyTo, attachmentIds } =
        data || {};

      const hasAttachments =
        Array.isArray(attachmentIds) && attachmentIds.length > 0;
      const trimmedText = typeof text === "string" ? text.trim() : "";

      if (!trimmedText && !hasAttachments) {
        return emitError("Message cannot be empty");
      }
      if (trimmedText.length > 5000) {
        return emitError("Message cannot exceed 5000 characters");
      }

      // ---------------------------------------------------------------
      // Resolve the conversation and target type.
      // ---------------------------------------------------------------
      let conv = null;
      let targetType = "conversation"; // "room" | "conversation"

      if (conversationId) {
        conv = await Conversation.findById(conversationId);
        if (!conv) return emitError("Conversation not found");
        if (!isParticipant(conv, userId)) return emitError("Access denied");

        const room = await Room.findById(conv.room).select("settings");
        if (room && !room.settings?.allowChat) {
          return emitError("Chat is disabled in this room");
        }
      } else if (roomId) {
        const room = await Room.findById(roomId);
        if (!room) return emitError("Room not found");
        if (!isMember(room, userId)) return emitError("Access denied");
        if (!room.settings?.allowChat) {
          return emitError("Chat is disabled in this room");
        }

        conv = await conversationService.getOrCreateRoomConversation(roomId);
        targetType = "room";
      } else {
        return emitError("conversationId or roomId is required");
      }

      // ---------------------------------------------------------------
      // Persist the message.
      // ---------------------------------------------------------------
      const message = await Message.create({
        conversation: conv._id,
        room: conv.room,
        sender: userId,
        text: trimmedText || "(attachment)",
        replyTo: replyTo || null,
        attachments: hasAttachments ? attachmentIds : [],
        readBy: [{ user: userId, at: new Date() }],
      });

      await message.populate("sender", "username avatar");
      if (replyTo) {
        await message.populate("replyTo", "text sender");
      }

      // ---------------------------------------------------------------
      // Load attachment metadata.
      // ---------------------------------------------------------------
      let attachments = [];
      if (hasAttachments) {
        const docs = await Attachment.find({ _id: { $in: attachmentIds } });

        attachments = docs.map((a) => ({
          id: String(a._id),
          originalName: a.originalName,
          mimeType: a.mimeType,
          size: a.size,
          url: a.url,
        }));

        await Attachment.updateMany(
          { _id: { $in: attachmentIds } },
          { $set: { message: message._id } }
        );
      }

      // ---------------------------------------------------------------
      // Conversation bookkeeping.
      // ---------------------------------------------------------------
      await Conversation.updateOne(
        { _id: conv._id },
        {
          $set: {
            lastMessageAt: message.createdAt,
            lastMessagePreview: message.text.slice(0, 80),
          },
        }
      );

      // ---------------------------------------------------------------
      // Build payload.
      // ---------------------------------------------------------------
      const payload = {
        id: String(message._id),
        conversationId: String(conv._id),
        roomId: String(conv.room),
        sender: {
          id: String(message.sender._id),
          username: message.sender.username,
          avatar: message.sender.avatar,
        },
        senderBot: null,
        text: message.text,
        attachments,
        createdAt: message.createdAt,
        readBy: [userId],
        replyTo: message.replyTo
          ? {
              id: String(message.replyTo._id),
              text: message.replyTo.text,
            }
          : null,
        kind:
          targetType === "room"
            ? "room"
            : conv.type === "group" || conv.type === "discussion"
            ? "discussion"
            : conv.type,
      };

      // ---------------------------------------------------------------
      // Fan out — strictly one destination.
      // ---------------------------------------------------------------
      if (targetType === "room") {
        io.to(String(roomId)).emit("chat:message", payload);
      } else {
        io.to(`conv:${conv._id}`).emit("chat:message", payload);
      }

      // Inbox badge updates for DM/discussion only.
      if (targetType === "conversation") {
        for (const p of conv.participants) {
          const pid = String(p.user?._id || p.user);
          if (pid !== userId) {
            io.to(`user:${pid}`).emit("chat:inbox-updated", {
              conversationId: String(conv._id),
              lastMessagePreview: payload.text.slice(0, 80),
              lastMessageAt: payload.createdAt,
            });
          }
        }
      }

      // Ack to sender — do this BEFORE running bots so the sender's
      // optimistic bubble reconciles immediately.
      socket.emit("chat:sent", {
        id: payload.id,
        conversationId: String(conv._id),
      });

      // ---------------------------------------------------------------
      // BOT INVOCATION (discussions only)
      // ---------------------------------------------------------------
      const isDiscussion =
        conv.type === "discussion" || conv.type === "group";

      if (
        isDiscussion &&
        Array.isArray(conv.bots) &&
        conv.bots.length > 0 &&
        trimmedText
      ) {
        const mentioned = botService.parseMentions(trimmedText, conv.bots);

        for (const bot of mentioned) {
          // Fire-and-forget — do not block the handler.
          runBot({
            io,
            conv,
            bot,
            triggeringMessage: message,
            prompt: trimmedText,
            triggerUserId: userId,
          }).catch((err) =>
            console.error("[chat] bot run failed:", err.message)
          );
        }
      }
    } catch (error) {
      console.error("CHAT SEND ERROR:", error);
      emitError("Failed to send message");
    }
  });

  /*
  |--------------------------------------------------------------------------
  | BOT RUNNER (internal helper)
  |--------------------------------------------------------------------------
  | Generates a bot reply, persists it, and broadcasts it.
  | Called by both chat:send (@mention flow) and discussion:bot-ask.
  */
  async function runBot({
    io,
    conv,
    bot,
    triggeringMessage,
    prompt,
    triggerUserId,
  }) {
    // Typing indicator on.
    io.to(`conv:${conv._id}`).emit("chat:bot-typing", {
      conversationId: String(conv._id),
      botId: String(bot._id),
      botName: bot.name,
      isTyping: true,
    });

    let result;
    try {
      const history = await Message.find({
        conversation: conv._id,
        deletedAt: null,
      })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate("sender", "username avatar")
        .lean();

      history.reverse();

      result = await botService.askBot({
        bot,
        messages: history,
        prompt,
      });
    } catch (err) {
      result = { ok: false, error: err.message };
    }

    // Typing indicator off.
    io.to(`conv:${conv._id}`).emit("chat:bot-typing", {
      conversationId: String(conv._id),
      botId: String(bot._id),
      botName: bot.name,
      isTyping: false,
    });

    if (!result || !result.ok) {
      io.to(`conv:${conv._id}`).emit("chat:bot-error", {
        conversationId: String(conv._id),
        botId: String(bot._id),
        botName: bot.name,
        message: result?.error || "Bot failed to reply",
      });
      return;
    }

    // Persist the bot's reply.
    const botMessage = await Message.create({
      conversation: conv._id,
      room: conv.room,
      sender: null,
      senderBot: {
        id: bot._id,
        name: bot.name,
        provider: bot.provider,
        model: result.model || bot.model || null,
        avatar: bot.avatar || "",
      },
      inReplyTo: triggeringMessage ? triggeringMessage._id : null,
      text: (result.text || "").slice(0, 8000),
      readBy: [{ user: triggerUserId, at: new Date() }],
    });

    await Conversation.updateOne(
      { _id: conv._id },
      {
        $set: {
          lastMessageAt: botMessage.createdAt,
          lastMessagePreview: botMessage.text.slice(0, 80),
        },
      }
    );

    const botPayload = {
      id: String(botMessage._id),
      conversationId: String(conv._id),
      roomId: String(conv.room),
      sender: null,
      senderBot: {
        id: String(bot._id),
        name: bot.name,
        provider: bot.provider,
        model: result.model || bot.model || null,
        avatar: bot.avatar || "",
      },
      text: botMessage.text,
      attachments: [],
      createdAt: botMessage.createdAt,
      readBy: [],
      replyTo: triggeringMessage
        ? { id: String(triggeringMessage._id), text: triggeringMessage.text }
        : null,
      kind: "discussion",
    };

    io.to(`conv:${conv._id}`).emit("chat:message", botPayload);

    // Update other participants' inbox badges.
    for (const p of conv.participants) {
      const pid = String(p.user?._id || p.user);
      if (pid !== triggerUserId) {
        io.to(`user:${pid}`).emit("chat:inbox-updated", {
          conversationId: String(conv._id),
          lastMessagePreview: botPayload.text.slice(0, 80),
          lastMessageAt: botPayload.createdAt,
        });
      }
    }
  }

  /*
  |--------------------------------------------------------------------------
  | CONVERSATION:JOIN
  |--------------------------------------------------------------------------
  */
  socket.on("conversation:join", async (data) => {
    try {
      const { conversationId } = data || {};
      if (!conversationId) return;

      const conv = await Conversation.findById(conversationId);
      if (!conv) return emitError("Conversation not found");
      if (!isParticipant(conv, userId)) return emitError("Access denied");

      socket.join(`conv:${conversationId}`);

      await Conversation.updateOne(
        { _id: conversationId, "participants.user": userId },
        { $set: { "participants.$.lastReadAt": new Date() } }
      );
    } catch (err) {
      console.error("CONVERSATION JOIN ERROR:", err);
    }
  });

  /*
  |--------------------------------------------------------------------------
  | CONVERSATION:LEAVE
  |--------------------------------------------------------------------------
  */
  socket.on("conversation:leave", (data) => {
    const { conversationId } = data || {};
    if (!conversationId) return;
    socket.leave(`conv:${conversationId}`);
  });

  /*
  |--------------------------------------------------------------------------
  | CHAT:TYPING
  |--------------------------------------------------------------------------
  */
  socket.on("chat:typing", (data) => {
    const { conversationId, isTyping } = data || {};
    if (!conversationId) return;

    socket.to(`conv:${conversationId}`).emit("chat:typing", {
      conversationId,
      userId,
      username: socket.user.username,
      isTyping: Boolean(isTyping),
    });
  });

  /*
  |--------------------------------------------------------------------------
  | CHAT:MARK_READ
  |--------------------------------------------------------------------------
  */
  socket.on("chat:mark_read", async (data) => {
    try {
      const { conversationId } = data || {};
      if (!conversationId) return;

      const conv = await Conversation.findById(conversationId);
      if (!conv || !isParticipant(conv, userId)) return;

      await Conversation.updateOne(
        { _id: conversationId, "participants.user": userId },
        { $set: { "participants.$.lastReadAt": new Date() } }
      );

      await Message.updateMany(
        {
          conversation: conversationId,
          sender: { $ne: userId },
          "readBy.user": { $ne: userId },
          deletedAt: null,
        },
        { $push: { readBy: { user: userId, at: new Date() } } }
      );

      io.to(`conv:${conversationId}`).emit("chat:read", {
        conversationId,
        userId,
      });
    } catch (error) {
      console.error("CHAT MARK READ ERROR:", error);
    }
  });

  /*
  |--------------------------------------------------------------------------
  | CHAT:PRIVATE_SEND (DM)
  |--------------------------------------------------------------------------
  */
  socket.on("chat:private_send", async (data) => {
    try {
      const { roomId, recipientId, text, attachmentIds } = data || {};

      const hasAttachments =
        Array.isArray(attachmentIds) && attachmentIds.length > 0;
      const trimmedText = typeof text === "string" ? text.trim() : "";

      if (!roomId || !recipientId) return;
      if (!trimmedText && !hasAttachments) return;

      const room = await Room.findById(roomId);
      if (!room) return emitError("Room not found");
      if (!isMember(room, userId)) return emitError("Access denied");
      if (!room.settings?.allowChat) {
        return emitError("Chat is disabled in this room");
      }

      if (userId === String(recipientId)) {
        return emitError("Cannot DM yourself");
      }

      const recipientIsMember = room.members.some(
        (m) => String(m.user?._id || m.user) === String(recipientId)
      );
      if (!recipientIsMember) {
        return emitError("Recipient is not a member of this room");
      }

      const conv = await conversationService.getOrCreateDM(
        roomId,
        userId,
        recipientId
      );

      const message = await Message.create({
        conversation: conv._id,
        room: roomId,
        sender: userId,
        text: trimmedText || "(attachment)",
        attachments: hasAttachments ? attachmentIds : [],
        readBy: [{ user: userId, at: new Date() }],
      });

      await message.populate("sender", "username avatar");
      await message.populate("recipient", "username avatar");

      let attachments = [];
      if (hasAttachments) {
        const docs = await Attachment.find({ _id: { $in: attachmentIds } });
        attachments = docs.map((a) => ({
          id: String(a._id),
          originalName: a.originalName,
          mimeType: a.mimeType,
          size: a.size,
          url: a.url,
        }));
        await Attachment.updateMany(
          { _id: { $in: attachmentIds } },
          { $set: { message: message._id } }
        );
      }

      await Conversation.updateOne(
        { _id: conv._id },
        {
          $set: {
            lastMessageAt: message.createdAt,
            lastMessagePreview: message.text.slice(0, 80),
          },
        }
      );

      const legacyPayload = {
        id: String(message._id),
        roomId,
        senderId: String(message.sender._id),
        senderName: message.sender.username,
        senderAvatar: message.sender.avatar,
        recipientId: String(recipientId),
        text: message.text,
        attachments,
        createdAt: message.createdAt,
        timestamp: message.createdAt,
      };

      const targetSockets = await io.in(`user:${recipientId}`).fetchSockets();
      let delivered = 0;
      for (const s of targetSockets) {
        s.emit("chat:private", legacyPayload);
        delivered++;
      }

      io.to(`conv:${conv._id}`).emit("chat:message", {
        id: String(message._id),
        conversationId: String(conv._id),
        roomId,
        sender: {
          id: String(message.sender._id),
          username: message.sender.username,
          avatar: message.sender.avatar,
        },
        senderBot: null,
        text: message.text,
        attachments,
        createdAt: message.createdAt,
        readBy: [userId],
        kind: "dm",
      });

      socket.emit("chat:private_sent", {
        id: legacyPayload.id,
        recipientId: String(recipientId),
        delivered: delivered > 0,
        message: legacyPayload,
      });
    } catch (error) {
      console.error("PRIVATE CHAT SEND ERROR:", error);
      emitError("Failed to send message");
    }
  });

  /*
  |--------------------------------------------------------------------------
  | CHAT:HISTORY
  |--------------------------------------------------------------------------
  | Returns the last N messages grouped by conversation type:
  |   - messages   : room broadcasts (kind: "room")
  |   - dmMessages : { peerId: [...DMs], "discussion:<id>": [...discussion] }
  */
  socket.on("chat:history", async (data) => {
    try {
      const { roomId, limit = 200 } = data || {};
      if (!roomId) return;

      const max = Math.min(Number(limit) || 200, 500);

      const convs = await Conversation.find({
        room: roomId,
        "participants.user": userId,
      }).select("_id type name participants");

      if (convs.length === 0) {
        return socket.emit("chat:history", {
          roomId,
          messages: [],
          dmMessages: {},
        });
      }

      const convIds = convs.map((c) => c._id);

      const allMessages = await Message.find({
        conversation: { $in: convIds },
        deletedAt: null,
      })
        .sort({ createdAt: -1 })
        .limit(max)
        .populate("sender", "username avatar")
        .populate("attachments")
        .lean();

      allMessages.reverse();

      const roomConvIds = new Set(
        convs.filter((c) => c.type === "room").map((c) => String(c._id))
      );

      const shapedRoom = [];
      const dmByPeer = {};

      for (const m of allMessages) {
        const convId = String(m.conversation);
        const attachmentsShaped = (m.attachments || []).map((a) => ({
          id: String(a._id),
          originalName: a.originalName,
          mimeType: a.mimeType,
          size: a.size,
          url: a.url,
        }));

        const senderShape = m.sender
          ? {
              id: String(m.sender._id),
              username: m.sender.username,
              avatar: m.sender.avatar,
            }
          : null;

        const senderBotShape = m.senderBot
          ? {
              id: String(m.senderBot.id),
              name: m.senderBot.name,
              provider: m.senderBot.provider,
              model: m.senderBot.model,
              avatar: m.senderBot.avatar,
            }
          : null;

        // ── Room broadcast ──
        if (roomConvIds.has(convId)) {
          shapedRoom.push({
            id: String(m._id),
            roomId,
            sender: senderShape,
            senderBot: senderBotShape,
            text: m.text,
            attachments: attachmentsShaped,
            createdAt: m.createdAt,
            kind: "room",
          });
          continue;
        }

        const conv = convs.find((c) => String(c._id) === convId);
        if (!conv) continue;

        // ── Discussion ──
        if (conv.type === "discussion" || conv.type === "group") {
          const key = `discussion:${convId}`;
          if (!dmByPeer[key]) dmByPeer[key] = [];

          dmByPeer[key].push({
            id: String(m._id),
            conversationId: convId,
            roomId,
            sender: senderShape,
            senderBot: senderBotShape,
            text: m.text,
            attachments: attachmentsShaped,
            createdAt: m.createdAt,
            kind: "discussion",
          });
          continue;
        }

        // ── DM ──
        const peer = conv.participants.find(
          (p) => String(p.user?._id || p.user) !== userId
        );
        if (!peer) continue;

        const peerId = String(peer.user?._id || peer.user);
        if (!dmByPeer[peerId]) dmByPeer[peerId] = [];

        dmByPeer[peerId].push({
          id: String(m._id),
          roomId,
          senderId: senderShape?.id || null,
          senderName: senderShape?.username || "Operator",
          senderAvatar: senderShape?.avatar || "",
          recipientId: peerId,
          text: m.text,
          attachments: attachmentsShaped,
          createdAt: m.createdAt,
          timestamp: m.createdAt,
          mine: senderShape?.id === userId,
          kind: "dm",
        });
      }

      socket.emit("chat:history", {
        roomId,
        messages: shapedRoom,
        dmMessages: dmByPeer,
      });
    } catch (error) {
      console.error("CHAT HISTORY ERROR:", error);
    }
  });

  /*
  |--------------------------------------------------------------------------
  | DISCUSSION:BOT-ASK  (button-triggered)
  |--------------------------------------------------------------------------
  */
  socket.on("discussion:bot-ask", async (data) => {
    try {
      const { conversationId, botId, messageId } = data || {};
      if (!conversationId || !botId || !messageId) return;

      const conv = await Conversation.findById(conversationId);
      if (!conv) return emitError("Conversation not found");
      if (!isParticipant(conv, userId)) return emitError("Access denied");

      const bot = conv.bots.find((b) => String(b._id) === String(botId));
      if (!bot) return emitError("Bot not found in this discussion");

      const targetMessage = await Message.findById(messageId);
      if (!targetMessage) return emitError("Message not found");

      runBot({
        io,
        conv,
        bot,
        triggeringMessage: targetMessage,
        prompt: targetMessage.text,
        triggerUserId: userId,
      }).catch((err) =>
        console.error("[chat] discussion:bot-ask runBot failed:", err.message)
      );
    } catch (err) {
      console.error("DISCUSSION BOT-ASK ERROR:", err);
    }
  });

  /*
  |--------------------------------------------------------------------------
  | DISCUSSION:ADD-BOT
  |--------------------------------------------------------------------------
  */
  socket.on("discussion:add-bot", async (data) => {
    try {
      const { conversationId, bot } = data || {};
      if (!conversationId || !bot || !bot.name || !bot.provider) {
        return emitError("Invalid bot payload");
      }

      const conv = await Conversation.findById(conversationId);
      if (!conv) return emitError("Conversation not found");
      if (!isParticipant(conv, userId)) return emitError("Access denied");
      if (conv.type !== "discussion" && conv.type !== "group") {
        return emitError("Bots can only be added to discussions");
      }

      conv.bots.push({
        name: String(bot.name).trim().slice(0, 60),
        provider: bot.provider,
        model: bot.model || null,
        instructions: (bot.instructions || "").slice(0, 500),
        avatar: bot.avatar || "",
        createdBy: userId,
      });

      await conv.save();

      const newBot = conv.bots[conv.bots.length - 1];

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
    } catch (err) {
      console.error("DISCUSSION ADD-BOT ERROR:", err);
    }
  });

  /*
  |--------------------------------------------------------------------------
  | DISCUSSION:REMOVE-BOT
  |--------------------------------------------------------------------------
  */
  socket.on("discussion:remove-bot", async (data) => {
    try {
      const { conversationId, botId } = data || {};
      if (!conversationId || !botId) return;

      const conv = await Conversation.findById(conversationId);
      if (!conv) return emitError("Conversation not found");
      if (!isParticipant(conv, userId)) return emitError("Access denied");

      conv.bots = conv.bots.filter((b) => String(b._id) !== String(botId));
      await conv.save();

      io.to(`conv:${conv._id}`).emit("discussion:bot-removed", {
        conversationId: String(conv._id),
        botId: String(botId),
      });
    } catch (err) {
      console.error("DISCUSSION REMOVE-BOT ERROR:", err);
    }
  });
};