import express from "express";
import { Readable } from "node:stream";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
const AGENT_URL = process.env.AGENT_URL;
if (!AGENT_URL) {
  throw new Error("AGENT_URL environment variable is required");
}

// Keep in sync with ai-agent-ts/src/index.ts's MAX_MESSAGE_LENGTH — the agent's
// /chat endpoint enforces this independently since it's also reachable directly
// (eval harness, test:chat script), not just through this proxy.
const MAX_MESSAGE_LENGTH = 4000;

router.post("/", requireAuth, async (req, res) => {
  const { message, threadId } = req.body;
  const userId = req.userId;

  if (!message || !threadId) {
    return res.status(400).json({ error: "message and threadId are required" });
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return res
      .status(400)
      .json({ error: `message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters` });
  }

  // res.on("close") — not req.on("close") — is the correct client-disconnect signal here:
  // req (the incoming request stream) emits "close" once its body is fully read, which
  // happens almost immediately and has nothing to do with whether the client is still
  // waiting on the response.
  const controller = new AbortController();
  res.on("close", () => controller.abort());

  try {
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
      signal: controller.signal,
    });
    req.log.info(
      { thread_id: threadId, status: response.status, duration_ms: Date.now() - start },
      "Agent chat response"
    );

    const contentType = response.headers.get("content-type") ?? "";

    if (contentType.includes("text/event-stream")) {
      res.writeHead(response.status, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
      if (!response.body) {
        res.end();
        return;
      }
      const upstream = Readable.fromWeb(response.body);
      upstream.on("error", (streamErr) => {
        if (streamErr.name === "AbortError") return;
        req.log.error({ err: streamErr, thread_id: threadId }, "Chat stream error");
        res.end();
      });
      upstream.pipe(res);
      return;
    }

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Agent error: ${response.status} ${errText}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    if (err.name === "AbortError") return;
    req.log.error({ err, thread_id: req.body?.threadId }, "Chat error");
    res.status(500).json({ error: err.message || "Chat request failed" });
  }
});

export default router;
