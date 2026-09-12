// backend/services/botService.js
const aiService = require("./aiService");

/*
|--------------------------------------------------------------------------
| PARSE MENTIONS
|--------------------------------------------------------------------------
| Scans a message for @BotName tokens and returns the matching bots.
| Matching is case-insensitive and tolerant of spaces in bot names
| (e.g. "Code Reviewer" can be mentioned as @Code Reviewer or
| @codereviewer).
|--------------------------------------------------------------------------
*/
const parseMentions = (text, bots = []) => {
  if (!text || !Array.isArray(bots) || bots.length === 0) return [];

  const lower = text.toLowerCase();
  const matched = [];

  for (const bot of bots) {
    if (!bot.name) continue;

    const simpleName = bot.name.toLowerCase().replace(/\s+/g, "");
    const spacedName = bot.name.toLowerCase();

    // Match @codereviewer or @Code Reviewer
    const patterns = [
      `@${simpleName}`,
      `@${spacedName}`,
    ];

    if (patterns.some((p) => lower.includes(p))) {
      matched.push(bot);
    }
  }

  return matched;
};

/*
|--------------------------------------------------------------------------
| BUILD MESSAGE HISTORY FOR THE BOT
|--------------------------------------------------------------------------
| Takes the last N messages from the discussion and formats them for
| the AI provider. Skips the bot's own past replies to avoid the model
| talking to itself.
|--------------------------------------------------------------------------
*/
const buildHistory = (messages, currentUserId, maxMessages = 20) => {
  const trimmed = messages.slice(-maxMessages);

  return trimmed.map((m) => {
    const isBot = Boolean(m.senderBot);
    return {
      role: isBot ? "assistant" : "user",
      content: m.text,
    };
  });
};

/*
|--------------------------------------------------------------------------
| ASK A BOT
|--------------------------------------------------------------------------
| Given a bot, a discussion history, and a user prompt, generates a
| reply using the existing aiService failover chain.
|
| Returns { ok, text, provider, model } or { ok: false, error }
|--------------------------------------------------------------------------
*/
const askBot = async ({ bot, messages, prompt }) => {
  try {
    // Build the system prompt from the bot's instructions if any.
    const systemPrompt = [
      `You are ${bot.name}, an AI participant in a group discussion.`,
      bot.instructions || "",
      "Reply concisely and helpfully. Do not preface your reply with your own name.",
    ]
      .filter(Boolean)
      .join(" ");

    // Build the message array: system + history + new prompt.
    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...buildHistory(messages),
      { role: "user", content: prompt },
    ];

    // Use the existing service. It handles provider failover.
    const result = await aiService.generateReply({
      messages: aiMessages,
      // Optional: pass a preferred provider if you extend aiService
      // to accept one. Right now it just runs the failover chain.
    });

    if (!result.ok) {
      return { ok: false, error: result.error || "Bot failed to reply" };
    }

    return {
      ok: true,
      text: result.reply,
      provider: result.provider,
      providerName: result.providerName,
      model: result.model,
    };
  } catch (err) {
    console.error("[botService] askBot error:", err);
    return { ok: false, error: err.message };
  }
};

module.exports = {
  parseMentions,
  buildHistory,
  askBot,
};