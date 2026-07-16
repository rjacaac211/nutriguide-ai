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

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser requests (no Origin header, e.g. server-to-server, curl).
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error("Not allowed by CORS"));
    },
  })
);
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
