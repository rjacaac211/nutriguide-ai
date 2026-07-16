import express from "express";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
const AGENT_URL = process.env.AGENT_URL;
if (!AGENT_URL) {
  throw new Error("AGENT_URL environment variable is required");
}

router.post("/", requireAuth, async (req, res) => {
  try {
    const { message, threadId } = req.body;
    const userId = req.userId;

    if (!message || !threadId) {
      return res.status(400).json({ error: "message and threadId are required" });
    }

    const response = await fetch(`${AGENT_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        message,
        thread_id: threadId,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Agent error: ${response.status} ${errText}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: err.message || "Chat request failed" });
  }
});

export default router;
