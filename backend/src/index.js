import "./env.js";

import express from "express";
import cors from "cors";

import { prisma } from "./db.js";
import chatRoutes from "./routes/chat.js";
import userRoutes from "./routes/users.js";
import internalRoutes from "./routes/internal.js";
import foodsRoutes from "./routes/foods.js";
import foodLogsRoutes from "./routes/foodLogs.js";

const app = express();
const PORT = process.env.PORT;
if (!PORT) {
  throw new Error("PORT environment variable is not set");
}

await prisma.$connect();

app.use(cors({ origin: true }));
app.use(express.json());

app.use("/api/chat", chatRoutes);
app.use("/api/users", userRoutes);
app.use("/api/foods", foodsRoutes);
app.use("/api/users", foodLogsRoutes);
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
