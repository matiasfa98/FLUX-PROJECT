// backend/test-bot-mention.js
const { io } = require("socket.io-client");

const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhOWM1ODg4NzA3NTg4YzE5N2NkNWI0ZiIsInVzZXJuYW1lIjoidGVzdC0xIiwiZW1haWwiOiJ0ZXN0LTFAZ21haWwuY29tIiwiaWF0IjoxNzg5MTcxNTcwLCJleHAiOjE3ODk3NzYzNzB9.JX6eM5EHlGecbRudY2Ph0ux5KXKHPqE-YWuMuMpCPQk";
const CONVERSATION_ID = "6aa506ccb8a9eb560a8cce16";

const socket = io("http://10.192.20.135:4000", {
  auth: { token: TOKEN },
  transports: ["websocket"],
});

socket.on("connect", () => {
  console.log("✔ connected as socket", socket.id);

  // Join the discussion conversation
  socket.emit("conversation:join", { conversationId: CONVERSATION_ID });

  // Wait a moment, then send a message that mentions the bot
  setTimeout(() => {
    console.log("→ sending @Code Reviewer message...");
    socket.emit("chat:send", {
      conversationId: CONVERSATION_ID,
      text: "@Code Reviewer write a one-line hello in JavaScript.",
    });
  }, 500);
});

// Listen for everything
socket.on("chat:sent", (d) => console.log("✔ chat:sent", d));

socket.on("chat:message", (m) => {
  console.log("← chat:message");
  console.log("   sender:", m.sender?.username || `bot:${m.senderBot?.name}`);
  console.log("   text:", m.text.slice(0, 200));
});

socket.on("chat:bot-typing", (d) =>
  console.log("⏳ bot typing:", d.botName, d.isTyping)
);

socket.on("chat:bot-error", (d) =>
  console.log("❌ bot error:", d.botName, d.message)
);

socket.on("chat:error", (d) => console.log("❌ chat error:", d.message));

socket.on("disconnect", (r) => console.log("disconnected:", r));

// Auto-exit after 30 seconds so the script doesn't hang
setTimeout(() => {
  console.log("done — exiting");
  socket.disconnect();
  process.exit(0);
}, 30000);