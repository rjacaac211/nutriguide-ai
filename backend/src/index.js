import "./env.js";

import express from "express";
import cors from "cors";

import { prisma } from "./db.js";
import chatRoutes from "./routes/chat.js";
import userRoutes from "./routes/users.js";
import internalRoutes from "./routes/internal.js";
import foodsRoutes from "./routes/foods.js";
import foodLogsRoutes from "./routes/foodLogs.js";
import weightLogsRoutes from "./routes/weightLogs.js";

const app = express();
const PORT = process.env.PORT;
if (!PORT) {
  throw new Error("PORT environment variable is not set");
}

await prisma.$connect();

const DEFAULT_DEV_ORIGINS = ["http://localhost:5173", "http://localhost:80", "http://localhost"];
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map((o) => o.trim())
  : DEFAULT_DEV_ORIGINS;

// In prod, browser traffic always reaches this server same-origin (nginx proxies
// /api to the backend on the frontend's own origin), so trust any request whose
// Origin host matches the Host header it was sent to, regardless of whether the
// browser was pointed at an IP, a DNS name, or a future custom domain.
// FRONTEND_URL remains for genuinely cross-origin cases (e.g. local dev, where
// the Vite dev server's origin differs from the backend's).
function corsOptionsDelegate(req, callback) {
  const origin = req.headers.origin;
  let allowed = !origin; // no Origin header: non-browser request (curl, server-to-server)
  if (origin) {
    if (allowedOrigins.includes(origin)) {
      allowed = true;
    } else {
      try {
        allowed = new URL(origin).host === req.headers.host;
      } catch {
        allowed = false;
      }
    }
  }
  callback(null, { origin: allowed });
}

app.use(cors(corsOptionsDelegate));
app.use(express.json());

app.use("/api/chat", chatRoutes);
app.use("/api/users", userRoutes);
app.use("/api/foods", foodsRoutes);
app.use("/api/users", foodLogsRoutes);
app.use("/api/users", weightLogsRoutes);
app.use("/api/internal", internalRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`NutriGuide backend running on http://localhost:${PORT}`);
});
