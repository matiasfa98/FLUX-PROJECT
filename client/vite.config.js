// client/vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { networkInterfaces } from "os";

function detectLanIp() {
  const ifaces = networkInterfaces();
  const candidates = [];

  for (const [name, addrs] of Object.entries(ifaces)) {
    for (const addr of addrs || []) {
      if (addr.family !== "IPv4" || addr.internal) continue;
      const l = name.toLowerCase();
      if (
        l.includes("vmware") ||
        l.includes("vethernet") ||
        l.includes("hyper-v") ||
        l.includes("virtualbox")
      ) {
        continue;
      }
      candidates.push({ name, address: addr.address });
    }
  }

  const preferred = candidates.find((c) => {
    const l = c.name.toLowerCase();
    return l.includes("wi-fi") || l.includes("wifi") || l.includes("ethernet");
  });

  return preferred?.address || candidates[0]?.address || "127.0.0.1";
}

const LAN_IP = detectLanIp();

console.log(`[flux] detected LAN IP: ${LAN_IP}`);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    open: true,
  },
  define: {
    __FLUX_LAN_IP__: JSON.stringify(LAN_IP),
  },
});