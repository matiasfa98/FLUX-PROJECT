import { useState } from "react";
import { io } from "socket.io-client";
import "./App.css";

const API = "http://localhost:4000";

function App() {
  // =========================
  // AUTH
  // =========================

  const [email, setEmail] = useState("fluxuser2@example.com");
  const [password, setPassword] = useState("");

  const [token, setToken] = useState(
    localStorage.getItem("fluxToken") || ""
  );

  // =========================
  // SOCKET
  // =========================

  const [socket, setSocket] = useState(null);

  // =========================
  // ROOM
  // =========================

  const [roomId, setRoomId] = useState(
    "6a99aafbdbf77c3429c1cdb7"
  );

  const [room, setRoom] = useState(null);

  // Current driver
  const [driver, setDriver] = useState(null);

  // =========================
  // CHAT
  // =========================

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  // =========================
  // DRIVER CONTROL
  // =========================

  const [controlUserId, setControlUserId] = useState("");

  // =========================
  // LOGS
  // =========================

  const [logs, setLogs] = useState([]);

  const log = (message, data = "") => {
    setLogs((prev) => [
      `${new Date().toLocaleTimeString()}  ${message}`,
      ...prev
    ]);

    if (data) {
      console.log(message, data);
    }
  };

  // =========================
  // LOGIN
  // =========================

  const login = async () => {
    try {
      const response = await fetch(`${API}/api/auth/login`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          email,
          password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        log(`❌ Login failed: ${data.message}`);
        return;
      }

      localStorage.setItem("fluxToken", data.token);

      setToken(data.token);

      log("✅ Login successful");

      connectSocket(data.token);

    } catch (error) {
      log(`❌ Server error: ${error.message}`);
    }
  };

  // =========================
  // CONNECT SOCKET
  // =========================

  const connectSocket = (authToken = token) => {
    if (!authToken) {
      log("❌ No token");
      return;
    }

    // Disconnect previous socket
    if (socket) {
      socket.disconnect();
    }

    const newSocket = io(API, {
      auth: {
        token: authToken
      }
    });

    // =========================
    // LISTEN TO EVERYTHING
    // =========================

    newSocket.onAny((event, ...args) => {
      console.log(
        "📡 SOCKET EVENT RECEIVED:",
        event,
        args
      );
    });

    // =========================
    // CONNECTION EVENTS
    // =========================

    newSocket.on("connect", () => {
      log(`🟢 Socket connected: ${newSocket.id}`);
    });

    newSocket.on("connect_error", (error) => {
      log(`❌ Socket error: ${error.message}`);
    });

    newSocket.on("disconnect", () => {
      log("🔴 Socket disconnected");
    });

    // =========================
    // ROOM EVENTS
    // =========================

    newSocket.on("room:joined", (data) => {
      console.log("ROOM JOINED:", data);

      log("✅ Room joined", data);

      setRoom(data);

      // Save current driver
      setDriver(data.driver || null);

      // Clear old messages
      setMessages([]);
    });

    newSocket.on("room:left", (data) => {
      console.log("🔥 ROOM LEFT EVENT:", data);

      log("👋 Left room", data);

      setRoom(null);

      setDriver(null);

      setMessages([]);
    });

    newSocket.on("room:user-joined", (data) => {
      log("👤 User joined", data);
    });

    newSocket.on("room:user-left", (data) => {
      log("👋 User left", data);
    });

    newSocket.on("room:error", (data) => {
      log("❌ Room error", data);
    });

    // =========================
    // CHAT EVENTS
    // =========================

    newSocket.on("chat:message", (data) => {
      console.log("💬 CHAT MESSAGE:", data);

      setMessages((prev) => [
        ...prev,
        data
      ]);

      log("💬 Message received", data);
    });

    newSocket.on("chat:error", (data) => {
      console.error("❌ CHAT ERROR:", data);

      log("❌ Chat error", data);
    });

    // =========================
    // CONTROL EVENTS
    // =========================

    newSocket.on("control:requested", (data) => {
      console.log("🎮 CONTROL REQUESTED:", data);

      log("🎮 Control requested", data);
    });

    newSocket.on("control:changed", (data) => {
      console.log("👑 DRIVER CHANGED:", data);

      log("👑 Driver changed", data);

      // Update driver
      setDriver(data.driver || null);
    });

    newSocket.on("control:rejected", (data) => {
      console.log("❌ CONTROL REJECTED:", data);

      log("❌ Control rejected", data);
    });

    newSocket.on("control:released", (data) => {
      console.log("🔓 DRIVER RELEASED:", data);

      log("🔓 Control released", data);

      // No driver anymore
      setDriver(null);
    });

    newSocket.on("control:error", (data) => {
      console.error("❌ CONTROL ERROR:", data);

      log("❌ Control error", data);
    });

    // Save socket
    setSocket(newSocket);
  };

  // =========================
  // JOIN ROOM
  // =========================

  const joinRoom = () => {
    if (!socket) {
      log("❌ Connect socket first");
      return;
    }

    if (!socket.connected) {
      log("❌ Socket is not connected");
      return;
    }

    if (!roomId) {
      log("❌ Enter a room ID");
      return;
    }

    socket.emit("room:join", {
      roomId
    });

    log(`Joining room ${roomId}...`);
  };

  // =========================
  // LEAVE ROOM
  // =========================

  const leaveRoom = () => {
    if (!socket) {
      log("❌ Connect socket first");
      return;
    }

    if (!socket.connected) {
      log("❌ Socket is not connected");
      return;
    }

    if (!room) {
      log("❌ You are not in a room");
      return;
    }

    socket.emit("room:leave", {
      roomId
    });

    log(`Leaving room ${roomId}...`);
  };

  // =========================
  // SEND MESSAGE
  // =========================

  const sendMessage = () => {
    if (!socket) {
      log("❌ Connect socket first");
      return;
    }

    if (!socket.connected) {
      log("❌ Socket is disconnected");
      return;
    }

    if (!room) {
      log("❌ Join a room first");
      return;
    }

    if (!message.trim()) {
      return;
    }

    socket.emit("chat:send", {
      roomId,
      text: message.trim()
    });

    setMessage("");
  };

  // =========================
  // REQUEST CONTROL
  // =========================

  const requestControl = () => {
    if (!socket) {
      log("❌ Connect socket first");
      return;
    }

    if (!room) {
      log("❌ Join a room first");
      return;
    }

    socket.emit("control:request", {
      roomId
    });

    log("🎮 Control requested");
  };

  // =========================
  // APPROVE CONTROL
  // =========================

  const approveControl = () => {
    if (!socket) {
      log("❌ Connect socket first");
      return;
    }

    if (!room) {
      log("❌ Join a room first");
      return;
    }

    if (!controlUserId.trim()) {
      log("❌ Enter a user ID");
      return;
    }

    socket.emit("control:approve", {
      roomId,
      userId: controlUserId.trim()
    });

    log(
      `Approving control for ${controlUserId}`
    );
  };

  // =========================
  // REJECT CONTROL
  // =========================

  const rejectControl = () => {
    if (!socket) {
      log("❌ Connect socket first");
      return;
    }

    if (!room) {
      log("❌ Join a room first");
      return;
    }

    if (!controlUserId.trim()) {
      log("❌ Enter a user ID");
      return;
    }

    socket.emit("control:reject", {
      roomId,
      userId: controlUserId.trim()
    });

    log(
      `Rejecting control for ${controlUserId}`
    );
  };

  // =========================
  // RELEASE CONTROL
  // =========================

  const releaseControl = () => {
    if (!socket) {
      log("❌ Connect socket first");
      return;
    }

    if (!room) {
      log("❌ Join a room first");
      return;
    }

    socket.emit("control:release", {
      roomId
    });

    log("🔓 Releasing control...");
  };

  // =========================
  // UI
  // =========================

  return (
    <div className="app">

      <h1>FLUX Backend Tester</h1>

      {/* =========================
          AUTHENTICATION
      ========================= */}

      <section className="card">

        <h2>Authentication</h2>

        <input
          placeholder="Email"
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
        />

        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
        />

        <button onClick={login}>
          Login
        </button>

        <div className="token">
          {token
            ? "🟢 Authenticated"
            : "⚪ Not authenticated"}
        </div>

      </section>

      {/* =========================
          SOCKET
      ========================= */}

      <section className="card">

        <h2>Socket</h2>

        <button
          onClick={() => connectSocket()}
        >
          Connect Socket
        </button>

        <span className="socket-status">
          {socket?.connected
            ? "🟢 Connected"
            : "🔴 Disconnected"}
        </span>

      </section>

      {/* =========================
          ROOM
      ========================= */}

      <section className="card">

        <h2>Room</h2>

        <input
          placeholder="Room ID"
          value={roomId}
          onChange={(e) =>
            setRoomId(e.target.value)
          }
        />

        <div className="buttons">

          <button onClick={joinRoom}>
            Join Room
          </button>

          <button onClick={leaveRoom}>
            Leave Room
          </button>

        </div>

        {room && (
          <pre>
            {JSON.stringify(
              room,
              null,
              2
            )}
          </pre>
        )}

        {/* =========================
            CURRENT DRIVER
        ========================= */}

        <div className="driver-status">

          <h3>Current Driver</h3>

          {driver ? (
            <div>

              <strong>
                👑 Driver
              </strong>

              <br />

              <code>
                {typeof driver === "object"
                  ? driver.id || driver._id
                  : driver}
              </code>

            </div>
          ) : (
            <div>
              ⚪ No driver
            </div>
          )}

        </div>

      </section>

      {/* =========================
          CHAT
      ========================= */}

      <section className="card">

        <h2>Room Chat</h2>

        <div className="messages">

          {messages.length === 0 && (
            <div className="empty">
              No messages yet...
            </div>
          )}

          {messages.map((msg) => (

            <div
              key={msg.id}
              className="message"
            >

              <strong>
                {msg.sender?.username || "Unknown"}
              </strong>

              <p>
                {msg.text}
              </p>

              <small>
                {msg.createdAt
                  ? new Date(
                      msg.createdAt
                    ).toLocaleTimeString()
                  : ""}
              </small>

            </div>

          ))}

        </div>

        <div className="chat-input">

          <input
            value={message}
            onChange={(e) =>
              setMessage(e.target.value)
            }
            placeholder="Type a message..."
            disabled={!room}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                sendMessage();
              }
            }}
          />

          <button
            onClick={sendMessage}
            disabled={!room}
          >
            Send
          </button>

        </div>

      </section>

      {/* =========================
          DRIVER CONTROL
      ========================= */}

      <section className="card">

        <h2>Driver Control</h2>

        <button
          onClick={requestControl}
          disabled={!room}
        >
          Request Control
        </button>

        <input
          placeholder="User ID to approve/reject"
          value={controlUserId}
          onChange={(e) =>
            setControlUserId(
              e.target.value
            )
          }
        />

        <div className="buttons">

          <button
            onClick={approveControl}
            disabled={!room}
          >
            Approve
          </button>

          <button
            onClick={rejectControl}
            disabled={!room}
          >
            Reject
          </button>

          <button
            onClick={releaseControl}
            disabled={!room}
          >
            Release
          </button>

        </div>

      </section>

      {/* =========================
          LIVE EVENTS
      ========================= */}

      <section className="card">

        <div className="log-header">

          <h2>Live Events</h2>

          <button
            onClick={() =>
              setLogs([])
            }
          >
            Clear
          </button>

        </div>

        <div className="logs">

          {logs.length === 0 && (
            <div className="empty">
              No events yet...
            </div>
          )}

          {logs.map(
            (item, index) => (

              <div
                className="log"
                key={index}
              >
                {item}
              </div>

            )
          )}

        </div>

      </section>

    </div>
  );
}

export default App;