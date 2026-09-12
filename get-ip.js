// get-ip.js
const os = require("os");

/*
 * Returns the machine's LAN IPv4 address.
 * Prefers the interface with a default gateway (the real Wi-Fi/Ethernet),
 * falls back to any non-internal IPv4 otherwise.
 */
function getLanIp() {
  const ifaces = os.networkInterfaces();
  const candidates = [];

  for (const [name, addrs] of Object.entries(ifaces)) {
    for (const addr of addrs || []) {
      if (addr.family !== "IPv4") continue;
      if (addr.internal) continue;

      // Skip obvious virtual adapters.
      const lowered = name.toLowerCase();
      if (
        lowered.includes("vmware") ||
        lowered.includes("vethernet") ||
        lowered.includes("hyper-v") ||
        lowered.includes("virtualbox")
      ) {
        continue;
      }

      candidates.push({
        name,
        address: addr.address,
      });
    }
  }

  // Prefer a real Wi-Fi or Ethernet adapter.
  const preferred = candidates.find((c) => {
    const l = c.name.toLowerCase();
    return l.includes("wi-fi") || l.includes("wifi") || l.includes("ethernet");
  });

  return preferred?.address || candidates[0]?.address || "127.0.0.1";
}

if (require.main === module) {
  console.log(getLanIp());
}

module.exports = getLanIp;