import express from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { casesRouter } from "./routes/cases.js";
import { uploadsDir } from "./middleware/upload.js";
import "./db.js"; // ensures tables exist on boot

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());

// Serve uploaded documents/photos back out (e.g. for the case-summary screen
// to show a thumbnail of what the agent uploaded).
app.use("/uploads", express.static(uploadsDir));

app.use("/api/cases", casesRouter);

app.get("/api/health", (req, res) => res.json({ ok: true }));

// In dev, the client is served separately by Vite (with its own proxy back
// to this server). In a built/deployed container there's no Vite process,
// so if a production client build is present, serve it — and fall back to
// index.html for client-side routes (React Router) that aren't /api or
// /uploads.
const clientDistDir = process.env.CLIENT_DIST_DIR || path.join(__dirname, "../../client/dist");
if (fs.existsSync(path.join(clientDistDir, "index.html"))) {
  app.use(express.static(clientDistDir));
  app.get(/^(?!\/api|\/uploads).*/, (req, res) => {
    res.sendFile(path.join(clientDistDir, "index.html"));
  });
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Server error" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`SpotShield API listening on http://localhost:${PORT}`);
});
