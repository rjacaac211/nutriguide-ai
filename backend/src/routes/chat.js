import express from "express";

const router = express.Router();
const AGENT_URL = process.env.AGENT_URL || "http://localhost:8000";

router.post("/", async (req, res) => {
  try {
    const { userId, message, threadId } = req.body;

    if (!userId || !message || !threadId) {
      return res.status(400).json({ error: "userId, message, and threadId are required" });
    }

    const userProfiles = req.app.locals.userProfiles || {};
    const userProfile = userProfiles[userId] ? { [userId]: userProfiles[userId] } : {};

    const response = await fetch(`${AGENT_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        message,
        thread_id: threadId,
        user_profiles: userProfile,
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
