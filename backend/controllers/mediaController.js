// backend/controllers/mediaController.js
const getIceServers = async (req, res) => {
  try {
    // Return standard public Google STUN servers
    return res.json({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
      ],
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch ICE servers" });
  }
};

module.exports = {
  getIceServers,
};