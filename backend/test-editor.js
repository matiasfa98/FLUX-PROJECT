const { io } = require("socket.io-client");

const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhOWIwMGQxZDNkZGEzNTI2NGZkM2M5MyIsInVzZXJuYW1lIjoiZmx1eHVzZXIyIiwiZW1haWwiOiJmbHV4dXNlcjJAZXhhbXBsZS5jb20iLCJpYXQiOjE3ODg1NDY0NDYsImV4cCI6MTc4OTE1MTI0Nn0.dFrajS_L9gSVo8ErmcdxK7-aFKn228S8I_k7xbPhRYQ";


const ROOM_ID = "6a99aafbdbf77c3429c1cdb7";
const DOCUMENT_ID = "6a9b04b8d3dda35264fd3c94";

const socket = io("http://localhost:4000", {
  auth: {
    token: TOKEN
  }
});

socket.on("connect", () => {
  console.log("CONNECTED:", socket.id);

  // Join the room first
  console.log("JOINING ROOM...");

  socket.emit("room:join", ROOM_ID);
});

socket.on("room:joined", () => {
  console.log("ROOM JOINED!");

  // Wait a little so we can clearly see the sequence
  setTimeout(() => {
    console.log("SENDING EDITOR CHANGE...");

    socket.emit("editor:change", {
      roomId: ROOM_ID,
      documentId: DOCUMENT_ID,

      content:
`console.log("Hello Flux!");

console.log("Editor Socket.IO is working!");`,

      language: "javascript",

      // Current document version is 1
      version: 1
    });
  }, 1000);
});

socket.on("editor:saved", (data) => {
  console.log("EDITOR SAVED:", data);
});

socket.on("editor:error", (data) => {
  console.log("EDITOR ERROR:", data);
});

socket.on("connect_error", (error) => {
  console.log("CONNECT ERROR:", error.message);
});

socket.on("disconnect", () => {
  console.log("DISCONNECTED");
});