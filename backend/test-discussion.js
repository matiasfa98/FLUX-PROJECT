// backend/test-discussion.js
const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhOWM1ODg4NzA3NTg4YzE5N2NkNWI0ZiIsInVzZXJuYW1lIjoidGVzdC0xIiwiZW1haWwiOiJ0ZXN0LTFAZ21haWwuY29tIiwiaWF0IjoxNzg5MTcxNTcwLCJleHAiOjE3ODk3NzYzNzB9.JX6eM5EHlGecbRudY2Ph0ux5KXKHPqE-YWuMuMpCPQk";
const ROOM_ID = "6aa29b4729fcf00eb04c4edb";
const PEER_ID = "6a9eb4d57b6b47f7b03957dc";

async function test() {
  const body = {
    roomId: ROOM_ID,
    type: "discussion",
    name: "Code Review Squad",
    participantIds: [PEER_ID],
    bots: [
      {
        name: "Code Reviewer",
        provider: "groq",
        instructions: "You are a strict but fair code reviewer.",
      },
    ],
  };

  console.log("Sending:", JSON.stringify(body, null, 2));

  const res = await fetch("http://10.192.20.135:4000/api/chat/conversations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  console.log("Status:", res.status);
  console.log(JSON.stringify(data, null, 2));
}

test().catch(console.error);