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

    req.log.info({ thread_id: threadId, user_id: userId }, "Proxying chat to agent");
    const start = Date.now();
    const response = await fetch(`${AGENT_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Request-Id": req.id },
      body: JSON.stringify({
        user_id: userId,
        message,
        thread_id: threadId,
      }),
    });
    req.log.info(
      { thread_id: threadId, status: response.status, duration_ms: Date.now() - start },
      "Agent chat response"
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Agent error: ${response.status} ${errText}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    req.log.error({ err, thread_id: req.body?.threadId }, "Chat error");
    res.status(500).json({ error: err.message || "Chat request failed" });
  }
});

export default router;
