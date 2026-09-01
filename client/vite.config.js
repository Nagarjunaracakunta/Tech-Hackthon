import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev-time proxy so the client can call /api/... without CORS friction,
// same origin as if it were served by the Node backend in production.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Lets the ngrok tunnel's Host header through Vite's dev-server allowlist.
    // ngrok's free-tier domain rotates every run, so allow any host rather
    // than chase it — fine for an intentionally-exposed local dev tunnel.
    allowedHosts: true,
    proxy: {
      "/api": "http://localhost:4000",
      "/uploads": "http://localhost:4000",
    },
  },
});
