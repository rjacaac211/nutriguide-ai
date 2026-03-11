import express from "express";

const router = express.Router();
const AGENT_URL = process.env.AGENT_URL || "http://localhost:8000";

router.post("/", async (req, res) => {
  try {
    const { userId, message, messages: existingMessages } = req.body;

    if (!userId || !message) {
      return res.status(400).json({ error: "userId and message are required" });
    }

    const messages = existingMessages || [];
    messages.push({ role: "user", content: message });

    const userProfiles = req.app.locals.userProfiles || {};
    const userProfile = userProfiles[userId] ? { [userId]: userProfiles[userId] } : {};

    const response = await fetch(`${AGENT_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        messages,
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
