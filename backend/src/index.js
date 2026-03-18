import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import { prisma } from "./db.js";
import chatRoutes from "./routes/chat.js";
import userRoutes from "./routes/users.js";
import internalRoutes from "./routes/internal.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

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
