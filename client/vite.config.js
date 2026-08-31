import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev-time proxy so the client can call /api/... without CORS friction,
// same origin as if it were served by the Node backend in production.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:4000",
      "/uploads": "http://localhost:4000",
    },
  },
});
