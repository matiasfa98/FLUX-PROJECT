// backend/services/aiService.js
const crypto = require("crypto");

/*
|--------------------------------------------------------------------------
| PROVIDER REGISTRY
|--------------------------------------------------------------------------
| Gemini: its own JSON shape (contents[], parts[]).
| Groq:   OpenAI-compatible /chat/completions.
|
| To add a provider: add an entry here, then add its key(s) in buildAttempts.
|--------------------------------------------------------------------------
*/
const PROVIDERS = {
  gemini: {
    name: "Gemini",
    models: ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"],
    endpoint: (model) =>
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    buildHeaders: (apiKey) => ({
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    }),
    buildBody: (model, messages) => ({
      systemInstruction:
        messages[0]?.role === "system"
          ? { parts: [{ text: messages[0].content }] }
          : undefined,
      contents: messages
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    }),
    parseReply: (json) => ({
      reply:
        json.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "",
      usage: json.usageMetadata || null,
    }),
  },

  groq: {
    name: "Groq",
    models: [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "qwen/qwen3-32b",
    ],
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    buildHeaders: (apiKey) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    }),
    buildBody: (model, messages) => ({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 2048,
    }),
    parseReply: (json) => ({
      reply: json.choices?.[0]?.message?.content || "",
      usage: json.usage || null,
    }),
  },
};

/*
|--------------------------------------------------------------------------
| COOLDOWN TRACKING
|--------------------------------------------------------------------------
| After a 429 on a key, skip it for 60s.
|--------------------------------------------------------------------------
*/
const keyCooldowns = new Map();
const COOLDOWN_MS = 60 * 1000;

const hashKey = (key) =>
  crypto.createHash("sha256").update(key).digest("hex").slice(0, 16);

const isCoolingDown = (apiKey) => {
  const reset = keyCooldowns.get(hashKey(apiKey));
  return reset && reset > Date.now();
};

const setCooldown = (apiKey) => {
  keyCooldowns.set(hashKey(apiKey), Date.now() + COOLDOWN_MS);
};

/*
|--------------------------------------------------------------------------
| BUILD ATTEMPT LIST (server keys only)
|--------------------------------------------------------------------------
| Order: Gemini first (reliable free tier), then Groq (if keys exist).
|--------------------------------------------------------------------------
*/
const buildAttempts = () => {
  const attempts = [];

  const geminiKeys = [
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
  ].filter(Boolean);

  const groqKeys = [
    process.env.GROQ_API_KEY_1,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
  ].filter(Boolean);

  for (const key of geminiKeys) {
    attempts.push({ providerKey: "gemini", apiKey: key });
  }
  for (const key of groqKeys) {
    attempts.push({ providerKey: "groq", apiKey: key });
  }

  return attempts;
};

/*
|--------------------------------------------------------------------------
| SINGLE PROVIDER CALL
|--------------------------------------------------------------------------
*/
const callProvider = async (providerKey, apiKey, messages) => {
  const provider = PROVIDERS[providerKey];
  if (!provider) return { ok: false, reason: `Unknown provider: ${providerKey}` };
  if (isCoolingDown(apiKey)) {
    return { ok: false, reason: `${provider.name}: key cooling down` };
  }

  let lastError = null;

  for (const model of provider.models) {
    try {
      const url =
        typeof provider.endpoint === "function"
          ? provider.endpoint(model)
          : provider.endpoint;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const res = await fetch(url, {
        method: "POST",
        headers: provider.buildHeaders(apiKey),
        body: JSON.stringify(provider.buildBody(model, messages)),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.status === 429) {
        setCooldown(apiKey);
        lastError = `${provider.name}: rate limited on ${model}`;
        continue;
      }
      if (res.status === 401 || res.status === 403) {
        return {
          ok: false,
          reason: `${provider.name}: invalid key`,
          fatal: true,
        };
      }
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        lastError = `${provider.name} ${model}: ${res.status} ${text.slice(0, 120)}`;
        continue;
      }

      const json = await res.json();
      const { reply, usage } = provider.parseReply(json);

      if (!reply) {
        lastError = `${provider.name} ${model}: empty response`;
        continue;
      }

      return {
        ok: true,
        reply,
        usage,
        model,
        provider: providerKey,
        providerName: provider.name,
      };
    } catch (err) {
      lastError = `${provider.name} ${model}: ${err.message}`;
      continue;
    }
  }

  return {
    ok: false,
    reason: lastError || `${provider.name}: all models failed`,
  };
};

/*
|--------------------------------------------------------------------------
| MAIN ENTRY
|--------------------------------------------------------------------------
*/
const generateReply = async ({ messages }) => {
  const attempts = buildAttempts();

  if (attempts.length === 0) {
    return {
      ok: false,
      error: "No AI providers configured on the server.",
    };
  }

  const errors = [];

  for (const attempt of attempts) {
    const result = await callProvider(
      attempt.providerKey,
      attempt.apiKey,
      messages
    );

    if (result.ok) {
      return { ...result, source: "server" };
    }

    errors.push(`${attempt.providerKey}: ${result.reason}`);
  }

  return {
    ok: false,
    error: "All AI providers are unavailable right now. Please try again.",
    details: errors,
  };
};

module.exports = { generateReply, PROVIDERS };