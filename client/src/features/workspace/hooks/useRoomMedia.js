// client/src/features/workspace/hooks/useRoomMedia.js
import { useState, useEffect, useRef, useCallback } from "react";

/*
|--------------------------------------------------------------------------
| ICE SERVERS
|--------------------------------------------------------------------------
|
| On localhost / LAN / hotspot / same-network ngrok: host candidates are
| enough. Empty array = fastest connect. Add STUN/TURN if you need
| cross-network WebRTC.
|
| If you later need STUN, use:
|   iceServers: [
|     { urls: "stun:stun.l.google.com:19302" },
|     { urls: "stun:stun1.l.google.com:19302" }
|   ]
|
|--------------------------------------------------------------------------
*/
const ICE_SERVERS = { iceServers: [] };

export const useRoomMedia = ({ roomId, socket }) => {
  // ---------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);

  // ---------------------------------------------------------------
  // REFS
  // ---------------------------------------------------------------
  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef({}); // socketId -> RTCPeerConnection
  const socketRef = useRef(socket);

  // Keep socket ref in sync.
  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  // ---------------------------------------------------------------
  // CREATE PEER CONNECTION
  // ---------------------------------------------------------------
  const createPeerConnection = useCallback((targetSocketId) => {
    const existing = peerConnectionsRef.current[targetSocketId];
    if (existing) return existing;

    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Attach local tracks if we are broadcasting.
    if (localStreamRef.current) {
      for (const track of localStreamRef.current.getTracks()) {
        pc.addTrack(track, localStreamRef.current);
      }
    }

    // -----------------------------------------------------------
    // RECEIVE REMOTE TRACKS
    // -----------------------------------------------------------
    //
    // On the observer side, `ontrack` fires once per remote track
    // (audio and video). `event.streams[0]` is the whole remote
    // MediaStream, which already has both tracks. We just need to
    // hand it to the <video> element.
    //
    // IMPORTANT: we do NOT mute the audio track. The <video> element
    // rendering the remote stream must have its `muted` attribute
    // REMOVED (or set to false) or the observer will see video but
    // hear nothing.
    //
    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (!stream) return;

      // Ensure the remote audio track is enabled and at full volume.
      const audioTracks = stream.getAudioTracks();
      for (const track of audioTracks) {
        track.enabled = true;
      }

      setRemoteStream(stream);
    };

    // ICE relay.
    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      const s = socketRef.current;
      if (!s || !s.connected) return;
      s.emit("webrtc:ice-candidate", {
        targetSocketId,
        candidate: event.candidate,
      });
    };

    // Cleanup on failure/close.
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (
        state === "failed" ||
        state === "closed" ||
        state === "disconnected"
      ) {
        // Only clear the ref if this is still the active PC for this peer.
        if (peerConnectionsRef.current[targetSocketId] === pc) {
          try {
            pc.close();
          } catch {}
          delete peerConnectionsRef.current[targetSocketId];
          setRemoteStream(null);
        }
      }
    };

    peerConnectionsRef.current[targetSocketId] = pc;
    return pc;
  }, []);

  // ---------------------------------------------------------------
  // DRIVER: START BROADCAST
  // ---------------------------------------------------------------
  const startMedia = useCallback(async () => {
    const s = socketRef.current;

    console.log("[webrtc] startMedia called", {
      hasSocket: Boolean(s),
      connected: s?.connected,
      socketId: s?.id,
      alreadyBroadcasting: Boolean(localStreamRef.current),
    });

    if (!s || !s.connected) {
      alert("Socket is not connected yet. Wait a moment, then try again.");
      return null;
    }

    if (localStreamRef.current) {
      return localStreamRef.current;
    }

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (err) {
      console.error("[webrtc] getUserMedia failed:", err);

      if (err.name === "NotAllowedError" || err.name === "SecurityError") {
        alert("Camera/mic access denied. WebRTC requires HTTPS or localhost.");
      } else if (err.name === "NotFoundError") {
        alert("No camera or microphone found on this device.");
      } else if (err.name === "NotReadableError") {
        alert("Camera or microphone is already in use by another app.");
      } else {
        alert(`Broadcast failed: ${err.message}`);
      }
      return null;
    }

    localStreamRef.current = stream;
    setLocalStream(stream);
    setIsCameraOn(true);
    setIsMicOn(true);
    setBroadcasting(true);

    console.log("[webrtc] emitting webrtc:broadcast-started", { roomId });
    s.emit("webrtc:broadcast-started", { roomId });

    return stream;
  }, [roomId]);

  // ---------------------------------------------------------------
  // DRIVER: STOP BROADCAST
  // ---------------------------------------------------------------
  const stopMedia = useCallback(() => {
    if (localStreamRef.current) {
      for (const track of localStreamRef.current.getTracks()) {
        track.stop();
      }
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setIsCameraOn(false);
    setIsMicOn(false);
    setBroadcasting(false);

    for (const pc of Object.values(peerConnectionsRef.current)) {
      try {
        pc.close();
      } catch {}
    }
    peerConnectionsRef.current = {};

    const s = socketRef.current;
    if (s && s.connected) {
      s.emit("webrtc:broadcast-stopped", { roomId });
    }
  }, [roomId]);

  // ---------------------------------------------------------------
  // TOGGLES
  // ---------------------------------------------------------------
  const toggleCamera = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setIsCameraOn(track.enabled);
  }, []);

  const toggleMic = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setIsMicOn(track.enabled);
  }, []);

    // ---------------------------------------------------------------
  // SOCKET LISTENERS
  // ---------------------------------------------------------------
  useEffect(() => {
    if (!socket || !roomId) return;

    let isMounted = true;

    // Wrapper that drops events after unmount.
    const safeOn = (event, handler) => {
      socket.on(event, (...args) => {
        if (!isMounted) return;
        try {
          handler(...args);
        } catch (err) {
          console.error(`[useRoomMedia] handler error for ${event}:`, err);
        }
      });
    };

    // DRIVER: new observer → send offer
    const onObserverJoined = async ({ observerSocketId }) => {
      if (!observerSocketId) return;
      if (!localStreamRef.current) return;

      try {
        const pc = createPeerConnection(observerSocketId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit("webrtc:offer", {
          targetSocketId: observerSocketId,
          offer,
        });
      } catch (err) {
        console.error("[useRoomMedia] observer-joined failed:", err);
      }
    };

    // OBSERVER: driver is live → ask for offer
    const onBroadcastStarted = () => {
      socket.emit("webrtc:observer-ready", { roomId });
    };

    // OBSERVER: driver stopped → teardown
    const onBroadcastStopped = () => {
      if (localStreamRef.current) return; // we're the driver
      for (const pc of Object.values(peerConnectionsRef.current)) {
        try { pc.close(); } catch {}
      }
      peerConnectionsRef.current = {};
      if (isMounted) setRemoteStream(null);
    };

    // OBSERVER: offer → answer
    const onOffer = async ({ fromSocketId, offer }) => {
      try {
        const pc = createPeerConnection(fromSocketId);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("webrtc:answer", {
          targetSocketId: fromSocketId,
          answer,
        });
      } catch (err) {
        console.error("[useRoomMedia] offer handling failed:", err);
      }
    };

    // DRIVER: answer received
    const onAnswer = async ({ fromSocketId, answer }) => {
      try {
        const pc = peerConnectionsRef.current[fromSocketId];
        if (!pc) return;
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (err) {
        console.error("[useRoomMedia] answer handling failed:", err);
      }
    };

    // BOTH: ICE candidates
    const onIceCandidate = async ({ fromSocketId, candidate }) => {
      const pc = peerConnectionsRef.current[fromSocketId];
      if (!pc || !candidate) return;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn("[useRoomMedia] addIceCandidate failed:", err.message);
      }
    };

    // PEER CLOSED
    const onPeerClosed = ({ fromSocketId }) => {
      const pc = peerConnectionsRef.current[fromSocketId];
      if (!pc) return;
      try { pc.close(); } catch {}
      delete peerConnectionsRef.current[fromSocketId];
      if (isMounted) setRemoteStream(null);
    };

    // Server errors
    const onWebrtcError = ({ message }) => {
      console.error("[useRoomMedia] server error:", message);
      // Don't alert — alert() during unmount causes issues.
    };

    safeOn("webrtc:observer-joined", onObserverJoined);
    safeOn("webrtc:broadcast-started", onBroadcastStarted);
    safeOn("webrtc:broadcast-stopped", onBroadcastStopped);
    safeOn("webrtc:offer", onOffer);
    safeOn("webrtc:answer", onAnswer);
    safeOn("webrtc:ice-candidate", onIceCandidate);
    safeOn("webrtc:peer-closed", onPeerClosed);
    safeOn("webrtc:error", onWebrtcError);

    return () => {
      isMounted = false;
      socket.off("webrtc:observer-joined", onObserverJoined);
      socket.off("webrtc:broadcast-started", onBroadcastStarted);
      socket.off("webrtc:broadcast-stopped", onBroadcastStopped);
      socket.off("webrtc:offer", onOffer);
      socket.off("webrtc:answer", onAnswer);
      socket.off("webrtc:ice-candidate", onIceCandidate);
      socket.off("webrtc:peer-closed", onPeerClosed);
      socket.off("webrtc:error", onWebrtcError);
    };
  }, [socket, roomId, createPeerConnection]);

  // ---------------------------------------------------------------
  // UNMOUNT CLEANUP
  // ---------------------------------------------------------------
  useEffect(() => {
    return () => {
      // Close all peer connections.
      for (const pc of Object.values(peerConnectionsRef.current)) {
        try { pc.close(); } catch {}
      }
      peerConnectionsRef.current = {};

      // Stop local tracks.
      if (localStreamRef.current) {
        for (const track of localStreamRef.current.getTracks()) {
          try { track.stop(); } catch {}
        }
        localStreamRef.current = null;
      }
    };
  }, []);
  return {
    localStream,
    remoteStream,
    isCameraOn,
    isMicOn,
    broadcasting,
    startMedia,
    stopMedia,
    toggleCamera,
    toggleMic,
  };
};

export default useRoomMedia;