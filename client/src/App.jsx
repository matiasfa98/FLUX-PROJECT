import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import "./App.css";

const API = "http://localhost:4000";

function App() {
  // =========================
  // AUTH
  // =========================
  const [authMode, setAuthMode] = useState("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("fluxuser2@example.com");
  const [password, setPassword] = useState("");

  const [token, setToken] = useState(
    () => localStorage.getItem("flux_token") || ""
  );

  const [currentUser, setCurrentUser] = useState(null);
  const [showToken, setShowToken] = useState(false);

  // =========================
  // SOCKET
  // =========================
  const [socket, setSocket] = useState(null);
  const [socketStatus, setSocketStatus] = useState("disconnected");

  // =========================
  // API
  // =========================
  const [apiStatus, setApiStatus] = useState("checking");

  // =========================
  // ROOMS
  // =========================
  const [rooms, setRooms] = useState([]);
  const [room, setRoom] = useState(null);

  const [roomId, setRoomId] = useState("");
  const [roomName, setRoomName] = useState("");
  const [roomDescription, setRoomDescription] = useState("");
  const [roomLanguage, setRoomLanguage] = useState("javascript");
  const [roomPrivate, setRoomPrivate] = useState(false);

  // =========================
  // JOIN STATE
  // =========================
  const [joinStatus, setJoinStatus] = useState("idle");
  const [joinMessage, setJoinMessage] = useState("");

  // =========================
  // JOIN REQUESTS
  // =========================
  const [joinRequests, setJoinRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);

  // =========================
  // DRIVER
  // =========================
  const [driver, setDriver] = useState(null);
  const [controlUserId, setControlUserId] = useState("");

  // =========================
  // CHAT
  // =========================
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  // =========================
  // LOGS
  // =========================
  const [logs, setLogs] = useState([]);

  const [loading, setLoading] = useState(false);

  // =========================
  // LOGGING
  // =========================
  const addLog = (title, data = "") => {
    setLogs((prev) => [
      {
        id: `${Date.now()}-${Math.random()}`,
        title,
        data,
        time: new Date().toLocaleTimeString(),
      },
      ...prev,
    ].slice(0, 80));
  };

  // =========================
  // API REQUEST
  // =========================
  const apiRequest = async (path, options = {}, authToken = token) => {
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };

    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    const response = await fetch(`${API}${path}`, {
      ...options,
      headers,
    });

    const text = await response.text();

    let data;

    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { message: text };
    }

    if (!response.ok) {
      throw new Error(data.message || "Request failed");
    }

    return data;
  };

  // =========================
  // CHECK API
  // =========================
  const checkAPI = async () => {
    try {
      await fetch(`${API}/`);
      setApiStatus("online");
    } catch {
      setApiStatus("offline");
    }
  };

  // =========================
  // GET CURRENT USER
  // =========================
  const getMe = async (authToken) => {
    try {
      const data = await apiRequest("/api/auth/me", {}, authToken);

      const user = data.user || data;

      setCurrentUser(user);

      return user;
    } catch (error) {
      localStorage.removeItem("flux_token");
      setToken("");
      setCurrentUser(null);

      addLog("AUTH ERROR", error.message);

      return null;
    }
  };

  // =========================
  // LOGIN
  // =========================
  const login = async (e) => {
    e.preventDefault();

    if (!email || !password) return;

    try {
      setLoading(true);

      const data = await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const newToken = data.token;

      localStorage.setItem("flux_token", newToken);
      setToken(newToken);

      const user = data.user || (await getMe(newToken));

      setCurrentUser(user);

      connectSocket(newToken);
      await loadRooms(newToken);

      addLog("LOGIN SUCCESS", user);

      setPassword("");
    } catch (error) {
      addLog("LOGIN ERROR", error.message);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // SIGNUP
  // =========================
  const signup = async (e) => {
    e.preventDefault();

    if (!username || !email || !password) return;

    try {
      setLoading(true);

      const data = await apiRequest("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          username,
          email,
          password,
        }),
      });

      const newToken = data.token;

      localStorage.setItem("flux_token", newToken);
      setToken(newToken);

      const user = data.user || (await getMe(newToken));

      setCurrentUser(user);

      connectSocket(newToken);
      await loadRooms(newToken);

      addLog("SIGNUP SUCCESS", user);

      setPassword("");
    } catch (error) {
      addLog("SIGNUP ERROR", error.message);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // LOGOUT
  // =========================
  const logout = () => {
    if (socket) {
      socket.disconnect();
    }

    localStorage.removeItem("flux_token");

    setToken("");
    setCurrentUser(null);
    setSocket(null);
    setRooms([]);
    setRoom(null);
    setMessages([]);
    setDriver(null);
    setJoinRequests([]);
    setRoomId("");
    setJoinStatus("idle");
    setJoinMessage("");

    addLog("LOGGED OUT");
  };

  // =========================
  // SOCKET
  // =========================
  const connectSocket = (authToken) => {
    if (!authToken) return null;

    if (socket) {
      socket.disconnect();
    }

    const newSocket = io(API, {
      auth: {
        token: authToken,
      },
    });

    setSocket(newSocket);
    setSocketStatus("connecting");

    newSocket.on("connect", () => {
      setSocketStatus("connected");

      addLog("SOCKET CONNECTED", {
        socketId: newSocket.id,
      });
    });

    newSocket.on("disconnect", (reason) => {
      setSocketStatus("disconnected");

      addLog("SOCKET DISCONNECTED", reason);
    });

    newSocket.on("connect_error", (error) => {
      setSocketStatus("error");

      addLog("SOCKET ERROR", error.message);
    });

    // =========================
    // ROOM EVENTS
    // =========================

    newSocket.on("room:joined", (data) => {
      setDriver(data.driver || null);

      addLog("ROOM JOINED VIA SOCKET", data);
    });

    newSocket.on("room:error", (data) => {
      addLog("ROOM ERROR", data);
    });

    newSocket.on("room:user-joined", (data) => {
      addLog("USER JOINED ROOM", data);
    });

    newSocket.on("room:user-left", (data) => {
      addLog("USER LEFT ROOM", data);
    });

    newSocket.on("room:left", (data) => {
      setDriver(data.driver || null);

      addLog("LEFT ROOM", data);
    });

    // =========================
    // CONTROL EVENTS
    // =========================

    newSocket.on("control:requested", (data) => {
      addLog("CONTROL REQUEST", data);
    });

    newSocket.on("control:changed", (data) => {
      setDriver(data.driver || null);

      addLog("DRIVER CHANGED", data);
    });

    newSocket.on("control:released", (data) => {
      setDriver(null);

      addLog("CONTROL RELEASED", data);
    });

    newSocket.on("control:rejected", (data) => {
      addLog("CONTROL REJECTED", data);
    });

    newSocket.on("control:error", (data) => {
      addLog("CONTROL ERROR", data);
    });

    // =========================
    // CHAT
    // =========================

    newSocket.on("chat:message", (data) => {
      setMessages((prev) => {
        if (prev.some((item) => item._id === data._id)) {
          return prev;
        }

        return [...prev, data];
      });
    });

    newSocket.on("chat:error", (data) => {
      addLog("CHAT ERROR", data);
    });

    return newSocket;
  };

  // =========================
  // LOAD ROOMS
  // =========================
  const loadRooms = async (authToken = token) => {
    if (!authToken) return;

    try {
      const data = await apiRequest("/api/rooms", {}, authToken);

      const list = data.rooms || data || [];

      setRooms(list);

      addLog("ROOMS LOADED", {
        count: list.length,
      });

      return list;
    } catch (error) {
      addLog("LOAD ROOMS ERROR", error.message);
    }
  };

  // =========================
  // CREATE ROOM
  // =========================
  const createRoom = async (e) => {
    e.preventDefault();

    if (!roomName.trim()) return;

    try {
      setLoading(true);

      const data = await apiRequest("/api/rooms", {
        method: "POST",
        body: JSON.stringify({
          name: roomName.trim(),
          description: roomDescription.trim(),
          language: roomLanguage,

          settings: {
            access: roomPrivate ? "private" : "public",
            requireJoinApproval: roomPrivate,
            allowChat: true,
            allowControlRequests: true,
            allowMultipleDrivers: false,
            autoAssignDriver: false,
            allowMembersToInvite: false,
          },
        }),
      });

      const createdRoom = data.room || data;

      setRoom(createdRoom);
      setRoomId(createdRoom._id);
      setDriver(createdRoom.driver || null);
      setMessages([]);
      setJoinRequests([]);

      setRooms((prev) => [
        createdRoom,
        ...prev.filter((item) => item._id !== createdRoom._id),
      ]);

      if (socket) {
        socket.emit("room:join", {
          roomId: createdRoom._id,
        });
      }

      await loadMessages(createdRoom._id);
      await loadJoinRequests(createdRoom._id, createdRoom);

      addLog("ROOM CREATED", createdRoom);

      setRoomName("");
      setRoomDescription("");
    } catch (error) {
      addLog("CREATE ROOM ERROR", error.message);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // ENTER EXISTING MEMBER ROOM
  // =========================
  const enterRoom = async (selectedRoom) => {
    if (!selectedRoom?._id) return;

    if (!socket) {
      addLog("ROOM ERROR", "Socket is not connected.");
      return;
    }

    try {
      setJoinStatus("joining");
      setJoinMessage("");

      setRoom(selectedRoom);
      setRoomId(selectedRoom._id);
      setDriver(selectedRoom.driver || null);
      setMessages([]);

      socket.emit("room:join", {
        roomId: selectedRoom._id,
      });

      await loadMessages(selectedRoom._id);
      await loadJoinRequests(selectedRoom._id, selectedRoom);

      setJoinStatus("joined");
      setJoinMessage(`Entered ${selectedRoom.name}.`);

      addLog("ENTERED ROOM", selectedRoom);
    } catch (error) {
      setJoinStatus("error");
      setJoinMessage(error.message);

      addLog("ENTER ROOM ERROR", error.message);
    }
  };

  // =========================
  // JOIN ROOM BY ID
  // PUBLIC:
  // POST /join -> immediately joins
  //
  // PRIVATE:
  // POST /join -> pending
  // =========================
  const joinRoomById = async (e) => {
    e.preventDefault();

    const id = roomId.trim();

    if (!id) return;

    try {
      setJoinStatus("joining");
      setJoinMessage("");

      const data = await apiRequest(`/api/rooms/${id}/join`, {
        method: "POST",
      });

      // =========================
      // PRIVATE ROOM
      // =========================
      if (data.status === "pending") {
        setJoinStatus("pending");

        setJoinMessage(
          "Join request sent. Wait for the owner or an admin to approve you."
        );

        addLog("JOIN REQUEST SENT", data);

        return;
      }

      // =========================
      // PUBLIC ROOM
      // =========================
      const joinedRoom = data.room || data;

      setRoom(joinedRoom);
      setRoomId(joinedRoom._id);
      setDriver(joinedRoom.driver || null);
      setMessages([]);

      setRooms((prev) => [
        joinedRoom,
        ...prev.filter((item) => item._id !== joinedRoom._id),
      ]);

      if (!socket) {
        setJoinStatus("error");
        setJoinMessage("Joined the room, but Socket.IO is not connected.");

        addLog("ROOM SOCKET ERROR", "Socket is not connected.");

        return;
      }

      socket.emit("room:join", {
        roomId: joinedRoom._id,
      });

      await loadMessages(joinedRoom._id);
      await loadJoinRequests(joinedRoom._id, joinedRoom);

      setJoinStatus("joined");
      setJoinMessage(`Joined ${joinedRoom.name}.`);

      addLog("PUBLIC ROOM JOINED", joinedRoom);

      await loadRooms();
    } catch (error) {
      setJoinStatus("error");
      setJoinMessage(error.message);

      addLog("JOIN ROOM ERROR", error.message);
    }
  };

  // =========================
  // LOAD MESSAGES
  // =========================
  const loadMessages = async (id) => {
    try {
      const data = await apiRequest(`/api/messages/${id}`);

      const list = data.messages || data || [];

      setMessages(list);

      return list;
    } catch (error) {
      addLog("LOAD MESSAGES ERROR", error.message);
    }
  };

  // =========================
  // SEND MESSAGE
  // =========================
  const sendMessage = (e) => {
    e.preventDefault();

    if (!socket || !room?._id) return;

    const text = message.trim();

    if (!text) return;

    socket.emit("chat:send", {
      roomId: room._id,
      text,
    });

    setMessage("");
  };

  // =========================
  // LOAD JOIN REQUESTS
  // =========================
  const loadJoinRequests = async (id, selectedRoom = room) => {
    if (!id || !selectedRoom) return;

    if (!canManageRoom(selectedRoom)) {
      setJoinRequests([]);
      return;
    }

    try {
      setRequestsLoading(true);

      const data = await apiRequest(`/api/rooms/${id}/join-requests`);

      setJoinRequests(data.requests || data || []);
    } catch (error) {
      addLog("LOAD JOIN REQUESTS ERROR", error.message);
    } finally {
      setRequestsLoading(false);
    }
  };

  // =========================
  // APPROVE JOIN REQUEST
  // =========================
  const approveJoinRequest = async (request) => {
    const userId = getUserIdFromRequest(request);

    if (!userId || !room?._id) return;

    try {
      await apiRequest(
        `/api/rooms/${room._id}/join-requests/${userId}/approve`,
        {
          method: "POST",
        }
      );

      addLog("JOIN REQUEST APPROVED", request);

      await loadJoinRequests(room._id, room);
      await loadRooms();
    } catch (error) {
      addLog("APPROVE REQUEST ERROR", error.message);
      alert(error.message);
    }
  };

  // =========================
  // REJECT JOIN REQUEST
  // =========================
  const rejectJoinRequest = async (request) => {
    const userId = getUserIdFromRequest(request);

    if (!userId || !room?._id) return;

    try {
      await apiRequest(
        `/api/rooms/${room._id}/join-requests/${userId}/reject`,
        {
          method: "POST",
        }
      );

      addLog("JOIN REQUEST REJECTED", request);

      await loadJoinRequests(room._id, room);
    } catch (error) {
      addLog("REJECT REQUEST ERROR", error.message);
      alert(error.message);
    }
  };

  // =========================
  // REQUEST USER ID HELPER
  // =========================
  const getUserIdFromRequest = (request) => {
    if (!request?.user) return null;

    if (typeof request.user === "string") {
      return request.user;
    }

    return request.user._id;
  };

  // =========================
  // REQUEST USERNAME
  // =========================
  const getRequestUsername = (request) => {
    if (!request?.user) return "Unknown user";

    if (typeof request.user === "string") {
      return request.user;
    }

    return request.user.username || request.user.email || "Unknown user";
  };

  // =========================
  // ROOM MEMBER HELPERS
  // =========================
  const currentUserId =
    currentUser?._id || currentUser?.id || currentUser?.userId;

  const isOwner =
    room &&
    String(room.owner?._id || room.owner) === String(currentUserId);

  const currentMember = room?.members?.find(
    (member) =>
      String(member.user?._id || member.user) === String(currentUserId)
  );

  const isAdmin = currentMember?.role === "admin";

  const canManageRoom = (selectedRoom = room) => {
    if (!selectedRoom || !currentUserId) return false;

    const ownerId = selectedRoom.owner?._id || selectedRoom.owner;

    if (String(ownerId) === String(currentUserId)) {
      return true;
    }

    const member = selectedRoom.members?.find(
      (item) =>
        String(item.user?._id || item.user) === String(currentUserId)
    );

    return member?.role === "admin";
  };

  // =========================
  // DRIVER
  // =========================
  const driverId = driver?._id || driver?.id || driver;

  const isDriver =
    driverId && String(driverId) === String(currentUserId);

  const driverName =
    driver?.username ||
    driver?.email ||
    (driverId ? String(driverId) : "No driver");

  // =========================
  // REQUEST CONTROL
  // =========================
  const requestControl = () => {
    if (!socket || !room?._id) return;

    socket.emit("control:request", {
      roomId: room._id,
    });
  };

  // =========================
  // APPROVE CONTROL
  // =========================
  const approveControl = () => {
    if (!socket || !room?._id || !controlUserId) return;

    socket.emit("control:approve", {
      roomId: room._id,
      userId: controlUserId,
    });

    setControlUserId("");
  };

  // =========================
  // REJECT CONTROL
  // =========================
  const rejectControl = () => {
    if (!socket || !room?._id || !controlUserId) return;

    socket.emit("control:reject", {
      roomId: room._id,
      userId: controlUserId,
    });

    setControlUserId("");
  };

  // =========================
  // RELEASE CONTROL
  // =========================
  const releaseControl = () => {
    if (!socket || !room?._id) return;

    socket.emit("control:release", {
      roomId: room._id,
    });
  };

  // =========================
  // LEAVE ROOM
  // =========================
  const leaveRoom = () => {
    if (!room?._id) return;

    if (socket) {
      socket.emit("room:leave", {
        roomId: room._id,
      });
    }

    setRoom(null);
    setMessages([]);
    setDriver(null);
    setJoinRequests([]);
    setJoinStatus("idle");
    setJoinMessage("");

    addLog("LEFT ACTIVE ROOM", {
      roomId: room._id,
    });
  };

  // =========================
  // DELETE ROOM
  // =========================
  const deleteRoom = async () => {
    if (!room?._id || !isOwner) return;

    const confirmed = window.confirm(
      `Delete "${room.name}" permanently?`
    );

    if (!confirmed) return;

    try {
      await apiRequest(`/api/rooms/${room._id}`, {
        method: "DELETE",
      });

      if (socket) {
        socket.emit("room:leave", {
          roomId: room._id,
        });
      }

      setRooms((prev) =>
        prev.filter((item) => item._id !== room._id)
      );

      setRoom(null);
      setMessages([]);
      setDriver(null);
      setJoinRequests([]);

      addLog("ROOM DELETED");
    } catch (error) {
      addLog("DELETE ROOM ERROR", error.message);
      alert(error.message);
    }
  };

  // =========================
  // COPY ROOM ID
  // =========================
  const copyRoomId = async () => {
    if (!room?._id) return;

    try {
      await navigator.clipboard.writeText(room._id);

      addLog("ROOM ID COPIED");
    } catch {
      alert("Could not copy room ID.");
    }
  };

  // =========================
  // COPY TOKEN
  // =========================
  const copyToken = async () => {
    if (!token) return;

    try {
      await navigator.clipboard.writeText(token);

      addLog("JWT COPIED");
    } catch {
      alert("Could not copy token.");
    }
  };

  // =========================
  // INITIALIZE
  // =========================
  useEffect(() => {
    checkAPI();

    const savedToken = localStorage.getItem("flux_token");

    if (!savedToken) return;

    let activeSocket = null;

    const initialize = async () => {
      const user = await getMe(savedToken);

      if (!user) return;

      activeSocket = connectSocket(savedToken);

      await loadRooms(savedToken);
    };

    initialize();

    return () => {
      if (activeSocket) {
        activeSocket.disconnect();
      }
    };
  }, []);

  // =========================
  // AUTH SCREEN
  // =========================
  if (!currentUser) {
    return (
      <div className="app">
        <div className="auth-shell">
          <div className="auth-hero">
            <div className="brand-large">
              <span className="brand-mark">F</span>
              <span>Flux</span>
            </div>

            <div className="hero-eyebrow">
              REAL-TIME COLLABORATION
            </div>

            <h1>
              Code together.
              <br />
              <span>In real time.</span>
            </h1>

            <p>
              Flux gives developers a shared environment for
              coding, communication, and collaboration.
            </p>

            <div className="hero-points">
              <div>
                <span>01</span>
                Shared rooms
              </div>

              <div>
                <span>02</span>
                Live collaboration
              </div>

              <div>
                <span>03</span>
                Real-time chat
              </div>
            </div>
          </div>

          <div className="auth-card">
            <div className="auth-card-header">
              <span className="status-dot online" />
              {authMode === "login"
                ? "Welcome back"
                : "Create your account"}
            </div>

            <form
              onSubmit={
                authMode === "login" ? login : signup
              }
            >
              {authMode === "signup" && (
                <label>
                  Username
                  <input
                    value={username}
                    onChange={(e) =>
                      setUsername(e.target.value)
                    }
                    placeholder="your username"
                  />
                </label>
              )}

              <label>
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  placeholder="you@example.com"
                />
              </label>

              <label>
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  placeholder="••••••••"
                />
              </label>

              <button
                className="primary-button"
                disabled={loading}
              >
                {loading
                  ? "Please wait..."
                  : authMode === "login"
                  ? "Login"
                  : "Create account"}
              </button>
            </form>

            <button
              className="text-button"
              onClick={() =>
                setAuthMode(
                  authMode === "login"
                    ? "signup"
                    : "login"
                )
              }
            >
              {authMode === "login"
                ? "Create a new account"
                : "Already have an account?"}
            </button>

            <div className="connection-info">
              <span>
                API{" "}
                <b
                  className={
                    apiStatus === "online"
                      ? "green"
                      : "red"
                  }
                >
                  {apiStatus}
                </b>
              </span>

              <span>localhost:4000</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================
  // MAIN APPLICATION
  // =========================
  return (
    <div className="app">
      {/* TOP BAR */}
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">F</span>
          <span>Flux</span>
        </div>

        <div className="topbar-right">
          <div className="status-pill">
            <span
              className={`status-dot ${
                apiStatus === "online"
                  ? "online"
                  : "offline"
              }`}
            />
            API
          </div>

          <div className="status-pill">
            <span
              className={`status-dot ${
                socketStatus === "connected"
                  ? "online"
                  : "offline"
              }`}
            />
            Socket
          </div>

          <div className="user-pill">
            <span className="avatar">
              {(currentUser.username ||
                currentUser.email ||
                "U")[0].toUpperCase()}
            </span>

            <span>
              {currentUser.username ||
                currentUser.email}
            </span>
          </div>

          <button
            className="ghost-button"
            onClick={logout}
          >
            Logout
          </button>
        </div>
      </header>

      <main className="main">
        {/* SESSION BAR */}
        <section className="session-bar">
          <div>
            <div className="section-label">
              SESSION
            </div>

            <h2>
              {currentUser.username ||
                currentUser.email}
            </h2>
          </div>

          <div className="session-meta">
            <div>
              <span>API</span>
              <strong
                className={
                  apiStatus === "online"
                    ? "green"
                    : "red"
                }
              >
                {apiStatus}
              </strong>
            </div>

            <div>
              <span>SOCKET</span>
              <strong
                className={
                  socketStatus === "connected"
                    ? "green"
                    : "red"
                }
              >
                {socketStatus}
              </strong>
            </div>

            <div>
              <span>ROOMS</span>
              <strong>{rooms.length}</strong>
            </div>
          </div>
        </section>

        {/* JWT */}
        <section className="token-card">
          <div>
            <div className="section-label">
              DEVELOPMENT TOKEN
            </div>

            <div className="token-value">
              {showToken
                ? token
                : "••••••••••••••••••••••••••••••••"}
            </div>
          </div>

          <div className="token-actions">
            <button
              className="ghost-button"
              onClick={() =>
                setShowToken((value) => !value)
              }
            >
              {showToken ? "Hide" : "Show"}
            </button>

            <button
              className="ghost-button"
              onClick={copyToken}
            >
              Copy
            </button>
          </div>
        </section>

        {/* ROOM ACTIONS */}
        <div className="dashboard-grid">
          {/* CREATE */}
          <section className="panel">
            <div className="panel-header">
              <div>
                <div className="section-label">
                  NEW ROOM
                </div>

                <h3>Create a room</h3>
              </div>

              <span className="panel-number">
                01
              </span>
            </div>

            <form onSubmit={createRoom}>
              <label>
                Room name
                <input
                  value={roomName}
                  onChange={(e) =>
                    setRoomName(e.target.value)
                  }
                  placeholder="Frontend workshop"
                />
              </label>

              <label>
                Description
                <textarea
                  value={roomDescription}
                  onChange={(e) =>
                    setRoomDescription(e.target.value)
                  }
                  placeholder="What are you working on?"
                  rows="3"
                />
              </label>

              <div className="form-row">
                <label>
                  Language
                  <select
                    value={roomLanguage}
                    onChange={(e) =>
                      setRoomLanguage(e.target.value)
                    }
                  >
                    <option value="javascript">
                      JavaScript
                    </option>
                    <option value="typescript">
                      TypeScript
                    </option>
                    <option value="python">
                      Python
                    </option>
                    <option value="rust">
                      Rust
                    </option>
                    <option value="go">
                      Go
                    </option>
                    <option value="cpp">
                      C++
                    </option>
                  </select>
                </label>

                <label>
                  Access
                  <select
                    value={roomPrivate ? "private" : "public"}
                    onChange={(e) =>
                      setRoomPrivate(
                        e.target.value === "private"
                      )
                    }
                  >
                    <option value="public">
                      Public
                    </option>
                    <option value="private">
                      Private
                    </option>
                  </select>
                </label>
              </div>

              <div
                className={`access-info ${
                  roomPrivate ? "private" : "public"
                }`}
              >
                <span>
                  {roomPrivate ? "PRIVATE" : "PUBLIC"}
                </span>

                <p>
                  {roomPrivate
                    ? "People must request access before entering."
                    : "Anyone with the Room ID can join immediately."}
                </p>
              </div>

              <button
                className="primary-button"
                disabled={loading}
              >
                Create room
              </button>
            </form>
          </section>

          {/* JOIN */}
          <section className="panel">
            <div className="panel-header">
              <div>
                <div className="section-label">
                  JOIN ROOM
                </div>

                <h3>Enter a Room ID</h3>
              </div>

              <span className="panel-number">
                02
              </span>
            </div>

            <p className="panel-description">
              Public rooms open immediately. Private
              rooms send a request to the owner or admin.
            </p>

            <form onSubmit={joinRoomById}>
              <label>
                Room ID
                <input
                  value={roomId}
                  onChange={(e) => {
                    setRoomId(e.target.value);
                    setJoinStatus("idle");
                    setJoinMessage("");
                  }}
                  placeholder="Paste room ID..."
                />
              </label>

              <button
                className="primary-button"
                disabled={
                  !roomId.trim() ||
                  joinStatus === "joining"
                }
              >
                {joinStatus === "joining"
                  ? "Checking room..."
                  : "Join room"}
              </button>
            </form>

            {joinMessage && (
              <div
                className={`join-result ${joinStatus}`}
              >
                <div className="join-result-title">
                  {joinStatus === "pending" &&
                    "Request pending"}

                  {joinStatus === "joined" &&
                    "Room joined"}

                  {joinStatus === "error" &&
                    "Unable to join"}
                </div>

                <p>{joinMessage}</p>
              </div>
            )}

            {joinStatus === "pending" && (
              <div className="pending-box">
                <div className="pending-icon">◌</div>

                <div>
                  <strong>Waiting for approval</strong>
                  <p>
                    You are not inside the room yet.
                    The owner or admin must approve your
                    request first.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* MY ROOMS */}
        <section className="panel">
          <div className="panel-header">
            <div>
              <div className="section-label">
                YOUR ROOMS
              </div>

              <h3>My rooms</h3>
            </div>

            <button
              className="ghost-button"
              onClick={() => loadRooms()}
            >
              Refresh
            </button>
          </div>

          {rooms.length === 0 ? (
            <div className="empty-state">
              <span>∅</span>
              <p>You are not a member of any rooms yet.</p>
            </div>
          ) : (
            <div className="room-list">
              {rooms.map((item) => {
                const privateRoom =
                  item.settings?.access === "private";

                const ownerId =
                  item.owner?._id || item.owner;

                const member =
                  item.members?.find(
                    (m) =>
                      String(
                        m.user?._id || m.user
                      ) === String(currentUserId)
                  );

                return (
                  <div
                    className={`room-list-item ${
                      room?._id === item._id
                        ? "active"
                        : ""
                    }`}
                    key={item._id}
                  >
                    <div className="room-list-main">
                      <div className="room-list-icon">
                        #
                      </div>

                      <div>
                        <strong>{item.name}</strong>

                        <span>
                          {item.description ||
                            "No description"}
                        </span>
                      </div>
                    </div>

                    <div className="room-list-meta">
                      <span
                        className={`access-tag ${
                          privateRoom
                            ? "private"
                            : "public"
                        }`}
                      >
                        {privateRoom
                          ? "PRIVATE"
                          : "PUBLIC"}
                      </span>

                      {String(ownerId) ===
                        String(currentUserId) && (
                        <span className="role-tag owner">
                          OWNER
                        </span>
                      )}

                      {member?.role === "admin" && (
                        <span className="role-tag admin">
                          ADMIN
                        </span>
                      )}

                      <button
                        className="ghost-button small"
                        onClick={() =>
                          enterRoom(item)
                        }
                      >
                        Enter
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ACTIVE ROOM */}
        {room && (
          <section className="active-room">
            <div className="active-room-header">
              <div>
                <div className="section-label">
                  ACTIVE ROOM
                </div>

                <h2>{room.name}</h2>

                <p>
                  {room.description ||
                    "Collaborative Flux room"}
                </p>
              </div>

              <div className="active-room-actions">
                <span
                  className={`access-tag ${
                    room.settings?.access === "private"
                      ? "private"
                      : "public"
                  }`}
                >
                  {room.settings?.access === "private"
                    ? "PRIVATE"
                    : "PUBLIC"}
                </span>

                <button
                  className="ghost-button"
                  onClick={leaveRoom}
                >
                  Exit
                </button>

                {isOwner && (
                  <button
                    className="danger-button"
                    onClick={deleteRoom}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>

            {/* ROOM ID */}
            <div className="room-id-card">
              <div>
                <div className="section-label">
                  ROOM ID
                </div>

                <code>{room._id}</code>
              </div>

              <button
                className="ghost-button"
                onClick={copyRoomId}
              >
                Copy ID
              </button>
            </div>

            <div className="room-grid">
              {/* MEMBERS */}
              <section className="panel">
                <div className="panel-header">
                  <div>
                    <div className="section-label">
                      MEMBERS
                    </div>

                    <h3>
                      {room.members?.length || 0} members
                    </h3>
                  </div>
                </div>

                <div className="member-list">
                  {(room.members || []).map(
                    (member, index) => {
                      const memberUser =
                        member.user || {};

                      const memberId =
                        memberUser._id || memberUser;

                      const memberName =
                        memberUser.username ||
                        memberUser.email ||
                        String(memberId);

                      const memberIsCurrent =
                        String(memberId) ===
                        String(currentUserId);

                      return (
                        <div
                          className="member-item"
                          key={`${memberId}-${index}`}
                        >
                          <div className="member-info">
                            <span className="avatar">
                              {memberName[0].toUpperCase()}
                            </span>

                            <div>
                              <strong>
                                {memberName}
                                {memberIsCurrent &&
                                  " (you)"}
                              </strong>

                              <span>
                                {member.role}
                              </span>
                            </div>
                          </div>

                          <div className="member-actions">
                            {member.role ===
                              "owner" && (
                              <span className="role-tag owner">
                                OWNER
                              </span>
                            )}

                            {member.role ===
                              "admin" && (
                              <span className="role-tag admin">
                                ADMIN
                              </span>
                            )}

                            {member.role ===
                              "member" &&
                              isOwner && (
                                <button
                                  className="ghost-button small"
                                  onClick={() =>
                                    alert(
                                      "Admin management endpoint will be connected next."
                                    )
                                  }
                                >
                                  Make admin
                                </button>
                              )}

                            {member.role ===
                              "admin" &&
                              isOwner && (
                                <button
                                  className="ghost-button small"
                                  onClick={() =>
                                    alert(
                                      "Admin management endpoint will be connected next."
                                    )
                                  }
                                >
                                  Remove admin
                                </button>
                              )}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </section>

              {/* DRIVER */}
              <section className="panel">
                <div className="panel-header">
                  <div>
                    <div className="section-label">
                      CONTROL
                    </div>

                    <h3>Driver</h3>
                  </div>

                  <span
                    className={`driver-status ${
                      driver ? "active" : ""
                    }`}
                  >
                    {driver ? "ACTIVE" : "FREE"}
                  </span>
                </div>

                <div className="driver-card">
                  <div className="driver-avatar">
                    {driver ? "▶" : "—"}
                  </div>

                  <div>
                    <span>Current driver</span>
                    <strong>
                      {driver
                        ? driverName
                        : "No driver"}
                    </strong>
                  </div>
                </div>

                <div className="control-actions">
                  {!isDriver && (
                    <button
                      className="primary-button"
                      onClick={requestControl}
                    >
                      Request control
                    </button>
                  )}

                  {isDriver && (
                    <button
                      className="danger-button"
                      onClick={releaseControl}
                    >
                      Release control
                    </button>
                  )}
                </div>

                {isDriver && (
                  <div className="control-panel">
                    <div className="section-label">
                      DRIVER ACTIONS
                    </div>

                    <select
                      value={controlUserId}
                      onChange={(e) =>
                        setControlUserId(e.target.value)
                      }
                    >
                      <option value="">
                        Select member
                      </option>

                      {(room.members || [])
                        .filter(
                          (member) =>
                            String(
                              member.user?._id ||
                                member.user
                            ) !==
                            String(currentUserId)
                        )
                        .map((member, index) => {
                          const memberId =
                            member.user?._id ||
                            member.user;

                          const name =
                            member.user?.username ||
                            member.user?.email ||
                            String(memberId);

                          return (
                            <option
                              key={`${memberId}-${index}`}
                              value={memberId}
                            >
                              {name}
                            </option>
                          );
                        })}
                    </select>

                    <div className="button-row">
                      <button
                        className="ghost-button"
                        onClick={approveControl}
                        disabled={!controlUserId}
                      >
                        Give control
                      </button>

                      <button
                        className="ghost-button"
                        onClick={rejectControl}
                        disabled={!controlUserId}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                )}
              </section>

              {/* JOIN REQUESTS */}
              {canManageRoom() && (
                <section className="panel">
                  <div className="panel-header">
                    <div>
                      <div className="section-label">
                        ACCESS
                      </div>

                      <h3>Join requests</h3>
                    </div>

                    <button
                      className="ghost-button small"
                      onClick={() =>
                        loadJoinRequests(
                          room._id,
                          room
                        )
                      }
                    >
                      Refresh
                    </button>
                  </div>

                  {requestsLoading ? (
                    <div className="empty-state">
                      Loading requests...
                    </div>
                  ) : joinRequests.length === 0 ? (
                    <div className="empty-state">
                      <span>✓</span>
                      <p>No pending requests.</p>
                    </div>
                  ) : (
                    <div className="request-list">
                      {joinRequests.map(
                        (request, index) => (
                          <div
                            className="request-item"
                            key={`${getUserIdFromRequest(
                              request
                            )}-${index}`}
                          >
                            <div>
                              <strong>
                                {getRequestUsername(
                                  request
                                )}
                              </strong>

                              <span>
                                Requested{" "}
                                {request.requestedAt
                                  ? new Date(
                                      request.requestedAt
                                    ).toLocaleString()
                                  : "recently"}
                              </span>
                            </div>

                            <div className="button-row">
                              <button
                                className="ghost-button small"
                                onClick={() =>
                                  rejectJoinRequest(
                                    request
                                  )
                                }
                              >
                                Reject
                              </button>

                              <button
                                className="primary-button small-button"
                                onClick={() =>
                                  approveJoinRequest(
                                    request
                                  )
                                }
                              >
                                Approve
                              </button>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </section>
              )}

              {/* CHAT */}
              <section className="panel chat-panel">
                <div className="panel-header">
                  <div>
                    <div className="section-label">
                      CHAT
                    </div>

                    <h3>Room chat</h3>
                  </div>

                  <span className="message-count">
                    {messages.length}
                  </span>
                </div>

                <div className="messages">
                  {messages.length === 0 ? (
                    <div className="empty-chat">
                      <span>◇</span>
                      <p>
                        No messages yet. Start the
                        conversation.
                      </p>
                    </div>
                  ) : (
                    messages.map((item, index) => {
                      const sender =
                        item.sender || {};

                      const senderName =
                        sender.username ||
                        sender.email ||
                        "User";

                      const mine =
                        String(
                          sender._id || sender
                        ) ===
                        String(currentUserId);

                      return (
                        <div
                          className={`message ${
                            mine ? "mine" : ""
                          }`}
                          key={
                            item._id ||
                            `${item.createdAt}-${index}`
                          }
                        >
                          <span className="message-author">
                            {mine
                              ? "You"
                              : senderName}
                          </span>

                          <div className="message-bubble">
                            {item.text}
                          </div>

                          {item.createdAt && (
                            <span className="message-time">
                              {new Date(
                                item.createdAt
                              ).toLocaleTimeString()}
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {room.settings?.allowChat !== false && (
                  <form
                    className="chat-input"
                    onSubmit={sendMessage}
                  >
                    <input
                      value={message}
                      onChange={(e) =>
                        setMessage(e.target.value)
                      }
                      placeholder="Write a message..."
                    />

                    <button
                      className="primary-button"
                      disabled={!message.trim()}
                    >
                      Send
                    </button>
                  </form>
                )}

                {room.settings?.allowChat === false && (
                  <div className="disabled-chat">
                    Chat is disabled for this room.
                  </div>
                )}
              </section>
            </div>
          </section>
        )}

        {/* LOGS */}
        <section className="panel logs-panel">
          <div className="panel-header">
            <div>
              <div className="section-label">
                DEVELOPER LOG
              </div>

              <h3>Live events</h3>
            </div>

            <button
              className="ghost-button"
              onClick={() => setLogs([])}
            >
              Clear
            </button>
          </div>

          <div className="logs">
            {logs.length === 0 ? (
              <div className="empty-state">
                No events yet.
              </div>
            ) : (
              logs.map((log) => (
                <div
                  className="log-item"
                  key={log.id}
                >
                  <span className="log-time">
                    {log.time}
                  </span>

                  <strong>{log.title}</strong>

                  <code>
                    {typeof log.data === "string"
                      ? log.data
                      : JSON.stringify(
                          log.data
                        )}
                  </code>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;