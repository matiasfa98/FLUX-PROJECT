// backend/controllers/aiController.js
const aiService = require("../services/aiService");
const { checkRateLimit } = require("../services/aiRateLimit");

const chat = async (req, res) => {
  try {
    const { messages } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ message: "messages[] is required" });
    }

    // Sliding window — only the last 10 messages reach the provider.
    const trimmed = messages.slice(-10).map((m) => ({
      role:
        m.role === "assistant"
          ? "assistant"
          : m.role === "system"
          ? "system"
          : "user",
      content: String(m.content || "").slice(0, 8000),
    }));

    // Per-user rate limit for the shared server keys.
    const limit = checkRateLimit(req.user.id);
    if (!limit.ok) {
      return res.status(429).json({ message: limit.reason });
    }

    const result = await aiService.generateReply({ messages: trimmed });

    if (!result.ok) {
      return res.status(503).json({
        message: result.error,
        details: result.details || [],
      });
    }

    return res.json({
      reply: result.reply,
      provider: result.provider,
      providerName: result.providerName,
      model: result.model,
      usage: result.usage,
    });
  } catch (err) {
    console.error("AI CHAT ERROR:", err);
    return res.status(500).json({ message: "AI request failed" });
  }
};

module.exports = { chat };